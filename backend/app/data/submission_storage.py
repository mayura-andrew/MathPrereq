import json
import sqlite3
import pandas as pd
from typing import List, Dict, Optional, Any
from datetime import datetime
import structlog
from pathlib import Path
import shutil


logger = structlog.get_logger()

class SubmissionStorage:
    def __init__(self, db_path: str = "data/submissions.db",
                nodes_csv_path: str = "data/raw/nodes.csv",
                edges_csv_path: str = "data/raw/edges.csv"):
        self.db_path = Path(db_path)
        self.nodes_csv_path = Path(nodes_csv_path)
        self.edges_csv_path = Path(edges_csv_path)
        
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.nodes_csv_path.parent.mkdir(parents=True, exist_ok=True)
        self.edges_csv_path.parent.mkdir(parents=True, exist_ok=True)
      
        self._init_database()

    def _init_database(self):
        """Initialize the submissions database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS concept_submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT,
                    student_name TEXT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    source_material TEXT,
                    suggested_concept_id TEXT,
                    suggested_concept_name TEXT,
                    suggested_description TEXT,
                    suggested_prerequisites TEXT,
                    suggested_leads_to TEXT,
                    confidence_score INTEGER,
                    status TEXT DEFAULT 'pending',
                    reviewer_id TEXT,
                    reviewer_comments TEXT,
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    reviewed_at TIMESTAMP,
                    quality_feedback TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS relationship_submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    concept_submission_id INTEGER,
                    source_concept TEXT,
                    target_concept TEXT,
                    relationship_type TEXT,
                    confidence_score INTEGER,
                    FOREIGN KEY (concept_submission_id) REFERENCES concept_submissions (id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS kg_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action_type TEXT,
                    concept_id TEXT,
                    old_data TEXT,
                    new_data TEXT,
                    reviewer_id TEXT,
                    submission_id INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

    async def store_concept_submission(
        self,
        student_id: Optional[str],
        student_name: Optional[str],
        title: str,
        description: str,
        source_material: Optional[str],
        analysis: Any,
        relationships: List[Any],
        quality_check: Dict[str, Any]
    ) -> int:
        """Store a new concept submission"""
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                INSERT INTO concept_submissions (
                    student_id, student_name, title, description, source_material,
                    suggested_concept_id, suggested_concept_name, suggested_description,
                    suggested_prerequisites, suggested_leads_to, confidence_score,
                    quality_feedback
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                student_id, student_name, title, description, source_material,
                analysis.suggested_id, analysis.suggested_name, analysis.description,
                json.dumps(analysis.prerequisites), json.dumps(analysis.leads_to),
                analysis.confidence_score, json.dumps(quality_check)
            ))
            
            submission_id = cursor.lastrowid
            
            # Store relationships
            for rel in relationships:
                conn.execute("""
                    INSERT INTO relationship_submissions (
                        concept_submission_id, source_concept, target_concept,
                        relationship_type, confidence_score
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    submission_id, rel.source_concept, rel.target_concept,
                    rel.relationship_type, rel.confidence_score
                ))
            
            logger.info(f"✅ Stored submission {submission_id}: {title}")
            return submission_id

    async def get_pending_submissions(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get pending submissions for review"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM concept_submissions 
                WHERE status = 'pending' 
                ORDER BY submitted_at DESC 
                LIMIT ?
            """, (limit,))
            
            submissions = []
            for row in cursor.fetchall():
                submission = dict(row)
                submission['suggested_prerequisites'] = json.loads(submission['suggested_prerequisites'] or '[]')
                submission['suggested_leads_to'] = json.loads(submission['suggested_leads_to'] or '[]')
                submissions.append(submission)
            
            return submissions

    async def update_submission_review(
        self,
        submission_id: int,
        reviewer_id: str,
        decision: str,
        comments: str,
        modifications: Optional[Dict[str, Any]] = None
    ):
        """Update submission with review decision"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE concept_submissions 
                SET status = ?, reviewer_id = ?, reviewer_comments = ?, reviewed_at = ?
                WHERE id = ?
            """, (decision, reviewer_id, comments, datetime.now(), submission_id))
            
            logger.info(f"✅ Updated submission {submission_id} status to {decision}")

    async def integrate_approved_submission(self, submission_id: int):
        """Integrate approved submission into knowledge graph"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM concept_submissions WHERE id = ? AND status = 'approved'
            """, (submission_id,))
            
            submission = cursor.fetchone()
            if not submission:
                return
            
            # Here you would integrate with your actual knowledge graph
            # For now, just log the action
            conn.execute("""
                INSERT INTO kg_history (
                    action_type, concept_id, new_data, reviewer_id, submission_id
                ) VALUES (?, ?, ?, ?, ?)
            """, (
                "add_concept", 
                submission['suggested_concept_id'],
                json.dumps(dict(submission)),
                submission['reviewer_id'],
                submission_id
            ))
            
            logger.info(f"🌱 Integrated submission {submission_id} into knowledge graph")

    async def get_student_submissions(self, student_id: str) -> List[Dict[str, Any]]:
        """Get all submissions by a student"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM concept_submissions 
                WHERE student_id = ? 
                ORDER BY submitted_at DESC
            """, (student_id,))
            
            return [dict(row) for row in cursor.fetchall()]

    async def get_submission_statistics(self) -> Dict[str, int]:
        """Get submission statistics"""
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_count,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
                FROM concept_submissions
            """)
            
            row = cursor.fetchone()
            return {
                'total_count': row[0] or 0,
                'pending_count': row[1] or 0,
                'approved_count': row[2] or 0,
                'rejected_count': row[3] or 0
            }
    
    async def integrate_approved_submission(self, submission_id: int):
        """Integrate approved submission into knowledge graph CSV files"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM concept_submissions WHERE id = ? AND status = 'approved'
            """, (submission_id,))
            
            submission = cursor.fetchone()
            if not submission:
                logger.warning(f"❌ No approved submission found with ID {submission_id}")
                return False

            try:
                # Step 1: Add concept to nodes.csv
                await self._add_concept_to_nodes_csv(submission)
                
                # Step 2: Add relationships to edges.csv
                await self._add_relationships_to_edges_csv(submission_id, submission)
                
                # Step 3: Create backup and log the integration
                await self._log_integration(submission_id, submission)
                
                logger.info(f"🌱 Successfully integrated submission {submission_id} into CSV files")
                return True
                
            except Exception as e:
                logger.error(f"❌ Failed to integrate submission {submission_id}: {e}")
                return False
            
    async def _add_concept_to_nodes_csv(self, submission):
        """Add new concept to nodes.csv file"""
        try:
            # create backup
            await self._backup_csv_files()
            
            # read existing nodes
            if self.nodes_csv_path.exists():
                nodes_df = pd.read_csv(self.nodes_csv_path)
            else:
                nodes_df = pd.DataFrame(columns=['node_id', 'concept_name', 'description'])
            
            # Check if concept already exists
            if submission['suggested_concept_id'] in nodes_df['node_id'].values:
                logger.warning(f"⚠️ Concept {submission['suggested_concept_id']} already exists in nodes.csv")
                return
            
            # Create new row
            new_row = {
                'node_id': submission['suggested_concept_id'],
                'concept_name': submission['suggested_concept_name'],
                'description': submission['suggested_description']
            }
            
            # Add to dataframe
            nodes_df = pd.concat([nodes_df, pd.DataFrame([new_row])], ignore_index=True)
            
            # Save back to CSV
            nodes_df.to_csv(self.nodes_csv_path, index=False)
            
            logger.info(f"✅ Added concept '{submission['suggested_concept_name']}' to nodes.csv")
            
        except Exception as e:
            logger.error(f"❌ Failed to add concept to nodes.csv: {e}")
            # Restore from backup if available
            await self._restore_csv_backup()
            raise
    
    
    async def _add_relationships_to_edges_csv(self, submission_id: int, submission):
        """Add new relationships to edges.csv file"""
        try:
            # Read existing edges
            if self.edges_csv_path.exists():
                edges_df = pd.read_csv(self.edges_csv_path)
            else:
                edges_df = pd.DataFrame(columns=['source_id', 'target_id', 'relationship_type'])
            
            new_edges = []
            
            # Add prerequisite relationships (existing concepts -> new concept)
            prerequisites = json.loads(submission['suggested_prerequisites'] or '[]')
            for prereq in prerequisites:
                # Convert concept name to ID (you might need to map this)
                prereq_id = await self._find_concept_id_by_name(prereq)
                if prereq_id:
                    new_edge = {
                        'source_id': prereq_id,
                        'target_id': submission['suggested_concept_id'],
                        'relationship_type': 'prerequisite_for'
                    }
                    
                    # Check if edge already exists
                    edge_exists = ((edges_df['source_id'] == prereq_id) & 
                                  (edges_df['target_id'] == submission['suggested_concept_id']) &
                                  (edges_df['relationship_type'] == 'prerequisite_for')).any()
                    
                    if not edge_exists:
                        new_edges.append(new_edge)
            
            # Add "leads to" relationships (new concept -> existing concepts)
            leads_to = json.loads(submission['suggested_leads_to'] or '[]')
            for target in leads_to:
                target_id = await self._find_concept_id_by_name(target)
                if target_id:
                    new_edge = {
                        'source_id': submission['suggested_concept_id'],
                        'target_id': target_id,
                        'relationship_type': 'prerequisite_for'
                    }
                    
                    # Check if edge already exists
                    edge_exists = ((edges_df['source_id'] == submission['suggested_concept_id']) & 
                                  (edges_df['target_id'] == target_id) &
                                  (edges_df['relationship_type'] == 'prerequisite_for')).any()
                    
                    if not edge_exists:
                        new_edges.append(new_edge)
                        
            # Add relationship submissions from database
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                rel_cursor = conn.execute("""
                    SELECT * FROM relationship_submissions 
                    WHERE concept_submission_id = ?
                """, (submission_id,))
                
                for rel_row in rel_cursor.fetchall():
                    source_id = await self._find_concept_id_by_name(rel_row['source_concept'])
                    target_id = await self._find_concept_id_by_name(rel_row['target_concept'])
                    
                    if source_id and target_id:
                        new_edge = {
                            'source_id': source_id,
                            'target_id': target_id,
                            'relationship_type': rel_row['relationship_type']
                        }
                        
                     # Check if edge already exists
                        edge_exists = ((edges_df['source_id'] == source_id) & 
                                      (edges_df['target_id'] == target_id) &
                                      (edges_df['relationship_type'] == rel_row['relationship_type'])).any()
                        
                        if not edge_exists:
                            new_edges.append(new_edge)

             # Add all new edges to dataframe
            if new_edges:
                new_edges_df = pd.DataFrame(new_edges)
                edges_df = pd.concat([edges_df, new_edges_df], ignore_index=True)
                
                # Save back to CSV
                edges_df.to_csv(self.edges_csv_path, index=False)
                
                logger.info(f"✅ Added {len(new_edges)} relationships to edges.csv")
            else:
                logger.info("ℹ️ No new relationships to add to edges.csv")
                
        except Exception as e:
            logger.error(f"❌ Failed to add relationships to edges.csv: {e}")
            await self._restore_csv_backup()
            raise
                

    async def _find_concept_id_by_name(self, concept_name: str) -> Optional[str]:
        """Find concept ID by name from nodes.csv"""
        try:
            if not self.nodes_csv_path.exists():
                return None
                
            nodes_df = pd.read_csv(self.nodes_csv_path)
            
            # Direct match
            exact_match = nodes_df[nodes_df['concept_name'].str.lower() == concept_name.lower()]
            if not exact_match.empty:
                return exact_match.iloc[0]['node_id']
            
            # Partial match
            partial_match = nodes_df[nodes_df['concept_name'].str.lower().str.contains(concept_name.lower(), na=False)]
            if not partial_match.empty:
                return partial_match.iloc[0]['node_id']
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to find concept ID for '{concept_name}': {e}")
            return None
        
    async def _backup_csv_files(self):
        """Create backup copies of CSV files before modification"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir = self.nodes_csv_path.parent / "backups"
            backup_dir.mkdir(exist_ok=True)
            
            if self.nodes_csv_path.exists():
                backup_nodes = backup_dir / f"nodes_{timestamp}.csv"
                shutil.copy2(self.nodes_csv_path, backup_nodes)
                logger.info(f"📋 Created backup: {backup_nodes}")
            
            if self.edges_csv_path.exists():
                backup_edges = backup_dir / f"edges_{timestamp}.csv"
                shutil.copy2(self.edges_csv_path, backup_edges)
                logger.info(f"📋 Created backup: {backup_edges}")
                
        except Exception as e:
            logger.error(f"❌ Failed to create backup: {e}")
            raise
    
    async def _restore_csv_backup(self):
        """Restore CSV files from most recent backup"""
        try:
            backup_dir = self.nodes_csv_path.parent / "backups"
            if not backup_dir.exists():
                return
            
            # Find most recent backups
            nodes_backups = list(backup_dir.glob("nodes_*.csv"))
            edges_backups = list(backup_dir.glob("edges_*.csv"))
            
            if nodes_backups:
                latest_nodes = max(nodes_backups, key=lambda x: x.stat().st_mtime)
                shutil.copy2(latest_nodes, self.nodes_csv_path)
                logger.info(f"🔄 Restored nodes.csv from {latest_nodes}")
            
            if edges_backups:
                latest_edges = max(edges_backups, key=lambda x: x.stat().st_mtime)
                shutil.copy2(latest_edges, self.edges_csv_path)
                logger.info(f"🔄 Restored edges.csv from {latest_edges}")
                
        except Exception as e:
            logger.error(f"❌ Failed to restore backup: {e}")
            
    
    async def _log_integration(self, submission_id: int, submission):
        """Log the integration action"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                integration_data = {
                    'concept_id': submission['suggested_concept_id'],
                    'concept_name': submission['suggested_concept_name'],
                    'description': submission['suggested_description'],
                    'prerequisites': submission['suggested_prerequisites'],
                    'leads_to': submission['suggested_leads_to'],
                    'submission_id': submission_id
                }
                
                conn.execute("""
                    INSERT INTO kg_history (
                        action_type, concept_id, new_data, reviewer_id, submission_id
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    "integrate_concept", 
                    submission['suggested_concept_id'],
                    json.dumps(integration_data),
                    submission['reviewer_id'],
                    submission_id
                ))
                
                logger.info(f"📝 Logged integration of submission {submission_id}")
                
        except Exception as e:
            logger.error(f"❌ Failed to log integration: {e}")
            
    async def get_integration_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get history of concept integrations"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT * FROM kg_history 
                    WHERE action_type = 'integrate_concept'
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, (limit,))
                
                history = []
                for row in cursor.fetchall():
                    entry = dict(row)
                    entry['new_data'] = json.loads(entry['new_data'] or '{}')
                    history.append(entry)
                
                return history
        except Exception as e:
            logger.error(f"❌ Failed to get integration history: {e}")
            return []
        

    async def verify_csv_integrity(self) -> Dict[str, Any]:
        """Verify the integrity of CSV files after integration"""
        try:
            integrity_report = {
                'nodes_file_exists': self.nodes_csv_path.exists(),
                'edges_file_exists': self.edges_csv_path.exists(),
                'nodes_count': 0,
                'edges_count': 0,
                'orphaned_edges': [],
                'issues': []
            }
            
            if integrity_report['nodes_file_exists']:
                nodes_df = pd.read_csv(self.nodes_csv_path)
                integrity_report['nodes_count'] = len(nodes_df)
                
                # Check for required columns
                required_node_cols = ['node_id', 'concept_name', 'description']
                missing_cols = [col for col in required_node_cols if col not in nodes_df.columns]
                if missing_cols:
                    integrity_report['issues'].append(f"Missing node columns: {missing_cols}")
                
                # Check for duplicates
                duplicates = nodes_df[nodes_df.duplicated(subset=['node_id'])]
                if not duplicates.empty:
                    integrity_report['issues'].append(f"Duplicate node IDs: {duplicates['node_id'].tolist()}")
        
            if integrity_report['edges_file_exists']:
                edges_df = pd.read_csv(self.edges_csv_path)
                integrity_report['edges_count'] = len(edges_df)
                
                # Check for required columns
                required_edge_cols = ['source_id', 'target_id', 'relationship_type']
                missing_cols = [col for col in required_edge_cols if col not in edges_df.columns]
                if missing_cols:
                    integrity_report['issues'].append(f"Missing edge columns: {missing_cols}")
                
                # Check for orphaned edges (edges referencing non-existent nodes)
                if integrity_report['nodes_file_exists']:
                    valid_node_ids = set(nodes_df['node_id'])
                    orphaned_sources = edges_df[~edges_df['source_id'].isin(valid_node_ids)]
                    orphaned_targets = edges_df[~edges_df['target_id'].isin(valid_node_ids)]
                    
                    orphaned_edges = []
                    for _, row in orphaned_sources.iterrows():
                        orphaned_edges.append(f"Source '{row['source_id']}' not found in nodes")
                    for _, row in orphaned_targets.iterrows():
                        orphaned_edges.append(f"Target '{row['target_id']}' not found in nodes")
                    
                    integrity_report['orphaned_edges'] = orphaned_edges
                
            return integrity_report
        
        except Exception as e:
            logger.error(f"❌ Failed to verify CSV integrity: {e}")
            return {'error': str(e)}

    async def store_concept_suggestion(
        self,
        concept_data: Dict[str, Any],
        source_query: str,
        confidence: float
    ) -> int:
        """Store an auto-generated concept suggestion for expert review"""
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    INSERT INTO concept_submissions (
                        student_id, student_name, title, description, source_material,
                        suggested_concept_id, suggested_concept_name, suggested_description,
                        suggested_prerequisites, suggested_leads_to, confidence_score,
                        status, quality_feedback
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    'auto_analyzer',  # student_id
                    'Auto Concept Analyzer',  # student_name  
                    f"Auto-suggestion: {concept_data.get('concept_name', 'Unknown Concept')}",  # title
                    f"Auto-generated suggestion based on query: {source_query}",  # description
                    source_query,  # source_material
                    concept_data.get('concept_id', concept_data.get('concept_name', '').lower().replace(' ', '_')),  # suggested_concept_id
                    concept_data.get('concept_name', 'Unknown Concept'),  # suggested_concept_name
                    concept_data.get('description', 'Auto-generated concept suggestion'),  # suggested_description
                    json.dumps(concept_data.get('prerequisites', [])),  # suggested_prerequisites
                    json.dumps(concept_data.get('leads_to', [])),  # suggested_leads_to
                    int(confidence * 100),  # confidence_score (convert to percentage)
                    'pending',  # status
                    json.dumps({
                        'auto_generated': True,
                        'source': 'concept_analyzer',
                        'reasoning': concept_data.get('reasoning', ''),
                        'integration_priority': concept_data.get('integration_priority', 'medium')
                    })  # quality_feedback
                ))
                
                suggestion_id = cursor.lastrowid
                
                logger.info(f"✅ Stored concept suggestion {suggestion_id}: {concept_data.get('concept_name')}")
                
                return suggestion_id
                
        except Exception as e:
            logger.error(f"❌ Failed to store concept suggestion: {e}")
            raise