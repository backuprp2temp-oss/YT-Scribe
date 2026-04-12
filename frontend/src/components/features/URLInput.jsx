import React, { useState, useRef, useEffect } from 'react'
import { Box, InputAdornment, Alert } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import Input from '../common/Input'
import Button from '../common/Button'
import { isValidYoutubeUrl } from '../../utils/validators'

export default function URLInput({ onFetchInfo, loading }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  // Auto-focus on Ctrl+V (paste)
  useEffect(() => {
    const handlePaste = (e) => {
      if (e.ctrlKey && e.key === 'v') {
        // Only auto-focus if no input is currently focused
        if (!document.activeElement?.matches('input, textarea')) {
          inputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handlePaste)
    return () => window.removeEventListener('keydown', handlePaste)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    if (!isValidYoutubeUrl(url.trim())) {
      setError('Please enter a valid YouTube URL')
      return
    }

    onFetchInfo(url.trim())
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: { xs: 'stretch', sm: 'flex-start' } }}>
        <Input
          label="YouTube URL"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (error) setError('')
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          error={!!error}
          helperText={error}
          disabled={loading}
          inputRef={inputRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          loading={loading}
          sx={{ minWidth: 140, height: 56 }}
        >
          Fetch Info
        </Button>
      </Box>
    </Box>
  )
}
