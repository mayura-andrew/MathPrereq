import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function StepByStepAnswer({ answer }: { answer?: unknown }){
  return (
    <Box>
      <Typography variant="subtitle1">Solution</Typography>
      <Typography variant="body2">{answer?.toString ? String(answer) : 'No detailed solution available.'}</Typography>
    </Box>
  );
}
