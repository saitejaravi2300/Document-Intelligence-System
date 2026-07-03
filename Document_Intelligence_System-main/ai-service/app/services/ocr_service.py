import os
import sys
import json
import subprocess
from typing import Dict, List, Tuple, Any

class OCRService:
    def __init__(self):
        # We now use a subprocess to run PaddleOCR to prevent Pybind11 / DLL conflicts with PyTorch
        self.script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "run_paddle_ocr.py")
        print("Initialized OCR Service (Subprocess mode)")

    def process_file(self, file_path: str, mime_type: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Processes image or PDF file and returns full text and blocks with bounding boxes.
        Runs in a separate process to protect the main FastAPI thread.
        """
        python_executable = sys.executable
        
        try:
            # Run the paddle OCR subprocess
            result = subprocess.run(
                [python_executable, self.script_path, file_path, mime_type],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode != 0:
                print(f"OCR Subprocess failed: {result.stderr}")
                return "", []
                
            output = result.stdout.strip()
            
            # Since paddle logs a lot of garbage to stdout, find the JSON block
            # The JSON block should be the last line printed
            json_line = None
            for line in reversed(output.splitlines()):
                if line.startswith("{") and line.endswith("}"):
                    json_line = line
                    break
                    
            if not json_line:
                print(f"Could not find JSON output in OCR subprocess. Output: {output}")
                return "", []
                
            parsed = json.loads(json_line)
            if "error" in parsed:
                print(f"OCR Subprocess reported error: {parsed['error']}")
                return "", []
                
            return parsed.get("full_text", ""), parsed.get("blocks", [])
            
        except Exception as e:
            print(f"Failed to run OCR subprocess: {str(e)}")
            return "", []

# Initialize a singleton service instance
ocr_service = None

def get_ocr_service() -> OCRService:
    global ocr_service
    if ocr_service is None:
        ocr_service = OCRService()
    return ocr_service
