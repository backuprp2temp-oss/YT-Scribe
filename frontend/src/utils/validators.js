/**
 * Validate if a string is a valid YouTube URL.
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid YouTube URL
 */
export const isValidYoutubeUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  
  const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/.+/
  
  return youtubeRegex.test(url)
}
