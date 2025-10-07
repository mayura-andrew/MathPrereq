import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { SearchInput } from '../ui';
import { ResourceCard } from '../ui';

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

interface ResourceSearchProps {
  searchedResources: APIResource[];
  loadingResources: boolean;
  onSearch: (query: string) => void;
}

export default function ResourceSearch({
  searchedResources,
  loadingResources,
  onSearch
}: ResourceSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Search for Learning Resources
      </Typography>

      <Box sx={{ mb: 2 }}>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          placeholder="Search for math concepts, topics, or resources..."
          disabled={loadingResources}
        />
      </Box>

      {loadingResources && (
        <Typography variant="body2" color="text.secondary">
          Searching for resources...
        </Typography>
      )}

      {searchedResources.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Found {searchedResources.length} resources
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {searchedResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </Box>
        </Box>
      )}

      {!loadingResources && searchQuery && searchedResources.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No resources found for "{searchQuery}". Try a different search term.
        </Typography>
      )}
    </Box>
  );
}