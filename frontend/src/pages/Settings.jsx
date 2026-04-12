import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import RestoreIcon from '@mui/icons-material/Restore'
import Button from '../components/common/Button'
import { getSettings, updateSetting, resetSettings } from '../services/settingsService'
import toast from 'react-hot-toast'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [settings, setSettings] = useState({
    default_video_quality: '1080p',
    default_video_format: 'mp4',
    default_audio_format: 'mp3',
    default_audio_bitrate: '320k',
    default_subtitle_lang: 'en',
    auto_download_subtitles: 'false',
    cleanup_downloads_after_hours: '24',
  })

  const [originalSettings, setOriginalSettings] = useState({})

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getSettings()
      const s = result.settings || {}
      setSettings(s)
      setOriginalSettings({ ...s })
    } catch (err) {
      setError(err.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = Object.entries(settings).map(([key, value]) =>
        updateSetting(key, String(value))
      )
      await Promise.all(updates)
      setOriginalSettings({ ...settings })
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      const result = await resetSettings()
      setSettings(result.settings)
      setOriginalSettings({ ...result.settings })
      toast.success('Settings reset to defaults')
    } catch (err) {
      toast.error(err.message || 'Failed to reset settings')
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {/* Video Settings */}
        <Typography variant="h6" gutterBottom>
          Video
        </Typography>
        <Grid container spacing={3} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Default Quality"
              value={settings.default_video_quality || '1080p'}
              onChange={(e) => handleChange('default_video_quality', e.target.value)}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="360p">360p</option>
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="best">Best</option>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Default Format"
              value={settings.default_video_format || 'mp4'}
              onChange={(e) => handleChange('default_video_format', e.target.value)}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="mkv">MKV</option>
            </TextField>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Audio Settings */}
        <Typography variant="h6" gutterBottom>
          Audio
        </Typography>
        <Grid container spacing={3} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Default Audio Format"
              value={settings.default_audio_format || 'mp3'}
              onChange={(e) => handleChange('default_audio_format', e.target.value)}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="mp3">MP3</option>
              <option value="m4a">M4A</option>
              <option value="wav">WAV</option>
              <option value="flac">FLAC</option>
              <option value="ogg">OGG</option>
              <option value="aac">AAC</option>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Default Audio Bitrate"
              value={settings.default_audio_bitrate || '320k'}
              onChange={(e) => handleChange('default_audio_bitrate', e.target.value)}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="320k">320 kbps (Best)</option>
              <option value="256k">256 kbps</option>
              <option value="192k">192 kbps</option>
              <option value="128k">128 kbps</option>
              <option value="96k">96 kbps</option>
              <option value="64k">64 kbps</option>
            </TextField>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Subtitle Settings */}
        <Typography variant="h6" gutterBottom>
          Subtitles
        </Typography>
        <Grid container spacing={3} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Default Subtitle Language"
              value={settings.default_subtitle_lang || 'en'}
              onChange={(e) => handleChange('default_subtitle_lang', e.target.value)}
              fullWidth
              placeholder="en"
            />
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', pt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.auto_download_subtitles === 'true'}
                  onChange={(e) => handleChange('auto_download_subtitles', e.target.checked ? 'true' : 'false')}
                />
              }
              label="Auto-download subtitles with video"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Maintenance Settings */}
        <Typography variant="h6" gutterBottom>
          Maintenance
        </Typography>
        <Grid container spacing={3} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              type="number"
              label="Cleanup Downloads After (hours)"
              value={settings.cleanup_downloads_after_hours || '24'}
              onChange={(e) => handleChange('cleanup_downloads_after_hours', e.target.value)}
              fullWidth
              InputProps={{
                inputProps: { min: 1, max: 720 },
                endAdornment: <InputAdornment position="end">hours</InputAdornment>,
              }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={handleReset}
            color="error"
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
