import api from './api'

export const downloadAudio = async (data) => {
  const response = await api.post('/audio/download', data)
  return response
}
