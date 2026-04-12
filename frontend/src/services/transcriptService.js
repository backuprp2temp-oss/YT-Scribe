import api from './api'

export const getAvailableSubtitles = async (videoId, url) => {
  const response = await api.get(`/transcript/${videoId}`, { params: { url } })
  return response
}

export const downloadSubtitle = async (data) => {
  const response = await api.post('/transcript/download', data)
  return response
}

export const previewSubtitle = async (videoId, lang, url, format = 'srt') => {
  const response = await api.get(`/transcript/${videoId}/${lang}/preview`, {
    params: { url, format },
  })
  return response
}
