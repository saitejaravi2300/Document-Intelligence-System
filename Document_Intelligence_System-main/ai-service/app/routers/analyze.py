from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, ClassificationResponse, SummaryResponse, EntitiesResponse
from app.services.gemini_service import get_gemini_service, GeminiService

router = APIRouter(prefix="/api/ai", tags=["AI Analysis"])

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(
    request: AnalyzeRequest,
    gemini_service: GeminiService = Depends(get_gemini_service)
):
    """
    On-Demand Gemini Document Analysis:
    1. Classifies the document type from raw text.
    2. Generates a summary and identifies key details.
    3. Extracts entities (names, dates, organizations, locations, store/candidate details).
    """
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Document text cannot be empty.")

        # Call Gemini service with local model's classification data if available
        result = gemini_service.analyze_document_text(
            request.text, 
            existing_doc_type=request.existing_doc_type, 
            existing_confidence=request.existing_confidence
        )

        return AnalyzeResponse(
            success=True,
            classification=ClassificationResponse(
                doc_type=result.doc_type,
                confidence=result.classification_confidence
            ),
            summary=SummaryResponse(
                content=result.summary_content or "",
                main_purpose=result.main_purpose or "",
                important_people=result.summary_people or [],
                organizations=result.summary_organizations or [],
                dates=result.summary_dates or []
            ),
            entities=EntitiesResponse(
                names=result.names or [],
                dates=result.dates or [],
                organizations=result.organizations or [],
                locations=result.locations or [],
                emails=result.emails or [],
                phones=result.phones or [],
                
                # Letter Specific
                sender=result.sender or "",
                receiver=result.receiver or "",
                subject=result.subject or "",
                
                # Invoice/Receipt Specific
                store_name=result.store_name or "",
                amount=result.amount,
                tax=result.tax,
                
                # Resume Specific
                candidate_name=result.candidate_name or "",
                skills=result.skills or [],
                education=result.education or []
            )
        )
    except Exception as e:
        print(f"Exception during document analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
