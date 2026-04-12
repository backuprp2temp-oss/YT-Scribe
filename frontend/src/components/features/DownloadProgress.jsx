import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import Button from '../common/Button'
import ProgressBar from '../common/ProgressBar'
import { formatFileSize } from '../../utils/formatters'

export default function DownloadProgress({
  open,
  progress,
  status,
  error,
  onClose,
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'downloading':
        return 'primary'
      case 'processing':
        return 'warning'
      case 'completed':
        return 'success'
      case 'failed':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...'
      case 'downloading':
        return 'Downloading...'
      case 'processing':
        return 'Processing...'
      case 'completed':
        return 'Download Complete!'
      case 'failed':
        return 'Download Failed'
      default:
        return 'Preparing...'
    }
  }

  return (
    <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown={status !== 'completed' && status !== 'failed'}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Download Progress</Typography>
          <Chip label={getStatusLabel()} color={getStatusColor()} size="small" />
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {status === 'downloading' && progress && (
          <Box sx={{ mb: 2 }}>
            <ProgressBar
              value={progress.progress || 0}
              label="Downloading"
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Speed: {progress.speed || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ETA: {progress.eta ? `${progress.eta}s` : 'N/A'}
              </Typography>
            </Box>
            {progress.downloaded_bytes && progress.total_bytes && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {formatFileSize(progress.downloaded_bytes)} / {formatFileSize(progress.total_bytes)}
              </Typography>
            )}
          </Box>
        )}

        {status === 'processing' && (
          <ProgressBar variant="indeterminate" label="Post-processing video..." />
        )}

        {status === 'completed' && progress && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h6" color="success.main" gutterBottom>
              ✓ Download Complete
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.title && `File: ${progress.title}`}
            </Typography>
            {progress.file_size && (
              <Typography variant="body2" color="text.secondary">
                Size: {formatFileSize(progress.file_size)}
              </Typography>
            )}
          </Box>
        )}

        {status === 'failed' && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h6" color="error.main" gutterBottom>
              ✗ Download Failed
            </Typography>
            <Typography variant="body2" color="error.main">
              {error || 'An unknown error occurred'}
            </Typography>
          </Box>
        )}

        {(status === 'idle' || status === 'connecting') && (
          <ProgressBar variant="indeterminate" label="Initializing..." />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          disabled={status !== 'completed' && status !== 'failed'}
          variant="contained"
        >
          {status === 'completed' || status === 'failed' ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
