#!/usr/bin/env python3
"""
scanner_service.py — Physical Aadhaar QR scanner for SUVIDHA kiosk.

Runs as PM2 daemon. Captures from USB/Pi camera via OpenCV, detects QR
using WeChat QR (CNN-based, better than pyzbar for dense/angled Aadhaar QR),
decodes Secure QR v2 via stdlib zlib, POSTs citizen fields to Express backend.

Setup:
  pip install opencv-contrib-python requests
  pm2 start scanner_service.py --interpreter python3 --name aadhaar-scanner
  pm2 save

Note: use opencv-CONTRIB-python (not plain opencv-python) for WeChat QR.
If both are installed, uninstall opencv-python first:
  pip uninstall opencv-python && pip install opencv-contrib-python
"""

import cv2
import json
import logging
import os
import sys
import time
import zlib
from pathlib import Path

import requests

# ── Config ────────────────────────────────────────────────────────────────────
CAMERA_INDEX  = int(os.environ.get("CAMERA_INDEX", "0"))
BACKEND_URL   = os.environ.get("BACKEND_URL", "http://localhost:3000/api/kiosk/aadhaar-scan")
FALLBACK_FILE = "/tmp/suvidha_aadhaar_latest.json"
LOG_FILE      = "/tmp/suvidha_scanner.log"
SCAN_COOLDOWN_S = 2.0
RECONNECT_AFTER = 10
POST_TIMEOUT_S  = 5

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stderr),
    ],
)
log = logging.getLogger("suvidha-scanner")

# ── WeChat QR detector (CNN — better than pyzbar for dense QR) ───────────────
try:
    _wechat_qr = cv2.wechat_qrcode_WeChatQRCode()
    WECHAT_OK = True
    log.info("WeChat QR detector loaded.")
except AttributeError:
    _wechat_qr = None
    WECHAT_OK = False
    log.warning("WeChat QR not available — using QRCodeDetector fallback. "
                "Install opencv-contrib-python for better detection.")

def detect_qr_codes(frame):
    """Returns list of decoded QR string values from a frame."""
    results = []

    if WECHAT_OK and _wechat_qr is not None:
        try:
            texts, _ = _wechat_qr.detectAndDecode(frame)
            results = [t for t in (texts or []) if t]
        except Exception:
            pass

    if not results:
        # Fallback: OpenCV built-in QR detector (no CNN, less accurate)
        detector = cv2.QRCodeDetector()
        data, _, _ = detector.detectAndDecode(frame)
        if data:
            results = [data]

    return results

# ── Validation ────────────────────────────────────────────────────────────────

def is_secure_qr_candidate(text: str) -> bool:
    s = text.strip()
    return s.isdigit() and len(s) >= 500

# ── Aadhaar Secure QR v2 decode (stdlib only — no pyaadhaar) ─────────────────

def decode_secure_qr(digit_string: str) -> dict | None:
    try:
        n = int(digit_string)
        byte_len = (n.bit_length() + 7) // 8
        raw = n.to_bytes(byte_len, byteorder='big')

        # Byte 0: email/mobile flags
        _ = raw[0]

        decompressed = zlib.decompress(raw[1:])
        parts = decompressed.split(b'\xff')

        def field(idx):
            try:
                return parts[idx].decode('utf-8', errors='replace').strip()
            except IndexError:
                return ''

        name     = field(1)
        dob      = field(2)
        gender_r = field(3)
        house    = field(7)
        street   = field(12)
        locality = field(8) or field(14)
        district = field(5)
        state    = field(11)
        pincode  = field(9)
        last4    = field(15)

        if not name:
            return None

        g = gender_r.upper()
        gender = 'Male' if g in ('M', 'MALE') else 'Female' if g in ('F', 'FEMALE') else gender_r

        return {
            "name":                name,
            "dob":                 dob,
            "gender":              gender,
            "aadhaar_last_digits": last4,
            "address": {
                "house":    house,
                "street":   street,
                "locality": locality,
                "district": district,
                "state":    state,
                "pincode":  pincode,
            },
        }
    except Exception as exc:
        log.warning("Decode failed: %s", exc)
        return None

# ── HTTP POST ─────────────────────────────────────────────────────────────────

def post_to_backend(payload: dict) -> bool:
    try:
        resp = requests.post(BACKEND_URL, json=payload, timeout=POST_TIMEOUT_S)
        if resp.ok:
            log.info("Scan posted — name=%s", payload.get("name", "?"))
            return True
        log.warning("Backend %d: %s", resp.status_code, resp.text[:200])
        return False
    except requests.RequestException as exc:
        log.warning("Backend unreachable (%s) — writing fallback file.", exc)
        try:
            Path(FALLBACK_FILE).write_text(json.dumps(payload), encoding="utf-8")
        except OSError as io_exc:
            log.error("Fallback write failed: %s", io_exc)
        return False

# ── Camera ────────────────────────────────────────────────────────────────────

def open_camera(index: int):
    cap = cv2.VideoCapture(index)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open camera index {index}")
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    return cap

# ── Main loop ─────────────────────────────────────────────────────────────────

def main():
    log.info("SUVIDHA scanner starting — camera=%d backend=%s wechat=%s",
             CAMERA_INDEX, BACKEND_URL, WECHAT_OK)

    last_scan_at    = 0.0
    consec_failures = 0

    cap = open_camera(CAMERA_INDEX)
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                consec_failures += 1
                log.warning("Frame read failed (%d/%d)", consec_failures, RECONNECT_AFTER)
                if consec_failures >= RECONNECT_AFTER:
                    log.info("Reconnecting camera…")
                    cap.release()
                    time.sleep(2)
                    try:
                        cap = open_camera(CAMERA_INDEX)
                        consec_failures = 0
                        log.info("Camera reconnected.")
                    except RuntimeError as exc:
                        log.error("Reconnect failed: %s", exc)
                        time.sleep(5)
                time.sleep(0.1)
                continue

            consec_failures = 0

            if time.monotonic() - last_scan_at < SCAN_COOLDOWN_S:
                time.sleep(0.05)
                continue

            for text in detect_qr_codes(frame):
                if not is_secure_qr_candidate(text):
                    continue
                payload = decode_secure_qr(text)
                if not payload:
                    continue
                post_to_backend(payload)
                last_scan_at = time.monotonic()
                break

    finally:
        cap.release()
        log.info("Camera released.")

if __name__ == "__main__":
    main()
