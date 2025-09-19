import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';
import type { EducationalResource } from '../types/api';
import { mathAPI } from '../services/api';

interface ResourceProps {
  resources: EducationalResource[];
  onSearch: (query: string) => void;
  selectedConcept?: { id: number; title: string; description?: string } | null;
}

export default function Resources({ resources, onSearch, selectedConcept }: ResourceProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedResources, setFetchedResources] = useState<EducationalResource[]>([]);

  // Fetch resources for selected concept
  useEffect(() => {
    if (selectedConcept?.title) {
      setLoading(true);
      mathAPI.getResourcesForConcept(selectedConcept.title, {
        limit: 10,
        minQuality: 70,
      })
        .then((data) => {
          setFetchedResources(data);
        })
        .catch((error) => {
          console.error('Failed to fetch resources:', error);
          setFetchedResources([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setFetchedResources([]);
    }
  }, [selectedConcept]);

  const displayResources = selectedConcept ? fetchedResources : resources;

  const getResourceIcon = (type?: string) => {
    switch (type) {
      case 'video': return <PlayArrowIcon />;
      case 'article': return <DescriptionIcon />;
      default: return <LinkIcon />;
    }
  };

  const getPlatformColor = (platform?: string) => {
    if (!platform) return '#64748b';
    switch (platform) {
      case 'youtube': return '#ff0000';
      case 'khan_academy': return '#14b866';
      case 'coursera': return '#0056d2';
      default: return '#64748b';
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Learning Resources</Typography>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search resources..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          onSearch(e.target.value);
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Selected Concept Info */}
      {selectedConcept && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="primary">
            Resources for: {selectedConcept.title}
          </Typography>
          {selectedConcept.description && (
            <Typography variant="body2" color="text.secondary">
              {selectedConcept.description}
            </Typography>
          )}
        </Box>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 1 }}>
            Loading resources...
          </Typography>
        </Box>
      )}

      {/* Resources List */}
      {!loading && displayResources.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayResources.map((resource) => (
            <Paper key={resource.id} sx={{ p: 2, '&:hover': { boxShadow: 2 } }}>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <Box sx={{ color: getPlatformColor(resource.platform) }}>
                  {getResourceIcon(resource.resource_type)}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {resource.title || 'Untitled Resource'}
                  </Typography>

                  {resource.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {resource.description}
                    </Typography>
                  )}

                  <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <Chip
                      label={resource.platform ? resource.platform.replace('_', ' ') : 'Unknown'}
                      size="small"
                      sx={{ bgcolor: getPlatformColor(resource.platform), color: 'white' }}
                    />
                    <Chip
                      label={resource.resource_type || 'unknown'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={resource.difficulty_level || 'unknown'}
                      size="small"
                      color={
                        resource.difficulty_level === 'beginner' ? 'success' :
                        resource.difficulty_level === 'intermediate' ? 'warning' :
                        resource.difficulty_level === 'advanced' ? 'error' : 'default'
                      }
                      variant="outlined"
                    />
                  </Box>

                  <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                    {resource.estimated_duration && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <AccessTimeIcon fontSize="small" />
                        <Typography variant="caption">
                          {resource.estimated_duration}
                        </Typography>
                      </Box>
                    )}

                    {typeof resource.rating === 'number' && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
                        <Typography variant="caption">
                          {resource.rating}
                        </Typography>
                      </Box>
                    )}

                    {typeof resource.quality_score === 'number' && (
                      <Typography variant="caption" color="text.secondary">
                        Quality: {resource.quality_score}/100
                      </Typography>
                    )}
                  </Box>

                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="contained"
                      href={resource.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<LinkIcon />}
                      disabled={!resource.url}
                    >
                      Open Resource
                    </Button>

                    {typeof resource.view_count === 'number' && (
                      <Typography variant="caption" color="text.secondary">
                        {resource.view_count.toLocaleString()} views
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : !loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {selectedConcept
              ? `No resources found for "${selectedConcept.title}"`
              : 'No resources available'
            }
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
