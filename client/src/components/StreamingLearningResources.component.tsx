import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import LinearProgress from "@mui/material/LinearProgress";
import Fade from "@mui/material/Fade";
import Grow from "@mui/material/Grow";
import { Fragment } from "react";
import { styled, keyframes } from "@mui/material/styles";
import {
  RiPlayCircleLine,
  RiStarLine,
  RiCheckboxCircleLine,
  RiBookOpenLine,
  RiVideoLine,
  RiArticleLine,
  RiLinkM,
  RiArrowRightSLine,
} from "react-icons/ri";
import type { StreamState } from "../types/streaming";
import type { ResourceItem } from "../types/streaming";

// Animations
const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const Container = styled(Box)(({ theme }) => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.default,
}));

const VideoCard = styled(Card)(() => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer",
  animation: `${slideInUp} 0.5s ease-out`,
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
  },
}));

const ThumbnailContainer = styled(Box)({
  position: "relative",
  width: "100%",
  paddingBottom: "56.25%", // 16:9 aspect ratio
  overflow: "hidden",
  backgroundColor: "#000",
});

const PlayOverlay = styled(Box)(() => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.3)",
  opacity: 0,
  transition: "opacity 0.3s ease",
  "&:hover": {
    opacity: 1,
  },
}));

const LoadingSkeleton = styled(Box)(({ theme }) => ({
  background: `linear-gradient(90deg, ${theme.palette.grey[200]} 0%, ${theme.palette.grey[300]} 50%, ${theme.palette.grey[200]} 100%)`,
  backgroundSize: "1000px 100%",
  animation: `${shimmer} 2s infinite`,
  borderRadius: theme.shape.borderRadius,
}));

interface ConceptWithResources {
  name: string;
  resources: ResourceItem[];
  isCompleted: boolean;
}

interface StreamingLearningResourcesProps {
  streamState: StreamState;
}

export default function StreamingLearningResources({
  streamState,
}: StreamingLearningResourcesProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [completedConcepts, setCompletedConcepts] = useState<Set<string>>(new Set());
  const [conceptsWithResources, setConceptsWithResources] = useState<ConceptWithResources[]>([]);

  // Process concepts and resources
  useEffect(() => {
    if (!streamState.concepts || streamState.concepts.length === 0) return;

    const concepts = streamState.concepts.map((concept) => ({
      name: concept,
      resources: streamState.resources || [],
      isCompleted: completedConcepts.has(concept),
    }));

    setConceptsWithResources(concepts);
  }, [streamState.concepts, streamState.resources, completedConcepts]);

  const toggleConceptCompletion = (conceptName: string) => {
    setCompletedConcepts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(conceptName)) {
        newSet.delete(conceptName);
      } else {
        newSet.add(conceptName);
      }
      return newSet;
    });
  };

  const handleVideoClick = (resource: ResourceItem) => {
    window.open(resource.url, "_blank");
  };

  const getYouTubeVideoId = (url: string): string | null => {
    const match = url.match(
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    );
    return match ? match[1] : null;
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "video":
        return <RiVideoLine />;
      case "article":
        return <RiArticleLine />;
      case "documentation":
        return <RiBookOpenLine />;
      default:
        return <RiLinkM />;
    }
  };

  // Render video card
  const renderVideoCard = (resource: ResourceItem, index: number) => {
    const videoId = getYouTubeVideoId(resource.url);
    // Use null as fallback since thumbnail_url doesn't exist on ResourceItem type
    const thumbnailUrl = videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : null;

    return (
      <Grow in={true} timeout={500 + index * 100} key={resource.id || index}>
        <Box sx={{ p: 1, width: { xs: '100%', sm: '50%', md: '33.333%' } }}>
          <VideoCard onClick={() => handleVideoClick(resource)}>
            {/* Thumbnail */}
            <ThumbnailContainer>
              {thumbnailUrl ? (
                <Box
                  component="img"
                  src={thumbnailUrl}
                  alt={resource.title}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "grey.800",
                  }}
                >
                  <RiVideoLine size={48} color="#fff" />
                </Box>
              )}
              <PlayOverlay>
                <IconButton
                  sx={{
                    bgcolor: "rgba(255,255,255,0.9)",
                    "&:hover": { bgcolor: "white" },
                  }}
                >
                  <RiPlayCircleLine size={48} color="#1976d2" />
                </IconButton>
              </PlayOverlay>

              {/* Duration badge - commented out as duration doesn't exist on ResourceItem */}
              {/* {resource.duration && (
                <Chip
                  icon={<RiTimeLine />}
                  label={formatDuration(resource.duration)}
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    bgcolor: "rgba(0,0,0,0.8)",
                    color: "white",
                  }}
                />
              )} */}
            </ThumbnailContainer>

            {/* Content */}
            <CardContent sx={{ flex: 1, p: 2 }}>
              {/* Title */}
              <Typography
                variant="h6"
                sx={{
                  mb: 1,
                  fontSize: "1rem",
                  fontWeight: 600,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: 1.4,
                }}
              >
                {resource.title}
              </Typography>

              {/* Description */}
              {resource.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {resource.description}
                </Typography>
              )}

              {/* Metadata */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
                {/* Resource Type */}
                <Chip
                  icon={getResourceTypeIcon(resource.type)}
                  label={resource.type}
                  size="small"
                  variant="outlined"
                />

                {/* Quality Score */}
                {resource.quality_score && (
                  <Chip
                    icon={<RiStarLine />}
                    label={`${Math.round(resource.quality_score * 100)}%`}
                    size="small"
                    sx={{
                      bgcolor: "warning.light",
                      color: "warning.contrastText",
                    }}
                  />
                )}
              </Box>

              {/* Stats */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                {/* View count commented out as view_count doesn't exist on ResourceItem */}
                {/* {resource.view_count && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <RiEyeLine size={16} color="#64748b" />
                    <Typography variant="caption" color="text.secondary">
                      {formatViewCount(resource.view_count)} views
                    </Typography>
                  </Box>
                )} */}

                {resource.platform && (
                  <Chip
                    label={resource.platform}
                    size="small"
                    sx={{ fontSize: "0.7rem" }}
                  />
                )}
              </Box>
            </CardContent>

            {/* Actions */}
            <Box sx={{ px: 2, pb: 2 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<RiPlayCircleLine />}
                endIcon={<RiArrowRightSLine />}
                onClick={() => handleVideoClick(resource)}
              >
                Watch Now
              </Button>
            </Box>
          </VideoCard>
        </Box>
      </Grow>
    );
  };

  // Loading skeleton
  const renderSkeleton = () => (
    <Box sx={{ p: 1, width: { xs: '100%', sm: '50%', md: '33.333%' } }}>
      <Card>
        <LoadingSkeleton sx={{ height: 200 }} />
        <CardContent>
          <LoadingSkeleton sx={{ height: 20, mb: 1 }} />
          <LoadingSkeleton sx={{ height: 16, width: "80%", mb: 2 }} />
          <Box sx={{ display: "flex", gap: 1 }}>
            <LoadingSkeleton sx={{ height: 24, width: 60 }} />
            <LoadingSkeleton sx={{ height: 24, width: 60 }} />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const hasResources = streamState.resources && streamState.resources.length > 0;
  const hasConcepts = streamState.concepts && streamState.concepts.length > 0;

  return (
    <Container>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
            <RiBookOpenLine />
            Learning Resources
          </Typography>

          {hasConcepts && (
            <Chip
              label={`${completedConcepts.size}/${streamState.concepts?.length || 0} Completed`}
              color={completedConcepts.size === streamState.concepts?.length ? "success" : "default"}
              icon={<RiCheckboxCircleLine />}
            />
          )}
        </Box>

        {/* Progress Bar */}
        {hasConcepts && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Your Learning Progress
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">
                {Math.round((completedConcepts.size / (streamState.concepts?.length || 1)) * 100)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(completedConcepts.size / (streamState.concepts?.length || 1)) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: "grey.200",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  background: "linear-gradient(90deg, #10b981 0%, #22c55e 100%)",
                },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Concept Tabs */}
      {hasConcepts && conceptsWithResources.length > 0 && (
        <Paper sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2 }}
          >
            {conceptsWithResources.map((concept) => (
              <Tab
                key={concept.name}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {concept.name}
                    {completedConcepts.has(concept.name) && (
                      <RiCheckboxCircleLine color="#10b981" size={18} />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {!hasConcepts && !hasResources ? (
          // Empty state
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 300,
              textAlign: "center",
            }}
          >
            <RiBookOpenLine size={64} color="#94a3b8" style={{ marginBottom: 16 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Learning Resources Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask a question in the streaming chat to discover learning resources
            </Typography>
          </Box>
        ) : streamState.isStreaming && !hasResources ? (
          // Loading state
          <Box>
            <Typography variant="h6" gutterBottom>
              Loading Resources...
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
              {[1, 2, 3].map((i) => (
                <Fragment key={i}>{renderSkeleton()}</Fragment>
              ))}
            </Box>
          </Box>
        ) : (
          // Resources grid
          <Fade in={true} timeout={500}>
            <Box>
              {/* Current concept header */}
              {conceptsWithResources[activeTab] && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {conceptsWithResources[activeTab].name}
                    </Typography>
                    <Button
                      variant={completedConcepts.has(conceptsWithResources[activeTab].name) ? "outlined" : "contained"}
                      color={completedConcepts.has(conceptsWithResources[activeTab].name) ? "success" : "primary"}
                      startIcon={<RiCheckboxCircleLine />}
                      onClick={() => toggleConceptCompletion(conceptsWithResources[activeTab].name)}
                    >
                      {completedConcepts.has(conceptsWithResources[activeTab].name)
                        ? "Mark Incomplete"
                        : "Mark Complete"}
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {streamState.resources?.length || 0} learning resource{streamState.resources?.length !== 1 ? "s" : ""} available
                  </Typography>
                </Box>
              )}

              {/* Resources grid */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
                {streamState.resources?.map((resource, index) => renderVideoCard(resource, index))}
              </Box>

              {/* No resources for current concept */}
              {(!streamState.resources || streamState.resources.length === 0) && !streamState.isStreaming && (
                <Box
                  sx={{
                    p: 4,
                    textAlign: "center",
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    border: "2px dashed",
                    borderColor: "divider",
                  }}
                >
                  <RiVideoLine size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No resources found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Resources for this concept will appear here
                  </Typography>
                </Box>
              )}
            </Box>
          </Fade>
        )}
      </Box>
    </Container>
  );
}
