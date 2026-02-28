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

            video.play().catch(err => {
                console.log("Erro autoplay:", err);
            });

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