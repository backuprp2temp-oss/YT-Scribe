import React from 'react'
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  Chip,
  Box,
  Divider,
} from '@mui/material'
import { formatFileSize, formatDuration, formatViewCount } from '../../utils/formatters'

export default function VideoPreview({ videoInfo }) {
  if (!videoInfo) return null

  const {
    title,
    thumbnail_url,
    uploader,
    duration,
    view_count,
    upload_date,
    description,
    available_formats,
  } = videoInfo

  // Get unique resolutions from formats
  const resolutions = [...new Set(
    available_formats
      .filter((f) => f.resolution)
      .map((f) => f.resolution)
  )]

  // Get file size range from formats
  const sizes = available_formats
    .filter((f) => f.filesize || f.filesize_approx)
    .map((f) => f.filesize || f.filesize_approx)
  const minSize = sizes.length > 0 ? Math.min(...sizes) : null
  const maxSize = sizes.length > 0 ? Math.max(...sizes) : null

  return (
    <Card sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <CardMedia
            component="img"
            image={thumbnail_url || '/placeholder-video.jpg'}
            alt={title}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: 220,
              objectFit: 'cover',
              bgcolor: 'grey.200',
            }}
          />
        </Grid>
        <Grid item xs={12} sm={8}>
          <CardContent>
            <Typography variant="h6" gutterBottom noWrap sx={{ fontWeight: 600 }}>
              {title}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {uploader && (
                <Chip label={uploader} size="small" variant="outlined" />
              )}
              {duration && (
                <Chip label={`⏱ ${formatDuration(duration)}`} size="small" />
              )}
              {view_count && (
                <Chip label={`👁 ${formatViewCount(view_count)} views`} size="small" />
              )}
              {upload_date && (
                <Chip label={`📅 ${upload_date}`} size="small" />
              )}
            </Box>

            {resolutions.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Available qualities:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {resolutions.slice(0, 6).map((res) => (
                    <Chip key={res} label={res} size="small" color="primary" variant="outlined" />
                  ))}
                  {resolutions.length > 6 && (
                    <Chip label={`+${resolutions.length - 6} more`} size="small" />
                  )}
                </Box>
              </Box>
            )}

            {minSize && maxSize && (
              <Typography variant="body2" color="text.secondary">
                File size: ~{formatFileSize(minSize)} - {formatFileSize(maxSize)}
              </Typography>
            )}
          </CardContent>
        </Grid>
      </Grid>
    </Card>
  )
}
