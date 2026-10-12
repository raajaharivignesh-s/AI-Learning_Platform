import logging
from uuid import UUID
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.course import Course
from app.models.resource_chunk import ResourceChunk
from app.models.knowledge import (
    CourseKnowledgeMap, KnowledgeMapStatus, Topic, Concept, ConceptSource, PrerequisiteRelationship
)
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger(__name__)

class KnowledgeService:
    def __init__(self):
        self.llm = get_llm_provider()

    def get_map_status(self, db: Session, course_id: UUID) -> Optional[CourseKnowledgeMap]:
        return db.query(CourseKnowledgeMap).filter(CourseKnowledgeMap.course_id == course_id).first()

    def build_knowledge_map(self, db: Session, course_id: UUID, owner_id: UUID):
        # Enforce course ownership
        course = db.query(Course).filter(Course.id == course_id, Course.owner_id == owner_id).first()
        if not course:
            raise ValueError("Course not found or unauthorized")

        k_map = self.get_map_status(db, course_id)
        if not k_map:
            k_map = CourseKnowledgeMap(course_id=course_id, status=KnowledgeMapStatus.pending)
            db.add(k_map)
            db.commit()
            db.refresh(k_map)

        if k_map.status == KnowledgeMapStatus.processing:
            return k_map

        k_map.status = KnowledgeMapStatus.processing
        k_map.error_details = None
        db.commit()

        try:
            self._process_knowledge_map(db, course_id)
            k_map.status = KnowledgeMapStatus.completed
            db.commit()
        except Exception as e:
            db.rollback()
            logger.exception("Failed to build knowledge map")
            k_map = self.get_map_status(db, course_id)
            if k_map:
                k_map.status = KnowledgeMapStatus.failed
                k_map.error_details = str(e)
                db.commit()

    def _process_knowledge_map(self, db: Session, course_id: UUID):
        # 1. Clean existing knowledge data
        self.clear_knowledge_map(db, course_id)
        
        # 2. Retrieve chunks (we take up to 200 chunks for cost/context reasons for now)
        # Real-world: Should batch/cluster chunks based on embedding similarity and process sequentially.
        chunks = db.query(ResourceChunk).filter(ResourceChunk.course_id == course_id).limit(200).all()
        if not chunks:
            return

        context_lines = []
        chunk_dict = {}
        for chunk in chunks:
            chunk_dict[str(chunk.id)] = chunk
            context_lines.append(f"[Chunk {chunk.id}]\n{chunk.text}\n")
        
        context_str = "\n".join(context_lines)
        
        # 3. Extract Topics and Concepts
        extracted_data = self.llm.extract_topics_and_concepts(context_str)
        topics = extracted_data.get("topics", [])
        
        # Dictionary to hold concept by title to process relationships later
        concept_db_map = {}

        for topic_data in topics:
            topic_title = topic_data.get("title")
            # Deduplicate topics by title
            topic = db.query(Topic).filter(Topic.course_id == course_id, Topic.title == topic_title).first()
            if not topic:
                topic = Topic(
                    course_id=course_id,
                    title=topic_title,
                    description=topic_data.get("description")
                )
                db.add(topic)
                db.flush() # get topic.id
            
            for concept_data in topic_data.get("concepts", []):
                c_title = concept_data.get("title")
                # Deduplicate concepts
                concept = db.query(Concept).filter(Concept.course_id == course_id, Concept.title == c_title).first()
                if not concept:
                    concept = Concept(
                        course_id=course_id,
                        topic_id=topic.id,
                        title=c_title,
                        definition=concept_data.get("definition")
                    )
                    db.add(concept)
                    db.flush()
                
                concept_db_map[c_title] = concept

                # Add sources
                for src in concept_data.get("sources", []):
                    c_id_str = src.get("chunk_id")
                    if c_id_str in chunk_dict:
                        chk = chunk_dict[c_id_str]
                        # check if mapping already exists
                        existing = db.query(ConceptSource).filter(
                            ConceptSource.concept_id == concept.id,
                            ConceptSource.chunk_id == chk.id
                        ).first()
                        if not existing:
                            db.add(ConceptSource(
                                concept_id=concept.id,
                                resource_id=chk.resource_id,
                                chunk_id=chk.id
                            ))
        
        db.flush()

        # 4. Extract Relationships
        if concept_db_map:
            concepts_context_lines = []
            for c_title, c_obj in concept_db_map.items():
                concepts_context_lines.append(f"- Concept: '{c_title}': {c_obj.definition}")
            
            rels_data = self.llm.extract_relationships("\n".join(concepts_context_lines))
            prerequisites = rels_data.get("prerequisites", [])

            for pre in prerequisites:
                src_title = pre.get("source_concept_title")
                tgt_title = pre.get("target_concept_title")
                
                if src_title in concept_db_map and tgt_title in concept_db_map:
                    src_obj = concept_db_map[src_title]
                    tgt_obj = concept_db_map[tgt_title]
                    
                    if src_obj.id == tgt_obj.id:
                        continue # no self reference

                    # prevent cycle
                    if self._would_create_cycle(db, src_obj.id, tgt_obj.id):
                        continue

                    # Insert
                    existing = db.query(PrerequisiteRelationship).filter(
                        PrerequisiteRelationship.source_concept_id == src_obj.id,
                        PrerequisiteRelationship.target_concept_id == tgt_obj.id
                    ).first()

                    if not existing:
                        db.add(PrerequisiteRelationship(
                            course_id=course_id,
                            source_concept_id=src_obj.id,
                            target_concept_id=tgt_obj.id,
                            is_inferred=pre.get("is_inferred", True),
                            confidence=pre.get("confidence", 0.5),
                            evidence=pre.get("evidence")
                        ))

        db.commit()
    
    def _would_create_cycle(self, db: Session, src_id: UUID, tgt_id: UUID) -> bool:
        # Check if tgt_id is already a prerequisite for src_id anywhere up the chain
        visited = set()
        queue = [src_id]
        while queue:
            curr = queue.pop(0)
            if curr == tgt_id:
                return True
            if curr not in visited:
                visited.add(curr)
                parents = db.query(PrerequisiteRelationship.source_concept_id).filter(
                    PrerequisiteRelationship.target_concept_id == curr
                ).all()
                for (pid,) in parents:
                    queue.append(pid)
        return False

    def clear_knowledge_map(self, db: Session, course_id: UUID):
        db.query(PrerequisiteRelationship).filter(PrerequisiteRelationship.course_id == course_id).delete()
        # cascades will handle concept_sources
        db.query(Concept).filter(Concept.course_id == course_id).delete()
        db.query(Topic).filter(Topic.course_id == course_id).delete()
        db.flush()
    
    def get_topics(self, db: Session, course_id: UUID) -> List[Topic]:
        return db.query(Topic).filter(Topic.course_id == course_id, Topic.parent_id == None).all()

    def get_topic_by_id(self, db: Session, course_id: UUID, topic_id: UUID) -> Optional[Topic]:
        return db.query(Topic).filter(Topic.course_id == course_id, Topic.id == topic_id).first()

knowledge_service = KnowledgeService()
