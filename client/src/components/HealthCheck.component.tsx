import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { mathAPI } from '../services/api';
import type { SystemHealth } from '../types/api';

export default function HealthCheck() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const healthData = await mathAPI.healthCheckDetailed();
      setHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'degraded': return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'unhealthy': return <ErrorIcon sx={{ color: 'error.main' }} />;
      default: return <ErrorIcon sx={{ color: 'text.secondary' }} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">API Health Status</Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={checkHealth}
          disabled={loading}
        >
          {loading ? <CircularProgress size={16} /> : 'Refresh'}
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error.main">
            {error}
          </Typography>
        </Box>
      )}

      {health && (
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            {getStatusIcon(health.overall_status || health.status || 'unknown')}
            <Typography variant="subtitle1">
              Overall Status:
            </Typography>
            <Chip
              label={health.overall_status || health.status || 'unknown'}
              color={getStatusColor(health.overall_status || health.status || 'unknown')}
              size="small"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Last checked: {new Date(health.timestamp).toLocaleString()}
          </Typography>

          {/* Services Status */}
          {health.services && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Services:</Typography>
              {Object.entries(health.services).map(([service, status]) => (
                <Box key={service} display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  {getStatusIcon(status.status)}
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    {service}:
                  </Typography>
                  <Chip
                    label={status.status}
                    color={getStatusColor(status.status)}
                    size="small"
                  />
                  {status.response_time_ms && (
                    <Typography variant="caption" color="text.secondary">
                      {status.response_time_ms}ms
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Repositories Status */}
          {health.repositories && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Repositories:</Typography>
              {Object.entries(health.repositories).map(([repo, status]) => (
                <Box key={repo} display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  {getStatusIcon(status.status)}
                  <Typography variant="body2" sx={{ minWidth: 120 }}>
                    {repo}:
                  </Typography>
                  <Chip
                    label={status.status}
                    color={getStatusColor(status.status)}
                    size="small"
                  />
                  {status.response_time_ms && (
                    <Typography variant="caption" color="text.secondary">
                      {status.response_time_ms}ms
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {!health && !loading && !error && (
        <Typography variant="body2" color="text.secondary">
          Click refresh to check API health
        </Typography>
      )}
    </Box>
  );
}