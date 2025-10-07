import { Box, Typography, Grid, Paper, CircularProgress, Chip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import StatsCard from "../../components/admin/StatsCard.component";
import { adminService } from "../../services/admin.service";

export default function AdminDashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: adminService.getStats,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  const stats = statsData?.stats;
  if (!stats) return null;

  const statusData = [
    { name: "Pending", value: stats.pending_count || 0, color: "#ffa726" },
    { name: "Approved", value: stats.approved_count || 0, color: "#66bb6a" },
    { name: "Rejected", value: stats.rejected_count || 0, color: "#ef5350" },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatsCard
            title="Total Staged"
            value={stats.total_count || 0}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatsCard
            title="Pending Review"
            value={stats.pending_count || 0}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatsCard
            title="Approved"
            value={stats.approved_count || 0}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatsCard
            title="Rejected"
            value={stats.rejected_count || 0}
            color="error"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: "100%", minHeight: 400 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Concepts by Status
            </Typography>
            {stats.total_count > 0 ? (
              <Box sx={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box
                sx={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: "100%", minHeight: 400 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Most Recent Pending
            </Typography>
            {stats.most_recent_pending ? (
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, mb: 1.5, color: "primary.main" }}
                >
                  {stats.most_recent_pending.concept_name}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2, lineHeight: 1.6 }}
                >
                  {stats.most_recent_pending.description}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                  <Chip
                    label={stats.most_recent_pending.suggested_category || "N/A"}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`Difficulty: ${stats.most_recent_pending.suggested_difficulty || "N/A"}`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${stats.most_recent_pending.occurrence_count || 0} occurrence${(stats.most_recent_pending.occurrence_count || 0) !== 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                {stats.most_recent_pending.suggested_prerequisites &&
                  stats.most_recent_pending.suggested_prerequisites.length > 0 && (
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: "grey.50",
                        borderRadius: 1,
                        border: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        <strong>Prerequisites:</strong>{" "}
                        {stats.most_recent_pending.suggested_prerequisites.join(", ")}
                      </Typography>
                    </Box>
                  )}
              </Box>
            ) : (
              <Box
                sx={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography color="text.secondary">
                  No pending concepts
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
