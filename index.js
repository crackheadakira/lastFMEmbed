require('dotenv').config({ path: __dirname + '/.env.local'});

const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
})

app.get('/user/:user', async (req, res) => {
    try {
        console.log(`User: ${req.params.user}`)
        const user = req.params.user;
        const queries = req.query;
        const trackAmount = clampNumber(queries.previousTracks, 1, 4);

        const response = await fetchRecentTracks(user, trackAmount);
        const track = response.recenttracks.track;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 's-max-age=1, stale-while-revalidate');
        res.end(await getSVG(track, queries));

    } catch (e) {
        console.log(e);
        res.end("Error in retrieving the user, either the user doesn't exist or there was an error on our side!")
    }
});

app.listen(port, () => console.log(`Listening on port ${port}`));

module.exports = app;

function clampNumber(num, min, max) {
    if(isNaN(num)) return min;
    return Math.min(Math.max(num, min), max);
}

function fetchRecentTracks(user, amount) {
    const requestURL = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=${process.env.API_KEY}&format=json&limit=${amount}`;
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

// Needed for encoding special characters in XML
function htmlSpecialChars(unsafe) {
    return unsafe
    .replaceAll(`&`, "&amp;")
    .replaceAll(`<`, "&lt;")
    .replaceAll(`>`, "&gt;")
    .replaceAll(`"`, "&quot;")
    .replaceAll(`'`, "&apos;");
}


function htmlDiv(artist, track, cover, past = false, showStatus = false, statusBar = false) {
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

function makeBars(amount) {
    let html = "";
    for (let i = 0; i < amount; i++) {
        html += `<div class="bar"></div>`;
    }
    return html;
}

function getBarCSS(amount) {
    let css = "";
    for (let i = 0; i < amount; i++) {
        css += `.bar:nth-child(${i + 1}) {
            animation-duration: ${Math.random() * (3200 - 1000) + 1000}ms;
            left: ${i * 4}px;
        }`;
    }
    return css;
}

async function getSVG(data, queries) {
    let html = "";

    const amountOfTrack = queries?.previousTracks > 1 ? data.length : 1;
    const showStatus = queries?.showStatus === "true";
    const statusBar = showStatus ? queries?.statusBar === "true" : false;
    const bars = showStatus && statusBar ? getBarCSS(30 * amountOfTrack) : "";

    for (let i = 0; i < amountOfTrack; i++) {
        const artist = data[i].artist["#text"];
        const trackName = data[i].name;
        const cover = data[i].image[2]["#text"];
        const nowPlaying = data[i]["@attr"]?.nowplaying;
        html += htmlDiv(artist, trackName, cover, nowPlaying, showStatus, statusBar);
    }

    let bgColor = "#181414";
    let trackColor = "f7f7f7";
    let artistColor = "9f9f9f";
    let statusBarColor = "#1c8b43";
    if (Object.keys(queries).length > 0) {
        if (queries.transparent === "true")
            bgColor = "transparent";

        if (queries.hasOwnProperty("trackColor") && queries.trackColor.length === 6)
            trackColor = queries.trackColor;

        if (queries.hasOwnProperty("artistColor") && queries.artistColor.length === 6)
            artistColor = queries.artistColor;

        if (queries.hasOwnProperty("bgColor") && queries.bgColor.length === 6 && queries.transparent !== "true")
            bgColor = `#${queries.bgColor}`
        
        if (queries.hasOwnProperty("statusBarColor") && queries.statusBarColor.length === 6 && statusBar)
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
