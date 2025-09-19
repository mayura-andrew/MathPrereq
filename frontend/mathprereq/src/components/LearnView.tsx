import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';
import SchoolIcon from '@mui/icons-material/School';
import type { LearningPath as LearningPathType } from '../types/api';
import { mathAPI } from '../services/api';

interface APIResource {
  id: string;
  concept_id: string;
  concept_name: string;
  title: string;
  url: string;
  description: string;
  resource_type: string;
  source_domain: string;
  difficulty_level: string;
  quality_score: number;
  content_preview: string;
  scraped_at: string;
  language: string;
  duration: string;
  thumbnail_url: string;
  view_count: number;
  author_channel: string;
  tags: string[] | null;
  is_verified: boolean;
}

interface APIResponse {
  success: boolean;
  message: string;
  resources: APIResource[];
  total_found: number;
  request_id: string;
}

interface LearnViewProps {
  learningPathData: LearningPathType | null;
}

export default function LearnView({ learningPathData }: LearnViewProps) {
  const [resourceSearch, setResourceSearch] = useState('');
  const [searchedResources, setSearchedResources] = useState<APIResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [expandedConcept, setExpandedConcept] = useState<string | false>(false);
  const [completedConcepts, setCompletedConcepts] = useState<Set<string>>(new Set());
  const [conceptResources, setConceptResources] = useState<Record<string, APIResource[]>>({});
  const [loadingConceptResources, setLoadingConceptResources] = useState<Record<string, boolean>>({});

  // Search for learning resources
  const searchResources = async () => {
    if (!resourceSearch.trim()) return;

    setLoadingResources(true);
    try {
      const response = await mathAPI.getResourcesForConcept(resourceSearch.trim(), {
        limit: 10,
        minQuality: 70,
      });
      
      // Handle different response formats
      let apiData: unknown = response;
      if (response && typeof response === 'object' && 'data' in response) {
        // If it's an axios response object, get the data
        apiData = response.data;
      }
      
      let resources: APIResource[] = [];
      if (Array.isArray(apiData)) {
        resources = apiData as APIResource[];
      } else if (apiData && typeof apiData === 'object' && 'resources' in apiData) {
        // If response has resources property, use that
        resources = (apiData as APIResponse).resources || [];
      }
      
      setSearchedResources(resources);
    } catch (error) {
      console.error('Failed to search resources:', error);
      setSearchedResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  // Fetch resources for a specific concept
  const fetchConceptResources = async (conceptId: string, conceptName: string) => {
    setLoadingConceptResources(prev => ({ ...prev, [conceptId]: true }));
    try {
      const response = await mathAPI.getResourcesForConcept(conceptName, {
        limit: 5,
        minQuality: 60,
      });
      
      // Debug logging - check what we actually received
      console.log('Raw API Response:', response);
      console.log('Response type:', typeof response);
      
      // Handle axios response vs direct data
      let apiData: unknown = response;
      if (response && typeof response === 'object' && 'data' in response) {
        // If it's an axios response object, get the data
        apiData = response.data;
        console.log('Using response.data:', apiData);
      }
      
      console.log('API Data type:', typeof apiData);
      console.log('API Data keys:', Object.keys(apiData as object));
      
      // Handle different response formats
      let resources: APIResource[] = [];
      if (Array.isArray(apiData)) {
        console.log('Response is an array with length:', apiData.length);
        resources = apiData as APIResource[];
      } else if (apiData && typeof apiData === 'object' && 'resources' in apiData) {
        console.log('Response has resources property:', (apiData as APIResponse).resources);
        // If response has resources property, use that
        resources = (apiData as APIResponse).resources || [];
      } else {
        console.log('Unexpected response format:', apiData);
      }
      
      console.log('Final extracted resources:', resources);
      
      // Store the resources
      setConceptResources(prev => ({ ...prev, [conceptId]: resources }));
    } catch (error) {
      console.error(`Failed to fetch resources for concept ${conceptName}:`, error);
      setConceptResources(prev => ({ ...prev, [conceptId]: [] }));
    } finally {
      setLoadingConceptResources(prev => ({ ...prev, [conceptId]: false }));
    }
  };

  // Handle concept selection
  const handleConceptClick = (conceptId: string) => {
    setExpandedConcept(conceptId);

    // If resources for this concept are not loaded, fetch them
    if (!conceptResources[conceptId] && learningPathData) {
      const concept = learningPathData.concepts.find(c => c.id === conceptId);
      if (concept) {
        fetchConceptResources(conceptId, concept.name);
      }
    }
  };

  // Mark concept as completed
  const toggleConceptCompletion = (conceptId: string) => {
    const newCompleted = new Set(completedConcepts);
    if (newCompleted.has(conceptId)) {
      newCompleted.delete(conceptId);
    } else {
      newCompleted.add(conceptId);
    }
    setCompletedConcepts(newCompleted);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with search */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon />
          Interactive Learning
        </Typography>

        {/* Resource Search */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search for learning resources (e.g., 'derivatives', 'calculus basics')"
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchResources()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={searchResources}
            disabled={loadingResources || !resourceSearch.trim()}
            startIcon={loadingResources ? <CircularProgress size={16} /> : <SearchIcon />}
          >
            Search
          </Button>
        </Box>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {!learningPathData?.concepts || learningPathData.concepts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No Learning Path Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask a mathematical question in the chat to generate a personalized learning path.
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Learning Path Concepts */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Your Learning Path ({learningPathData.total_concepts} concepts)
            </Typography>

            {/* Progress indicator */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Learning Progress
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1, height: 8, bgcolor: 'grey.200', borderRadius: 4 }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${(completedConcepts.size / learningPathData.total_concepts) * 100}%`,
                      bgcolor: 'success.main',
                      borderRadius: 4,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {completedConcepts.size}/{learningPathData.total_concepts}
                </Typography>
              </Box>
            </Box>

            {learningPathData.concepts.map((concept, index) => (
              <Accordion
                key={concept.id}
                expanded={expandedConcept === concept.id}
                onChange={() => handleConceptClick(concept.id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip
                      label={`${index + 1}`}
                      size="small"
                      color="primary"
                      sx={{ minWidth: 32 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{concept.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {concept.type} • {concept.difficulty_level || 'intermediate'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {completedConcepts.has(concept.id) && (
                        <Chip label="✓" size="small" color="success" />
                      )}
                      {concept.tags && concept.tags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {concept.tags.slice(0, 2).map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ width: '100%' }}>
                    {/* Concept Header */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                        {concept.name}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {concept.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`Type: ${concept.type}`}
                          size="small"
                          color={concept.type === 'prerequisite' ? 'warning' : 'success'}
                        />
                        <Chip
                          label={`Difficulty: ${concept.difficulty_level || 'intermediate'}`}
                          size="small"
                          color={
                            concept.difficulty_level === 'beginner' ? 'success' :
                            concept.difficulty_level === 'intermediate' ? 'warning' : 'error'
                          }
                        />
                        {concept.tags && concept.tags.map((tag, tagIndex) => (
                          <Chip key={tagIndex} label={`#${tag}`} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>

                    {/* Concept Details */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Concept Overview
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {concept.description}
                      </Typography>

                      {/* Key Points */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                          Why this concept matters:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {concept.type === 'prerequisite'
                            ? 'This foundational concept is essential for understanding more advanced mathematical topics.'
                            : 'This is a core concept that builds upon prerequisite knowledge and enables advanced problem-solving.'
                          }
                        </Typography>
                      </Box>
                    </Box>

                    {/* Prerequisites Section */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        📚 Prerequisites
                      </Typography>
                      {learningPathData && learningPathData.concepts
                        .filter(c => c.type === 'prerequisite' && learningPathData.concepts.indexOf(c) < index)
                        .length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {learningPathData.concepts
                            .filter(c => c.type === 'prerequisite' && learningPathData.concepts.indexOf(c) < index)
                            .map((prereq, prereqIndex) => (
                              <Box key={prereq.id} sx={{ pl: 2, borderLeft: 3, borderColor: 'warning.main', py: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {prereqIndex + 1}. {prereq.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {prereq.description}
                                </Typography>
                              </Box>
                            ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No prerequisites required for this concept.
                        </Typography>
                      )}
                    </Box>

                    {/* Completion Button */}
                    <Box sx={{ mb: 3 }}>
                      <Button
                        variant={completedConcepts.has(concept.id) ? 'outlined' : 'contained'}
                        color={completedConcepts.has(concept.id) ? 'success' : 'primary'}
                        size="small"
                        onClick={() => toggleConceptCompletion(concept.id)}
                        startIcon={completedConcepts.has(concept.id) ? '✓' : '+'}
                      >
                        {completedConcepts.has(concept.id) ? 'Mark as Incomplete' : 'Mark as Complete'}
                      </Button>
                    </Box>

                    {/* Fetch Resources Button */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          onClick={() => fetchConceptResources(concept.id, concept.name)}
                          disabled={loadingConceptResources[concept.id]}
                          startIcon={loadingConceptResources[concept.id] ? <CircularProgress size={16} /> : <SearchIcon />}
                        >
                          {loadingConceptResources[concept.id] ? 'Fetching Resources...' : 'Fetch Learning Resources'}
                        </Button>
                        {conceptResources[concept.id] && (
                          <Typography variant="caption" color="text.secondary">
                            {conceptResources[concept.id].length} resources found
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Concept-specific resources */}
                    {conceptResources[concept.id] && conceptResources[concept.id].length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          🎥 Learning Resources for {concept.name}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {conceptResources[concept.id].map((resource) => (
                            <ResourceCard key={resource.id} resource={resource} />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Loading state for concept resources */}
                    {loadingConceptResources[concept.id] && (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Fetching resources for {concept.name}...
                        </Typography>
                      </Box>
                    )}

                    {/* General Resources */}
                    {searchedResources.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          📖 General Resources
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {searchedResources
                            .filter(resource => resource.concept_id === concept.id)
                            .slice(0, 3)
                            .map((resource) => (
                              <ResourceCard key={resource.id} resource={resource} />
                            ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}

            {/* Searched Resources */}
            {searchedResources.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Search Results for "{resourceSearch}"
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {searchedResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </Box>
              </Box>
            )}

            {/* Learning Statistics */}
            <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Learning Statistics
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {learningPathData?.total_concepts || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Concepts
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {completedConcepts.size}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {learningPathData?.concepts.filter(c => c.type === 'prerequisite').length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Prerequisites
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {learningPathData?.concepts.filter(c => c.type === 'target').length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Target Concepts
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// Resource Card Component with YouTube embedding
function ResourceCard({ resource }: { resource: APIResource }) {
  const [showVideo, setShowVideo] = useState(false);
  const videoId = resource.url ? getYouTubeVideoId(resource.url) : null;

  return (
    <Paper sx={{ p: 2, '&:hover': { boxShadow: 2 } }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Thumbnail/Play Button */}
        <Box sx={{ position: 'relative', minWidth: 120, height: 90 }}>
          {videoId && !showVideo ? (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: 'grey.300',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: 1,
              }}
              onClick={() => setShowVideo(true)}
            >
              <PlayArrowIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
          ) : videoId && showVideo ? (
            <iframe
              width="120"
              height="90"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={resource.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: 4 }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: 'grey.300',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
              }}
            >
              {resource.resource_type === 'video' ? <PlayArrowIcon /> : <SearchIcon />}
            </Box>
          )}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {resource.title}
          </Typography>

          {resource.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {resource.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Chip
              label={resource.source_domain || 'youtube'}
              size="small"
              sx={{ bgcolor: getPlatformColor(resource.source_domain || 'youtube'), color: 'white' }}
            />
            <Chip label={resource.resource_type} size="small" variant="outlined" />
            <Chip
              label={resource.difficulty_level}
              size="small"
              color={
                resource.difficulty_level === 'beginner' ? 'success' :
                resource.difficulty_level === 'intermediate' ? 'warning' : 'error'
              }
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {resource.duration && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon fontSize="small" />
                <Typography variant="caption">{resource.duration}</Typography>
              </Box>
            )}

            {resource.view_count && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
                <Typography variant="caption">{resource.view_count.toLocaleString()} views</Typography>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary">
              Quality: {Math.round(resource.quality_score * 100)}/100
            </Typography>
          </Box>

          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Resource
            </Button>
            {videoId && !showVideo && (
              <Button
                size="small"
                variant="contained"
                onClick={() => setShowVideo(true)}
                sx={{ ml: 1 }}
              >
                Watch Video
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

// Helper function for platform colors
function getPlatformColor(platform: string): string {
  switch (platform) {
    case 'youtube.com': return '#ff0000';
    case 'khan_academy': return '#14b866';
    case 'coursera': return '#0056d2';
    default: return '#64748b';
  }
}

// Helper function for YouTube video ID extraction
function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/s]{11})/);
  return match ? match[1] : null;
}