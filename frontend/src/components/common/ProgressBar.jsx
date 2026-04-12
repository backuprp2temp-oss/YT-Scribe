import React from 'react'
import { Box, LinearProgress, Typography } from '@mui/material'

export default function ProgressBar({
  value,
  variant = 'determinate',
  label,
  showValue = true,
  height = 8,
}) {
  return (
    <Box sx={{ width: '100%' }}>
      {(label || showValue) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {label || 'Progress'}
          </Typography>
          {showValue && variant === 'determinate' && (
            <Typography variant="body2" color="text.secondary">
              {Math.round(value)}%
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress
        variant={variant}
        value={value}
        sx={{ height }}
      />
    </Box>
  )
}
