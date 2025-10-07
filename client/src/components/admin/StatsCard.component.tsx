import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingFlat as TrendingFlatIcon,
} from "@mui/icons-material";

interface StatsCardProps {
  title: string;
  value: number | string;
  color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

export default function StatsCard({
  title,
  value,
  color = "primary",
  subtitle,
  trend,
}: StatsCardProps) {
  const colorMap = {
    primary: "#1976d2",
    secondary: "#9c27b0",
    success: "#2e7d32",
    error: "#d32f2f",
    warning: "#ed6c02",
    info: "#0288d1",
  };

  return (
    <Card
      sx={{
        height: "100%",
        background: `linear-gradient(135deg, ${colorMap[color]}15 0%, ${colorMap[color]}05 100%)`,
        border: `1px solid ${colorMap[color]}30`,
      }}
    >
      <CardContent>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          gutterBottom
          sx={{ fontWeight: 500 }}
        >
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", mb: 1 }}>
          <Typography
            variant="h4"
            component="div"
            sx={{ fontWeight: 700, color: colorMap[color] }}
          >
            {value}
          </Typography>
          {trend && (
            <Box sx={{ ml: 1, display: "flex", alignItems: "center" }}>
              {trend === "up" ? (
                <TrendingUpIcon sx={{ color: "success.main", fontSize: 20 }} />
              ) : (
                <TrendingFlatIcon sx={{ color: "text.secondary", fontSize: 20 }} />
              )}
            </Box>
          )}
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
