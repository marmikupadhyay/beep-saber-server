const axios = require('axios');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const request = require('superagent');
const fs = require('fs');
const admZip = require('adm-zip');


const io = require("socket.io")(server, {
    cors: {
        origin: ["https://marmikupadhyay.github.io","https://yudeeeth.github.io","http://192.168.1.8:5500","http://192.168.1.8:3000","http://localhost","http://localhost:3000","http://localhost:5500","http://localhost:5000"],
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

app.use(express.static(__dirname + '/static'));

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header(
		'Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, Accept'
	);
	next();
});

app.get('/:filename', (req, res) => {
    res.sendFile(__dirname + `/serve/${req.params.filename}.html`);
});

app.get('/map/:id', (req, res) => {
    let mapId = req.params.id + '.zip';
    request
    .get(`https://as.cdn.beatsaver.com/${mapId}`)
    .on('error', function(error) {
        console.log(error);
    })
    .pipe(fs.createWriteStream(__dirname + `/maps/${mapId}`))
    .on('finish', function() {
        console.log('finished downloading');
        var zip = new admZip(__dirname + `/maps/${mapId}`);
        let onlyId = mapId.split('.')[0];        
        let errorMsg = "";
        if (!fs.existsSync(__dirname + `/maps/${onlyId}/`)) {
            fs.mkdirSync(__dirname + `/maps/${onlyId}/`);
            zip.extractAllTo(__dirname + `/maps/${onlyId}/`, true);
            if (!fs.existsSync(__dirname + `/maps/${onlyId}/Info.dat`)) {
                console.log("no Info.dat");
                if (fs.existsSync(__dirname + `/maps/${onlyId}/info.dat`)) {
                    fs.renameSync(__dirname + `/maps/${onlyId}/info.dat`, __dirname + `/maps/${onlyId}/Info.dat`);
                } else {
                    errorMsg = "No Info.dat";
                }
            }
        }
        fs.unlinkSync(__dirname + `/maps/${mapId}`);
        res.json({mesaage: errorMsg==""?"Loaded successfully":errorMsg});
    })
})

app.get('/map/:id/file/:name', (req, res) => {
    let fileName = req.params.name;
    let mapId = req.params.id;
    if (fs.existsSync(__dirname + `/maps/${mapId}/`)) {
        // check if filename exists
        if (fs.existsSync(__dirname + `/maps/${mapId}/${fileName}`)) {
            res.sendFile(__dirname + `/maps/${mapId}/${fileName}`);
        } else {
            res.send(`File ${fileName} does not exist`);
        }
    }
    else {
        res.send(`Map ${mapId} not found`);
    }
})

let port = process.env.PORT || 5000;

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});


let allSockets = [];

io.on("connection", (socket) => {
    allSockets.push(socket);
    console.log("New client connected");
    socket.on("coords",(data)=>{
        allSockets.forEach(s => {
            if(s.id !== socket.id){
                s.emit("coords",data);
            }
        });
    })
    socket.on("disconnect", () => {
        console.log("Client disconnected");
        allSockets = allSockets.filter(s => s.id !== socket.id);
    });
});