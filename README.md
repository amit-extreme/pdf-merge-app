# 🗂️ Advanced PDF Merger Web App

A powerful and easy-to-use web application that allows users to **merge multiple PDF files into a single document**.  
Supports drag-and-drop uploading, file reordering, page selection, password-protected PDFs, thumbnail previews, and more.

This project is built with **Flask**, **PDF.js**, and **PyPDF2**.

---

## 🚀 Features

### ✅ Core Features
- Merge multiple PDF files into one  
- Upload PDFs via **drag & drop** or file picker  
- **Reorder files** using drag-and-drop sorting  
- **Select specific pages** to merge (e.g., `1,3,5-7`)  
- **Password-protected PDF support**  
- **PDF thumbnail previews** (first-page preview using PDF.js)  
- Merge progress bar  
- Dark / Light mode toggle  
- Fully responsive UI  
- Fast and secure processing (PDFs never leave your server unless cloud storage is enabled)

### 🌐 Optional Cloud Integrations
- **Firebase Storage** upload support  
- **Supabase Storage** upload support  
(Returns a public download link)

---

## 🛠️ Tech Stack

| Layer        | Technology |
|-------------|------------|
| Backend     | Flask (Python) |
| PDF Engine  | PyPDF2 |
| Thumbnail Preview | PDF.js |
| Frontend    | HTML, CSS, JavaScript |
| Drag-Reorder | SortableJS |
| Optional Cloud Storage | Firebase / Supabase |

---

## 📦 Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/pdf-merge-app.git
cd pdf-merge-app
