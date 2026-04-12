import React, { useState, useEffect } from 'react'
import { Box, Typography, Paper, Alert, Divider, Button as MuiButton, Skeleton } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import AudioFileIcon from '@mui/icons-material/AudioFile'
import ImageIcon from '@mui/icons-material/Image'
import DescriptionIcon from '@mui/icons-material/Description'
import toast from 'react-hot-toast'

import URLInput from '../components/features/URLInput'
import VideoPreview from '../components/features/VideoPreview'
import FormatSelector from '../components/features/FormatSelector'
import DownloadProgress from '../components/features/DownloadProgress'
import TranscriptSelector from '../components/features/TranscriptSelector'
import Button from '../components/common/Button'

import { fetchVideoInfo, downloadVideo } from '../services/videoService'
import { downloadAudio } from '../services/audioService'
import { getSettings } from '../services/settingsService'
import { useSSE } from '../hooks/useSSE'

export default function Home() {
  const [videoInfo, setVideoInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(true)

  const [format, setFormat] = useState('mp4')
  const [quality, setQuality] = useState('1080p')

  const [audioFormat, setAudioFormat] = useState('mp3')
  const [audioBitrate, setAudioBitrate] = useState('320k')

  const [downloadOpen, setDownloadOpen] = useState(false)
  const [taskId, setTaskId] = useState(null)

  const { progress, status, error: downloadError, connect } = useSSE()

  // Load settings defaults on mount
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const result = await getSettings()
        const s = result.settings || {}
        if (s.default_video_format) setFormat(s.default_video_format)
        if (s.default_video_quality) setQuality(s.default_video_quality)
        if (s.default_audio_format) setAudioFormat(s.default_audio_format)
        if (s.default_audio_bitrate) setAudioBitrate(s.default_audio_bitrate)
      } catch (err) {
        // Silently fail, use hardcoded defaults
      } finally {
        setSettingsLoading(false)
      }
    }
    loadDefaults()
  }, [])

  const handleFetchInfo = async (url) => {
    setLoading(true)
    setError('')
    setVideoInfo(null)

    try {
      const info = await fetchVideoInfo(url)
      setVideoInfo(info)
      toast.success('Video information loaded')
    } catch (err) {
      setError(err.message || 'Failed to fetch video information')
      toast.error(err.message || 'Failed to fetch video information')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!videoInfo) {
      toast.error('No video selected')
      return
    }

    try {
      const response = await downloadVideo({
        url: `https://www.youtube.com/watch?v=${videoInfo.video_id}`,
        format,
        quality,
        download_subtitles: false,
        subtitle_lang: 'en',
      })

      setTaskId(response.task_id)
      setDownloadOpen(true)
      connect(response.task_id)
      
      toast.success('Download started')
    } catch (err) {
      toast.error(err.message || 'Failed to start download')
    }
  }

  const handleAudioDownload = async () => {
    if (!videoInfo) {
      toast.error('No video selected')
      return
    }

    try {
      const response = await downloadAudio({
        url: `https://www.youtube.com/watch?v=${videoInfo.video_id}`,
        format: audioFormat,
        bitrate: audioBitrate,
      })

      setTaskId(response.task_id)
      setDownloadOpen(true)
      connect(response.task_id)
      
      toast.success('Audio download started')
    } catch (err) {
      toast.error(err.message || 'Failed to start audio download')
    }
  }

  const handleDownloadThumbnail = async () => {
    if (!videoInfo?.video_id) return

    try {
      const url = `/api/video/${videoInfo.video_id}/thumbnail?url=https://www.youtube.com/watch?v=${videoInfo.video_id}`
      const response = await fetch(url)
      
      if (!response.ok) throw new Error('Failed to download thumbnail')
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${videoInfo.title}_thumbnail.jpg`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
      
      toast.success('Thumbnail downloaded')
    } catch (err) {
      toast.error(err.message || 'Failed to download thumbnail')
    }
  }

  const handleExportMetadata = async () => {
    if (!videoInfo?.video_id) return

    try {
      const url = `/api/video/${videoInfo.video_id}/metadata?url=https://www.youtube.com/watch?v=${videoInfo.video_id}`
      const response = await fetch(url)
      
      if (!response.ok) throw new Error('Failed to export metadata')
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${videoInfo.title}_metadata.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
      
      toast.success('Metadata exported')
    } catch (err) {
      toast.error(err.message || 'Failed to export metadata')
    }
  }

  const handleDownloadClose = () => {
    setDownloadOpen(false)
  }

  const audioFormatOptions = [
    { value: 'mp3', label: 'MP3' },
    { value: 'm4a', label: 'M4A' },
    { value: 'wav', label: 'WAV' },
    { value: 'flac', label: 'FLAC' },
  ]

  const audioBitrateOptions = [
    { value: '320k', label: '320 kbps (Best)' },
    { value: '256k', label: '256 kbps' },
    { value: '192k', label: '192 kbps' },
    { value: '128k', label: '128 kbps' },
    { value: '96k', label: '96 kbps' },
    { value: '64k', label: '64 kbps' },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Download YouTube Videos
      </Typography>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <URLInput onFetchInfo={handleFetchInfo} loading={loading} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {videoInfo && <VideoPreview videoInfo={videoInfo} />}

        {videoInfo && (
          <>
            {/* Video Download Section */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Video Download
            </Typography>
            
            <FormatSelector
              format={format}
              quality={quality}
              onFormatChange={setFormat}
              onQualityChange={setQuality}
              availableFormats={videoInfo.available_formats || []}
            />

            <Button
              onClick={handleDownload}
              variant="contained"
              size="large"
              startIcon={<DownloadIcon />}
              fullWidth
              sx={{ mt: 2 }}
            >
              Download Video
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Audio Download Section */}
            <Typography variant="h6" gutterBottom>
              Audio Only
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Format:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {audioFormatOptions.map((opt) => (
                  <MuiButton
                    key={opt.value}
                    variant={audioFormat === opt.value ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setAudioFormat(opt.value)}
                  >
                    {opt.label}
                  </MuiButton>
                ))}
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Quality:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {audioBitrateOptions.map((opt) => (
                  <MuiButton
                    key={opt.value}
                    variant={audioBitrate === opt.value ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setAudioBitrate(opt.value)}
                  >
                    {opt.label}
                  </MuiButton>
                ))}
              </Box>
            </Box>

            <Button
              onClick={handleAudioDownload}
              variant="contained"
              size="large"
              startIcon={<AudioFileIcon />}
              fullWidth
              sx={{ mb: 2 }}
            >
              Download Audio Only
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Additional Actions */}
            <Typography variant="h6" gutterBottom>
              Additional Options
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                onClick={handleDownloadThumbnail}
                variant="outlined"
                startIcon={<ImageIcon />}
              >
                Download Thumbnail
              </Button>
              <Button
                onClick={handleExportMetadata}
                variant="outlined"
                startIcon={<DescriptionIcon />}
              >
                Export Metadata
              </Button>
            </Box>

            <TranscriptSelector videoInfo={videoInfo} />
          </>
        )}
      </Paper>

      <DownloadProgress
        open={downloadOpen}
        progress={progress}
        status={status}
        error={downloadError}
        onClose={handleDownloadClose}
      />
    </Box>
  )
}
