/**
 * Format bytes to human-readable string.
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS.
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:00'
  
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format view count with suffix (K, M, B).
 * @param {number} count - View count
 * @returns {string} Formatted view count
 */
export const formatViewCount = (count) => {
  if (!count) return '0'
  
  if (count >= 1_000_000_000) {
    return (count / 1_000_000_000).toFixed(1) + 'B'
  }
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1) + 'M'
  }
  if (count >= 1_000) {
    return (count / 1_000).toFixed(1) + 'K'
  }
  
  return count.toString()
}
