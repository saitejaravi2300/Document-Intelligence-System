# 📄 IntelliDoc AI - Document Intelligence System

An AI-powered Document Intelligence Platform that automatically extracts text from PDFs and images, classifies documents, generates AI-powered summaries, extracts important entities, and enables intelligent question answering using Retrieval-Augmented Generation (RAG).

The platform combines OCR, Natural Language Processing, Large Language Models, and Vector Search to transform unstructured documents into meaningful, searchable information.

---

# 🚀 Features

- 📤 **Secure Document Upload**
  - Upload PDF, PNG, JPG, and JPEG files
  - Secure user authentication with JWT
  - Personal document management

- 🔍 **OCR Text Extraction**
  - Extracts text using PaddleOCR
  - Supports multi-page PDF processing
  - High-accuracy text recognition

- 🧹 **Document Processing**
  - Cleans and preprocesses extracted text
  - Stores OCR results in MongoDB
  - Background document processing

- 📄 **AI Document Classification**
  - Automatically identifies document type
  - Supports Resume, Invoice, Receipt, Letter, Forms, and more
  - Confidence score for each prediction

- 📝 **AI Summarization**
  - Generates concise document summaries
  - Identifies the document purpose
  - Highlights important information

- 🏷️ **Named Entity Extraction**
  - Extracts important fields including:
    - Names
    - Dates
    - Organizations
    - Email Addresses
    - Phone Numbers
    - Invoice Numbers
    - Amounts
    - Locations

- 💬 **Document Question Answering (RAG)**
  - Ask natural language questions about uploaded documents
  - AI generates context-aware answers
  - Query history is stored for future reference

- 📊 **Interactive Dashboard**
  - View uploaded documents
  - Processing status tracking
  - Document statistics
  - Search functionality
  - Analytics charts

- 📥 **Export Results**
  - Download extracted document information
  - Export AI analysis as JSON

---

# 🛠️ Tech Stack

## 🎨 Frontend

- React.js
- Vite
- Bootstrap
- React Router DOM
- Axios
- Chart.js

---

## ⚙️ Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Multer

---

## 🤖 AI & Machine Learning

- Python
- FastAPI
- PaddleOCR
- Google Gemini API
- ChromaDB
- Sentence Transformers
- PyMuPDF
- Hugging Face Transformers
- LayoutLMv3
- PyTorch

---

## 🧰 Tools

- Git & GitHub
- VS Code
- MongoDB Atlas
- Postman
- Python Virtual Environment

---

# 🗂️ Project Structure

```bash
IntelliDoc-AI/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── app.js
│   │
│   ├── uploads/
│   └── package.json
│
├── ai-service/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   └── main.py
│   │
│   ├── training/
│   ├── chroma_db/
│   └── requirements.txt
│
├── docs/
│
└── README.md
```

---

# 🔍 Key Modules

| Module | Description |
|----------|-------------|
| 🔐 Authentication | User registration, login, JWT authentication |
| 📤 Document Upload | Upload and manage PDFs & Images |
| 🔍 OCR Engine | Extracts text using PaddleOCR |
| 📄 AI Classification | Detects document type using Gemini |
| 📝 AI Summary | Generates document summaries |
| 🏷️ Entity Extraction | Extracts names, dates, emails, organizations, invoice details |
| 💬 RAG Chat | Ask questions about uploaded documents |
| 📊 Dashboard | Analytics, search, document management |
| 💾 MongoDB | Stores users, documents and metadata |
| 🧠 ChromaDB | Stores vector embeddings for semantic search |

---

# 🧪 Getting Started

## 1. Clone Repository

```bash
git clone https://github.com/yourusername/intellidoc-ai.git

cd intellidoc-ai
```

---

## 2. Install Backend

```bash
cd server

npm install

npm run dev
```

---

## 3. Install AI Service

```bash
cd ai-service

python -m venv venv

source venv/bin/activate

pip install -r requirements.txt

python app/main.py
```

---

## 4. Install Frontend

```bash
cd client

npm install

npm run dev
```

---

## 5. Open Application

Frontend

```text
http://localhost:3000
```

Backend

```text
http://localhost:5000
```

FastAPI

```text
http://localhost:8000
```

Swagger API

```text
http://localhost:8000/docs
```

---

# 📊 AI Pipeline

```
User Upload
      │
      ▼
Express Backend
      │
      ▼
FastAPI
      │
      ▼
PaddleOCR
      │
      ▼
Text Extraction
      │
      ▼
Gemini AI
      │
 ┌────┴──────────────┐
 ▼                   ▼
Classification     Summary
 ▼                   ▼
Entity Extraction
      │
      ▼
Sentence Embeddings
      │
      ▼
ChromaDB
      │
      ▼
Document Q&A (RAG)
```

---

# 📈 Results

- High-accuracy OCR extraction
- AI-powered document classification
- Automatic document summarization
- Intelligent entity extraction
- Semantic document search
- Natural language document Q&A
- Real-time dashboard analytics
- Secure document management

---

# 🏁 Future Improvements

- Handwritten document recognition
- Multi-language OCR
- Batch document processing
- Cloud storage integration
- Role-based access control
- Docker deployment
- Kubernetes deployment
- Mobile application support
- AI-powered document comparison

---

# 📚 Learning Outcomes

- Full Stack Web Development
- REST API Development
- Authentication & Authorization
- OCR Pipeline Development
- Large Language Model Integration
- Retrieval-Augmented Generation (RAG)
- Vector Databases
- Document Intelligence
- Machine Learning
- Natural Language Processing
- AI Application Development
- Model Training using LayoutLMv3

---

# 🎓 Project Highlights

This project demonstrates practical implementation of:

- Artificial Intelligence
- Machine Learning
- Natural Language Processing (NLP)
- Optical Character Recognition (OCR)
- Retrieval-Augmented Generation (RAG)
- Full Stack Web Development
- Document Understanding Systems
- Vector Databases
- Cloud-Ready Architecture

---

## 🧑‍💻 Author

Ravi Sai Teja 
B.Tech Computer Science  
Document Intelligence System Project
