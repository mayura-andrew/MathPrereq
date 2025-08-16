import sqlite3
from pathlib import Path
from typing import List, Dict, Optional
import json
import structlog
from core.web_scraper import EducationalResource

logger = structlog.get_logger()

class ResourceStorage:
    """Stores and manages scraped educational resources"""
    
    def __init__(self, db_path: str = "data/educational_resources.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
    
    def _init_database(self):
        """Initialize the educational resources database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS educational_resources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    concept_id TEXT NOT NULL,
                    concept_name TEXT NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT UNIQUE NOT NULL,
                    description TEXT,
                    resource_type TEXT,
                    source_domain TEXT,
                    difficulty_level TEXT,
                    quality_score REAL,
                    content_preview TEXT,
                    scraped_at TIMESTAMP,
                    language TEXT DEFAULT 'en',
                    is_verified BOOLEAN DEFAULT FALSE,
                    verification_notes TEXT,
                    view_count INTEGER DEFAULT 0,
                    rating REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_concept_id ON educational_resources(concept_id)
            """)
            
            logger.info("✅ Educational resources database initialized")
    
    
    async def store_resources(self, resources: List[EducationalResource]) -> int:
        """Store scraped resources in database"""
        try:
            logger.info(f"💾 Attempting to store {len(resources)} resources")
            print(f"\n=== STORING {len(resources)} RESOURCES ===")
            
            stored_count = 0
            
            with sqlite3.connect(self.db_path) as conn:
                for i, resource in enumerate(resources):
                    try:
                        print(f"💾 Storing resource {i+1}: {resource.title}")
                        
                        cursor = conn.execute("""
                            INSERT OR IGNORE INTO educational_resources (
                                concept_id, concept_name, title, url, description,
                                resource_type, source_domain, difficulty_level,
                                quality_score, content_preview, scraped_at, language
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            resource.concept_id,
                            resource.concept_name,
                            resource.title,
                            resource.url,
                            resource.description,
                            resource.resource_type,
                            resource.source_domain,
                            resource.difficulty_level,
                            resource.quality_score,
                            resource.content_preview,
                            resource.scraped_at,
                            resource.language
                        ))
                        
                        if cursor.rowcount > 0:
                            stored_count += 1
                            print(f"✅ Stored successfully")
                            logger.info(f"✅ Stored: {resource.title}")
                        else:
                            print(f"⚠️ Resource already exists")
                            logger.debug(f"⚠️ Resource already exists: {resource.url}")
                            
                    except sqlite3.IntegrityError as e:
                        print(f"❌ Integrity error: {e}")
                        logger.debug(f"⚠️ Integrity error for {resource.url}: {e}")
                        continue
                    except Exception as e:
                        print(f"❌ Storage error: {e}")
                        logger.error(f"❌ Failed to store resource {resource.url}: {e}")
                        continue
                
                # Verify total count
                cursor = conn.execute("SELECT COUNT(*) FROM educational_resources")
                total_count = cursor.fetchone()[0]
                
            print(f"✅ Storage complete: {stored_count} new resources stored")
            print(f"📊 Total resources in database: {total_count}")
            print("=" * 40)
            
            logger.info(f"✅ Stored {stored_count} new resources (total: {total_count})")
            return stored_count
            
        except Exception as e:
            print(f"❌ Storage failed: {e}")
            logger.error(f"❌ Failed to store resources: {e}")
            return 0
    
    async def get_resources_for_concept(
        self, 
        concept_id: str, 
        resource_type: Optional[str] = None,
        difficulty_level: Optional[str] = None,
        min_quality_score: float = 0.0,
        limit: int = 20
    ) -> List[Dict]:
        """Get educational resources for a specific concept"""
        try:
            query = """
                SELECT * FROM educational_resources 
                WHERE concept_id = ? AND quality_score >= ?
            """
            params = [concept_id, min_quality_score]
            
            if resource_type:
                query += " AND resource_type = ?"
                params.append(resource_type)
            
            if difficulty_level:
                query += " AND difficulty_level = ?"
                params.append(difficulty_level)
            
            query += " ORDER BY quality_score DESC, view_count DESC LIMIT ?"
            params.append(limit)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(query, params)
                
                resources = []
                for row in cursor.fetchall():
                    resources.append(dict(row))
                
                logger.info(f"📚 Found {len(resources)} resources for {concept_id}")
                return resources
                
        except Exception as e:
            logger.error(f"❌ Failed to get resources for {concept_id}: {e}")
            return []
    
    async def get_resource_statistics(self) -> Dict:
        """Get statistics about stored resources"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                stats = {}
                
                # Total resources
                cursor = conn.execute("SELECT COUNT(*) FROM educational_resources")
                stats['total_resources'] = cursor.fetchone()[0]
                
                # Resources by type
                cursor = conn.execute("""
                    SELECT resource_type, COUNT(*) 
                    FROM educational_resources 
                    GROUP BY resource_type
                """)
                stats['by_type'] = dict(cursor.fetchall())
                
                # Resources by difficulty
                cursor = conn.execute("""
                    SELECT difficulty_level, COUNT(*) 
                    FROM educational_resources 
                    GROUP BY difficulty_level
                """)
                stats['by_difficulty'] = dict(cursor.fetchall())
                
                # Average quality score
                cursor = conn.execute("SELECT AVG(quality_score) FROM educational_resources")
                stats['avg_quality_score'] = round(cursor.fetchone()[0] or 0, 2)
                
                return stats
                
        except Exception as e:
            logger.error(f"❌ Failed to get resource statistics: {e}")
            return {}