"""
flask-aadhaar/app.py — Aadhaar Secure QR v2 decoder microservice.

Implements UIDAI Secure QR v2 decode directly using stdlib zlib — no pyaadhaar,
no pyzbar, no native library dependencies. Works on any Python 3.8+ environment.

Algorithm (from UIDAI spec / pyaadhaar source):
  1. Parse digit string as big integer → bytes
  2. Byte 0: email/mobile present flags
  3. Bytes 1+: zlib-decompress
  4. Split decompressed bytes by 0xFF delimiter → ordered fields

Setup:
  pip install flask gunicorn

Local:  python server/flask-aadhaar/app.py
Render: gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 30
"""

import os
import zlib
import logging
from flask import Flask, request, jsonify

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("aadhaar-decoder")

DECODER_API_SECRET = os.environ.get("DECODER_API_SECRET", "suvidha-decoder-dev-2026")

# ── Auth ──────────────────────────────────────────────────────────────────────

def check_api_key():
    return request.headers.get("X-Decoder-Secret", "") == DECODER_API_SECRET

# ── Aadhaar Secure QR v2 decode ───────────────────────────────────────────────
# Pure stdlib — no pyaadhaar, no pyzbar, no native deps.

def decode_secure_qr(digit_string: str) -> dict:
    """
    Decode UIDAI Aadhaar Secure QR v2 (long digit string).
    Returns dict with name, dob, gender, address fields.
    Raises ValueError on bad data.
    """
    n = int(digit_string)
    byte_len = (n.bit_length() + 7) // 8
    raw = n.to_bytes(byte_len, byteorder='big')

    # Byte 0: email/mobile present flags (unused in field extraction)
    _ = raw[0]

    # Bytes 1+: zlib compressed payload
    decompressed = zlib.decompress(raw[1:])

    # Fields delimited by 0xFF
    parts = decompressed.split(b'\xff')

    def field(idx: int) -> str:
        try:
            return parts[idx].decode('utf-8', errors='replace').strip()
        except IndexError:
            return ''

    # Fixed field order from UIDAI spec
    # 0: reference_id, 1: name, 2: dob, 3: gender, 4: care_of,
    # 5: district, 6: landmark, 7: house, 8: location/locality,
    # 9: pincode, 10: post_office, 11: state, 12: street,
    # 13: sub_district, 14: vtc/village, 15: aadhaar_last_4
    # 16+: optional email_hash, mobile_hash, photo bytes

    name         = field(1)
    dob          = field(2)
    gender_raw   = field(3)
    house        = field(7)
    street       = field(12)
    locality     = field(8) or field(14)  # location or VTC
    district     = field(5)
    state        = field(11)
    pincode      = field(9)
    last4        = field(15)

    # Normalize gender to Male/Female
    g = gender_raw.upper()
    gender = 'Male' if g in ('M', 'MALE') else 'Female' if g in ('F', 'FEMALE') else gender_raw

    if not name:
        raise ValueError("Decoded name is empty — likely not a valid Aadhaar Secure QR")

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

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/health")
def health():
    return jsonify({"ok": True, "decoder": "stdlib-zlib", "pyaadhaar": False})


@app.route("/decode-secure-qr", methods=["POST"])
def decode_secure_qr_route():
    if not check_api_key():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    body     = request.get_json(silent=True) or {}
    qr_text  = (body.get("qrText") or "").strip()

    if not qr_text:
        return jsonify({"success": False, "error": "qrText required"}), 400
    if not qr_text.isdigit():
        return jsonify({"success": False, "error": "qrText must be a digit string"}), 400
    if not (500 <= len(qr_text) <= 5000):
        return jsonify({"success": False, "error": f"Unexpected length {len(qr_text)}"}), 422

    try:
        data = decode_secure_qr(qr_text)
        log.info("Decoded — name=%s state=%s", data["name"], data["address"].get("state"))
        return jsonify({"success": True, "data": data})
    except Exception as exc:
        log.warning("Decode failed: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 422


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    host = "0.0.0.0" if os.environ.get("RENDER") else "127.0.0.1"
    log.info("Starting on %s:%d", host, port)
    app.run(host=host, port=port, debug=False)
