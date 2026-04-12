import { useState, useCallback } from 'react'

/**
 * Custom hook for Server-Sent Events (SSE) connection.
 * @param {string} baseUrl - Base URL for the SSE endpoint (without task ID)
 * @returns {Object} SSE connection functions and state
 */
export function useSSE(baseUrl = '/api/tasks') {
  const [eventSource, setEventSource] = useState(null)
  const [progress, setProgress] = useState(null)
  const [status, setStatus] = useState('idle') // idle, connecting, downloading, completed, failed
  const [error, setError] = useState(null)

  const connect = useCallback((taskId) => {
    // Close existing connection
    if (eventSource) {
      eventSource.close()
    }

    setStatus('connecting')
    setProgress(null)
    setError(null)

    const url = `${baseUrl}/${taskId}/progress`
    const es = new EventSource(url)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setProgress(data)
        setStatus(data.status)

        if (data.status === 'completed' || data.status === 'failed') {
          es.close()
          setEventSource(null)
        }

        if (data.status === 'failed') {
          setError(data.error || 'Download failed')
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err)
      }
    }

    es.onerror = (err) => {
      console.error('SSE connection error:', err)
      setError('Connection lost')
      es.close()
      setEventSource(null)
      setStatus('failed')
    }

    setEventSource(es)
  }, [baseUrl, eventSource])

  const disconnect = useCallback(() => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
  }, [eventSource])

  return {
    progress,
    status,
    error,
    connect,
    disconnect,
  }
}

export default useSSE
