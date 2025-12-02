import os
import tempfile
import json
from flask import Flask, render_template, request, send_file, jsonify
from PyPDF2 import PdfReader, PdfWriter

# Optional cloud support
USE_FIREBASE = False
USE_SUPABASE = False

# Initialize Firebase if enabled
if USE_FIREBASE:
    from google.cloud import storage
    firebase_config = json.load(open("firebase_config.json"))
    firebase_client = storage.Client.from_service_account_info(firebase_config)
    bucket = firebase_client.bucket(firebase_config["bucket"])

# Initialize Supabase if enabled
if USE_SUPABASE:
    from supabase import create_client
    supa = json.load(open("supabase_config.json"))
    supabase = create_client(supa["url"], supa["key"])

# Initialize Flask
app = Flask(__name__)

# ------------------------
# ROUTES
# ------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/merge", methods=["POST"])
def merge():
    files = request.files.getlist("pdfs")
    passwords = request.form.getlist("passwords[]")
    pages = request.form.getlist("pages[]")
    order = request.form.getlist("order[]")

    # Reorder files according to user order
    ordered_files = [None] * len(files)
    ordered_pass = [None] * len(files)
    ordered_pages = [None] * len(files)
    for i, pos in enumerate(order):
        pos = int(pos)
        ordered_files[pos] = files[i]
        ordered_pass[pos] = passwords[i]
        ordered_pages[pos] = pages[i]

    output = PdfWriter()

    for i, pdf in enumerate(ordered_files):
        # Save uploaded file temporarily
        temp = tempfile.mktemp(suffix=".pdf")
        pdf.save(temp)

        reader = PdfReader(temp)

        # Decrypt if password provided
        if reader.is_encrypted and ordered_pass[i]:
            try:
                reader.decrypt(ordered_pass[i])
            except:
                os.remove(temp)
                return jsonify({"error": f"Failed to decrypt {pdf.filename}"}), 400

        # Add selected pages
        if ordered_pages[i].strip() == "":
            for page in reader.pages:
                output.add_page(page)
        else:
            selected = []
            for part in ordered_pages[i].split(","):
                if "-" in part:
                    start, end = part.split("-")
                    selected.extend(range(int(start)-1, int(end)))
                else:
                    selected.append(int(part)-1)
            for pg in selected:
                if 0 <= pg < len(reader.pages):
                    output.add_page(reader.pages[pg])

        os.remove(temp)

    # Save merged PDF temporarily
    outpath = tempfile.mktemp(suffix=".pdf")
    with open(outpath, "wb") as f:
        output.write(f)

    # Upload to Firebase if enabled
    if USE_FIREBASE:
        blob = bucket.blob("merged.pdf")
        blob.upload_from_filename(outpath)
        return jsonify({"url": blob.public_url})

    # Upload to Supabase if enabled
    if USE_SUPABASE:
        with open(outpath, "rb") as f:
            supabase.storage.from_("pdfs").upload("merged.pdf", f)
        url = supabase.storage.from_("pdfs").get_public_url("merged.pdf")
        return jsonify({"url": url})

    # Default: send merged PDF directly
    return send_file(outpath, as_attachment=True, download_name="merged.pdf")


# ------------------------
# RUN APP
# ------------------------
if __name__ == "__main__":
    # Use Render's PORT environment variable
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
