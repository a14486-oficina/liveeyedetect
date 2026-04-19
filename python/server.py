"""
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

*/
"""

from ultralytics import YOLO
import cv2
import base64
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect # Adicionado WebSocketDisconnect
import face_recognition

app = FastAPI()
model = YOLO("yolo26n.pt") # Nota: certifique-se que o nome do modelo está correto (ex: yolo11n.pt)

# 🔹 carregar rosto conhecido
try:
    known_image = face_recognition.load_image_file(r"C:\PAP\data\pessoasProcurar\pessoa1.jpg")
    known_encoding = face_recognition.face_encodings(known_image)[0]
except Exception as e:
    print(f"Erro ao carregar imagem de referência: {e}")
    known_encoding = None

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("Cliente conectado!")

    try:
        while True:
            # Recebe o frame do cliente
            data = await ws.receive_text()

            # base64 → imagem
            img_bytes = base64.b64decode(data.split(",")[1])
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            results = model(frame)[0]
            detections = []

            for box in results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                name = None 

                # 🔹 Reconhecimento facial apenas se for pessoa (cls 0) e houver encoding
                if cls == 0 and known_encoding is not None:
                    person_img = frame[y1:y2, x1:x2]

                    '''
                    if person_img.size > 0:
                        # Reduzir a imagem para acelerar o reconhecimento facial
                        small_rgb = cv2.cvtColor(person_img, cv2.COLOR_BGR2RGB)
                        
                        face_locations = face_recognition.face_locations(small_rgb)
                        encodings = face_recognition.face_encodings(small_rgb, face_locations)

                        for encoding in encodings:
                            match = face_recognition.compare_faces([known_encoding], encoding, tolerance=0.6)
                            if True in match:
                                name = "Pessoa conhecida"
                                break # Achou, não precisa verificar outros rostos na mesma pessoa
                    '''

                    # ... dentro do if cls == 0 ...
                    if person_img.size > 0:
                        # 1. Redimensionar o recorte da pessoa para ser menor (ex: max 150px)
                        # Isso alivia MUITO o processador
                        h, w = person_img.shape[:2]
                        scaling_factor = 150 / h if h > 150 else 1.0
                        small_person_img = cv2.resize(person_img, (0, 0), fx=scaling_factor, fy=scaling_factor)
                        
                        rgb = cv2.cvtColor(small_person_img, cv2.COLOR_BGR2RGB)
                        
                        # 2. Usar o modelo 'hog' (mais rápido) em vez de 'cnn'
                        face_locations = face_recognition.face_locations(rgb, model="hog")
                        encodings = face_recognition.face_encodings(rgb, face_locations)

                        for encoding in encodings:
                            # Aumente um pouco a tolerância para 0.55 ou 0.6 para ser mais justo
                            match = face_recognition.compare_faces([known_encoding], encoding, tolerance=0.55)
                            if True in match:
                                name = "Pessoa conhecida"
                                print("Reconhecido!") 
                                break
                    # ... dentro do if cls == 0 ...
                    #fase de teste
                    if person_img.size > 0:
                        rgb = cv2.cvtColor(person_img, cv2.COLOR_BGR2RGB)
                        
                        face_locations = face_recognition.face_locations(rgb)
                        encodings = face_recognition.face_encodings(rgb, face_locations)

                        # PRINT DE DEBUG: Quantos rostos ele achou no recorte da pessoa?
                        if len(encodings) > 0:
                            print(f"Rosto detectado no frame! Verificando identidade...")
                        
                        for encoding in encodings:
                            # Tolerance: 0.6 é o padrão. Menor (0.4) é mais rígido, maior (0.8) é mais flexível.
                            match = face_recognition.compare_faces([known_encoding], encoding, tolerance=0.6)

                            if True in match:
                                print("✅ SUCESSO: Pessoa conhecida identificada!")
                                name = "Pessoa conhecida"
                                break
                            else:
                                print("❌ Rosto detectado, mas NÃO coincide com a foto de referência.")                
                    

                    

                detections.append({
                    "x": x1,
                    "y": y1,
                    "w": x2 - x1,
                    "h": y2 - y1,
                    "conf": conf,
                    "cls": cls,
                    "name": name
                })

            await ws.send_json(detections)

    except WebSocketDisconnect:
        print("O cliente desconectou de forma esperada.")
    except Exception as e:
        print(f"Erro inesperado: {e}")
    finally:
        print("Conexão limpa.")