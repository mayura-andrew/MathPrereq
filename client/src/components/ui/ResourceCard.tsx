import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

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

interface ResourceCardProps {
  resource: APIResource;
  onView?: (resource: APIResource) => void;
}

export default function ResourceCard({ resource, onView }: ResourceCardProps) {
  const handleView = () => {
    if (onView) {
      onView(resource);
    } else {
      window.open(resource.url, '_blank');
    }
  };

  const formatDuration = (duration: string) => {
    // Simple duration formatting - could be enhanced
    return duration || 'N/A';
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {resource.title}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {resource.description}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            label={resource.resource_type}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={resource.difficulty_level}
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Rating
            value={resource.quality_score / 20} // Assuming score is out of 100
            readOnly
            size="small"
            precision={0.5}
          />
          <Typography variant="body2" color="text.secondary">
            ({resource.quality_score}/100)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          {resource.duration && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {formatDuration(resource.duration)}
              </Typography>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            {formatViewCount(resource.view_count)}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          by {resource.author_channel} • {resource.source_domain}
        </Typography>

        {resource.tags && resource.tags.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {resource.tags.slice(0, 3).map((tag, index) => (
              <Chip key={index} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}
      </CardContent>

      <CardActions>
        <Button
          size="small"
          startIcon={<PlayArrowIcon />}
          onClick={handleView}
          fullWidth
        >
          View Resource
        </Button>
      </CardActions>
    </Card>
  );
}