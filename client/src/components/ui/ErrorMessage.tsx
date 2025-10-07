import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import { RiRefreshLine } from "react-icons/ri";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  severity?: "error" | "warning" | "info";
}

export default function ErrorMessage({
  title = "Error",
  message,
  onRetry,
  severity = "error",
}: ErrorMessageProps) {
  return (
    <Box p={2}>
      <Alert
        severity={severity}
        action={
          onRetry ? (
            <Button
              color="inherit"
              size="small"
              startIcon={<RiRefreshLine />}
              onClick={onRetry}
            >
              Retry
            </Button>
          ) : undefined
        }
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        <Typography variant="body2">{message}</Typography>
      </Alert>
    </Box>
  );
}
