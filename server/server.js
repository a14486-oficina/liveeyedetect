/*
//nova versão teste com chagpt
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 🔥 SERVIR TODOS OS FICHEIROS (HTML, JS, ONNX, etc.)

// servir a pasta public (HTML, JS)
app.use(express.static(path.join(__dirname, '../public')));

// servir o modelo YOLO
app.use('/yoloAI', express.static(path.join(__dirname, 'yoloAI')));
// WebSocket (o teu já deve ter algo parecido)
wss.on('connection', (ws) => {
    console.log("Cliente conectado");

    ws.on('message', (message) => {
        // retransmitir para outros clientes
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
});

// iniciar servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});
*/

const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, "../public", req.url);

    if (req.url === "/") {
        filePath = path.join(__dirname, "../public", "index.html");
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end("Ficheiro não encontrado");
        } else {
            res.writeHead(200);
            res.end(content);
        }
    });
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("Cliente conectado");

    ws.on("message", (message) => {
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    ws.on("close", () => {
        console.log("Cliente desconectado");
    });
});

server.listen(3000, () => {
    console.log("Servidor HTTP + WebSocket a correr na porta 3000");
});
