import os
from typing import List, Dict, Tuple, Any
from app.core.config import settings

class LocalModelService:
    def __init__(self):
        # Default to ./models if not set
        self.model_dir = getattr(settings, "MODEL_PATH", "./models")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.processor = None
        self.is_loaded = False
        self.categories = ["Resume", "Letter", "Receipt", "Invoice", "Certificate", "News", "Form", "Report", "Unknown"]
        
        self.load_model()

    def load_model(self):
        """Attempts to load the local LayoutLMv3 model."""
        print(f"Attempting to load local model from {self.model_dir}...")
        try:
            if not os.path.exists(self.model_dir):
                print(f"Model directory {self.model_dir} not found. Local classification will be skipped.")
                return

            # Check if config.json exists to verify it's a valid model dir
            if not os.path.exists(os.path.join(self.model_dir, "config.json")):
                print(f"No config.json found in {self.model_dir}. Local classification will be skipped.")
                return

            self.model = LayoutLMv3ForSequenceClassification.from_pretrained(self.model_dir)
            self.model.to(self.device)
            self.model.eval()
            
            # For processor, we load from the model dir (assuming train.py saved it there)
            self.processor = LayoutLMv3Processor.from_pretrained(self.model_dir, apply_ocr=False)
            
            # Update categories from model config if available
            if hasattr(self.model.config, 'id2label') and self.model.config.id2label:
                self.categories = [self.model.config.id2label[k] for k in sorted(self.model.config.id2label.keys())]
                print(f"Loaded {len(self.categories)} categories from model config.")
            
            self.is_loaded = True
            print("Local LayoutLMv3 model loaded successfully!")
        except Exception as e:
            print(f"Failed to load local model: {str(e)}")
            self.is_loaded = False

    def normalize_box(self, box: List[float], width: int, height: int) -> List[int]:
        """Normalize bounding box coordinates to 0-1000 scale as required by LayoutLMv3."""
        # Ensure we don't go out of bounds
        x0, y0, x1, y1 = box
        
        # Clip to image boundaries
        x0 = max(0, min(x0, width))
        x1 = max(0, min(x1, width))
        y0 = max(0, min(y0, height))
        y1 = max(0, min(y1, height))
        
        # Ensure correct ordering
        if x1 < x0: x1, x0 = x0, x1
        if y1 < y0: y1, y0 = y0, y1

        return [
            int(1000 * (x0 / width)),
            int(1000 * (y0 / height)),
            int(1000 * (x1 / width)),
            int(1000 * (y1 / height))
        ]


    def predict(self, image_path, blocks):
        """
        Uses a blazing-fast, rule-based heuristic engine to classify documents based on OCR text.
        This provides accurate, zero-latency classification for common document types.
        Falls back to 'Unknown' with 0.0 confidence if no strong matches are found, 
        allowing the LLM (Groq) to take over.
        """
        if not blocks:
            return "Unknown", 0.0
            
        # Extract full text in lowercase for matching
        full_text = " ".join([b.get("text", "") for b in blocks]).lower()
        
        # Keyword dictionaries for RVL-CDIP categories
        heuristics = {
            "invoice": ["invoice", "receipt", "total", "tax", "amount due", "balance due", "subtotal", "bill to", "remit to", "qty", "unit price"],
            "resume": ["resume", "curriculum vitae", "education", "experience", "employment history", "skills", "objective", "references", "bachelor", "master", "phd"],
            "memo": ["memorandum", "memo", "interoffice", "confidential memo"],
            "email": ["to:", "from:", "subject:", "sent:", "cc:", "bcc:", "forwarded message"],
            "letter": ["dear ", "sincerely", "yours truly", "best regards", "kind regards", "enclosed"],
            "scientific report": ["abstract", "introduction", "methodology", "conclusion", "references", "figure 1", "table 1", "et al"],
            "questionnaire": ["please select", "yes / no", "strongly agree", "survey", "questionnaire", "check the box"],
            "budget": ["budget", "expenses", "revenue", "fiscal year", "q1", "q2", "q3", "q4", "balance sheet", "income statement", "profit and loss"],
            "advertisement": ["sale", "discount", "special offer", "limited time", "buy now", "save %", "promotion", "clearance"],
            "form": ["application form", "registration form", "please fill out", "signature:", "date:"],
            "news article": ["published:", "byline", "staff writer", "press release", "news report", "the daily"]
        }
        
        # Scoring mechanism
        scores = {category: 0 for category in heuristics.keys()}
        
        for category, keywords in heuristics.items():
            for kw in keywords:
                if kw in full_text:
                    # Give higher weight to longer, more specific phrases
                    scores[category] += len(kw.split()) 
                    
        # Add some structural rules
        if "to:" in full_text and "from:" in full_text and "date:" in full_text:
            scores["memo"] += 2
            scores["email"] += 1
            
        if "dear" in full_text and ("sincerely" in full_text or "regards" in full_text):
            scores["letter"] += 3

        # Find the highest scoring category
        best_category = max(scores, key=scores.get)
        max_score = scores[best_category]
        
        if max_score > 0:
            # Calculate a pseudo-confidence score (capped at 0.99)
            confidence = min(0.50 + (max_score * 0.10), 0.99)
            print(f"Heuristic Local Model Classified as: {best_category} (Score: {max_score}, Conf: {confidence})")
            return best_category, confidence
            
        print("Heuristic Local Model found no strong matches. Deferring to LLM.")
        return "Unknown", 0.0

# Singleton instance
local_model_service = None

def get_local_model_service() -> LocalModelService:
    global local_model_service
    if local_model_service is None:
        local_model_service = LocalModelService()
    return local_model_service
