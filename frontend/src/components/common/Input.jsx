import React from 'react'
import { TextField } from '@mui/material'

export default function Input({
  label,
  value,
  onChange,
  error = false,
  helperText = '',
  placeholder,
  disabled = false,
  fullWidth = true,
  type = 'text',
  ...props
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helperText={helperText}
      placeholder={placeholder}
      disabled={disabled}
      fullWidth={fullWidth}
      type={type}
      variant="outlined"
      {...props}
    />
  )
}
