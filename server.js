const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: ["http://localhost:3000","http://localhost:5500"],
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/serve/index.html');
});

server.listen(5000, () => {
    console.log('listening on *:5000');
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