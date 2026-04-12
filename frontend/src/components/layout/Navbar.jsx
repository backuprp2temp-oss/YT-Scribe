import React from 'react'
import { AppBar, Toolbar, Typography, Tabs, Tab } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar>
        <DownloadIcon sx={{ mr: 1.5 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          YT-DLP Web Downloader
        </Typography>
        <Tabs
          value={location.pathname}
          textColor="inherit"
          indicatorColor="secondary"
          sx={{ mr: 2 }}
        >
          <Tab
            label="Home"
            value="/"
            component={Link}
            to="/"
          />
          <Tab
            label="History"
            value="/history"
            component={Link}
            to="/history"
          />
          <Tab
            label="Settings"
            value="/settings"
            component={Link}
            to="/settings"
          />
        </Tabs>
      </Toolbar>
    </AppBar>
  )
}
