import React, { useState } from 'react'
import {
  Box,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import Select from '../common/Select'
import toast from 'react-hot-toast'
import { previewSubtitle, downloadSubtitle } from '../../services/transcriptService'

export default function TranscriptSelector({ videoInfo }) {
  const [languages, setLanguages] = useState([])
  const [selectedLang, setSelectedLang] = useState('en')
  const [selectedFormat, setSelectedFormat] = useState('srt')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const handleLoadLanguages = async () => {
    if (!videoInfo?.video_id) return

    try {
      const result = await previewSubtitle(
        videoInfo.video_id,
        'en',
        `https://www.youtube.com/watch?v=${videoInfo.video_id}`
      )
      // If we get here, subtitles are available
      setLoaded(true)
      toast.success('Transcript features available')
    } catch (err) {
      toast.error('No transcripts available for this video')
    }
  }

  const handlePreview = async () => {
    if (!videoInfo?.video_id) return

    setPreviewLoading(true)
    try {
      const result = await previewSubtitle(
        videoInfo.video_id,
        selectedLang,
        `https://www.youtube.com/watch?v=${videoInfo.video_id}`,
        selectedFormat
      )
      setPreviewContent(result.content || '')
      setPreviewOpen(true)
    } catch (err) {
      toast.error(err.message || 'Failed to load transcript preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!videoInfo?.video_id) return

    try {
      const response = await fetch('/api/transcript/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoInfo.video_id}`,
          language: selectedLang,
          format: selectedFormat,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Download failed')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${videoInfo.title}_${selectedLang}.${selectedFormat}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      toast.success('Subtitle downloaded')
    } catch (err) {
      toast.error(err.message || 'Failed to download subtitle')
    }
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(previewContent)
    toast.success('Copied to clipboard')
  }

  const formatOptions = [
    { value: 'srt', label: 'SRT' },
    { value: 'vtt', label: 'VTT' },
    { value: 'txt', label: 'Plain Text' },
  ]

  return (
    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" gutterBottom>
        Transcripts & Subtitles
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Language:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip
              label="English (en)"
              size="small"
              color={selectedLang === 'en' ? 'primary' : 'default'}
              onClick={() => setSelectedLang('en')}
              clickable
            />
            <Chip
              label="Spanish (es)"
              size="small"
              color={selectedLang === 'es' ? 'primary' : 'default'}
              onClick={() => setSelectedLang('es')}
              clickable
            />
            <Chip
              label="French (fr)"
              size="small"
              color={selectedLang === 'fr' ? 'primary' : 'default'}
              onClick={() => setSelectedLang('fr')}
              clickable
            />
            <Chip
              label="German (de)"
              size="small"
              color={selectedLang === 'de' ? 'primary' : 'default'}
              onClick={() => setSelectedLang('de')}
              clickable
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Select
            label="Format"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            options={formatOptions}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handlePreview}
          disabled={previewLoading}
        >
          Preview
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          Download Subtitle
        </Button>
      </Box>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Transcript Preview - {selectedLang.toUpperCase()} ({selectedFormat})
            </Typography>
            <IconButton onClick={() => setPreviewOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box
            sx={{
              maxHeight: '60vh',
              overflow: 'auto',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              bgcolor: 'grey.50',
              p: 2,
              borderRadius: 1,
            }}
          >
            {previewContent || 'No preview available'}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyToClipboard}
          >
            Copy to Clipboard
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Download
          </Button>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
