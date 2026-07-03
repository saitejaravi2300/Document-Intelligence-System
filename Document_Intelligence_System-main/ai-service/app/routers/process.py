import os
import re
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.models.schemas import DocumentProcessResponse, ClassificationResponse, OCRResponse, SummaryResponse, EntitiesResponse
from app.services.ocr_service import get_ocr_service, OCRService
from app.services.rag_service import get_rag_service, RAGService

router = APIRouter(prefix="/api/ai", tags=["AI Processing"])

def extract_basic_entities(text: str):
    """Fast regex matching to extract emails, phones, and dates without LLMs."""
    if not text:
        return {"emails": [], "phones": [], "dates": []}
    
    # Emails
    emails = list(set(re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)))
    
    # Dates: YYYY-MM-DD, DD/MM/YYYY, etc.
    dates = list(set(re.findall(r'\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b', text)))
    
    # Phones: Match common formats, but avoid currency patterns (e.g. $150.00 or 150.00)
    phone_patterns = [
        # +1 (555) 555-5555 or 555-555-5555 or +1-555-555-5555
        r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
        # European / International styles: e.g. +44 7911 123456 or 07911 123456
        r'\+?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,6}\b',
    ]
    
    phones_raw = []
    for pattern in phone_patterns:
        phones_raw.extend(re.findall(pattern, text))
        
    phones = []
    for p in phones_raw:
        p_clean = p.strip()
        num_digits = sum(c.isdigit() for c in p_clean)
        if num_digits >= 7 and num_digits <= 15:
            # Skip if it is a simple price format (e.g. 150.00)
            if re.search(r'^\d+\.\d{2}$', p_clean):
                continue
            # Skip if it contains currency symbols
            if any(sym in p_clean for sym in ['$', '€', '£', '¥', 'Rs', 'INR']):
                continue
            phones.append(p_clean)
            
    phones = list(set(phones))
    
    return {
        "emails": emails,
        "phones": phones,
        "dates": dates
    }

from app.services.local_model_service import get_local_model_service, LocalModelService

@router.post("/process", response_model=DocumentProcessResponse)
async def process_document(
    file: UploadFile = File(...),
    document_id: str = Form(""), # Received from Express backend to track vector indexing
    ocr_service: OCRService = Depends(get_ocr_service),
    rag_service: RAGService = Depends(get_rag_service),
    local_model: LocalModelService = Depends(get_local_model_service)
):
    """
    Process document file:
    1. Perform PaddleOCR text extraction.
    2. Run local model for classification.
    3. Run fast regex pattern matching for basic entities (emails, phones, dates).
    4. Index the parsed content in ChromaDB for RAG Q&A.
    """
    try:
        # Check supported file types
        allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Only PDF, JPG, JPEG, and PNG are allowed."
            )

        # Write uploaded file to a secure temporary path
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name

        try:
            # 1. Run PaddleOCR processing
            full_text, blocks = ocr_service.process_file(temp_path, file.content_type)
            
            # 2. Run local classification model
            doc_type, confidence = local_model.predict(temp_path, blocks)
            
        finally:
            # Ensure the temporary file is deleted even if OCR fails
            if os.path.exists(temp_path):
                os.remove(temp_path)

        # 3. Extract basic entities (emails, phones, dates)
        basic_entities = extract_basic_entities(full_text)

        # 4. Index OCR text in ChromaDB if document_id is supplied
        if document_id:
            try:
                rag_service.index_document(document_id, full_text)
            except Exception as index_err:
                print(f"Failed to index document {document_id} in ChromaDB: {str(index_err)}")

        # Map to structured DocumentProcessResponse (Gemini fields default to empty)
        return DocumentProcessResponse(
            success=True,
            classification=ClassificationResponse(
                doc_type=doc_type,
                confidence=confidence
            ),
            ocr=OCRResponse(
                full_text=full_text,
                blocks=blocks
            ),
            summary=SummaryResponse(
                content="Click 'Run AI Analysis' at the bottom to generate summaries and document categorization.",
                main_purpose="AI Analysis is pending."
            ),
            entities=EntitiesResponse(
                names=[],
                dates=basic_entities["dates"],
                organizations=[],
                locations=[],
                emails=basic_entities["emails"],
                phones=basic_entities["phones"]
            )
        )
    except Exception as e:
        print(f"Exception during document processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
