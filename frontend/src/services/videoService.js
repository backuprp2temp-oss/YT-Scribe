import api from './api'

export const fetchVideoInfo = async (url) => {
  const response = await api.get('/video/info', { params: { url } })
  return response
}

export const downloadVideo = async (data) => {
  const response = await api.post('/video/download', data)
  return response
}
