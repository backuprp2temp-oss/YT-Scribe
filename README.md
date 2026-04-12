# YT-DLP Web Downloader

A modern, production-ready web interface for downloading YouTube videos, audio, transcripts, thumbnails, and metadata.

![Phase](https://img.shields.io/badge/Phase-4%20Complete-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

### Downloads
- **Video** - Download in MP4, WebM, or MKV with quality selection (360p to Best)
- **Audio Only** - Extract audio as MP3, M4A, WAV, FLAC, OGG, or AAC with bitrate control
- **Transcripts** - Preview and download subtitles in SRT, VTT, or Plain Text (80+ languages)
- **Thumbnails** - Download high-quality video thumbnails
- **Metadata** - Export complete video metadata as JSON

### Management
- **Download History** - View, search, and manage all downloads with pagination
- **Redownload** - Re-download any item from history with the same settings
- **Settings** - Configure default preferences for format, quality, bitrate, and more

### User Experience
- **Real-time Progress** - Server-Sent Events (SSE) for live download progress tracking
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Error Handling** - Graceful error boundaries and user-friendly messages
- **Keyboard Shortcuts** - Ctrl+V auto-focuses the URL input

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI (Python 3.11+) |
| **Frontend** | React 18 + Vite + Material-UI |
| **Database** | SQLite + SQLAlchemy ORM |
| **Async** | Background threads + Redis pub/sub |
| **Real-time** | Server-Sent Events (SSE) |
| **Deployment** | Docker + Docker Compose + Nginx |

## Quick Start

### Option 1: Docker Compose (Recommended)

The easiest way to run the full stack:

```bash
docker-compose up -d
```

This starts:
- **Frontend** on http://localhost:80
- **Backend API** on http://localhost:8000
- **Redis** on port 6379

### Option 2: Manual Setup

#### Prerequisites

- Python 3.11+
- Node.js 18+
- FFmpeg (required for audio extraction)
- Redis server (optional, for real-time progress)

#### Backend Setup

1. **Create virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start the server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### Frontend setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Open** http://localhost:5173

## Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `False` | Enable debug mode (dev only) |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG/INFO/WARNING/ERROR) |
| `DATABASE_URL` | `sqlite:///./yt_downloads.db` | Database connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `DOWNLOAD_DIR` | `./downloads` | Directory for downloaded files |
| `MAX_CONCURRENT_DOWNLOADS` | `3` | Maximum simultaneous downloads |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API URL |

## API Documentation

Once the backend is running, interactive API docs are available:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/video/info` | Get video metadata |
| `POST` | `/api/video/download` | Start video download |
| `POST` | `/api/audio/download` | Start audio download |
| `GET` | `/api/transcript/{id}` | Available subtitle languages |
| `POST` | `/api/transcript/download` | Download subtitle file |
| `GET` | `/api/history/` | Paginated download history |
| `GET` | `/api/settings/` | Get all settings |
| `PUT` | `/api/settings/{key}` | Update setting |
| `GET` | `/api/tasks/{id}/progress` | SSE progress stream |

## Docker Deployment

### Build and run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild images
docker-compose up -d --build
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 80 | React app served by Nginx |
| `backend` | 8000 | FastAPI application |
| `redis` | 6379 | Message broker and cache |

### Volumes

Data persists across container restarts:

| Volume | Purpose |
|--------|---------|
| `redis_data` | Redis cache |
| `download_data` | Downloaded files |
| `db_data` | SQLite database |

## Project Structure

```
yt-dlp-web/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint + middleware
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models/              # Database models
│   │   │   ├── download.py      # DownloadHistory model
│   │   │   └── settings.py      # UserSettings model
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API endpoints
│   │   │   ├── video.py         # Video info, download, thumbnail, metadata
│   │   │   ├── audio.py         # Audio-only download
│   │   │   ├── transcript.py    # Subtitle preview and download
│   │   │   ├── history.py       # Download history CRUD
│   │   │   ├── settings.py      # Settings management
│   │   │   └── tasks.py         # SSE progress streaming
│   │   ├── services/            # Business logic
│   │   │   ├── yt_dlp_service.py    # yt-dlp wrapper
│   │   │   └── transcript_service.py # Subtitle handling
│   │   ├── tasks/               # Background download tasks
│   │   └── utils/               # Utilities
│   ├── downloads/               # Downloaded files
│   ├── Dockerfile               # Production Docker image
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Environment template
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app with routing
│   │   ├── components/
│   │   │   ├── common/          # Reusable UI components
│   │   │   ├── layout/          # Navbar, Footer
│   │   │   └── features/        # Feature-specific components
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Main download page
│   │   │   ├── History.jsx      # Download history
│   │   │   └── Settings.jsx     # User settings
│   │   ├── services/            # API client functions
│   │   ├── hooks/               # Custom React hooks
│   │   └── utils/               # Helper functions
│   ├── Dockerfile               # Multi-stage build (Node → Nginx)
│   ├── nginx.conf               # Nginx SPA routing config
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml           # Full stack orchestration
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

## Troubleshooting

### Audio download fails
- **FFmpeg is required** for audio extraction. Install it:
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
  - Ubuntu: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`

### Real-time progress not working
- **Redis must be running** on localhost:6379 (or configured REDIS_URL)
- Downloads still work, just without live progress updates

### "Download not found" error
- The download history may have been cleared. Downloads are independent of history.

### Docker build fails
- Ensure Docker Desktop is running
- Try `docker-compose down -v` to clear volumes, then `docker-compose up -d --build`

### Port already in use
- Change the port in docker-compose.yml or stop the conflicting service

## Roadmap

### Future Enhancements (Phase 5+)
- [ ] Batch/bulk downloads
- [ ] Playlist and channel downloads
- [ ] Cookie authentication for private content
- [ ] SponsorBlock integration
- [ ] Chapter extraction
- [ ] User authentication system
- [ ] Download queue with scheduling
- [ ] Rate limiting and IP-based throttling
- [ ] PostgreSQL/MySQL database support

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Disclaimer

This tool is for personal use only. Respect content creators' rights and YouTube's Terms of Service. Do not use this tool to download content you do not have permission to download.
