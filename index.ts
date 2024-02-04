import { Elysia, t } from "elysia";
import { staticPlugin } from '@elysiajs/static'
import https from 'https';
import path from 'path';

const port = 3000;

type lastfm_data = {
    recenttracks: {
        track: {
            artist: {
                "#text": string,
            }
            name: string
            image: {
                size: string
                "#text": string,
            }[],
            "@attr": {
                nowplaying: boolean
            }
        }[]
    }
}

type query_data = {
    previousTracks: string,
    trackColor: string,
    artistColor: string,
    backgroundColor: string,
    statusBarColor: string,
    showStatus: string,
    statusBar: string,
    transparent: string
}

new Elysia()
    .use(staticPlugin())
    .get('/', ({ set }) => {
        set.headers["Content-Type"] = "text/html";

        return Bun.file(path.join(import.meta.dir, "index.html"))
    })
    .get('/user/:user', async ({set, params: { user }, query }) => {
        set.headers["Content-Type"] = "image/svg+xml";
        set.headers["Cache-Control"] = "s-max-age=1, stale-while-revalidate";

        console.log(`User: ${user}`);
        
        const trackAmount = query?.previousTracks ? parseInt(query.previousTracks) - 1 : 1;
        const response = await fetchRecentTracks(user, trackAmount);
        const track = response.recenttracks.track;
        return await getHTML(track, query as query_data);
    })
    .listen(port);

console.log(`Server running on port ${port}`);

function fetchRecentTracks(user: string, amount: number): Promise<lastfm_data> {
    amount = Math.min(Math.max(amount, 1), 4);
    const requestURL = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=86c9aeec2744601fed67fbce2ae02a04&format=json&limit=${amount}`;
    return new Promise((resolve) => {
        https.get(requestURL, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on("error", (err) => {
            console.log(err.message);
        });
    });
}

function getCoverBase64(url: string): Promise<string> {
    return new Promise((resolve) => {
        https.get(url, (resp) => {
            resp.setEncoding('base64');
            let data = "data:" + resp.headers["content-type"] + ";base64,";
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                resolve(data);
            });
        }).on("error", (err) => {
            console.log(err.message);
        });
    });
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


function htmlDiv(artist: string, track: string, cover: string, past = false, showStatus = false, statusBar = false) {
    return `
    <div class="main">
        <img src="${cover}" class="cover" />
        <div class="content">
            ${showStatus && !statusBar ? `<div class="status">${!past ? "Listened to" : "Listening to"}</div>` : ""}
            <div class="song">${htmlSpecialChars(track)}</div>
            <div class="artist">${htmlSpecialChars(artist)}</div>
            ${statusBar && past ? `<div id="bars">${makeBars(30)}</div>` : ""}
        </div>
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

async function getHTML(data: lastfm_data["recenttracks"]["track"], queries: query_data) {
    let html = "";

    const amountOfTrack = parseInt(queries?.previousTracks) > 1 ? data.length : 1;
    const showStatus = queries?.showStatus === "true";
    const statusBar = showStatus ? queries?.statusBar === "true" : false;
    const bars = showStatus && statusBar ? getBarCSS(30 * amountOfTrack) : "";

    for (let i = 0; i < amountOfTrack; i++) {
        const artist = data[i].artist["#text"];
        const trackName = data[i].name;
        const cover = await getCoverBase64(data[i].image[2]["#text"]);
        const nowPlaying = data[i]["@attr"]?.nowplaying;
        html += htmlDiv(artist, trackName, cover, nowPlaying, showStatus, statusBar);
    }

    let bgColor = "#181414";
    let trackColor = "f7f7f7";
    let artistColor = "9f9f9f";
    let statusBarColor = "#1c8b43";
    if (Object.keys(queries).length > 0) {
        if (queries.transparent && queries.transparent === "true")
            bgColor = "transparent";

        if (queries.trackColor && queries.trackColor.length === 6)
            trackColor = queries.trackColor;

        if (queries.artistColor && queries.artistColor.length === 6)
            artistColor = queries.artistColor;

        if (queries.backgroundColor && queries.backgroundColor.length === 6 && queries.transparent !== "true")
            bgColor = `#${queries.backgroundColor}`
        
        if (queries.statusBarColor && queries.statusBarColor.length === 6 && statusBar)
            statusBarColor = `#${queries.statusBarColor}`
    }

    const height = 120 * amountOfTrack + (amountOfTrack > 1 ? (3 * amountOfTrack) : 0);

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
</svg>`
}
