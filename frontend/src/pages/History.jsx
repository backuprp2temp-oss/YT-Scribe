import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button as MuiButton,
  Alert,
  CircularProgress,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import ReplayIcon from '@mui/icons-material/Replay'
import { getHistory, deleteHistoryItem, clearHistory, redownload, getHistoryStats } from '../services/historyService'
import { formatFileSize, formatDuration } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function History() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const offset = page * rowsPerPage
      const result = await getHistory(rowsPerPage, offset)
      setItems(result.items || [])
      setTotal(result.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage])

  const loadStats = useCallback(async () => {
    try {
      const result = await getHistoryStats()
      setStats(result)
    } catch (err) {
      // Stats are optional, don't show error
    }
  }, [])

  useEffect(() => {
    loadHistory()
    loadStats()
  }, [loadHistory, loadStats])

  const handleDeleteItem = async () => {
    if (!itemToDelete) return
    try {
      await deleteHistoryItem(itemToDelete)
      toast.success('Item deleted')
      loadHistory()
      loadStats()
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    }
  }

  const handleClearAll = async () => {
    try {
      await clearHistory(true)
      toast.success('History cleared')
      loadHistory()
      loadStats()
    } catch (err) {
      toast.error(err.message || 'Failed to clear history')
    } finally {
      setConfirmClearOpen(false)
    }
  }

  const handleRedownload = async (id) => {
    try {
      const result = await redownload(id)
      toast.success(`Redownload started: ${result.task_id ? 'Check progress' : 'Done'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to start redownload')
    }
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success'
      case 'failed': return 'error'
      case 'downloading': return 'info'
      case 'pending': return 'warning'
      default: return 'default'
    }
  }

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Download History
        </Typography>
        <MuiButton
          variant="outlined"
          color="error"
          onClick={() => setConfirmClearOpen(true)}
          disabled={total === 0}
        >
          Clear All
        </MuiButton>
      </Box>

      {stats && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`Total: ${stats.total}`} color="primary" variant="outlined" />
            <Chip label={`Completed: ${stats.completed}`} color="success" variant="outlined" />
            <Chip label={`Failed: ${stats.failed}`} color="error" variant="outlined" />
            <Chip label={`Size: ${formatFileSize(stats.total_size_bytes)}`} variant="outlined" />
          </Box>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {total === 0 && !loading ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No download history
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Downloaded videos will appear here
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ maxWidth: 300 }}>
                      <Typography variant="body2" noWrap title={item.title}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {item.video_id}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.format?.toUpperCase()}</Typography>
                    {item.quality && (
                      <Typography variant="caption" color="text.secondary">
                        {item.quality}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.file_size ? formatFileSize(item.file_size) : '-'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(item.created_at).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      size="small"
                      color={getStatusColor(item.status)}
                    />
                    {item.status === 'failed' && item.error_message && (
                      <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                        {item.error_message.substring(0, 50)}...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleRedownload(item.id)}
                      title="Redownload"
                    >
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setItemToDelete(item.id)
                        setDeleteConfirmOpen(true)
                      }}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </TableContainer>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this download? This also removes the file from disk.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setDeleteConfirmOpen(false)}>Cancel</MuiButton>
          <MuiButton color="error" onClick={handleDeleteItem}>Delete</MuiButton>
        </DialogActions>
      </Dialog>

      {/* Clear all confirmation dialog */}
      <Dialog open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)}>
        <DialogTitle>Clear All History</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all download history and associated files.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setConfirmClearOpen(false)}>Cancel</MuiButton>
          <MuiButton color="error" onClick={handleClearAll}>Clear All</MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
