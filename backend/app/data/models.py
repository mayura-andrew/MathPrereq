from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

Base = declarative_base()

class SubmissionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVISION = "needs_revision"

class ConceptSubmission(Base):
    __tablename__ = "concept_submissions"
    
    id = Column(Integer, primary_key=True)
    student_id = Column(String, nullable=False)
    student_name = Column(String, nullable=True)

    # Original submission
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    source_material = Column(Text, nullable=True)  # URL, book reference, etc.
    difficulty_level = Column(String, nullable=True)

    # LLM Analysis Results
    suggested_concept_id = Column(String, nullable=True)
    suggested_concept_name = Column(String, nullable=True)
    suggested_description = Column(Text, nullable=True)
    suggested_prerequisites = Column(Text, nullable=True)  # JSON string
    suggested_leads_to = Column(Text, nullable=True)  # JSON string
    confidence_score = Column(Integer, nullable=True)  # 0-100

    # Review process
    status = Column(String, default=SubmissionStatus.PENDING)
    reviewer_id = Column(String, nullable=True)
    reviewer_comments = Column(Text, nullable=True)
    
    # Timestamps
    submitted_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Relationships
    relationships = relationship("RelationshipSubmission", 
    back_populates="concept")

class RelationshipSubmission(Base):
    __tablename__ = "relationship_submissions"
    
    id = Column(Integer, primary_key=True)
    concept_submission_id = Column(Integer, ForeignKey("concept_submissions.id"))
    
    source_concept = Column(String, nullable=False)
    target_concept = Column(String, nullable=False)
    relationship_type = Column(String, nullable=False)
    confidence_score = Column(Integer, nullable=True)
    
    concept = relationship("ConceptSubmission", back_populates="relationships")

class KnowledgeGraphHistory(Base):
    __tablename__ = "kg_history"

    id = Column(Integer, primary_key=True)
    action_type = Column(String, nullable=False)  # "add_concept", "add_relationship", "modify_concept"
    concept_id = Column(String, nullable=True)
    old_data = Column(Text, nullable=True)  # JSON
    new_data = Column(Text, nullable=True)  # JSON
    reviewer_id = Column(String, nullable=False)
    submission_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
