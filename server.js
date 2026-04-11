const express = require('express');
const cors = require('cors');
const path = require('path');
const { fetch: undiciFetch } = require('undici');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Constants ────────────────────────────────────────────────────────

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Multiple InnerTube API keys (fallback if one is blocked)
const INNERTUBE_API_KEYS = [
    'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
    'AIzaSyAO_FJ2SlqU8Q4ZEHLFAoMEQDcRaGpJzEg',
];

// Multiple client contexts to try in order (fallback if one gets blocked)
const CLIENT_CONTEXTS = [
    {
        clientName: 'IOS',
        clientVersion: '19.45.4',
        deviceMake: 'Apple',
        deviceModel: 'iPhone',
        osName: 'IOS',
        osVersion: '18.1',
        userAgent: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X;)',
    },
    {
        clientName: 'WEB',
        clientVersion: '2.20260409.00.00',
    },
    {
        clientName: 'ANDROID',
        clientVersion: '20.10.38',
    },
];

// YouTube consent cookie required for some regions
const CONSENT_COOKIE = 'CONSENT=YES+cb.20240101-10-p0.en+FX+700; SOCS=CAISEwgDEgk2MTkxMjkyNjEaAmVuIAEaBgiA_LyaBg';

// Cached visitor data (helps avoid bot detection)
let cachedVisitorData = null;
let currentKeyIndex = 0;

// ── Helpers ──────────────────────────────────────────────────────────

function extractVideoId(input) {
    if (!input) return null;
    input = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    try {
        const url = new URL(input);
        const host = url.hostname.replace('www.', '');
        if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
        if (host === 'youtube.com' || host === 'm.youtube.com') {
            if (url.searchParams.has('v')) return url.searchParams.get('v');
            const m = url.pathname.match(/^\/(embed|v|shorts|live)\/([a-zA-Z0-9_-]{11})/);
            if (m) return m[2];
        }
    } catch { }
    const fb = input.match(/(?:v=|\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return fb ? fb[1] : null;
}

/** Call innertube player API with fallback client contexts and API keys */
async function fetchInnertubeData(videoId) {
    const errors = [];

    // Try each API key and client context combination
    for (let keyIndex = 0; keyIndex < INNERTUBE_API_KEYS.length; keyIndex++) {
        const apiKey = INNERTUBE_API_KEYS[(currentKeyIndex + keyIndex) % INNERTUBE_API_KEYS.length];
        const innertubeApiUrl = 'https://www.youtube.com/youtubei/v1/player?key=' + apiKey;

        for (const context of CLIENT_CONTEXTS) {
            try {
                const body = {
                    context: { client: context },
                    videoId: videoId,
                    // Skip content checks (helps avoid bot detection)
                    contentCheckOk: true,
                    racyCheckOk: true,
                };

                // Add visitor data if we have it (helps avoid bot detection)
                if (cachedVisitorData) {
                    body.serviceIntegrityContext = {
                        visitorData: cachedVisitorData,
                    };
                }

                const headers = {
                    'Content-Type': 'application/json',
                    'User-Agent': context.userAgent || USER_AGENT,
                    'Cookie': CONSENT_COOKIE,
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Origin': 'https://www.youtube.com',
                    'Referer': 'https://www.youtube.com/',
                };

                const res = await undiciFetch(innertubeApiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(15000),
                });

                if (!res.ok) {
                    errors.push(`${context.clientName} (key${keyIndex}): HTTP ${res.status}`);
                    continue;
                }

                const data = await res.json();

                // Cache visitor data for future requests
                if (data.responseContext?.visitorData) {
                    cachedVisitorData = data.responseContext.visitorData;
                }

                // Check for bot detection or authentication errors
                const playabilityStatus = data.playabilityStatus;
                if (playabilityStatus) {
                    const reason = playabilityStatus.reason || '';
                    const status = playabilityStatus.status;

                    // Detect bot detection messages
                    if (reason.toLowerCase().includes('bot') ||
                        reason.toLowerCase().includes('sign in') ||
                        reason.toLowerCase().includes('verify') ||
                        status === 'LOGIN_REQUIRED') {
                        errors.push(`${context.clientName} (key${keyIndex}): ${reason.substring(0, 80)}`);
                        continue;
                    }

                    // Video is actually unavailable (don't try other contexts)
                    if (status === 'ERROR' && !reason.toLowerCase().includes('bot')) {
                        return data;
                    }
                }

                // Check if captions exist
                const hasCaptions = data.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length > 0;
                const totalContexts = INNERTUBE_API_KEYS.length * CLIENT_CONTEXTS.length;
                if (!hasCaptions && errors.length < totalContexts - 1) {
                    errors.push(`${context.clientName} (key${keyIndex}): No captions`);
                    continue;
                }

                // Update current key index for next request
                currentKeyIndex = (currentKeyIndex + keyIndex) % INNERTUBE_API_KEYS.length;

                // Success!
                return data;
            } catch (err) {
                errors.push(`${context.clientName} (key${keyIndex}): ${err.message || 'Unknown error'}`);
                continue;
            }
        }
    }

    // All combinations failed
    console.error('All client contexts failed:', errors);
    throw {
        code: 'SERVER_ERROR',
        message: `YouTube rejected all requests: ${errors.join('; ')}`,
    };
}

/** Extract caption tracks from innertube player response */
function extractCaptionTracks(data, videoId) {
    // Check playability
    const status = data.playabilityStatus;
    if (status) {
        if (status.status === 'ERROR' || status.status === 'LOGIN_REQUIRED') {
            const reason = status.reason || 'Video unavailable';
            throw { code: 'VIDEO_UNAVAILABLE', message: reason };
        }
        if (status.status !== 'OK') {
            throw { code: 'VIDEO_UNAVAILABLE', message: status.reason || 'Video is unplayable.' };
        }
    }

    const captions = data.captions?.playerCaptionsTracklistRenderer;
    if (!captions || !captions.captionTracks || captions.captionTracks.length === 0) {
        throw { code: 'NO_TRANSCRIPT', message: 'No captions are available for this video.' };
    }

    return captions.captionTracks;
}

/** Fetch and parse transcript XML from timedtext URL */
async function fetchTranscriptXML(baseUrl) {
    // Remove &fmt=srv3 if present (Python library does this)
    const url = baseUrl.replace('&fmt=srv3', '');
    const res = await undiciFetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Cookie': CONSENT_COOKIE,
        },
        signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
        throw {
            code: 'NO_TRANSCRIPT',
            message: `Failed to fetch transcript XML (HTTP ${res.status})`,
        };
    }

    const text = await res.text();

    // Check for bot detection in XML response
    if (text.toLowerCase().includes('sign in') || text.toLowerCase().includes('bot')) {
        console.error('Bot detected in transcript XML response');
        throw {
            code: 'NO_TRANSCRIPT',
            message: 'YouTube requires sign-in for this transcript',
        };
    }

    return text;
}

function decodeEntities(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&apos;/g, "'")
        .replace(/\\n/g, ' ')
        .replace(/\n/g, ' ');
}

function parseTranscriptXML(xml) {
    const segments = [];
    const regex = /<text\s+start="([^"]*?)"\s+dur="([^"]*?)"[^>]*?>([\s\S]*?)<\/text>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        const start = parseFloat(match[1]);
        const dur = parseFloat(match[2]);
        // Remove any HTML tags from text content
        const rawText = match[3].replace(/<[^>]*>/g, '').trim();
        const text = decodeEntities(rawText);
        if (text) {
            segments.push({
                text,
                offset: Math.round(start * 1000),
                duration: Math.round(dur * 1000),
            });
        }
    }
    return segments;
}

// ── API: Video Metadata ──────────────────────────────────────────────

app.get('/api/metadata', async (req, res) => {
    try {
        const videoId = extractVideoId(req.query.url || req.query.videoId || '');
        if (!videoId) {
            return res.status(400).json({ error: 'INVALID_URL', message: 'Please provide a valid YouTube URL.' });
        }

        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const r = await undiciFetch(oembedUrl, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(10000),
        });
        const data = await r.json();

        res.json({
            videoId,
            title: data.title || 'Unknown Title',
            author: data.author_name || 'Unknown',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        });
    } catch (err) {
        res.status(404).json({
            error: 'VIDEO_UNAVAILABLE',
            message: 'Video not found. It may be private, removed, or the URL is incorrect.',
        });
    }
});

// ── API: Transcript ──────────────────────────────────────────────────

app.get('/api/transcript', async (req, res) => {
    try {
        const videoId = extractVideoId(req.query.url || req.query.videoId || '');
        if (!videoId) {
            return res.status(400).json({ error: 'INVALID_URL', message: 'Please provide a valid YouTube URL.' });
        }

        const requestedLang = req.query.lang || '';

        // Step 1: Call innertube player API (ANDROID client)
        const innertubeData = await fetchInnertubeData(videoId);

        // Step 2: Extract caption tracks
        const tracks = extractCaptionTracks(innertubeData, videoId);

        // Step 3: Pick the right track
        let chosenTrack;
        if (requestedLang) {
            chosenTrack = tracks.find((t) => t.languageCode === requestedLang);
            if (!chosenTrack) {
                const available = tracks.map((t) => t.languageCode).join(', ');
                return res.status(404).json({
                    error: 'NO_TRANSCRIPT',
                    message: `No transcript in '${requestedLang}'. Available: ${available}`,
                });
            }
        } else {
            // Prefer manual over auto-generated
            chosenTrack = tracks.find((t) => t.kind !== 'asr') || tracks[0];
        }

        // Step 4: Fetch and parse transcript XML
        const xml = await fetchTranscriptXML(chosenTrack.baseUrl);
        const segments = parseTranscriptXML(xml);

        if (segments.length === 0) {
            return res.status(404).json({
                error: 'NO_TRANSCRIPT',
                message: 'Transcript was found but contained no text segments.',
            });
        }

        // Build available languages list
        const languages = tracks.map((t) => ({
            code: t.languageCode,
            name: t.name?.simpleText || t.name?.runs?.[0]?.text || t.languageCode,
            isAutoGenerated: t.kind === 'asr',
        }));

        res.json({
            videoId,
            language: chosenTrack.languageCode,
            languageName: chosenTrack.name?.simpleText || chosenTrack.name?.runs?.[0]?.text || chosenTrack.languageCode,
            isAutoGenerated: chosenTrack.kind === 'asr',
            availableLanguages: languages,
            segments,
        });
    } catch (err) {
        console.error('Transcript error:', err.message || err);
        console.error('Full error object:', JSON.stringify(err, null, 2));
        const status =
            err.code === 'RATE_LIMITED' ? 429
                : err.code === 'VIDEO_UNAVAILABLE' ? 404
                    : err.code === 'NO_TRANSCRIPT' ? 404
                        : 500;
        res.status(status).json({
            error: err.code || 'SERVER_ERROR',
            message: err.message || 'An unexpected error occurred while fetching the transcript.',
        });
    }
});

// ── SPA fallback ─────────────────────────────────────────────────────

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`✨ YT-Scribe server running at http://localhost:${PORT}`);
});
