from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import QueryRequest, QueryResponse
from app.services.rag_service import get_rag_service, RAGService

router = APIRouter(prefix="/api/ai", tags=["RAG Query"])

@router.post("/query", response_model=QueryResponse)
async def query_document(
    request: QueryRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    RAG Document Question Answering:
    1. Retrieve similar chunks for document_id from ChromaDB.
    2. Answer the question using Gemini context completion.
    """
    try:
        if not request.document_id or not request.question:
            raise HTTPException(status_code=400, detail="document_id and question are required.")
            
        answer = rag_service.query_document(request.document_id, request.question)
        return QueryResponse(answer=answer)
    except Exception as e:
        print(f"Exception during document querying: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
