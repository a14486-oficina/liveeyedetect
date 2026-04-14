from ultralytics import YOLO
import cv2
import base64
import numpy as np
from fastapi import FastAPI, WebSocket

app = FastAPI()
model = YOLO("yolo26n.pt")

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    while True:
        data = await ws.receive_text()

        # converter base64 → imagem
        img_bytes = base64.b64decode(data.split(",")[1])
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        results = model(frame)[0]

        detections = []

        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cls = int(box.cls[0])

            detections.append({
                "x": x1,
                "y": y1,
                "w": x2 - x1,
                "h": y2 - y1,
                "conf": conf,
                "cls": cls
            })

        await ws.send_json(detections)
