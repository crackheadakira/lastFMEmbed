import dotenv from 'dotenv';
import { Elysia, t } from 'elysia'

dotenv.config();

import embedBuilder from "./index.html";
type LastFMTrack = {
    artist: {
        "#text": string,
    }
    album: {
        mbid?: string,
        "#text": string,
    }
    name: string
    image: {
        size: string
        "#text": string,
    }[],
    "@attr"?: {
        nowplaying: boolean
    }
}
type LastFMData = {
    recenttracks: {
        track: LastFMTrack[]
    }
}

const port = process.env.PORT ?? 3000;

const userQuery = t.Object({
    showAsAlbum: t.Boolean({
        default: false,
    }),
    showStatus: t.Boolean({
        default: false,
    }),
    statusBar: t.Boolean({
        default: false,
    }),
    showOnlyCover: t.Boolean({
        default: false,
    }),
    transparent: t.Boolean({
        default: false,
    }),

    bgColor: t.String({
        default: "#181414"
    }),
    trackColor: t.String({
        default: "f7f7f7"
    }),
    artistColor: t.String({
        default: "9f9f9f",
    }),
    statusBarColor: t.String({
        default: "#1c8b43"
    }),

    previousTracks: t.Number({
        minimum: 1,
        maximum: 5,
        default: 1,
    }),
});

new Elysia({ nativeStaticResponse: true })
    .listen(port)
    .all("/", embedBuilder)
    .onError(({ error }) => {
        console.error(error);
        return new Response(error.toString())
    })
    .get("/user/:user", async ({ params, query, set }) => {
        set.headers["content-type"] = "image/svg+xml";
        set.headers["cache-control"] = "s-max-age=1, stale-while-revalidate";

        const user = params.user;

        const response = await fetchRecentTracksCached(user);

        let tracks = response.recenttracks.track;

        if (query.showAsAlbum) {
            const seen = new Set<string>();

            tracks = tracks.filter((track) => {
                const id = track.album.mbid || track.album["#text"];
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
            });
        }

        tracks = tracks.slice(0, query.previousTracks);

        const svg = await getSVG(tracks, query);
        return svg;
    }, {
        query: userQuery,
        response: t.String(),
    });

console.log(`Listening on port: ${port}`);

const cache = new Map<string, { data: LastFMData; expires: number }>();
const coverCache = new Map<string, { base64: string; expires: number }>();

async function fetchRecentTracksCached(user: string) {
    const cacheKey = `recentTracks:${user}`;
    const now = Date.now();

    const cached = cache.get(cacheKey);
    if (cached && cached.expires > now) {
        return cached.data;
    }

    const data = await fetchRecentTracks(user) as LastFMData; // Your actual fetch function

    cache.set(cacheKey, { data, expires: now + 1000 * 60 }); // Cache for one minute

    return data;
}


async function fetchRecentTracks(user: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const requestURL = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=${process.env.API_KEY}&format=json`;

    const res = await fetch(requestURL, {
        signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
}

async function getCoverBase64Cached(url: string | undefined) {
    if (!url) throw new Error("Missing album cover URL in track");

    const now = Date.now();
    const cached = coverCache.get(url);

    if (cached && cached.expires > now) {
        return cached.base64;
    }

    const base64 = await getCoverBase64(url);

    coverCache.set(url, { base64, expires: now + 24 * 60 * 60 * 1000 }); // 24 hour cache

    return base64;
}

async function getCoverBase64(url: string) {
    const res = await fetch(url);

    if (!res.ok || !res.body) {
        throw new Error(`Failed to fetch image: ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type") || "image/jpeg"; // fallback type
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return `data:${contentType};base64,${base64}`;
}

// Needed for encoding special characters in XML
function htmlSpecialChars(unsafe: string) {
    return unsafe
        .replaceAll(`&`, "&amp;")
        .replaceAll(`<`, "&lt;")
        .replaceAll(`>`, "&gt;")
        .replaceAll(`"`, "&quot;")
        .replaceAll(`'`, "&apos;");
}

function htmlDiv(data: {
    artist: string,
    track: string,
    cover: string,
    past: boolean,
    showStatus: boolean,
    statusBar: boolean,
    showOnlyCover: boolean,
}) {
    if (!data.showOnlyCover)
        return `
    <div class="main">
        <img src="${data.cover}" class="cover" />
        <div class="content">
            ${data.showStatus && !data.statusBar
                ? `<div class="status">${!data.past ? "Listened to" : "Listening to"
                }</div>`
                : ""
            }
            <div class="song">${htmlSpecialChars(data.track)}</div>
            <div class="artist">${htmlSpecialChars(data.artist)}</div>
            ${data.statusBar && data.past ? `<div id="bars">${makeBars(30)}</div>` : ""}
        </div>
    </div>`;

    return `<div class="main">
        <img src="${data.cover}" class="cover" />
    </div>`;
}

function makeBars(amount: number) {
    let html = "";
    for (let i = 0; i < amount; i++) {
        html += `<div class="bar"></div>`;
    }
    return html;
}

function getBarCSS(amount: number) {
    let css = "";
    for (let i = 0; i < amount; i++) {
        css += `.bar:nth-child(${i + 1}) {
            animation-duration: ${Math.random() * (3200 - 1000) + 1000}ms;
            left: ${i * 4}px;
        }`;
    }
    return css;
}

async function getSVG(data: LastFMTrack[], queries: typeof userQuery.static) {
    const amountOfTrack = queries.previousTracks;
    const showStatus = queries.showStatus;
    const statusBar = showStatus ? queries.statusBar : false;
    const showOnlyCover = queries.showOnlyCover;
    const bars = showStatus && statusBar ? getBarCSS(30 * amountOfTrack) : "";

    const coverPromises = data.slice(0, amountOfTrack).map(async (track) => {
        const artist = track.artist["#text"];
        const trackName = track.name as string;
        const cover = await getCoverBase64Cached(track.image[2]?.['#text']);
        const nowPlaying = track["@attr"]?.nowplaying ?? false;

        return htmlDiv({
            artist,
            cover,
            track: trackName,
            past: nowPlaying,
            showStatus,
            statusBar,
            showOnlyCover
        });
    });

    const htmlParts = await Promise.all(coverPromises);
    const html = htmlParts.join("");

    let bgColor = "#181414";
    let trackColor = "f7f7f7";
    let artistColor = "9f9f9f";
    let statusBarColor = "#1c8b43";

    if (queries.transparent) bgColor = "transparent";

    if (queries.trackColor.length === 6)
        trackColor = queries.trackColor;

    if (queries.artistColor.length === 6)
        artistColor = queries.artistColor;

    if (queries.bgColor.length === 6 && queries.transparent)
        bgColor = `#${queries.bgColor}`;

    if (queries.statusBarColor.length === 6 && statusBar)
        statusBarColor = `#${queries.statusBarColor}`;

    let height = 120 * amountOfTrack + (amountOfTrack > 1 ? 3 * amountOfTrack : 0);

    if (showOnlyCover && amountOfTrack > 3) height = 243;
    else if (showOnlyCover && amountOfTrack <= 3) height = 120;

    return `
    <svg width="382" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <foreignObject width="382" height="${height}">
        <body xmlns="http://www.w3.org/1999/xhtml">
        ${html}

            <style>
        @import url("https://rsms.me/inter/inter.css");

        :root {
            font-family: Inter, sans-serif;
            font-feature-settings: 'liga' 1, 'calt' 1; /* fix for Chrome */
        }

        body {
            width: fit-content;
            padding: 0;
            margin: 0;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            -webkit-font-smoothing: auto;
            -moz-osx-font-smoothing: auto;
            display: flex;
            flex-wrap: wrap;
            gap: 0px 6px;
            justify-content: center;
        }
    
        .main {
            position: relative;
            display: flex;
            width: fit-content;
            height: fit-content;
            justify-content: center;
            gap: 12px;
            align-items: center;
            border-radius: 5px;
            padding: 10px;
            background-color: ${bgColor};
            margin-bottom: 3px;
        }
    
        .art {
            width: 27%;
            float: left;
            margin-left: -5px;
        }
    
        .content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: fit-content;
            height: fit-content;
        }
    
        .song, .status {
            width: 250px;
            color: #${trackColor};
            overflow: hidden;
            margin-top: 3px;
            text-align: center;
            white-space: nowrap;
            text-overflow: ellipsis;
            font-weight: 500;
        }

        .status {
            font-weight: 400;
        }
    
        .artist {
            width: 250px;
            color: #${artistColor};
            margin-top: 4px;
            text-align: center;
            margin-bottom: 5px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            font-size: 14px;
        }
    
        .cover {
            width: 100px;
            height: 100px;
            border-radius: 5px;
        }
    
        a {
            text-decoration: none;
        }

        #bars {
            position: relative;
            width: 120px;
            height: 20px;
        }

        .bar {
            position: absolute;
            bottom: 1px;
            width: 3px;
            height: 3px;
            background: ${statusBarColor};
            animation: sound 0ms -3200ms ease-in-out infinite alternate;
        }

        ${bars}

        @keyframes sound {
            0% {
                height: 3px;
                opacity: 0.35;
            }
            100% {
                height: 15px;
                opacity: 0.95;
            }
        }
        
    </style>
        </body>
    </foreignObject>
</svg>`;
}