import api from './api'

export const getHistory = async (limit = 20, offset = 0, status = null) => {
  const params = { limit, offset }
  if (status) params.status = status
  const response = await api.get('/history/', { params })
  return response
}

export const getHistoryItem = async (id) => {
  const response = await api.get(`/history/${id}`)
  return response
}

export const deleteHistoryItem = async (id) => {
  const response = await api.delete(`/history/${id}`)
  return response
}

export const clearHistory = async (deleteFiles = true) => {
  const response = await api.delete('/history/', { params: { delete_files: deleteFiles } })
  return response
}

export const redownload = async (id) => {
  const response = await api.post(`/history/${id}/redownload`)
  return response
}

export const getHistoryStats = async () => {
  const response = await api.get('/history/stats')
  return response
}
