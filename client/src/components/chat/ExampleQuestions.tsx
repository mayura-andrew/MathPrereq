import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface ExampleQuestionsProps {
  onSelectQuestion: (question: string) => void;
}

const exampleQuestions = [
  'How do I solve quadratic equations?',
  'What is the chain rule in calculus?',
  'Explain matrix multiplication',
  'How do I find derivatives of trigonometric functions?',
  'What is the Pythagorean theorem?',
  'How do I solve systems of linear equations?'
];

export default function ExampleQuestions({ onSelectQuestion }: ExampleQuestionsProps) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2}>
        <AutoAwesomeIcon color="action" />
        <Typography variant="subtitle1">Try these examples</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        {exampleQuestions.map((question, i) => (
          <Button
            key={i}
            size="medium"
            variant="outlined"
            onClick={() => onSelectQuestion(question)}
            sx={{ borderRadius: 2 }}
          >
            {question}
          </Button>
        ))}
      </Box>
    </Box>
  );
}