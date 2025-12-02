from flask import Flask, render_template, request, send_file, jsonify
from PyPDF2 import PdfReader, PdfWriter
import tempfile, os, json

# Optional Cloud
USE_FIREBASE = False
USE_SUPABASE = False

if USE_FIREBASE:
    from google.cloud import storage
    firebase_config = json.load(open("firebase_config.json"))
    firebase_client = storage.Client.from_service_account_info(firebase_config)
    bucket = firebase_client.bucket(firebase_config["bucket"])

if USE_SUPABASE:
    from supabase import create_client
    supa = json.load(open("supabase_config.json"))
    supabase = create_client(supa["url"], supa["key"])

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/merge", methods=["POST"])
def merge():
    files = request.files.getlist("pdfs")
    passwords = request.form.getlist("passwords[]")
    pages = request.form.getlist("pages[]")   # Example: "1,2,3" or "" for all pages
    order = request.form.getlist("order[]")   # Order from drag-sort UI

    # Reorder incoming files based on "order"
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
        temp = tempfile.mktemp(suffix=".pdf")
        pdf.save(temp)

        reader = PdfReader(temp)
        if reader.is_encrypted:
            reader.decrypt(ordered_pass[i])

        if ordered_pages[i].strip() == "":
            # merge all pages
            for page in reader.pages:
                output.add_page(page)
        else:
            selected = [int(x.strip()) - 1 for x in ordered_pages[i].split(",")]
            for pg in selected:
                if 0 <= pg < len(reader.pages):
                    output.add_page(reader.pages[pg])

        os.remove(temp)

    outpath = tempfile.mktemp(suffix=".pdf")
    with open(outpath, "wb") as f:
        output.write(f)

    # Optional cloud upload
    if USE_FIREBASE:
        blob = bucket.blob("merged.pdf")
        blob.upload_from_filename(outpath)
        return jsonify({"url": blob.public_url})

    if USE_SUPABASE:
        with open(outpath, "rb") as f:
            supabase.storage.from_("pdfs").upload("merged.pdf", f)
        url = supabase.storage.from_("pdfs").get_public_url("merged.pdf")
        return jsonify({"url": url})

    return send_file(outpath, as_attachment=True, download_name="merged.pdf")


if __name__ == "__main__":
    app.run(debug=True)
