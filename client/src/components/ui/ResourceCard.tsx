import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Rating from "@mui/material/Rating";
import { RiTimeLine, RiPlayFill, RiVerifiedBadgeFill } from "react-icons/ri";

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
  onSave?: (resource: APIResource) => void;
}

export default function ResourceCard({ resource, onView, onSave }: ResourceCardProps) {
  const handleAction = () => {
    if (onSave) {
      onSave(resource);
    } else if (onView) {
      onView(resource);
    } else {
      window.open(resource.url, "_blank");
    }
  };

  const formatDuration = (duration: string) => {
    // Simple duration formatting - could be enhanced
    return duration || "N/A";
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(resource.url);

  return (
    <Card 
      sx={{ 
        height: "100%", 
        display: "flex", 
        flexDirection: "column", 
        transition: "box-shadow 0.3s ease", 
        "&:hover": { boxShadow: 6 } 
      }}
    >
      <CardContent sx={{ flex: 1, p: 3 }}>
        {videoId ? (
          <Box sx={{ mb: 3, position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 1, overflow: "hidden", boxShadow: 2 }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={resource.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            />
          </Box>
        ) : resource.thumbnail_url ? (
          <Box sx={{ mb: 3, height: 180, backgroundImage: `url(${resource.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 1, boxShadow: 2 }} />
        ) : null}
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Typography variant="h5" component="h2" sx={{ flex: 1 }}>
            {resource.title}
          </Typography>
          {resource.is_verified && <RiVerifiedBadgeFill size={20} color="primary" />}
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {resource.description}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          {resource.duration && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <RiTimeLine size={16} color="action" />
              <Typography variant="body2" color="text.secondary">
                {formatDuration(resource.duration)}
              </Typography>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            {formatViewCount(resource.view_count)}
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2 }}>
        <Button
          size="large"
          startIcon={<RiPlayFill />}
          onClick={handleAction}
          fullWidth
          variant="contained"
          color="primary"
        >
          Save for Later
        </Button>
      </CardActions>
    </Card>
  );
}
