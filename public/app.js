/* ═══════════════════════════════════════════════════════════════════
   YT-Scribe — Client-Side Logic
   ═══════════════════════════════════════════════════════════════════ */

(() => {
    'use strict';

    // ── DOM Refs ────────────────────────────────────────────────────
    const urlInput = document.getElementById('url-input');
    const fetchBtn = document.getElementById('fetch-btn');
    const urlError = document.getElementById('url-error');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultsSection = document.getElementById('results-section');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const videoAuthor = document.getElementById('video-author');
    const badgeSegments = document.getElementById('badge-segments');
    const badgeLang = document.getElementById('badge-language');
    const langSelect = document.getElementById('lang-select');
    const transcriptEl = document.getElementById('transcript-container');
    const btnCopy = document.getElementById('btn-copy');
    const btnTxt = document.getElementById('btn-txt');
    const btnSrt = document.getElementById('btn-srt');
    const btnJson = document.getElementById('btn-json');
    const toastContainer = document.getElementById('toast-container');

    // ── State ───────────────────────────────────────────────────────
    let currentSegments = [];
    let currentVideoId = '';
    let currentMeta = {};
    let isLoadingLangChange = false;

    // ── URL helpers ─────────────────────────────────────────────────
    const YT_PATTERNS = [
        /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    ];

    function extractVideoId(input) {
        if (!input) return null;
        input = input.trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
        for (const re of YT_PATTERNS) {
            const m = input.match(re);
            if (m) return m[1];
        }
        return null;
    }

    function isValidYouTubeUrl(input) {
        return !!extractVideoId(input);
    }

    // ── Toast ───────────────────────────────────────────────────────
    function toast(message, type = 'info', duration = 3500) {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        toastContainer.appendChild(el);
        setTimeout(() => {
            el.classList.add('out');
            el.addEventListener('animationend', () => el.remove());
        }, duration);
    }

    // ── Loading ─────────────────────────────────────────────────────
    function showLoading() { loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { loadingOverlay.classList.add('hidden'); }

    // ── Format helpers ──────────────────────────────────────────────
    function msToTimestamp(ms) {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function msToSrtTimestamp(ms) {
        const totalSec = Math.floor(ms / 1000);
        const millis = ms % 1000;
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
    }

    // ── Render transcript ───────────────────────────────────────────
    function renderTranscript(segments) {
        transcriptEl.innerHTML = '';
        if (!segments || segments.length === 0) {
            transcriptEl.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:32px 0;">No transcript segments found.</p>';
            return;
        }

        const frag = document.createDocumentFragment();
        segments.forEach((seg) => {
            const row = document.createElement('div');
            row.className = 'transcript-segment';

            const time = document.createElement('span');
            time.className = 'seg-time';
            time.textContent = msToTimestamp(seg.offset);
            time.title = 'Click to copy timestamp';
            time.addEventListener('click', () => {
                navigator.clipboard.writeText(msToTimestamp(seg.offset)).then(() => toast('Timestamp copied', 'success'));
            });

            const text = document.createElement('span');
            text.className = 'seg-text';
            text.textContent = seg.text;

            row.appendChild(time);
            row.appendChild(text);
            frag.appendChild(row);
        });
        transcriptEl.appendChild(frag);
    }

    // ── Populate language dropdown from API response ─────────────
    function populateLanguages(languages, currentLang) {
        // Only repopulate if not a lang-change fetch (to avoid resetting)
        if (isLoadingLangChange) return;

        langSelect.innerHTML = '';
        if (!languages || languages.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Auto-detect';
            langSelect.appendChild(opt);
            return;
        }

        languages.forEach(({ code, name, isAutoGenerated }) => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = isAutoGenerated ? `${name} (auto)` : name;
            if (code === currentLang) opt.selected = true;
            langSelect.appendChild(opt);
        });
    }

    // ── Fetch Metadata ─────────────────────────────────────────────
    async function fetchMetadata(videoId) {
        try {
            const res = await fetch(`/api/metadata?videoId=${encodeURIComponent(videoId)}`);
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }

    // ── Fetch Transcript ───────────────────────────────────────────
    async function fetchTranscript(videoId, lang) {
        const params = new URLSearchParams({ videoId });
        if (lang) params.set('lang', lang);
        const res = await fetch(`/api/transcript?${params}`);
        const data = await res.json();
        if (!res.ok) throw data;
        return data;
    }

    // ── Main Action ─────────────────────────────────────────────────
    async function handleFetch(langOverride) {
        const raw = urlInput.value.trim();
        urlError.classList.add('hidden');

        const videoId = langOverride ? currentVideoId : extractVideoId(raw);

        if (!langOverride) {
            if (!raw) {
                urlError.textContent = 'Please enter a YouTube URL.';
                urlError.classList.remove('hidden');
                urlInput.focus();
                return;
            }
            if (!isValidYouTubeUrl(raw)) {
                urlError.textContent = "That doesn't look like a valid YouTube URL. Try pasting the full link.";
                urlError.classList.remove('hidden');
                urlInput.focus();
                return;
            }
        }

        if (!videoId) return;
        currentVideoId = videoId;

        showLoading();

        try {
            const lang = langOverride || '';

            // Fetch metadata and transcript in parallel
            const promises = [fetchTranscript(videoId, lang)];
            if (!langOverride) promises.push(fetchMetadata(videoId));

            const results = await Promise.all(promises);
            const transcriptData = results[0];
            const meta = results[1] || currentMeta;

            // Populate metadata
            if (meta && meta.title) {
                currentMeta = meta;
                videoThumbnail.src = meta.thumbnail;
                videoThumbnail.alt = meta.title;
                videoTitle.textContent = meta.title;
                videoAuthor.textContent = meta.author;
            } else if (!langOverride) {
                currentMeta = { title: videoId, author: '' };
                videoThumbnail.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                videoThumbnail.alt = '';
                videoTitle.textContent = videoId;
                videoAuthor.textContent = '';
            }

            // Store segments
            currentSegments = transcriptData.segments;

            // Badges
            badgeSegments.textContent = `${currentSegments.length} segments`;

            const langLabel = transcriptData.languageName || transcriptData.language;
            const autoTag = transcriptData.isAutoGenerated ? ' (auto)' : '';
            badgeLang.textContent = `${langLabel}${autoTag}`;

            // Populate language dropdown
            isLoadingLangChange = !!langOverride;
            populateLanguages(transcriptData.availableLanguages, transcriptData.language);
            isLoadingLangChange = false;

            // Render
            renderTranscript(currentSegments);
            resultsSection.classList.remove('hidden');

            toast('Transcript loaded successfully!', 'success');

        } catch (err) {
            const msg = err.message || 'Failed to fetch transcript.';
            toast(msg, 'error', 5000);
        } finally {
            hideLoading();
        }
    }

    // ── Download helpers ────────────────────────────────────────────
    function downloadBlob(content, filename, mime) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function safeFilename(title) {
        return (title || 'transcript').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_').substring(0, 80);
    }

    function generatePlainText() {
        return currentSegments.map((s) => s.text).join('\n');
    }

    function generateSRT() {
        return currentSegments
            .map((s, i) => {
                const start = msToSrtTimestamp(s.offset);
                const end = msToSrtTimestamp(s.offset + (s.duration || 3000));
                return `${i + 1}\n${start} --> ${end}\n${s.text}\n`;
            })
            .join('\n');
    }

    function generateJSON() {
        return JSON.stringify(
            {
                videoId: currentVideoId,
                title: currentMeta.title || '',
                author: currentMeta.author || '',
                segments: currentSegments.map((s) => ({
                    text: s.text,
                    startMs: s.offset,
                    durationMs: s.duration || 0,
                    timestamp: msToTimestamp(s.offset),
                })),
            },
            null,
            2
        );
    }

    // ── Copy to clipboard ──────────────────────────────────────────
    async function copyTranscript() {
        if (!currentSegments.length) {
            toast('No transcript to copy.', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(generatePlainText());
            toast('Transcript copied to clipboard!', 'success');
        } catch {
            toast('Failed to copy — try again.', 'error');
        }
    }

    // ── Event Listeners ────────────────────────────────────────────
    fetchBtn.addEventListener('click', () => handleFetch());

    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleFetch();
    });

    urlInput.addEventListener('input', () => {
        urlError.classList.add('hidden');
    });

    // Language change → re-fetch with specific lang
    langSelect.addEventListener('change', () => {
        if (currentVideoId && langSelect.value) {
            handleFetch(langSelect.value);
        }
    });

    btnCopy.addEventListener('click', copyTranscript);

    btnTxt.addEventListener('click', () => {
        if (!currentSegments.length) {
            toast('No transcript to download.', 'error');
            return;
        }
        downloadBlob(generatePlainText(), `${safeFilename(currentMeta.title)}.txt`, 'text/plain');
        toast('Downloaded .txt', 'success');
    });

    btnSrt.addEventListener('click', () => {
        if (!currentSegments.length) {
            toast('No transcript to download.', 'error');
            return;
        }
        downloadBlob(generateSRT(), `${safeFilename(currentMeta.title)}.srt`, 'text/srt');
        toast('Downloaded .srt', 'success');
    });

    btnJson.addEventListener('click', () => {
        if (!currentSegments.length) {
            toast('No transcript to download.', 'error');
            return;
        }
        downloadBlob(generateJSON(), `${safeFilename(currentMeta.title)}.json`, 'application/json');
        toast('Downloaded .json', 'success');
    });

})();
