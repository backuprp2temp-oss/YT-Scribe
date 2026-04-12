import React from 'react'
import { FormControl, InputLabel, Select as MuiSelect, MenuItem } from '@mui/material'

export default function Select({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  fullWidth = true,
  size = 'medium',
}) {
  return (
    <FormControl fullWidth={fullWidth} size={size} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <MuiSelect
        value={value}
        label={label}
        onChange={onChange}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
    </FormControl>
  )
}
