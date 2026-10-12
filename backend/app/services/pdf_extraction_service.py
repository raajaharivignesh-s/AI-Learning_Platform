import pymupdf
from typing import List, Dict

def extract_text_from_pdf(file_path: str) -> List[Dict[str, str]]:
    """
    Extracts text from a PDF file page by page.
    Returns a list of dictionaries with 'page_number' (1-indexed) and 'text'.
    """
    pages = []
    try:
        doc = pymupdf.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            pages.append({
                "page_number": page_num + 1,
                "text": text.strip()
            })
        doc.close()
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {str(e)}")
    
    return pages

def extract_images_from_pdf(file_path: str) -> List[Dict[str, str]]:
    import os
    import uuid
    from app.core.config import settings
    
    images = []
    try:
        doc = pymupdf.open(file_path)
        os.makedirs(settings.STORAGE_ROOT, exist_ok=True)
        for page_num in range(len(doc)):
            page = doc[page_num]
            image_list = page.get_images(full=True)
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                ext = base_image["ext"]
                image_filename = f"{uuid.uuid4()}.{ext}"
                image_path = os.path.join(settings.STORAGE_ROOT, image_filename)
                with open(image_path, "wb") as f:
                    f.write(image_bytes)
                images.append({
                    "page_number": page_num + 1,
                    "image_filename": image_filename
                })
        doc.close()
    except Exception as e:
        raise RuntimeError(f"PDF image extraction failed: {str(e)}")
    
    return images
