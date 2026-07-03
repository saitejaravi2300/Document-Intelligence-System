from pydantic import BaseModel, Field
from typing import List, Optional

class OCRBlock(BaseModel):
    text: str
    confidence: float
    bbox: List[float]  # [x_min, y_min, x_max, y_max]

class OCRResponse(BaseModel):
    full_text: str
    blocks: List[OCRBlock]

class ClassificationResponse(BaseModel):
    doc_type: str = Field(..., description="Document category")
    confidence: float = Field(0.0, description="Confidence score")

class SummaryResponse(BaseModel):
    content: str
    main_purpose: str
    important_people: Optional[List[str]] = []
    organizations: Optional[List[str]] = []
    dates: Optional[List[str]] = []

class EntitiesResponse(BaseModel):
    # General entities
    names: Optional[List[str]] = []
    dates: Optional[List[str]] = []
    organizations: Optional[List[str]] = []
    locations: Optional[List[str]] = []
    emails: Optional[List[str]] = []
    phones: Optional[List[str]] = []

    # Letter-specific
    sender: Optional[str] = ""
    receiver: Optional[str] = ""
    subject: Optional[str] = ""

    # Receipt/Invoice-specific
    store_name: Optional[str] = ""
    amount: Optional[float] = None
    tax: Optional[float] = None

    # Resume-specific
    candidate_name: Optional[str] = ""
    skills: Optional[List[str]] = []
    education: Optional[List[str]] = []

class DocumentProcessResponse(BaseModel):
    success: bool
    classification: ClassificationResponse
    ocr: OCRResponse
    summary: SummaryResponse
    entities: EntitiesResponse

# RAG Query Schemas
class QueryRequest(BaseModel):
    document_id: str
    question: str

class QueryResponse(BaseModel):
    answer: str

# On-Demand AI Analyze schemas
class AnalyzeRequest(BaseModel):
    text: str
    existing_doc_type: Optional[str] = None
    existing_confidence: Optional[float] = None

class AnalyzeResponse(BaseModel):
    success: bool
    classification: ClassificationResponse
    summary: SummaryResponse
    entities: EntitiesResponse
