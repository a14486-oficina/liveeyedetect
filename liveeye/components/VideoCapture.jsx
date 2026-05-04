import { useEffect, useRef, useState } from "react";

const VideoCapture = () => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("A aguardar permissão da câmara...");
  const [active, setActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setStatus("Câmara ativa");
      setActive(true);
    } catch (err) {
      setStatus("Erro ao aceder à câmara");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h2 className="text-xl font-semibold">Telemóvel - Enviar Vídeo</h2>

      <button
        onClick={startCamera}
        className="px-6 py-4 text-lg bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
      >
        Ligar Sistema de Alerta
      </button>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-md rounded-xl"
      />

      <p className="text-gray-500">{status}</p>
    </div>
  );
};

export default VideoCapture;