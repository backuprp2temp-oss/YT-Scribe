# Contributing to YT-DLP Web Downloader

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment (see [README.md](README.md))
4. Create a new branch for your feature or bugfix

## Development Workflow

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Code Style

- **Backend:** Follow [PEP 8](https://peps.python.org/pep-0008/) for Python code
- **Frontend:** Use functional React components with hooks, consistent naming

### Testing

Before submitting a PR, test your changes:

1. Verify the backend starts without errors
2. Verify the frontend loads correctly
3. Test the affected feature manually
4. Ensure no regressions in related features

## Pull Request Guidelines

- **Title:** Use a clear, descriptive title (e.g., "Add FLAC audio format support")
- **Description:** Explain what the change does and why
- **Commits:** Keep commits focused and write meaningful messages
- **Scope:** One feature or fix per PR

## Reporting Issues

When reporting a bug, please include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Python version, Node version, browser)

## Project Structure

```
├── backend/          # FastAPI backend
│   ├── app/          # Application code
│   │   ├── models/   # SQLAlchemy database models
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   ├── routers/  # API endpoint definitions
│   │   ├── services/ # Business logic
│   │   ├── tasks/    # Background download tasks
│   │   └── utils/    # Utility functions
│   └── downloads/    # Downloaded files (not tracked)
├── frontend/         # React frontend
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page components (Home, History, Settings)
│       ├── services/    # API client functions
│       ├── hooks/       # Custom React hooks
│       └── utils/       # Helper functions
├── docker-compose.yml   # Production Docker setup
├── README.md
└── LICENSE
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
