import re
from typing import List, Dict, Any
from app.models.resource_page import ResourcePage
from app.core.config import settings

def chunk_text(pages: List[ResourcePage], chunk_size: int = None, chunk_overlap: int = None) -> List[Dict[str, Any]]:
    if chunk_size is None:
        chunk_size = settings.CHUNK_SIZE
    if chunk_overlap is None:
        chunk_overlap = settings.CHUNK_OVERLAP

    # Concatenate all text, tracking where each page starts and ends
    combined_text = ""
    page_boundaries = []
    
    # Sort pages
    sorted_pages = sorted(pages, key=lambda p: p.page_number)
    
    for page in sorted_pages:
        start_idx = len(combined_text)
        text = page.extracted_text.strip()
        if not text:
            continue
            
        combined_text += text + "\n\n"
        end_idx = len(combined_text)
        
        page_boundaries.append({
            "page_number": page.page_number,
            "start": start_idx,
            "end": end_idx
        })
        
    if not combined_text.strip():
        return []

    chunks = []
    current_start = 0
    chunk_index = 0
    
    while current_start < len(combined_text):
        current_end = current_start + chunk_size
        if current_end >= len(combined_text):
            current_end = len(combined_text)
        else:
            snap_end = combined_text.rfind(" ", current_start, current_end)
            if snap_end != -1 and snap_end > current_start + chunk_size // 2:
                current_end = snap_end
        
        chunk_text_str = combined_text[current_start:current_end].strip()
        
        if chunk_text_str:
            start_page = -1
            end_page = -1
            
            for b in page_boundaries:
                if b["start"] <= current_start < b["end"]:
                    start_page = b["page_number"]
                # For end page, we look at the last character of the chunk
                if b["start"] <= max(current_start, current_end - 1) < b["end"]:
                    end_page = b["page_number"]
                    
            if start_page == -1:
                start_page = sorted_pages[0].page_number if sorted_pages else 1
            if end_page == -1:
                end_page = start_page
                
            chunks.append({
                "chunk_index": chunk_index,
                "text": chunk_text_str,
                "start_page": start_page,
                "end_page": end_page
            })
            chunk_index += 1
            
        if current_end >= len(combined_text):
            break
            
        current_start = current_end - chunk_overlap
        # Ensure we always move forward
        if current_start >= current_end:
            current_start = current_end
        
    return chunks
