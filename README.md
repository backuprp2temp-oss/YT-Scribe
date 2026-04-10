# YT-Scribe

> Instantly extract, view, and download YouTube video transcripts — no API key required.

YT-Scribe is a lightweight, full-stack Node.js application that fetches YouTube video transcripts and metadata without requiring an official YouTube API key or heavy browser automation. Simply paste a YouTube URL and get the transcript in seconds, with options to export in multiple formats.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D16-green.svg)
![Express](https://img.shields.io/badge/express-4.x-lightgrey.svg)

---

## ✨ Features

- **📝 Transcript Extraction** — Retrieves full transcripts from YouTube videos with precise timestamps and durations
- **🌍 Multi-Language Support** — Automatically detects all available caption tracks and lets you pick a specific language
- **📊 Video Metadata** — Fetches video title, author, and thumbnail via YouTube oEmbed
- **📥 Multi-Format Export** — Download transcripts in **TXT**, **SRT** (subtitles), or **JSON** format
- **📋 One-Click Copy** — Copy the entire transcript to your clipboard with a single click
- **🎨 Modern UI** — Premium dark glassmorphism design, fully responsive for desktop and mobile
- **🔑 No API Key Needed** — Bypasses the official YouTube API by using the internal InnerTube API
- **⚡ Fast & Lightweight** — Built on `undici` for efficient HTTP requests, no heavy browser automation

---

## 🖥️ Screenshots

### Search & Fetch
Paste any YouTube URL and instantly get the full transcript with video metadata.

### Export Options
Copy to clipboard or download in `.txt`, `.srt`, or `.json` formats.

---

## 🛠️ Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| **Backend** | Node.js, Express.js               |
| **HTTP Client** | `undici` (native Node.js fetch) |
| **YouTube API** | InnerTube (`youtubei.js`)       |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| **Styling** | CSS Variables, Glassmorphism, Responsive Design |
| **Fonts** | Inter (Google Fonts)                |

---

## 📦 Installation

### Prerequisites

- **Node.js** ≥ 16.x
- **npm** (comes with Node.js)

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/backuprp2temp-oss/YT-Scribe.git
   cd YT-Scribe
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   Or for development with auto-restart (if you add `nodemon`):
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🚀 Usage

### Web Interface

1. Paste a YouTube video URL into the search bar (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ` or `https://youtu.be/dQw4w9WgXcQ`)
2. Press **Enter** or click the arrow button
3. The transcript appears with video metadata, segment count, and language info
4. Use the toolbar to:
   - **Switch languages** (if multiple caption tracks are available)
   - **Copy** the full transcript to clipboard
   - **Download** as `.txt`, `.srt`, or `.json`

### Supported URL Formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`
- `https://www.youtube.com/live/VIDEO_ID`
- Raw video ID (e.g., `dQw4w9WgXcQ`)

---

## 🔌 API Endpoints

### Get Video Metadata

Returns basic information about a YouTube video.

**Endpoint:** `GET /api/metadata`

**Query Parameters:**

| Parameter | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| `url`     | string | Yes*     | Full YouTube URL or video ID         |
| `videoId` | string | Yes*     | Alternative to `url` — the video ID  |

*\*Either `url` or `videoId` is required.*

**Example Request:**
```bash
curl "http://localhost:3000/api/metadata?videoId=dQw4w9WgXcQ"
```

**Example Response:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
  "author": "Rick Astley",
  "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
}
```

**Error Response (404):**
```json
{
  "error": "VIDEO_UNAVAILABLE",
  "message": "Video not found. It may be private, removed, or the URL is incorrect."
}
```

---

### Get Transcript

Returns the transcript segments for a video, including timestamps and durations.

**Endpoint:** `GET /api/transcript`

**Query Parameters:**

| Parameter | Type   | Required | Description                                                                 |
|-----------|--------|----------|-----------------------------------------------------------------------------|
| `url`     | string | Yes*     | Full YouTube URL or video ID                                                |
| `videoId` | string | Yes*     | Alternative to `url` — the video ID                                         |
| `lang`    | string | No       | Language code (e.g., `en`, `es`, `fr`). Defaults to best available track    |

**Example Request:**
```bash
curl "http://localhost:3000/api/transcript?videoId=dQw4w9WgXcQ&lang=en"
```

**Example Response:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "language": "en",
  "languageName": "English",
  "isAutoGenerated": false,
  "availableLanguages": [
    { "code": "en", "name": "English", "isAutoGenerated": false },
    { "code": "es", "name": "Spanish", "isAutoGenerated": true },
    { "code": "fr", "name": "French", "isAutoGenerated": true }
  ],
  "segments": [
    {
      "text": "We're no strangers to love",
      "offset": 0,
      "duration": 2500
    },
    {
      "text": "You know the rules and so do I",
      "offset": 2500,
      "duration": 3200
    }
  ]
}
```

**Error Responses:**

| Status | Error Code           | Description                                    |
|--------|----------------------|------------------------------------------------|
| 400    | `INVALID_URL`        | The provided URL or video ID is invalid        |
| 404    | `VIDEO_UNAVAILABLE`  | Video is private, removed, or doesn't exist    |
| 404    | `NO_TRANSCRIPT`      | No captions available for the video or language|
| 429    | `RATE_LIMITED`       | Too many requests — try again later            |
| 500    | `SERVER_ERROR`       | Internal server error                          |

---

## 🔧 How It Works

YT-Scribe bypasses the need for an official YouTube Data API key by leveraging the internal **InnerTube API** (the same API used by YouTube's own clients). Here's the step-by-step flow:

1. **InnerTube API Key Extraction** — On first request, the app uses `youtubei.js` to initialize a YouTube session and extract the `INNERTUBE_API_KEY`. This key is cached for subsequent requests.

2. **Player Data Fetch** — The app sends a `POST` request to `https://www.youtube.com/youtubei/v1/player` using the ANDROID client context. This returns the full player response including caption track metadata.

3. **Caption Track Selection** — The response is parsed to find available caption tracks. The app prefers manual (non-auto-generated) captions over auto-generated ones unless a specific language is requested.

4. **Transcript XML Fetch** — Each caption track has a `baseUrl` pointing to a timedtext XML endpoint. The app fetches this XML data.

5. **XML Parsing** — The raw XML is parsed using regex to extract `<text>` elements with their `start` (timestamp in seconds) and `dur` (duration in seconds) attributes. HTML entities are decoded and the result is converted to a clean JSON structure with millisecond-precision offsets.

6. **Response** — The parsed segments are returned as JSON, along with language metadata and the list of all available languages.

### Architecture Diagram

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Browser   │─────▶│  Express.js  │─────▶│  InnerTube API  │
│  (Frontend) │◀─────│   (Backend)  │◀─────│  (YouTube)      │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  timedtext   │
                     │  XML Parser  │
                     └──────────────┘
```

---

## 📁 Project Structure

```
YT-Scribe/
├── public/
│   ├── index.html       # Main HTML (SPA structure)
│   ├── styles.css       # Dark glassmorphism theme
│   └── app.js           # Client-side logic (fetch, render, export)
├── server.js            # Express server + API routes
├── package.json         # Project metadata & dependencies
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

---

## 📤 Export Formats

### TXT (Plain Text)
Clean, line-by-line transcript without timestamps. Ideal for reading, searching, or pasting into other apps.

```
We're no strangers to love
You know the rules and so do I
A full commitment's what I'm thinking of
```

### SRT (SubRip Subtitle)
Standard subtitle format with timestamps. Compatible with VLC, MPC-HC, subtitle editors, and video players.

```srt
1
00:00:00,000 --> 00:00:02,500
We're no strangers to love

2
00:00:02,500 --> 00:00:05,700
You know the rules and so do I
```

### JSON
Structured data with millisecond-precision timestamps, durations, and formatted timestamps. Ideal for programmatic use, data analysis, or further processing.

```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "author": "Rick Astley",
  "segments": [
    {
      "text": "We're no strangers to love",
      "startMs": 0,
      "durationMs": 2500,
      "timestamp": "0:00"
    }
  ]
}
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description              |
|----------|---------|--------------------------|
| `PORT`   | `3000`  | Server listening port    |

To run on a different port:
```bash
PORT=5000 npm start
```

### InnerTube Client

The app uses the **ANDROID** client context (`clientVersion: 20.10.38`) for fetching player data. This is configurable in `server.js` under `INNERTUBE_CONTEXT`.

---

## 🧪 Testing

You can test the API endpoints directly using `curl`, Postman, or any HTTP client:

```bash
# Get metadata
curl "http://localhost:3000/api/metadata?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Get transcript
curl "http://localhost:3000/api/transcript?videoId=dQw4w9WgXcQ"

# Get transcript in a specific language
curl "http://localhost:3000/api/transcript?videoId=dQw4w9WgXcQ&lang=es"
```

---

## ⚠️ Limitations & Notes

- **Auto-generated captions**: Some videos only have auto-generated (ASR) captions, which may be less accurate than manual captions.
- **No captions available**: Some videos have no captions at all — the app will return a `NO_TRANSCRIPT` error.
- **Rate limiting**: Making too many requests in a short period may trigger YouTube rate limiting. If you hit a `429` error, wait a minute and try again.
- **Private/age-restricted videos**: Videos that require login or are age-restricted may not be accessible.
- **Educational use**: This tool is intended for personal, educational, and research use. Respect content creators' rights and YouTube's Terms of Service.

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

Please make sure to:
- Follow the existing code style
- Write clear, descriptive commit messages
- Test your changes before submitting

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[youtubei.js](https://github.com/LuanRT/YouTube.js)** — For providing the InnerTube session and API key extraction
- **[undici](https://github.com/nodejs/undici)** — For fast, modern HTTP client
- **[Express.js](https://expressjs.com/)** — For the lightweight web framework
- **[Inter Font](https://fonts.google.com/specimen/Inter)** — For the clean, modern typeface

---

## 📬 Support

If you encounter any issues or have questions:

- 🐛 Open an [Issue](https://github.com/backuprp2temp-oss/YT-Scribe/issues) on GitHub
- 💬 Start a [Discussion](https://github.com/backuprp2temp-oss/YT-Scribe/discussions)

---

<div align="center">
  <strong>YT-Scribe</strong> — Built with ♥ for the open-source community
</div>
