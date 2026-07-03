import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from app.services.gemini_service import get_gemini_service
from app.core.config import settings

class RAGService:
    def __init__(self):
        # 1. Initialize BGE-small embeddings model
        print("Initializing BGE-small Embeddings Engine...")
        self.embedding_model = SentenceTransformer('BAAI/bge-small-en-v1.5')
        print("Embeddings Engine loaded.")

        # 2. Initialize Persistent ChromaDB client
        print(f"Initializing ChromaDB vector store at: {settings.CHROMA_DB_PATH}")
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        
        # Get or create collection
        self.collection = self.chroma_client.get_or_create_collection(
            name="intellidoc_documents"
        )
        print("ChromaDB Collection initialized.")

    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 100) -> list:
        """Splits full text into overlapping blocks for indexing."""
        if not text:
            return []
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += chunk_size - overlap
            
        return chunks

    def index_document(self, doc_id: str, full_text: str):
        """Chunks OCR text, computes BGE embeddings, and indexes in ChromaDB."""
        chunks = self.chunk_text(full_text)
        if not chunks:
            print(f"Skipping indexing for Document {doc_id}: Empty text.")
            return

        print(f"Indexing Document {doc_id} into ChromaDB. Created {len(chunks)} chunks.")

        # Compute embeddings
        # For BGE, we can prefix a query/document description or just encode directly.
        # Direct encode is standard.
        embeddings = self.embedding_model.encode(chunks).tolist()

        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"document_id": doc_id} for _ in range(len(chunks))]
        
        # Add to collection (overwrite/upsert if already indexed)
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas
        )
        print(f"Document {doc_id} successfully indexed in ChromaDB.")

    def query_document(self, doc_id: str, question: str) -> str:
        """Retrieves contexts from ChromaDB and answers using Gemini."""
        print(f"Running RAG Query on Document {doc_id}: '{question}'")

        # Encode query
        query_embedding = self.embedding_model.encode([question]).tolist()

        # Query ChromaDB (filter by document_id metadata)
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=3,
            where={"document_id": doc_id}
        )

        retrieved_chunks = results.get("documents", [[]])[0]
        if not retrieved_chunks:
            return "No relevant text context could be retrieved from this document to answer the question."

        # Compile context
        context = "\n---\n".join(retrieved_chunks)

        # Prompt Gemini to answer
        prompt = f"""
        You are a Document Q&A assistant.
        Answer the question using ONLY the provided document context below.
        If the answer cannot be found in the context, say "I cannot find the answer in the document." Do not make up answers.

        Document Context:
        ---
        {context}
        ---

        Question: {question}
        Answer:
        """

        # Call LLM Service
        try:
            llm = get_gemini_service()
            answer = llm.generate_text(prompt)
            return answer.strip()
        except Exception as e:
            return f"Error generating answer from LLM: {str(e)}"

# Initialize singleton RAG service
rag_service = None

def get_rag_service() -> RAGService:
    global rag_service
    if rag_service is None:
        rag_service = RAGService()
    return rag_service
