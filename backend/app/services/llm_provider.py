from typing import List, Dict, Any, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LLMProvider:
    def generate_answer(self, question: str, context: str, source_only: bool) -> str:
        raise NotImplementedError
        
    def generate_image_description(self, image_path: str) -> str:
        raise NotImplementedError
        
    def generate_video_transcript(self, audio_path: str) -> List[Dict[str, Any]]:
        raise NotImplementedError
        
    def extract_topics_and_concepts(self, context: str) -> Dict[str, Any]:
        raise NotImplementedError

    def extract_relationships(self, concepts_context: str) -> Dict[str, Any]:
        raise NotImplementedError

class GeminiProvider(LLMProvider):
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")
                
    def generate_answer(self, question: str, context: str, source_only: bool) -> str:
        if not self.client:
            raise ValueError("LLM Provider is not configured or unavailable.")
            
        system_prompt = (
            "You are a helpful and accurate tutoring assistant. "
            "You are provided with several excerpts from a student's learning materials. "
            "Each excerpt is labeled with a Chunk ID, such as [Chunk <UUID>].\n\n"
        )
        
        if source_only:
            system_prompt += (
                "You must answer the student's question strictly using ONLY the provided context. "
                "Do not use outside knowledge. If the context does not contain the answer, "
                "respond EXACTLY with: 'INSUFFICIENT_EVIDENCE'. "
            )
        else:
            system_prompt += (
                "You should use the provided context to answer the question. "
                "If the context doesn't fully answer the question, you may use outside knowledge, "
                "but you must clearly state when you are doing so. "
            )
            
        system_prompt += (
            "\nWhen you use information from the context, you must cite it using the chunk ID. "
            "Format your citations exactly like this: [Citation: <Chunk ID>]. "
            "For example: 'The mitochondria is the powerhouse of the cell [Citation: 123e4567-e89b-12d3-a456-426614174000].' "
            "Do not invent citations."
        )
        
        prompt = f"Context:\n{context}\n\nQuestion: {question}"
        
        try:
            from google.genai import types
            response = self.client.models.generate_content(
                model=settings.LLM_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.1 if source_only else 0.4
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            raise

    def generate_image_description(self, image_path: str) -> str:
        if not self.client:
            raise ValueError("LLM Provider is not configured or unavailable.")
        
        try:
            from PIL import Image
            img = Image.open(image_path)
            # Convert to RGB if RGBA
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            # Compress to avoid huge payload
            img.thumbnail((1024, 1024))
            
            prompt = "Describe this educational image, slide, chart, or diagram concisely. Capture all key relationships, labels, legends, or text present. State the main takeaway."
            
            response = self.client.models.generate_content(
                model=settings.LLM_MODEL,
                contents=[img, prompt]
            )
            return response.text
        except Exception as e:
            logger.error(f"Error calling Gemini API for image: {e}")
            raise

    def generate_video_transcript(self, audio_path: str) -> List[Dict[str, Any]]:
        if not self.client:
            raise ValueError("LLM Provider is not configured or unavailable.")
            
        import json
        from pydantic import BaseModel, Field
        from google.genai import types
        
        class TranscriptSegment(BaseModel):
            start: float = Field(description="Start time in seconds")
            end: float = Field(description="End time in seconds")
            text: str = Field(description="The spoken text")
            
        class Transcript(BaseModel):
            segments: list[TranscriptSegment]
            
        uploaded_file = None
        try:
            uploaded_file = self.client.files.upload(file=audio_path)
            
            prompt = "Transcribe the following audio precisely. Provide start and end timestamps in seconds for each spoken segment."
            
            response = self.client.models.generate_content(
                model=settings.LLM_MODEL,
                contents=[uploaded_file, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=Transcript,
                    temperature=0.1
                )
            )
            
            result = json.loads(response.text)
            return result.get("segments", [])
        except Exception as e:
            logger.error(f"Error calling Gemini API for audio transcription: {e}")
            raise
        finally:
            if uploaded_file:
                try:
                    self.client.files.delete(name=uploaded_file.name)
                except Exception as e:
                    logger.warning(f"Failed to delete uploaded file {uploaded_file.name}: {e}")
    def extract_topics_and_concepts(self, context: str) -> Dict[str, Any]:
        if not self.client:
            raise ValueError("LLM Provider is not configured or unavailable.")
            
        import json
        from google.genai import types
        from app.schemas.knowledge import LLMExtractionResponse
        
        system_prompt = (
            "You are a helpful and accurate educational knowledge extraction assistant. "
            "You are provided with educational text chunks labeled with their chunk ID. "
            "Extract major topics, subtopics, and concepts. "
            "For each concept, provide a clear definition and list the chunk IDs that support it as sources. "
            "Do not invent information. Ensure chunk IDs are preserved exactly as provided."
        )
        
        try:
            response = self.client.models.generate_content(
                model=settings.LLM_MODEL,
                contents=context,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    response_schema=LLMExtractionResponse,
                    temperature=0.1
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error calling Gemini API for concept extraction: {e}")
            raise

    def extract_relationships(self, concepts_context: str) -> Dict[str, Any]:
        if not self.client:
            raise ValueError("LLM Provider is not configured or unavailable.")
            
        import json
        from google.genai import types
        from app.schemas.knowledge import LLMRelationshipResponse
        
        system_prompt = (
            "You are an educational ontology expert. "
            "You are provided with a list of educational concepts and their definitions. "
            "Analyze these concepts to infer prerequisite relationships. "
            "Identify when one concept must be understood before another. "
            "Only return meaningful, directed prerequisite relationships. "
            "Do not create cyclic relationships. Rate confidence from 0.0 to 1.0. "
            "Provide evidence or reasoning for the prerequisite relationship."
        )
        
        try:
            response = self.client.models.generate_content(
                model=settings.LLM_MODEL,
                contents=concepts_context,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    response_schema=LLMRelationshipResponse,
                    temperature=0.1
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error calling Gemini API for relationship extraction: {e}")
            raise
_default_provider = None

def get_llm_provider() -> LLMProvider:
    global _default_provider
    if not _default_provider:
        _default_provider = GeminiProvider()
    return _default_provider
