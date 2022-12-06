const app = require('express')();
const https = require('https');
const port = 3000;

app.get('/', async (req, res) => {
    let info = `To use the embed, add your username to the end of the URL like this: /username 
    
Optional parameters: 
transparent - false or true (default: false)
trackColor - hex color (default: f7f7f7)
artistColor - hex color (default: 9f9f9f)

An example using these queries:
/crackheadakira?transparent=true&trackColor=ffffff&artistColor=000000`;
    res.end(info)
})

app.get('/:user', async (req, res) => {
    try {
        let user = req.params.user;
        let queries = req.query;

        let response = await fetchRecentTracks(user);
        let track = response.recenttracks.track[0];
        let artist = track.artist["#text"];
        let trackName = track.name;
        let cover = track.image[2]["#text"];
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 's-max-age=1, stale-while-revalidate');
        res.end(getHTML(artist, trackName, await getCoverBase64(cover), queries));
    } catch (e) {
        console.log(e);
        res.end("User not found")
    }
});

app.listen(port, () => console.log(`Listening on port ${port}`));

module.exports = app;

async function fetchRecentTracks(user) {
    let requestURL = "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + user + "&api_key=86c9aeec2744601fed67fbce2ae02a04&format=json&limit=1";
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

async function getCoverBase64(url) {
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

function getHTML(artist, track, cover, queries) {
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
    }
    return `
    <svg width="480" height="133" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <foreignObject width="480" height="133">
        <body xmlns="http://www.w3.org/1999/xhtml">
            <div class="main">
                <img src="${cover}" class="cover" />
                <div class="content">
                    <div class="song">${track}</div>
                    <div class="artist">${artist}</div>
                </div>
            </div>

            <style>
        body {
            width: fit-content;
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
            box-shadow: rgba(71, 95, 139, 0.3) 0px 3px 8px;
        }
    
        a {
            text-decoration: none;
        }
    </style>
        </body>
    </foreignObject>
</svg>`
}