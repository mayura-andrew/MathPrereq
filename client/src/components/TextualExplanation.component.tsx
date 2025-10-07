import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import type { QueryResponse, SmartConceptQueryResponse } from '../types/api';

// Simple markdown-like text processor
const processMathText = (text: string) => {
  if (!text) return [];

  // Split by lines and process each line
  const lines = text.split('\n');
  const processedLines = lines.map((line, index) => {
    // Handle headers (lines starting with #)
    if (line.startsWith('# ')) {
      return { type: 'h1', content: line.substring(2), key: `line-${index}` };
    }
    if (line.startsWith('## ')) {
      return { type: 'h2', content: line.substring(3), key: `line-${index}` };
    }
    if (line.startsWith('### ')) {
      return { type: 'h3', content: line.substring(4), key: `line-${index}` };
    }

    // Handle bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return { type: 'bullet', content: line.substring(2), key: `line-${index}` };
    }

    // Handle numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s(.+)$/);
    if (numberedMatch) {
      return { type: 'numbered', content: numberedMatch[2], number: numberedMatch[1], key: `line-${index}` };
    }

    // Handle bold text **text**
    let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Handle italic text *text*
    processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Handle inline code `code`
    processedLine = processedLine.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle LaTeX-style fractions and superscripts
    processedLine = processedLine.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<sup>$1</sup>/<sub>$2</sub>');
    processedLine = processedLine.replace(/\^(\w+)/g, '<sup>$1</sup>');
    processedLine = processedLine.replace(/_(\w+)/g, '<sub>$1</sub>');

    // Handle mathematical symbols
    processedLine = processedLine.replace(/\\theta/g, 'θ');
    processedLine = processedLine.replace(/\\pi/g, 'π');
    processedLine = processedLine.replace(/\\alpha/g, 'α');
    processedLine = processedLine.replace(/\\beta/g, 'β');
    processedLine = processedLine.replace(/\\gamma/g, 'γ');
    processedLine = processedLine.replace(/\\delta/g, 'δ');
    processedLine = processedLine.replace(/\\Delta/g, 'Δ');
    processedLine = processedLine.replace(/\\infty/g, '∞');
    processedLine = processedLine.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
    processedLine = processedLine.replace(/\\sum/g, '∑');
    processedLine = processedLine.replace(/\\int/g, '∫');

    return { type: 'paragraph', content: processedLine, key: `line-${index}` };
  });

  return processedLines;
};

interface ProcessedLine {
  type: string;
  content: string;
  key: string;
  number?: string;
}

const renderProcessedLine = (line: ProcessedLine) => {
  switch (line.type) {
    case 'h1':
      return (
        <Typography key={line.key} variant="h4" sx={{ mb: 2, mt: 3, fontWeight: 'bold', color: 'primary.main' }}>
          {line.content}
        </Typography>
      );
    case 'h2':
      return (
        <Typography key={line.key} variant="h5" sx={{ mb: 1, mt: 2, fontWeight: 'bold', color: 'primary.main' }}>
          {line.content}
        </Typography>
      );
    case 'h3':
      return (
        <Typography key={line.key} variant="h6" sx={{ mb: 1, mt: 1.5, fontWeight: 'bold' }}>
          {line.content}
        </Typography>
      );
    case 'bullet':
      return (
        <Box key={line.key} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography sx={{ mr: 1, color: 'primary.main' }}>•</Typography>
          <Typography variant="body1" dangerouslySetInnerHTML={{ __html: line.content }} />
        </Box>
      );
    case 'numbered':
      return (
        <Box key={line.key} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography sx={{ mr: 1, minWidth: '24px', color: 'primary.main' }}>{line.number}.</Typography>
          <Typography variant="body1" dangerouslySetInnerHTML={{ __html: line.content }} />
        </Box>
      );
    default:
      return (
        <Typography
          key={line.key}
          variant="body1"
          sx={{ mb: 1, lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: line.content }}
        />
      );
  }
};

export default function TextualExplanation({ response }: { response: QueryResponse | SmartConceptQueryResponse | undefined }) {
  if (!response || !response.success) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="error.main">
          {response?.error || 'No response available'}
        </Typography>
      </Box>
    );
  }

  // Handle different response types
  const isQueryResponse = 'query' in response;
  const isSmartConceptResponse = 'concept_name' in response;

  return (
    <Box sx={{ width: '100%', maxWidth: 'none', overflow: 'visible' }}>
      {/* Response Type Indicator */}
      <Box sx={{ mb: 2 }}>
        <Chip
          label={isQueryResponse ? 'General Query' : 'Smart Concept Analysis'}
          color="primary"
          size="small"
        />
      </Box>

      {/* Main Explanation */}
      {response.explanation && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Explanation
          </Typography>
          <Paper sx={{ 
            p: 2, 
            bgcolor: 'grey.50', 
            overflow: 'visible',
            '& code': {
              bgcolor: 'grey.200',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontFamily: 'monospace',
              fontSize: '0.9em'
            },
            '& strong': {
              fontWeight: 'bold',
              color: 'primary.main'
            },
            '& em': {
              fontStyle: 'italic',
              color: 'secondary.main'
            },
            '& sup': {
              fontSize: '0.8em',
              verticalAlign: 'super'
            },
            '& sub': {
              fontSize: '0.8em',
              verticalAlign: 'sub'
            }
          }}>
            {processMathText(response.explanation).map(renderProcessedLine)}
          </Paper>
        </Box>
      )}


      {/* Identified Concepts */}
      {response.identified_concepts && response.identified_concepts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Key Concepts Identified
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {response.identified_concepts.map((concept, index) => (
              <Chip
                key={index}
                label={concept}
                variant="outlined"
                color="secondary"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Smart Concept Specific Fields */}
      {isSmartConceptResponse && (
        <>
          {/* Concept Name */}
          {(response as SmartConceptQueryResponse).concept_name && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">
                Concept: {(response as SmartConceptQueryResponse).concept_name}
              </Typography>
            </Box>
          )}

          {/* Educational Resources */}
          {(response as SmartConceptQueryResponse).educational_resources &&
           (response as SmartConceptQueryResponse).educational_resources!.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Educational Resources ({(response as SmartConceptQueryResponse).educational_resources!.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(response as SmartConceptQueryResponse).educational_resources!.slice(0, 5).map((resource) => (
                  <Paper key={resource.id} sx={{ p: 2 }}>
                    <Typography variant="subtitle2">{resource.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {resource.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip label={resource.platform} size="small" />
                      <Chip label={resource.resource_type} size="small" variant="outlined" />
                      <Typography variant="caption">
                        Quality: {resource.quality_score}/100
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {/* Cache Information */}
          {(response as SmartConceptQueryResponse).cache_age && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                ⚡ Served from cache ({(response as SmartConceptQueryResponse).cache_age})
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Processing Information */}
      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Processing time: {response.processing_time} •
          Request ID: {response.request_id} •
          Timestamp: {new Date(response.timestamp).toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );
}
