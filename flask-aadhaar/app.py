"""
Flask service — decodes Aadhaar v2 Secure QR (protobuf, digit-prefixed).

jsQR (browser, AadhaarCameraScanner.jsx) already extracts the raw QR text
from the camera frame — that part stays client-side, no image ever leaves
the kiosk. This service only does the *decode* step v2 needs: unzip +
protobuf-parse the base10-encoded string into name/dob/gender/address.
v1 (XML, starts with '<') and the 'DEMO:' test format stay handled entirely
in AadhaarCameraScanner.jsx — only v2 (starts with a digit) routes here.

pyaadhaar deps (pyzbar, pylibjpeg, numpy-adjacent) installed cleanly on
this machine — confirmed via direct test, unlike nemo_toolkit's onnx
MAX_PATH failure earlier. Different dependency tree, no shared blocker.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyaadhaar.decode import AadhaarSecureQr
from pyaadhaar.utils import isSecureQr

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])


@app.route("/decode-secure-qr", methods=["POST"])
def decode_secure_qr():
    data = request.get_json(silent=True) or {}
    qr_text = data.get("qrText", "")

    if not qr_text:
        return jsonify({"success": False, "error": "qrText is required"}), 400

    if not isSecureQr(qr_text):
        return jsonify({"success": False, "error": "Not a valid v2 Secure QR string"}), 400

    try:
        secure_qr = AadhaarSecureQr(int(qr_text))
        decoded = secure_qr.decodeddata()
        return jsonify({
            "success": True,
            "data": {
                "name": decoded.get("name"),
                "dob": decoded.get("dob"),
                "gender": decoded.get("gender"),
                "address": {
                    "careof": decoded.get("careof"),
                    "house": decoded.get("house"),
                    "street": decoded.get("street"),
                    "landmark": decoded.get("landmark"),
                    "location": decoded.get("location"),
                    "vtc": decoded.get("vtc"),
                    "postoffice": decoded.get("postoffice"),
                    "subdistrict": decoded.get("subdistrict"),
                    "district": decoded.get("district"),
                    "state": decoded.get("state"),
                    "pincode": decoded.get("pincode"),
                },
            },
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Decode failed: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "aadhaar-secure-qr-decoder"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, threaded=True)
