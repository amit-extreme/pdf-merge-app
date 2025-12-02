let fileList = document.getElementById("fileList");
let fileInput = document.getElementById("fileInput");
let dropArea = document.getElementById("drop-area");

let filesArray = [];

// ---------------- DARK MODE ----------------
document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");
};

// ---------------- DRAG & DROP ----------------
dropArea.addEventListener("dragover", e => {
    e.preventDefault();
    dropArea.classList.add("dragover");
});
dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));
dropArea.addEventListener("drop", e => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
});
fileInput.onchange = () => handleFiles(fileInput.files);

function handleFiles(files) {
    [...files].forEach(file => {
        filesArray.push(file);
        addFileUI(file);
    });
}

// ---------------- FILE UI + THUMBNAIL ----------------
async function addFileUI(file) {
    let div = document.createElement("div");
    div.className = "file-item";

    let canvas = document.createElement("canvas");
    canvas.className = "thumbnail";
    renderThumbnail(file, canvas);

    div.innerHTML = `
        <div class="file-details">
            <strong>${file.name}</strong>

            <!-- password field -->
            <input type="password" class="pdf-pass" placeholder="Password (if locked)">

            <!-- page selection -->
            <input type="text" class="pdf-pages" placeholder="Pages (e.g., 1,2,5-7)">
        </div>
    `;

    div.prepend(canvas);
    fileList.appendChild(div);
}

// ---------------- PDF.js THUMBNAIL RENDERING ----------------
async function renderThumbnail(file, canvas) {
    const reader = new FileReader();
    reader.onload = async function(event) {
        const loadingTask = pdfjsLib.getDocument({ data: event.target.result });

        loadingTask.promise.then(async (pdf) => {
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.25 });

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: canvas.getContext("2d"),
                viewport: viewport
            }).promise;
        });
    };
    reader.readAsArrayBuffer(file);
}

// ---------------- SORTABLE (REORDER) ----------------
new Sortable(fileList, { animation: 150 });

// ---------------- MERGE REQUEST ----------------
document.getElementById("pdfForm").onsubmit = async function (e) {
    e.preventDefault();

    let form = new FormData();
    let items = fileList.querySelectorAll(".file-item");

    items.forEach((item, index) => {
        let pass = item.querySelector(".pdf-pass").value;
        let pages = item.querySelector(".pdf-pages").value;
        let file = filesArray[index];

        form.append("pdfs", file);
        form.append("passwords[]", pass);
        form.append("pages[]", pages);
        form.append("order[]", index);
    });

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/merge", true);
    xhr.responseType = "blob";

    let box = document.getElementById("progressBox");
    let bar = document.getElementById("progressBar");

    box.style.display = "block";

    xhr.upload.onprogress = e => {
        let pct = (e.loaded / e.total) * 100;
        bar.style.width = pct + "%";
        bar.textContent = Math.round(pct) + "%";
    };

    xhr.onload = () => {
        let blob = new Blob([xhr.response], { type: "application/pdf" });
        let a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "merged.pdf";
        a.click();

        bar.style.width = "0%";
        bar.textContent = "0%";
        box.style.display = "none";
    };

    xhr.send(form);
};
