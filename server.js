const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: ["https://marmikupadhyay.github.io","https://yudeeeth.github.io","http://192.168.1.8:5500","http://192.168.1.8:3000","http://localhost","http://localhost:3000","http://localhost:5500","http://localhost:5000"],
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

app.use(express.static(__dirname + '/static'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/serve/index.html');
});

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