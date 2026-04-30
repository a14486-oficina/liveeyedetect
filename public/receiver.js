/*
// 1️⃣ WebRTC
console.log("JS carregado");
const socket = new WebSocket(
    (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

const video = document.getElementById("remoteVideo");
const status = document.getElementById("status");

pc.ontrack = (event) => {
    console.log("Track recebida:", event.streams);

    if (!video.srcObject) {
        video.srcObject = event.streams[0];
    }

    video.muted = false;
    video.volume = 1;

    video.play().catch(err => console.log("Erro autoplay:", err));
    status.innerText = "Vídeo recebido!";
};

pc.onicecandidate = event => {
    if (event.candidate) {
        socket.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
    }
};

socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: "answer", answer }));
    }

    if (data.type === "ice") {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

// 2️⃣ Canvas / overlay
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);

function resizeCanvas() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}
video.addEventListener("loadeddata", resizeCanvas);

// 3️⃣ YOLO ONNX real (coloca **depois de todo o resto**, no fim)
let session;
let inputName;
/*
async function loadModel() {
    session = await ort.InferenceSession.create('./yoloAI/yolo26n.onnx');
    inputName = session.inputNames[0];
    console.log("Modelo YOLO carregado!");
}

// nova função teste com chagpt
async function loadModel() {
    try {
        console.log("A carregar modelo...");
        
        session = await ort.InferenceSession.create('./yoloAI/yolo26n.onnx');
        
        inputName = session.inputNames[0];

        console.log("Modelo YOLO carregado!");
    } catch (error) {
        console.error("ERRO AO CARREGAR MODELO:", error);
    }
}
function preprocessFrame(video) {
    const canvasTmp = document.createElement('canvas');
    canvasTmp.width = 640;
    canvasTmp.height = 640;
    const ctxTmp = canvasTmp.getContext('2d');
    ctxTmp.drawImage(video, 0, 0, 640, 640);
    const imgData = ctxTmp.getImageData(0, 0, 640, 640);
    const data = Float32Array.from(imgData.data).filter((_, i) => i % 4 !== 3);
    return new ort.Tensor('float32', data, [1, 3, 640, 640]);
}

function drawBoxes(boxes) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    boxes.forEach(box => {
        ctx.strokeRect(box[0], box[1], box[2]-box[0], box[3]-box[1]);
    });
}

function postprocess(output) {
    const data = output[Object.keys(output)[0]].data;
    const boxes = [];

    const numDetections = 8400; // padrão YOLO
    const numClasses = 80;

    for (let i = 0; i < numDetections; i++) {
        const x = data[i];
        const y = data[i + numDetections];
        const w = data[i + numDetections * 2];
        const h = data[i + numDetections * 3];

        let maxScore = 0;
        let classId = -1;

        // procurar melhor classe
        for (let c = 0; c < numClasses; c++) {
            const score = data[i + numDetections * (4 + c)];
            if (score > maxScore) {
                maxScore = score;
                classId = c;
            }
        }

        // 👤 pessoa = classe 0
        if (classId === 0 && maxScore > 0.5) {
            const scaleX = canvas.width / 640;
            const scaleY = canvas.height / 640;

            boxes.push([
                (x - w / 2) * scaleX,
                (y - h / 2) * scaleY,
                (x + w / 2) * scaleX,
                (y + h / 2) * scaleY,
                maxScore
            ]);
        }
    }

    return nonMaxSuppression(boxes, 0.5);
}

function nonMaxSuppression(boxes, iouThreshold) {
    boxes.sort((a, b) => b[4] - a[4]);
    const result = [];

    function iou(a, b) {
        const x1 = Math.max(a[0], b[0]);
        const y1 = Math.max(a[1], b[1]);
        const x2 = Math.min(a[2], b[2]);
        const y2 = Math.min(a[3], b[3]);

        const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const boxAArea = (a[2] - a[0]) * (a[3] - a[1]);
        const boxBArea = (b[2] - b[0]) * (b[3] - b[1]);

        return interArea / (boxAArea + boxBArea - interArea);
    }

    while (boxes.length > 0) {
        const chosen = boxes.shift();
        result.push(chosen);

        boxes = boxes.filter(box => iou(chosen, box) < iouThreshold);
    }

    return result;
}

async function detectYOLO() {
    if (video.videoWidth === 0 || !session) {
        requestAnimationFrame(detectYOLO);
        return;
    }

    const inputTensor = preprocessFrame(video);
    const output = await session.run({ [inputName]: inputTensor });
    const boxes = postprocess(output); // ainda precisas implementar

    drawBoxes(boxes);
    requestAnimationFrame(detectYOLO);
}



// inicializar YOLO **no fim do ficheiro**
console.log("ANTES DO LOAD");

loadModel().then(() => {
    console.log("DEPOIS DO LOAD");
    detectYOLO();
});
console.log(classId, score);
*/

const video = document.getElementById("remoteVideo");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");

const captureCanvas = document.getElementById("captureCanvas");
const captureCtx = captureCanvas.getContext("2d");



    const socket = new WebSocket( 
        (location.protocol === "https:" ? "wss://" : "ws://") + location.host ); 
        
    const pc = new RTCPeerConnection(
        { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
    ); 

    const status = document.getElementById("status"); 


    pc.ontrack = (event) => {
        const video = document.getElementById("remoteVideo");
        video.srcObject = event.streams[0];
        
        video.onloadedmetadata = () => {
            video.play();
            console.log("Vídeo recebido e a tocar. Dimensões:", video.videoWidth, "x", video.videoHeight);
            // Garantir que o loop começa assim que houver vídeo real
            setTimeout(sendFrame, 1000); 
        };
    };

    

    socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);
    
    if (data.type === "offer") {
        // O telemóvel enviou a câmara, o PC tem de aceitar
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: "answer", answer }));
    } 
    else if (data.type === "ice") {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

    video.onplay = () => {
    console.log("Iniciando envio de frames...");
    sendFrame();
    };

    const wsYOLO = new WebSocket("ws://localhost:8000/ws");

    /*
    const captureCanvas = document.getElementById("captureCanvas");
    const captureCtx = captureCanvas.getContext("2d");

    const canvas = document.getElementById("overlay");
    const ctx = canvas.getContext("2d");
    */

    let isWaitingForResponse = false;

    function sendFrame() {
        const video = document.getElementById("remoteVideo");
        
        // SÓ ENVIA SE: vídeo tiver tamanho, socket estiver aberto e não estivermos esperando resposta
        if (video.videoWidth === 0 || wsYOLO.readyState !== WebSocket.OPEN || isWaitingForResponse) {
            return; 
        }

        isWaitingForResponse = true; // Bloqueia novos envios até receber resposta

        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        captureCtx.drawImage(video, 0, 0);

        // 0.5 de qualidade ajuda MUITO na velocidade via ngrok/redes lentas
        const dataURL = captureCanvas.toDataURL("image/jpeg", 0.5); 
        wsYOLO.send(dataURL);
    }

    wsYOLO.onopen = () => {
        console.log("Ligado ao YOLO backend");
        // Não chamamos sendFrame aqui direto, deixamos o loop de vídeo carregar
    };
    
    wsYOLO.onclose = () => {
        console.log("WebSocket fechado");
    };

    wsYOLO.onerror = (err) => {
        console.log("Erro WebSocket:", err);
    };
    /*

    1. versão
    
    wsYOLO.onmessage = (event) => {
        const detections = JSON.parse(event.data);

        console.log("Deteções:", detections); 

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;

        detections.forEach(det => {
            ctx.strokeRect(det.x, det.y, det.w, det.h);
        });
    };
    */
   /*

    2. Versão

    wsYOLO.onmessage = (event) => {
        const detections = JSON.parse(event.data);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;

        detections.forEach(det => {
            ctx.strokeRect(det.x, det.y, det.w, det.h);
        });
    };
    */

    let dataChannel; // Variável global

    pc.ondatachannel = (event) => {
        dataChannel = event.channel;
        dataChannel.onopen = () => console.log("Canal de Dados aberto e pronto!");
        dataChannel.onclose = () => console.log("Canal de Dados fechado.");
    };

    pc.onicecandidate = event => {
        if (event.candidate) {
            socket.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
        }
    };

    wsYOLO.onmessage = (event) => {
    isWaitingForResponse = false; 

    // O event.data agora traz o objeto { detections: [], dispararAlerta: bool }
    const resposta = JSON.parse(event.data);
    const detections = resposta.detections;
    const alertaConfirmado = resposta.dispararAlerta;

    // 🔹 SÓ ENVIA O SINAL SE A COMPARAÇÃO DE FACE BATEU CERTO
    if (alertaConfirmado === true) {
        if (dataChannel && dataChannel.readyState === "open") {
            console.log("✅ Face Confirmada! Enviando alerta...");
            dataChannel.send("DETETADO");
        }
    }

    // --- Lógica de desenho (continua igual, mas usando 'detections') ---
    const video = document.getElementById("remoteVideo");
    const rect = video.getBoundingClientRect();
    const scaleX = rect.width / video.videoWidth;
    const scaleY = rect.height / video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = alertaConfirmado ? "green" : "red"; // Muda cor se reconhecido
    ctx.lineWidth = 2;
    ctx.fillStyle = alertaConfirmado ? "green" : "red";
    ctx.font = "18px Arial";

    detections.forEach(det => {
        const x = det.x * scaleX;
        const y = det.y * scaleY;
        const w = det.w * scaleX;
        const h = det.h * scaleY;

        ctx.strokeRect(x, y, w, h);
        if (det.name) {
            ctx.fillText(det.name, x, y > 20 ? y - 5 : y + 20);
        }
    });

    setTimeout(sendFrame, 50); 
};
    /*
    video.addEventListener("loadeddata", () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    });
    
    */
    video.addEventListener("loadeddata", resizeCanvas);
    window.addEventListener("resize", resizeCanvas);

    setInterval(() => {
    console.log("Video size:", video.videoWidth, video.videoHeight);
    }, 2000);

    function resizeCanvas() {
        const rect = video.getBoundingClientRect();

        canvas.width = rect.width;
        canvas.height = rect.height;

        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
    }