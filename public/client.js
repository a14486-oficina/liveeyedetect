const socket = new WebSocket(
        (location.protocol === "https:" ? "wss://" : "ws://") + location.host
    );
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        const video = document.getElementById("localVideo");
        const status = document.getElementById("status");

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