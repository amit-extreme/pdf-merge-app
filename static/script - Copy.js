let fileList = document.getElementById("fileList");
let fileInput = document.getElementById("fileInput");
let dropArea = document.getElementById("drop-area");

let filesArray = [];

// -------------- DARK MODE --------------
document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");
};

// -------------- DRAG & DROP --------------
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

// -------------- FILE HANDLER --------------
function handleFiles(files) {
    Array.from(files).forEach(pdf => {
        filesArray.push(pdf);
        addFileUI(pdf);
    });
}

async function addFileUI(file) {
    let div = document.createElement("div");
    div.className = "file-item";

    // Thumbnail Canvas
    let canvas = document.createElement("canvas");
    canvas.className = "thumbnail";
    renderThumbnail(file, canvas);

    div.innerHTML = `
        <div class="file-details">
            <strong>${file.name}</strong>
            <input type="password" placeholder="Password (if protected)" class="pdf-pass">
            <input type="text" placeholder="Pages (e.g. 1,3-5)" class="pdf-pages">
        </div>
    `;

    div.prepend(canvas);
    fileList.appendChild(div);
}

// -------------- PDF THUMBNAIL (pdf.js) --------------
async function renderThumbnail(file, canvas) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        let pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise;
        let page = await pdf.getPage(1);

        let viewport = page.getViewport({ scale: 0.2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        page.render({
            canvasContext: canvas.getContext("2d"),
            viewport: viewport
        });
    };
    reader.readAsArrayBuffer(file);
}

// -------------- SORTABLE (REORDER) --------------
new Sortable(fileList, {
    animation: 150
});

// -------------- MERGE REQUEST --------------
document.getElementById("pdfForm").onsubmit = async function (e) {
    e.preventDefault();

    let formData = new FormData();

    let items = fileList.querySelectorAll(".file-item");
    items.forEach((item, index) => {
        let file = filesArray[index];
        let pass = item.querySelector(".pdf-pass").value;
        let pages = item.querySelector(".pdf-pages").value;

        formData.append("pdfs", file);
        formData.append("passwords[]", pass);
        formData.append("pages[]", pages);
        formData.append("order[]", index);
    });

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/merge");
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
        bar.textContent = "0%";
        bar.style.width = "0%";
        box.style.display = "none";
    };

    xhr.send(formData);
};
