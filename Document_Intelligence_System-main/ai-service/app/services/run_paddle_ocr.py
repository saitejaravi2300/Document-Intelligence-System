import sys
import json
import numpy as np
from PIL import Image

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    mime_type = sys.argv[2]
    
    try:
        # Add cuDNN and CUDA to path for PaddlePaddle
        import os
        venv_path = os.environ.get("VIRTUAL_ENV") or sys.prefix
        site_packages = os.path.join(venv_path, "Lib", "site-packages")
        
        cudnn_path = os.path.join(site_packages, "nvidia", "cudnn", "bin")
        cublas_path = os.path.join(site_packages, "nvidia", "cublas", "bin")
        torch_lib = os.path.join(site_packages, "torch", "lib")
        
        paths_to_add = [cudnn_path, cublas_path, torch_lib]
        
        for p in paths_to_add:
            if os.path.exists(p):
                os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")

        from paddleocr import PaddleOCR
        # Initialize PaddleOCR
        ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        
        # Determine if it's a PDF or image
        if mime_type == "application/pdf":
            import fitz
            pdf_document = fitz.open(image_path)
            
            # Check for digital text
            total_digital_chars = 0
            for page_num in range(min(len(pdf_document), 5)):
                page = pdf_document.load_page(page_num)
                total_digital_chars += len(page.get_text().strip())
                if total_digital_chars > 100:
                    break
            
            if total_digital_chars > 100:
                # Digital PDF
                full_text_list = []
                all_blocks = []
                for page_num in range(len(pdf_document)):
                    page = pdf_document.load_page(page_num)
                    fitz_blocks = page.get_text("blocks")
                    page_text_parts = []
                    for b in fitz_blocks:
                        x0, y0, x1, y1, text, block_no, block_type = b
                        if block_type == 0 and text.strip():
                            cleaned = text.strip()
                            page_text_parts.append(cleaned)
                            all_blocks.append({
                                "text": cleaned,
                                "confidence": 1.0,
                                "bbox": [x0, y0, x1, y1]
                            })
                    if page_text_parts:
                        full_text_list.append(" ".join(page_text_parts))
                
                print(json.dumps({
                    "full_text": "\n\n".join(full_text_list),
                    "blocks": all_blocks
                }))
                sys.exit(0)
            
            # Scanned PDF - render first page only for OCR to save time, or all pages
            # For simplicity in subprocess, let's just do page 1 or all pages
            full_text_list = []
            all_blocks = []
            for page_num in range(len(pdf_document)):
                page = pdf_document.load_page(page_num)
                mat = fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=mat)
                img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                if pix.n == 4:
                    img = Image.fromarray(img_data).convert("RGB")
                    img_data = np.array(img)
                elif pix.n == 1:
                    img = Image.fromarray(img_data).convert("RGB")
                    img_data = np.array(img)
                
                result = ocr_engine.ocr(img_data, cls=True)
                pt, pb = parse_paddle_results(result)
                if pt:
                    full_text_list.append(pt)
                all_blocks.extend(pb)
            
            print(json.dumps({
                "full_text": "\n\n".join(full_text_list),
                "blocks": all_blocks
            }))
            
        else:
            # Image
            result = ocr_engine.ocr(image_path, cls=True)
            full_text, blocks = parse_paddle_results(result)
            print(json.dumps({
                "full_text": full_text,
                "blocks": blocks
            }))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

def parse_paddle_results(result):
    if not result or result[0] is None:
        return "", []
    full_text_parts = []
    blocks = []
    for page_result in result:
        if not page_result: continue
        for line in page_result:
            bbox_coords = line[0]
            text_info = line[1]
            text = text_info[0]
            confidence = float(text_info[1])
            x_coords = [p[0] for p in bbox_coords]
            y_coords = [p[1] for p in bbox_coords]
            blocks.append({
                "text": text,
                "confidence": confidence,
                "bbox": [min(x_coords), min(y_coords), max(x_coords), max(y_coords)]
            })
            full_text_parts.append(text)
    return " ".join(full_text_parts), blocks

if __name__ == "__main__":
    main()
