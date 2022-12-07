const app = require('express')();
const axios = require('axios');
const port = 3000;

app.get('/', async (req, res) => {
    let info = `To use the embed, add your username to the end of the URL like this: /username 
    
Optional parameters: 
transparent - false or true (default: false)
trackColor - hex color (default: f7f7f7)
artistColor - hex color (default: 9f9f9f)
bgColor - hex color, will not work with transparency (default: 181414)
showStatus - false or true (default: false)
previousTracks - number of tracks to show (default: 1)

An example using these queries:
/crackheadakira?transparent=true&trackColor=000000&artistColor=000000&showStatus=true&previousTracks=2`;
    res.end(info)
})

app.get('/:user', async (req, res) => {
    try {

        let user = req.params.user;
        let queries = req.query;
        let trackAmount = queries?.previousTracks ? parseInt(queries.previousTracks) - 1 : 1;

        let response = await fetchRecentTracks(user, trackAmount);
        let track = response.recenttracks.track;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 's-max-age=1, stale-while-revalidate');
        res.end(await getHTML(track, queries));

    } catch (e) {
        console.log(e);
        res.end("User not found")
    }
});

app.listen(port, () => console.log(`Listening on port ${port}`));

module.exports = app;

function fetchRecentTracks(user, amount = 1) {
    amount = Math.min(Math.max(amount, 1), 4);
    let requestURL = "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + user + "&api_key=86c9aeec2744601fed67fbce2ae02a04&format=json&limit=" + amount;
    return new Promise((resolve) => {
        resolve(axios.get(requestURL).then((response) => {
            return response.data
        }));
    });
}

function getCoverBase64(url) {
    return new Promise((resolve) => {
        resolve(axios.get(url, { responseType: 'arraybuffer' }).then((response) => {
            let buffer = Buffer.from(response.data, 'binary').toString("base64");
            return `data:${response.headers["content-type"]};base64,${buffer}`;
        }));
    });
}

function htmlDiv(artist, track, cover, past = false, showStatus = false) {
    return `
    <div class="main">
        <img src="${cover}" class="cover" />
        <div class="content">
            ${showStatus ? `<div class="song">${!past ? "Listened to" : "Listening to"}</div>` : ""}
            <div class="song">${track}</div>
            <div class="artist">${artist}</div>
        </div>
    </div>`;
}

async function getHTML(data, queries) {
    let html = "";

    let amountOfTrack = queries?.previousTracks ? data.length : 1;
    let showStatus = queries?.showStatus === "true";

    for (let i = 0; i < amountOfTrack; i++) {
        let artist = data[i].artist["#text"];
        let trackName = data[i].name;
        let cover = await getCoverBase64(data[i].image[2]["#text"]);
        let nowPlaying = data[i]["@attr"]?.nowplaying;
        html += htmlDiv(artist, trackName, cover, nowPlaying, showStatus);
    }

    let bgColor = "#181414";
    let trackColor = "f7f7f7";
    let artistColor = "9f9f9f";
    if (queries !== {}) {
        if (queries.transparent === "true") {
            bgColor = "transparent";
        }
        if (queries.hasOwnProperty("trackColor") && queries.trackColor.length === 6) {
            trackColor = queries.trackColor;
        }
        if (queries.hasOwnProperty("artistColor") && queries.artistColor.length === 6) {
            artistColor = queries.artistColor;
        }
        if (queries.hasOwnProperty("bgColor") && queries.bgColor.length === 6 && queries.transparent !== "true") {
            bgColor = "#" + queries.bgColor;
        }
    }

    let height = 124 * data.length + (data.length > 0 ? (3 * data.length) : 0);

    return `
    <svg width="386" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <foreignObject width="386" height="${height}">
        <body xmlns="http://www.w3.org/1999/xhtml">
        ${html}

            <style>
        body {
            width: fit-content;
            padding: 0;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
        }
    
        .main {
            display: flex;
            width: fit-content;
            height: fit-content;
            justify-content: center;
            gap: 12px;
            align-items: center;
            border-radius: 5px;
            padding: 10px;
            background-color: ${bgColor};
            border: 1px solid ${bgColor};
            margin-bottom: 3px;
        }
    
        .currentStatus {
            float: left;
            font-size: 24px;
            position: static;
            margin-top: -5px;
            margin-left: 10px;
        }
    
        .art {
            width: 27%;
            float: left;
            margin-left: -5px;
        }
    
        .content {
            width: fit-content;
            height: fit-content;
        }
    
        .song {
            width: 250px;
            color: #${trackColor};
            overflow: hidden;
            margin-top: 3px;
            text-align: center;
            white-space: nowrap;
            text-overflow: ellipsis;
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
        }
    
        .cover {
            width: 100px;
            height: 100px;
            border-radius: 5px;
            border: 1px solid ${bgColor};
        }
    
        a {
            text-decoration: none;
        }
    </style>
        </body>
    </foreignObject>
</svg>`
}