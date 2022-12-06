const nodeHtmlToImage = require('node-html-to-image');
const app = require('express')();
const https = require('https');
const port = 3000;

app.get('/', async (req, res) => {
    res.end("To use the API, please use the following format: /username")
})

app.get('/:user', async (req, res) => {
    try {
        let user = req.params.user;
        let response = await fetchRecentTracks(user);
        let track = response.recenttracks.track[0];
        let artist = track.artist["#text"];
        let trackName = track.name;
        let cover = track.image[2]["#text"];
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 's-max-age=1, stale-while-revalidate');
        nodeHtmlToImage({ html: getHTML(artist, trackName, cover) }).then(image => {
            res.end(image, 'binary');
        });
    } catch (e) {
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

function getHTML(artist, track, cover) {
    return `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    
    <body>
        <div class="main">
            <img src="${cover}" class="cover" />
            <div class="content">
                <div class="song">${track}</div>
                <div class="artist">${artist}</div>
            </div>
        </div>
    </body>
    
    </html>
    
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
            background-color: #181414;
            border: 1px solid #181414;
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
            color: #f7f7f7;
            overflow: hidden;
            margin-top: 3px;
            text-align: center;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
    
        .artist {
            width: 250px;
            color: #9f9f9f;
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
    
        #bars {
            width: 40px;
            height: 30px;
            bottom: 23px;
            position: absolute;
            margin: -20px 0 0 0px;
        }
    
        .bar {
            width: 3px;
            bottom: 1px;
            height: 3px;
            position: absolute;
            background: #1DB954cc;
            animation: sound 0ms -800ms linear infinite alternate;
        }
    
        .spotify-logo {
            position: fixed;
            right: 20px;
            top: 10px;
            width: 25px;
            filter: invert(1);
        }
    
        a {
            text-decoration: none;
        }
    </style>`
}