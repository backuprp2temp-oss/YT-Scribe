import api from './api'

export const getSettings = async () => {
  const response = await api.get('/settings/')
  return response
}

export const getSetting = async (key) => {
  const response = await api.get(`/settings/${key}`)
  return response
}

export const updateSetting = async (key, value) => {
  const response = await api.put(`/settings/${key}`, { value })
  return response
}

export const resetSettings = async () => {
  const response = await api.post('/settings/reset')
  return response
}

export const getDefaults = async () => {
  const response = await api.get('/settings/defaults')
  return response
}
