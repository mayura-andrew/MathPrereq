import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';

type Props = {
  question: string;
  setQuestion: (v: string) => void;
  loading: boolean;
  onSubmit: (q: string) => void;
};

export default function QuestionPhase({ question, setQuestion, loading, onSubmit }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const height = Math.min(ta.scrollHeight, 160);
    ta.style.height = `${height}px`;
  }, [question]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || loading) return;
    onSubmit(question.trim());
  };

  const exampleQuestions = [
    'How do I solve quadratic equations?',
    'What is the chain rule in calculus?',
    'Explain matrix multiplication',
    'How do I find derivatives of trig functions?'
  ];

  return (
    <Paper sx={{ p: 2 }} elevation={1}>
      <Box display="flex" gap={2} alignItems="center" mb={1}>
        {/* <BookOpenIcon color="primary" /> */}
        <Box>
          <Typography variant="h6">MathPrereq</Typography>
          <Typography variant="body2" color="text.secondary">AI-powered mathematics learning assistant</Typography>
        </Box>
      </Box>

      <Box component="form" onSubmit={(e) => { handleSubmit(e); }}>
        <TextField
          inputRef={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Ask me anything about mathematics..."
          multiline
          fullWidth
          minRows={1}
          maxRows={6}
          disabled={loading}
        />

        <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
          <Box>
            {loading ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={18} />
                <Typography variant="caption">Thinking...</Typography>
              </Box>
            ) : null}
          </Box>

          <Box display="flex" gap={1}>
            <Button size="small" onClick={() => { setQuestion(''); }} disabled={loading}>Clear</Button>
            <Button variant="contained" onClick={() => handleSubmit()} disabled={!question.trim() || loading}>Send</Button>
          </Box>
        </Box>
      </Box>

      {!loading && (
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>Try these examples</Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {exampleQuestions.map((ex, i) => (
              <Button key={i} size="small" variant="outlined" onClick={() => setQuestion(ex)}>{ex}</Button>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
