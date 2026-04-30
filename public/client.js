/*
document.getElementById("startBtn").addEventListener("click", () => {
    console.log("A testar vibração...");
    const suporta = navigator.vibrate(200); 
    console.log("O browser suporta/aceitou?", suporta);
});

    const socket = new WebSocket(
        (location.protocol === "https:" ? "wss://" : "ws://") + location.host
    );
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        const video = document.getElementById("localVideo");
        const status = document.getElementById("status");

        // CRIAR O CANAL 
        const sendChannel = pc.createDataChannel("alertas");

        sendChannel.onmessage = (e) => {
            if (e.data === "DETETADO") {
                console.log("Sinal de alerta recebido do PC!");
                alertarUtilizador(); 
            }
        };

        // 1. Aceder à câmara PRIMEIRO
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: true })
            .then(async (stream) => {
                video.srcObject = stream;
                status.innerText = "Câmara ativa. A ligar ao Peer...";
                
                stream.getTracks().forEach(track => pc.addTrack(track, stream));

                // 2. Criar oferta apenas depois de ter o stream
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                // Garantir que o socket está aberto antes de enviar
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: "offer", offer }));
                } else {
                    socket.onopen = () => socket.send(JSON.stringify({ type: "offer", offer }));
                }
            })
            .catch(err => {
                status.innerText = "Erro: " + err.message;
                console.error(err);
            });

        pc.ondatachannel = (event) => {
            const receiveChannel = event.channel;
            
            receiveChannel.onmessage = (e) => {
                if (e.data === "DETETADO") {
                    console.log("Sinal de alerta recebido do PC!");
                    alertarUtilizador(); // Chama a sua função de vibração aqui
                    await toggleFlash(true);
                    setTimeout(() => toggleFlash(false), 500);
                }
            };
        };

        let podeVibrar = true;

        function alertarUtilizador() {
        if (navigator.vibrate && podeVibrar) {
            navigator.vibrate(300);
            podeVibrar = false;
            setTimeout(() => { podeVibrar = true; }, 2000); // Evita spam
            }
        }
            
        pc.onicecandidate = event => {
            if (event.candidate) {
                socket.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
            }
        };

        socket.onmessage = async (message) => {
            const data = JSON.parse(message.data);
            if (data.type === "answer") {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                status.innerText = "Ligação estabelecida!";
            }
            if (data.type === "ice") {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        };

            // Função para fazer o telemóvel vibrar
    let bloqueioAlerta = false;

    function alertarUtilizador() {
        // Se já estivermos num ciclo de alerta, ignora os novos pedidos
        if (bloqueioAlerta) return;

        bloqueioAlerta = true;
        console.log("📳 Vibrando agora...");
        
        navigator.vibrate([200, 100, 200]); // Padrão: vibra, para, vibra

        // Só permite vibrar novamente após 3 segundos
        setTimeout(() => {
            bloqueioAlerta = false;
            console.log("Sinal de alerta pronto novamente.");
        }, 3000);
    }

    // Função para a Lanterna (Flash)
    async function toggleFlash(state) {
    if (!videoTrack) {
        console.error("Track de vídeo não encontrada.");
        return;
    }

    const capabilities = videoTrack.getCapabilities();
    
    // Verifica se o browser deteta suporte para lanterna (torch)
    if (capabilities.torch) {
        try {
            await videoTrack.applyConstraints({
                advanced: [{ torch: state }]
            });
            console.log("Lanterna:", state ? "Ligada" : "Desligada");
        } catch (err) {
            console.error("Erro ao controlar lanterna:", err);
        }
    } 
    else {
        console.warn("Este dispositivo não suporta controlo de lanterna via browser.");
    }
}
*/

let videoTrack = null;
let bloqueioAlerta = false;

// Configuração do Socket e WebRTC
const socket = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host);
const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

const video = document.getElementById("localVideo");
const status = document.getElementById("status");

// 1. O Telemóvel CRIA o canal de alertas
const sendChannel = pc.createDataChannel("alertas");

sendChannel.onmessage = async (e) => {
    if (e.data === "DETETADO") {
        console.log("Sinal de deteção recebido do PC!");
        alertarUtilizador();
        
        // Faz a lanterna piscar
        await toggleFlash(true);
        setTimeout(() => toggleFlash(false), 500);
    }
};

// 2. Aceder à câmara (Traseira)
navigator.mediaDevices.getUserMedia({ 
    video: { 
        facingMode: "environment", // Mais flexível que 'exact' para evitar erros de hardware
        width: { ideal: 1280 },
        height: { ideal: 720 }
    }, 
    audio: false 
})
.then(async (stream) => {
    video.srcObject = stream;
    
    // GUARDAR A TRACK: Importante para controlar a lanterna
    videoTrack = stream.getVideoTracks()[0];
    
    status.innerText = "Câmara ativa. Aguardando ligação...";
    
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    const sendOffer = () => socket.send(JSON.stringify({ type: "offer", offer }));
    if (socket.readyState === WebSocket.OPEN) sendOffer();
    else socket.onopen = sendOffer;
})
.catch(err => { 
    status.innerText = "Erro na Câmara: " + err.message;
    console.error(err);
});

// 3. Sinalização (Signaling)
socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);
    if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        status.innerText = "Ligado ao PC!";
    }
    if (data.type === "ice") {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

pc.onicecandidate = event => {
    if (event.candidate) {
        socket.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
    }
};

// --- FUNÇÕES DE HARDWARE ---

async function toggleFlash(state) {
    // Se a track global não existe, tentamos recuperá-la do elemento de vídeo
    if (!videoTrack && video.srcObject) {
        videoTrack = video.srcObject.getVideoTracks()[0];
    }

    if (!videoTrack) return;

    try {
        const capabilities = videoTrack.getCapabilities();
        
        // Verifica se o hardware realmente suporta lanterna (torch)
        if (capabilities.torch) {
            await videoTrack.applyConstraints({
                advanced: [{ torch: state }]
            });
            console.log("Lanterna estado:", state);
        } else {
            console.warn("Lanterna não suportada nesta lente.");
        }
    } catch (err) {
        console.error("Erro no controle da lanterna:", err);
    }
}

function alertarUtilizador() {
    if (bloqueioAlerta) return;
    bloqueioAlerta = true;

    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]); // Padrão de vibração
    }

    setTimeout(() => { bloqueioAlerta = false; }, 3000);
}

// 4. Botão de Ativação (Obrigatório para permissões de hardware)
document.getElementById("startBtn").onclick = async () => {
    status.innerText = "A testar Alerta e Lanterna...";
    
    // Vibração manual
    alertarUtilizador();
    
    // TESTE MANUAL DA LANTERNA (Acorda o hardware)
    try {
        await toggleFlash(true);
        setTimeout(() => toggleFlash(false), 300);
    } catch (e) {
        console.log("Teste de lanterna falhou.");
    }
};