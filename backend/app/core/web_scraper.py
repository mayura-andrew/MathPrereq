import aiohttp
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, quote
from typing import List, Dict, Optional, Set
from dataclasses import dataclass
from pathlib import Path
from datetime import datetime
import re
import json

import structlog

logger = structlog.get_logger()

@dataclass
class EducationalResource:
    """Represents an educational resource found online"""
    concept_id: str
    concept_name: str
    title: str
    url: str
    description: str
    resource_type: str  # 'video', 'article', 'tutorial', 'example', 'practice'
    source_domain: str
    difficulty_level: str  # 'beginner', 'intermediate', 'advanced'
    quality_score: float  # 0.0 to 1.0
    content_preview: str
    scraped_at: str
    language: str = 'en'
    duration: Optional[str] = None  # For videos
    thumbnail_url: Optional[str] = None  # For videos

class EducationalWebScraper:
    """Scrapes educational content for mathematical concepts"""
    
    def __init__(self, max_concurrent_requests: int = 10):
        self.max_concurrent_requests = max_concurrent_requests
        self.session = None
        self.scraped_urls: Set[str] = set()
        
        # Educational sites to target
        self.educational_domains = [
            'youtube.com',
            'youtu.be',
            'khanacademy.org',
            'coursera.org', 
            'edx.org',
            'mit.edu',
            'stanford.edu',
            'mathworld.wolfram.com',
            'brilliant.org',
            'mathisfun.com',
            'paulmseducation.com',
            'tutorial.math.lamar.edu',
            'mathinsight.org',
            'betterexplained.com',
            'patrickjmt.com',
            'professorleonard.com'
        ]
    
    async def __aenter__(self):
        connector = aiohttp.TCPConnector(limit=self.max_concurrent_requests)
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def scrape_resources_for_concepts(self, concept_names: List[str]) -> List[EducationalResource]:
        """Scrape educational resources for specific concepts"""
        try:
            logger.info(f"🔍 Starting resource scraping for {len(concept_names)} concepts")
            all_resources = []
            
            # Create search queries for each concept
            search_queries = []
            for concept_name in concept_names:
                query = self._create_search_query_from_name(concept_name)
                search_queries.append(query)
            
            # Process concepts in batches
            batch_size = 3
            for i in range(0, len(search_queries), batch_size):
                batch = search_queries[i:i + batch_size]
                logger.info(f"🔄 Processing batch {i//batch_size + 1}/{(len(search_queries)-1)//batch_size + 1}")
                
                # Process batch concurrently
                batch_tasks = [
                    self._scrape_resources_for_concept(query)
                    for query in batch
                ]
                
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # Collect results
                for result in batch_results:
                    if isinstance(result, list):
                        all_resources.extend(result)
                    else:
                        logger.error(f"❌ Batch processing error: {result}")
                
                # Rate limiting between batches
                await asyncio.sleep(2)
            
            # Deduplicate and filter quality resources
            unique_resources = self._deduplicate_resources(all_resources)
            quality_resources = self._filter_quality_resources(unique_resources)
            
            logger.info(f"✅ Scraped {len(quality_resources)} quality educational resources")
            return quality_resources
            
        except Exception as e:
            logger.error(f"❌ Failed to scrape resources: {e}")
            return []

    def _create_search_query_from_name(self, concept_name: str) -> Dict[str, str]:
        """Create search query from concept name"""
        # Generate concept ID from name
        concept_id = concept_name.lower().replace(' ', '_').replace('-', '_')
        
        return {
            'concept_id': concept_id,
            'concept_name': concept_name,
            'search_terms': [
                f"{concept_name} tutorial",
                f"{concept_name} explained",
                f"{concept_name} examples", 
                f"learn {concept_name}",
                f"{concept_name} calculus",
                f"how to {concept_name}",
                f"{concept_name} step by step"
            ]
        }

    async def _scrape_resources_for_concept(self, query: Dict[str, str]) -> List[EducationalResource]:
        """Scrape educational resources for a single concept"""
        try:
            logger.info(f"🔍 Scraping resources for: {query['concept_name']}")
            resources = []
            
            # Search different platforms
            search_tasks = [
                self._search_youtube(query),
                self._search_khan_academy(query),
                self._search_mathworld(query),
                self._search_general_education_sites(query)
            ]
            
            search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            for result in search_results:
                if isinstance(result, list):
                    resources.extend(result)
                else:
                    logger.error(f"❌ Search error: {result}")
            
            logger.info(f"📚 Found {len(resources)} resources for {query['concept_name']}")
            return resources
            
        except Exception as e:
            logger.error(f"❌ Failed to scrape resources for {query['concept_name']}: {e}")
            return []

    async def _search_youtube(self, query: Dict[str, str]) -> List[EducationalResource]:
        """Search YouTube for educational videos"""
        try:
            resources = []
            concept_name = query['concept_name']
            
            # YouTube search terms specifically for math education
            youtube_queries = [
                f"{concept_name} calculus tutorial",
                f"{concept_name} math explained",
                f"learn {concept_name} mathematics",
                f"{concept_name} examples step by step"
            ]
            
            for search_term in youtube_queries[:2]:  # Limit to avoid rate limiting
                try:
                    # Use YouTube's search results page (scraping approach)
                    search_url = f"https://www.youtube.com/results?search_query={quote(search_term)}"
                    
                    async with self.session.get(search_url) as response:
                        if response.status == 200:
                            html = await response.text()
                            youtube_resources = self._parse_youtube_results(html, query)
                            resources.extend(youtube_resources)
                            
                            # Limit results per search term
                            if len(youtube_resources) >= 3:
                                break
                                
                except Exception as e:
                    logger.error(f"❌ YouTube search error for '{search_term}': {e}")
                    continue
                
                await asyncio.sleep(1)  # Rate limiting
            
            return resources[:5]  # Return top 5 YouTube results
            
        except Exception as e:
            logger.error(f"❌ YouTube search failed: {e}")
            return []

    def _parse_youtube_results(self, html: str, query: Dict[str, str]) -> List[EducationalResource]:
        """Parse YouTube search results HTML"""
        try:
            resources = []
            
            # Extract video data from YouTube's initial data
            # Look for ytInitialData in the HTML
            pattern = r'var ytInitialData = ({.*?});'
            match = re.search(pattern, html)
            
            if match:
                try:
                    data = json.loads(match.group(1))
                    videos = self._extract_video_info_from_youtube_data(data)
                    
                    for video in videos[:5]:  # Top 5 videos
                        if self._is_educational_video(video):
                            resource = EducationalResource(
                                concept_id=query['concept_id'],
                                concept_name=query['concept_name'],
                                title=video.get('title', ''),
                                url=f"https://www.youtube.com/watch?v={video.get('videoId', '')}",
                                description=video.get('description', '')[:500],
                                resource_type='video',
                                source_domain='youtube.com',
                                difficulty_level=self._assess_video_difficulty(video),
                                quality_score=self._calculate_youtube_quality_score(video),
                                content_preview=video.get('description', '')[:200],
                                scraped_at=datetime.now().isoformat(),
                                duration=video.get('duration', ''),
                                thumbnail_url=video.get('thumbnail', '')
                            )
                            resources.append(resource)
                            
                except json.JSONDecodeError:
                    logger.error("❌ Failed to parse YouTube data JSON")
            
            return resources
            
        except Exception as e:
            logger.error(f"❌ Failed to parse YouTube results: {e}")
            return []

    def _extract_video_info_from_youtube_data(self, data: Dict) -> List[Dict]:
        """Extract video information from YouTube's ytInitialData"""
        videos = []
        try:
            # Navigate the YouTube data structure
            contents = data.get('contents', {}).get('twoColumnSearchResultsRenderer', {}).get('primaryContents', {})
            search_results = contents.get('sectionListRenderer', {}).get('contents', [])
            
            for section in search_results:
                items = section.get('itemSectionRenderer', {}).get('contents', [])
                
                for item in items:
                    if 'videoRenderer' in item:
                        video_data = item['videoRenderer']
                        
                        # Extract video information
                        video_info = {
                            'videoId': video_data.get('videoId', ''),
                            'title': self._extract_text_from_runs(video_data.get('title', {})),
                            'description': self._extract_text_from_runs(video_data.get('descriptionSnippet', {})),
                            'duration': self._extract_text_from_accessibility(video_data.get('lengthText', {})),
                            'views': self._extract_text_from_runs(video_data.get('viewCountText', {})),
                            'channel': self._extract_text_from_runs(video_data.get('ownerText', {})),
                            'thumbnail': video_data.get('thumbnail', {}).get('thumbnails', [{}])[-1].get('url', ''),
                            'publishedTime': self._extract_text_from_runs(video_data.get('publishedTimeText', {}))
                        }
                        
                        if video_info['videoId'] and video_info['title']:
                            videos.append(video_info)
            
        except Exception as e:
            logger.error(f"❌ Error extracting video info: {e}")
            
        return videos

    def _extract_text_from_runs(self, text_obj: Dict) -> str:
        """Extract text from YouTube's text run objects"""
        try:
            if isinstance(text_obj, dict):
                if 'runs' in text_obj:
                    return ''.join([run.get('text', '') for run in text_obj['runs']])
                elif 'simpleText' in text_obj:
                    return text_obj['simpleText']
            return str(text_obj) if text_obj else ''
        except:
            return ''

    def _extract_text_from_accessibility(self, text_obj: Dict) -> str:
        """Extract text from accessibility objects"""
        try:
            if 'accessibility' in text_obj:
                return text_obj['accessibility'].get('accessibilityData', {}).get('label', '')
            return self._extract_text_from_runs(text_obj)
        except:
            return ''

    def _is_educational_video(self, video: Dict) -> bool:
        """Check if video is educational based on title and channel"""
        try:
            title = video.get('title', '').lower()
            channel = video.get('channel', '').lower()
            
            # Educational keywords in title
            educational_keywords = [
                'tutorial', 'explained', 'learn', 'how to', 'lesson', 'lecture',
                'calculus', 'mathematics', 'math', 'derivative', 'integral',
                'step by step', 'example', 'practice', 'course'
            ]
            
            # Known educational channels
            educational_channels = [
                'khan academy', 'patrickjmt', 'professor leonard', 'organic chemistry tutor',
                'mathologer', 'blackpenredpen', 'bprp', 'krista king math', 'math and science',
                'eddie woo', 'nancy pi', 'professor dave explains'
            ]
            
            # Check for educational content
            has_educational_keywords = any(keyword in title for keyword in educational_keywords)
            is_educational_channel = any(edu_channel in channel for edu_channel in educational_channels)
            
            return has_educational_keywords or is_educational_channel
            
        except Exception as e:
            logger.error(f"❌ Error checking if video is educational: {e}")
            return False

    def _assess_video_difficulty(self, video: Dict) -> str:
        """Assess video difficulty level"""
        try:
            title = video.get('title', '').lower()
            description = video.get('description', '').lower()
            content = f"{title} {description}"
            
            # Beginner indicators
            beginner_keywords = ['intro', 'basic', 'beginner', 'simple', 'easy', 'start']
            # Advanced indicators  
            advanced_keywords = ['advanced', 'complex', 'graduate', 'proof', 'theorem']
            
            beginner_score = sum(1 for keyword in beginner_keywords if keyword in content)
            advanced_score = sum(1 for keyword in advanced_keywords if keyword in content)
            
            if beginner_score > advanced_score:
                return 'beginner'
            elif advanced_score > beginner_score:
                return 'advanced'
            else:
                return 'intermediate'
                
        except Exception as e:
            logger.error(f"❌ Error assessing video difficulty: {e}")
            return 'intermediate'

    def _calculate_youtube_quality_score(self, video: Dict) -> float:
        """Calculate quality score for YouTube video"""
        try:
            score = 0.5  # Base score
            
            # Channel reputation (simplified)
            channel = video.get('channel', '').lower()
            reputable_channels = [
                'khan academy', 'patrickjmt', 'professor leonard', 
                'organic chemistry tutor', 'mathologer'
            ]
            
            if any(ch in channel for ch in reputable_channels):
                score += 0.3
            
            # Title quality
            title = video.get('title', '')
            if len(title) > 20 and 'explained' in title.lower():
                score += 0.1
            
            # Duration (prefer 10-30 minute videos for tutorials)
            duration = video.get('duration', '')
            if '10:' in duration or '1' in duration[:2] or '2' in duration[:2]:
                score += 0.1
            
            return min(score, 1.0)
            
        except Exception as e:
            logger.error(f"❌ Error calculating video quality: {e}")
            return 0.5

    async def _search_khan_academy(self, query: Dict[str, str]) -> List[EducationalResource]:
        """Search Khan Academy for resources"""
        try:
            resources = []
            concept_name = query['concept_name']
            
            # Khan Academy search
            search_url = f"https://www.khanacademy.org/search?search_again=1&page_search_query={quote(concept_name)}"
            
            async with self.session.get(search_url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Parse Khan Academy results
                    for result in soup.find_all('a', class_='_1qhz5qmy')[:3]:  # Top 3 results
                        try:
                            title = result.get('aria-label', '')
                            relative_url = result.get('href', '')
                            full_url = urljoin('https://www.khanacademy.org', relative_url)
                            
                            if title and relative_url:
                                resource = EducationalResource(
                                    concept_id=query['concept_id'],
                                    concept_name=query['concept_name'],
                                    title=title,
                                    url=full_url,
                                    description=f"Khan Academy lesson on {concept_name}",
                                    resource_type='tutorial',
                                    source_domain='khanacademy.org',
                                    difficulty_level='beginner',
                                    quality_score=0.9,  # Khan Academy is high quality
                                    content_preview=title,
                                    scraped_at=datetime.now().isoformat()
                                )
                                resources.append(resource)
                                
                        except Exception as e:
                            logger.error(f"❌ Error parsing Khan Academy result: {e}")
                            continue
            
            return resources
            
        except Exception as e:
            logger.error(f"❌ Khan Academy search failed: {e}")
            return []

    async def _search_mathworld(self, query: Dict[str, str]) -> List[EducationalResource]:
        """Search Wolfram MathWorld for resources"""
        try:
            resources = []
            concept_name = query['concept_name']
            
            # MathWorld direct search
            search_url = f"https://mathworld.wolfram.com/search/?query={quote(concept_name)}"
            
            async with self.session.get(search_url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Parse MathWorld results
                    for result in soup.find_all('a', href=True)[:2]:  # Top 2 results
                        href = result.get('href', '')
                        if '/topics/' in href or concept_name.lower().replace(' ', '') in href.lower():
                            try:
                                title = result.get_text().strip()
                                full_url = urljoin('https://mathworld.wolfram.com', href)
                                
                                if title and full_url:
                                    resource = EducationalResource(
                                        concept_id=query['concept_id'],
                                        concept_name=query['concept_name'],
                                        title=f"{title} - MathWorld",
                                        url=full_url,
                                        description=f"Mathematical definition and explanation of {concept_name}",
                                        resource_type='reference',
                                        source_domain='mathworld.wolfram.com',
                                        difficulty_level='intermediate',
                                        quality_score=0.8,
                                        content_preview=title,
                                        scraped_at=datetime.now().isoformat()
                                    )
                                    resources.append(resource)
                                    
                            except Exception as e:
                                logger.error(f"❌ Error parsing MathWorld result: {e}")
                                continue
            
            return resources
            
        except Exception as e:
            logger.error(f"❌ MathWorld search failed: {e}")
            return []

    async def _search_general_education_sites(self, query: Dict[str, str]) -> List[EducationalResource]:
        """Search other educational sites"""
        try:
            resources = []
            concept_name = query['concept_name']
            
            # Search specific educational sites
            sites_to_search = [
                ('brilliant.org', 'https://brilliant.org/search/?q='),
                ('mathisfun.com', 'https://www.mathsisfun.com/search/search.html?query=')
            ]
            
            for domain, search_base in sites_to_search:
                try:
                    search_url = f"{search_base}{quote(concept_name)}"
                    
                    async with self.session.get(search_url) as response:
                        if response.status == 200:
                            html = await response.text()
                            soup = BeautifulSoup(html, 'html.parser')
                            
                            # Generic parsing for educational content
                            for link in soup.find_all('a', href=True)[:2]:
                                href = link.get('href')
                                text = link.get_text().strip()
                                
                                if (text and len(text) > 10 and 
                                    concept_name.lower() in text.lower() and
                                    href and not href.startswith('#')):
                                    
                                    full_url = urljoin(f"https://{domain}", href)
                                    
                                    resource = EducationalResource(
                                        concept_id=query['concept_id'],
                                        concept_name=query['concept_name'],
                                        title=text,
                                        url=full_url,
                                        description=f"Educational content about {concept_name}",
                                        resource_type='article',
                                        source_domain=domain,
                                        difficulty_level='intermediate',
                                        quality_score=0.7,
                                        content_preview=text,
                                        scraped_at=datetime.now().isoformat()
                                    )
                                    resources.append(resource)
                                    
                except Exception as e:
                    logger.error(f"❌ Error searching {domain}: {e}")
                    continue
                    
                await asyncio.sleep(1)  # Rate limiting
            
            return resources
            
        except Exception as e:
            logger.error(f"❌ General education sites search failed: {e}")
            return []

    def _deduplicate_resources(self, resources: List[EducationalResource]) -> List[EducationalResource]:
        """Remove duplicate resources based on URL and title similarity"""
        try:
            seen_urls = set()
            seen_titles = set()
            unique_resources = []
            
            for resource in resources:
                # Check URL uniqueness
                if resource.url in seen_urls:
                    continue
                    
                # Check title similarity (simple approach)
                title_key = resource.title.lower().strip()
                if title_key in seen_titles:
                    continue
                
                seen_urls.add(resource.url)
                seen_titles.add(title_key)
                unique_resources.append(resource)
            
            logger.info(f"🔄 Deduplicated: {len(resources)} -> {len(unique_resources)} resources")
            return unique_resources
            
        except Exception as e:
            logger.error(f"❌ Error deduplicating resources: {e}")
            return resources

    def _filter_quality_resources(self, resources: List[EducationalResource]) -> List[EducationalResource]:
        """Filter resources based on quality score and relevance"""
        try:
            # Sort by quality score descending
            sorted_resources = sorted(resources, key=lambda x: x.quality_score, reverse=True)
            
            # Filter minimum quality threshold
            quality_resources = [r for r in sorted_resources if r.quality_score >= 0.4]
            
            # Limit per concept and diversify resource types
            final_resources = []
            concept_counts = {}
            
            for resource in quality_resources:
                concept_id = resource.concept_id
                
                if concept_id not in concept_counts:
                    concept_counts[concept_id] = {'total': 0, 'video': 0, 'article': 0}
                
                counts = concept_counts[concept_id]
                
                # Limit total resources per concept
                if counts['total'] >= 6:
                    continue
                
                # Ensure diversity of resource types
                if resource.resource_type == 'video' and counts['video'] >= 3:
                    continue
                if resource.resource_type in ['article', 'tutorial'] and counts['article'] >= 3:
                    continue
                
                final_resources.append(resource)
                counts['total'] += 1
                counts[resource.resource_type] = counts.get(resource.resource_type, 0) + 1
            
            logger.info(f"🎯 Quality filtered: {len(resources)} -> {len(final_resources)} resources")
            return final_resources
            
        except Exception as e:
            logger.error(f"❌ Error filtering quality resources: {e}")
            return resources