# 🧠 Legal AI Assistant & Summarizer 🏛️

This repository contains two powerful AI-based tools designed for legal assistance and judgment summarization:

1. **Legal Chatbot** – A retrieval-based assistant that answers legal questions using Indian law sources.
2. **Legal Summarizer** – A fine-tuned BART model that compresses lengthy legal judgments into concise summaries.

---

## 📂 Project Structure

```

LegalCompanion/
│
├── Legal\_Chatbot/
│   ├── legal\_chatbot\_final.ipynb   # Main chatbot notebook
│   ├── chatbot\_utils.py            # Helper functions for chatbot
│   └── vector\_store/               # FAISS index and ingested docs
│
├── Legal\_Summarizer/
│   ├── bartseq2seq.ipynb           # BART fine-tuning notebook
│   ├── Legal\_summarizer\_final.ipynb # Final summarization pipeline
│   └── summarizer\_utils.py         # Supporting utilities
│
├── requirements.txt                # Dependencies
├── LICENSE                         # MIT License
└── README.md                       # Project documentation

````

---

## 🚀 Features

### ✅ Legal Chatbot
- 🔍 **Retrieval-Augmented Generation (RAG)** using FAISS
- 📚 Ingests documents from Indian law: Constitution, IPC, CrPC, etc.
- 🤖 Answers domain-specific legal questions
- 📄 Document-aware legal Q&A (PDF ingestion supported)

### ✅ Legal Summarizer
- 🔄 Fine-tuned **BART** model for legal judgment summarization
- ✂️ Combines extractive and abstractive techniques
- 🧠 Trained on [d0r1h/ILC](https://huggingface.co/datasets/d0r1h/ILC)

---

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/Anshul-ydv/Legal-ai.git
cd LegalCompanion
````

2. Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 🧪 Usage

### 📘 Run the Legal Chatbot

1. Navigate to the `Legal_Chatbot/` folder.
2. Open and run:

```bash
legal_chatbot_final.ipynb
```

3. Follow the steps to load your corpus, generate embeddings, and interact with the assistant.

### 📄 Run the Legal Summarizer

1. Go to `Legal_Summarizer/`.
2. Open and run:

```bash
Legal_summarizer_final.ipynb
```

3. Provide legal text input and get summarized outputs using the fine-tuned model.

---

## 📊 Dataset Info

* 📦 **Summarizer Dataset**: [d0r1h/ILC](https://huggingface.co/datasets/d0r1h/ILC)
* 📚 **Chatbot Corpus**: QA pairs and legal documents from Indian legal sources (manually or automatically curated)

---

## ⚙️ Tech Stack

* Python · PyTorch · HuggingFace Transformers
* FAISS · Google Colab · NLTK · Sklearn
* Optional UI: Streamlit or Gradio

---

## 💡 Future Improvements

* 🌐 Add multilingual query support (Hindi, Bengali, etc.)
* 🌍 Deploy as a web app using FastAPI + Streamlit
* 📎 Add support for OCR and audio-based legal queries
* 📊 Visual analytics dashboard for legal search trends

---

## 🙌 Acknowledgements

* Indian Legal Corpus – [d0r1h/ILC](https://huggingface.co/datasets/d0r1h/ILC)
* HuggingFace Ecosystem (Transformers, Datasets)
* FAISS by Meta AI
* OpenAI APIs for comparison and benchmarking

---

## 📃 License

This project is open-sourced under the [MIT License](LICENSE).

---

## ✨ Fun Fact

> “This AI has read more Indian laws than most lawyers.” ⚖️

---

## 👥 Authors

- **Saransh Bhargava**
- **Shruti Bajpayee**
- **Anshul Yadav**
