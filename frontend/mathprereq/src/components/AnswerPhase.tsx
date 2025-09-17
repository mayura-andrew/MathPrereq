import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import StepByStepAnswer from './StepByStepAnswer';
import LearningPath from './LearningPath';
import VisualRoadmap from './VisualRoadmap';

function getLearningPath(answer: unknown): unknown[] {
  if (!answer) return [];
  const a = answer as Record<string, unknown>;
  if (Array.isArray(a.learning_path)) return a.learning_path as unknown[];
  if (Array.isArray(a.prerequisites)) return a.prerequisites as unknown[];
  if (Array.isArray(a.concepts)) return a.concepts as unknown[];
  return [];
}

export default function AnswerPhase({ question, answer, onSave, onNewQuestion, isSaved }:
  { question: string; answer: unknown; onSave: () => void; onNewQuestion: () => void; isSaved: boolean }){
  const [active, setActive] = useState<number>(0);
  const learningPathArray = useMemo(() => getLearningPath(answer), [answer]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Box display="flex" gap={1}>
          <Button variant="text" onClick={onNewQuestion}>New Question</Button>
          <Button variant={isSaved ? 'contained' : 'outlined'} onClick={onSave}>{isSaved ? 'Saved' : 'Save'}</Button>
        </Box>
        <Typography variant="h6">{question}</Typography>
      </Box>

      <Tabs value={active} onChange={(_, v) => setActive(v)}>
        <Tab label="Step-by-step" />
        <Tab label="Learning Path" />
        <Tab label="Visual" />
      </Tabs>

      <Box mt={2}>
        {active === 0 && <StepByStepAnswer answer={answer} />}
        {active === 1 && <LearningPath learningPath={learningPathArray} />}
        {active === 2 && <VisualRoadmap learningPath={learningPathArray} />}
      </Box>
    </Box>
  );
}
