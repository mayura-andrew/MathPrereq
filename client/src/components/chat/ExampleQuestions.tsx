import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { RiSparklingLine } from "react-icons/ri";

interface ExampleQuestionsProps {
  onSelectQuestion: (question: string) => void;
}

const exampleQuestions = [
  "How do I solve quadratic equations?",
  "What is the chain rule in calculus?",
  "Explain matrix multiplication",
  "How do I find derivatives of trigonometric functions?",
  "What is the Pythagorean theorem?",
  "How do I solve systems of linear equations?",
];

export default function ExampleQuestions({
  onSelectQuestion,
}: ExampleQuestionsProps) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap={1}
        mb={2}
      >
        <RiSparklingLine />
        <Typography variant="subtitle1">Try these examples</Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          justifyContent: "center",
          p: 2,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
        }}
      >
        {exampleQuestions.map((question, i) => (
          <Button
            key={i}
            size="medium"
            variant="outlined"
            onClick={() => onSelectQuestion(question)}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              px: 2,
              color: "text.primary",
              borderColor: "divider",
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "action.hover",
              },
            }}
          >
            {question}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
