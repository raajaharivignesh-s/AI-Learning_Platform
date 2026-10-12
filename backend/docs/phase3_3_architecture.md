## Phase 3.3 Knowledge Structure and Prerequisite Mapping

### Data Model
- **CourseKnowledgeMap**: Tracks the state (pending, processing, completed, failed) of knowledge map extraction for a given course.
- **Topic**: Represents a major area of study within a course. Supports hierarchical parent-child structure (`parent_id`).
- **Concept**: Specific definitions or facts linked to a Topic.
- **ConceptSource**: Join table mapping Concepts to their origin `ResourceChunk`, preserving exact evidence and lineage.
- **PrerequisiteRelationship**: Represents directed dependencies between concepts. Includes `confidence`, `evidence`, and `is_inferred` flag. Cycle detection prevents circular dependencies.

### Extraction Strategy
The `KnowledgeService` queries chunks from the database and sends them to the LLM Provider using structured generation (Pydantic schema constraints).
1. Extract Topics and Concepts with source bindings.
2. Deduplicate based on title and course boundaries.
3. Pass extracted concept titles and definitions back to the LLM to infer Prerequisites.
4. Detect and filter self-referential or cyclic relationships programmatically before persistence.

### Idempotency
- Re-running the extraction drops the old map (`clear_knowledge_map`) and regenerates it, preventing duplication.
- Deleting resources triggers cascades that will sever the ConceptSource links. A full rebuild can be triggered if underlying chunks change significantly.

### APIs
- `POST /api/v1/courses/{course_id}/knowledge-map/build`: Kicks off the process.
- `GET /api/v1/courses/{course_id}/knowledge-map/status`: Returns current build status.
- `GET /api/v1/courses/{course_id}/knowledge-map`: Retrieves the mapped Topic/Concept tree.
- `GET /api/v1/courses/{course_id}/topics/{topic_id}`: Retrieves a specific topic and its concepts.

### Future Use by Adaptive Learning
This knowledge ontology acts as the foundation for future learner mastery tracking. When a student takes an assessment on a Concept, their score will propagate backward through the Prerequisite tree, allowing the system to pinpoint exactly where their foundational knowledge broke down and schedule review sessions for missing prerequisites.
