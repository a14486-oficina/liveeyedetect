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