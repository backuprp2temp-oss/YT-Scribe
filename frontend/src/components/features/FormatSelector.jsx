import React from 'react'
import { Grid, Box } from '@mui/material'
import Select from '../common/Select'

export default function FormatSelector({ format, quality, onFormatChange, onQualityChange, availableFormats }) {
  // Extract unique formats and qualities from available formats
  const formatOptions = [
    { value: 'mp4', label: 'MP4' },
    { value: 'webm', label: 'WebM' },
    { value: 'mkv', label: 'MKV' },
  ]

  const qualityOptions = [
    { value: '360p', label: '360p' },
    { value: '480p', label: '480p' },
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p' },
    { value: 'best', label: 'Best' },
  ]

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} sm={6}>
        <Select
          label="Format"
          value={format}
          onChange={(e) => onFormatChange(e.target.value)}
          options={formatOptions}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Select
          label="Quality"
          value={quality}
          onChange={(e) => onQualityChange(e.target.value)}
          options={qualityOptions}
        />
      </Grid>
    </Grid>
  )
}
