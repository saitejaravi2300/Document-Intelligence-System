import os
import json
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List, Optional
from app.core.config import settings

# Structured schema (same as before to keep backend/frontend compatibility)
class GeminiAnalysisResult(BaseModel):
    doc_type: str = Field(description="Must be exactly one of: Resume, Letter, Receipt, Invoice, Certificate, News Article, Form, Report, Unknown")
    classification_confidence: float = Field(description="Confidence of classification from 0.0 to 1.0")
    
    # Summary
    summary_content: str = Field(description="Concise, 2-3 sentence overview of the document")
    main_purpose: str = Field(description="Main objective or purpose of the document")
    summary_people: Optional[List[str]] = Field(default_factory=list, description="Important people referenced in the summary")
    summary_organizations: Optional[List[str]] = Field(default_factory=list, description="Important companies or organizations referenced in the summary")
    summary_dates: Optional[List[str]] = Field(default_factory=list, description="Important dates referenced in the summary")
    
    # Entities
    names: Optional[List[str]] = Field(default_factory=list, description="All individual human names extracted from the text")
    dates: Optional[List[str]] = Field(default_factory=list, description="All dates extracted from the text")
    organizations: Optional[List[str]] = Field(default_factory=list, description="All company/organization names extracted from the text")
    locations: Optional[List[str]] = Field(default_factory=list, description="All geographic locations/addresses extracted from the text")
    emails: Optional[List[str]] = Field(default_factory=list, description="All email addresses extracted")
    phones: Optional[List[str]] = Field(default_factory=list, description="All phone numbers extracted")
    
    # Letters
    sender: Optional[str] = Field(default="", description="For Letters: Sender name. Otherwise leave empty.")
    receiver: Optional[str] = Field(default="", description="For Letters: Recipient name. Otherwise leave empty.")
    subject: Optional[str] = Field(default="", description="For Letters: Subject line. Otherwise leave empty.")
    
    # Receipts/Invoices
    store_name: Optional[str] = Field(default="", description="For Receipts/Invoices: Business/Merchant name. Otherwise leave empty.")
    amount: Optional[float] = Field(default=None, description="For Receipts/Invoices: Total amount transaction value. Otherwise leave empty.")
    tax: Optional[float] = Field(default=None, description="For Receipts/Invoices: Tax charge value. Otherwise leave empty.")
    
    # Resumes
    candidate_name: Optional[str] = Field(default="", description="For Resumes: Candidate name. Otherwise leave empty.")
    skills: Optional[List[str]] = Field(default_factory=list, description="For Resumes: Skills listed. Otherwise leave empty.")
    education: Optional[List[str]] = Field(default_factory=list, description="For Resumes: Universities/Degrees listed. Otherwise leave empty.")

class LLMService:
    def __init__(self):
        # Fallback to GEMINI_API_KEY if LLM_API_KEY is not set (for user convenience)
        self.api_key = settings.LLM_API_KEY or settings.GEMINI_API_KEY
        self.base_url = settings.LLM_BASE_URL
        self.model = settings.LLM_MODEL
        
        # If API key looks like a Groq key (starts with gsk_) but provider/URL is not updated
        if self.api_key and self.api_key.startswith("gsk_") and "groq" not in self.base_url:
            self.base_url = "https://api.groq.com/openai/v1"
            
        print(f"Initializing LLM Service with model: {self.model} at {self.base_url}")
        
        self.client = None
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

    def generate_text(self, prompt: str) -> str:
        """Simple text generation (used for Q&A / RAG)."""
        if not self.client:
            # Re-initialize in case key was updated in env file without restart
            self.api_key = settings.LLM_API_KEY or settings.GEMINI_API_KEY
            if self.api_key and self.api_key.startswith("gsk_"):
                self.base_url = "https://api.groq.com/openai/v1"
            if self.api_key:
                self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
            else:
                return "Error: LLM API Key is missing. Please configure your API key."

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        return response.choices[0].message.content

    def analyze_document_text(
        self, 
        document_text: str, 
        existing_doc_type: Optional[str] = None, 
        existing_confidence: Optional[float] = None
    ) -> GeminiAnalysisResult:
        """
        Calls the LLM API using JSON Mode to classify, summarize,
        and extract entities from document OCR text.
        """
        if not self.client:
            self.api_key = settings.LLM_API_KEY or settings.GEMINI_API_KEY
            if self.api_key and self.api_key.startswith("gsk_"):
                self.base_url = "https://api.groq.com/openai/v1"
            if self.api_key:
                self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

        if not self.api_key:
            raise ValueError("LLM API Key is missing. Set LLM_API_KEY or GEMINI_API_KEY in environment variables.")

        if not document_text.strip():
            return GeminiAnalysisResult(
                doc_type="Unknown",
                classification_confidence=0.0,
                summary_content="The document appears to be empty or contains no readable text.",
                main_purpose="Unknown",
                # ... omitting rest of defaults for brevity as pydantic handles them if we had a full init, but let's just supply all fields since it's the current code structure
                summary_people=[], summary_organizations=[], summary_dates=[],
                names=[], dates=[], organizations=[], locations=[], emails=[], phones=[],
                sender="", receiver="", subject="",
                store_name="", amount=None, tax=None,
                candidate_name="", skills=[], education=[]
            )

        # Build schema guidelines to help JSON Mode structure
        schema_guidelines = {
            "doc_type": "Must be exactly one of: Resume, Letter, Receipt, Invoice, Certificate, News Article, Form, Report, Unknown",
            "classification_confidence": "float (0.0 to 1.0)",
            "summary_content": "string (concise 2-3 sentences)",
            "main_purpose": "string",
            "summary_people": "list of strings",
            "summary_organizations": "list of strings",
            "summary_dates": "list of strings",
            "names": "list of strings",
            "dates": "list of strings",
            "organizations": "list of strings",
            "locations": "list of strings",
            "emails": "list of strings",
            "phones": "list of strings",
            "sender": "string (for letters)",
            "receiver": "string (for letters)",
            "subject": "string (for letters)",
            "store_name": "string (for receipts/invoices)",
            "amount": "float or null (for receipts/invoices)",
            "tax": "float or null (for receipts/invoices)",
            "candidate_name": "string (for resumes)",
            "skills": "list of strings (for resumes)",
            "education": "list of strings (for resumes)"
        }

        # Determine if we should use the local model's classification or fallback to LLM
        use_local_classification = False
        if existing_doc_type and existing_confidence is not None:
            if existing_confidence >= 0.65 and existing_doc_type != "Unknown":
                use_local_classification = True

        prompt_prefix = "You are an advanced Document Intelligence AI."
        if use_local_classification:
            prompt_prefix += f"\nCRITICAL INSTRUCTION: This document has already been securely classified as '{existing_doc_type}' with {existing_confidence:.2f} confidence by a local model. You MUST return '{existing_doc_type}' for doc_type and {existing_confidence:.2f} for classification_confidence. Focus ONLY on extracting the summaries and entities appropriate for a {existing_doc_type}."
        else:
            prompt_prefix += "\nAnalyze the following extracted document text and extract the requested fields. Categorize the document type based on its content."

        prompt = f"""
        {prompt_prefix}
        You MUST return your output as a single JSON object. Do not include any markdown styling like ```json.
        The JSON keys and value types must match the schema guidelines:
        {json.dumps(schema_guidelines, indent=2)}

        Document Text:
        ---
        {document_text}
        ---
        """

        try:
            # We use standard JSON mode which is universally supported by OpenAI, Groq, DeepSeek, etc.
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content.strip()
            result_json = json.loads(result_text)
            return GeminiAnalysisResult(**result_json)
        except Exception as e:
            print(f"Error calling LLM Service: {str(e)}")
            # Fallback mock in case of failure
            return GeminiAnalysisResult(
                doc_type="Unknown",
                classification_confidence=0.0,
                summary_content="Failed to analyze document text with the LLM API.",
                main_purpose="Unknown",
                summary_people=[],
                summary_organizations=[],
                summary_dates=[],
                names=[],
                dates=[],
                organizations=[],
                locations=[],
                emails=[],
                phones=[],
                sender="",
                receiver="",
                subject="",
                store_name="",
                amount=None,
                tax=None,
                candidate_name="",
                skills=[],
                education=[]
            )

# Maintain backward compatibility with imports in other files
GeminiService = LLMService
gemini_service = None

def get_gemini_service() -> LLMService:
    global gemini_service
    if gemini_service is None:
        gemini_service = LLMService()
    return gemini_service
