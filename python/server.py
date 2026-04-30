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
from fastapi import UploadFile
from uuid import uuid4
from qdrant_client.models import PointStruct
from qdrant_client import QdrantClient
from qdrant_client.http import models
from ultralytics import YOLO
import cv2
import base64
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect # Adicionado WebSocketDisconnect
import face_recognition
import datetime
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi import Form, File




qdrant = QdrantClient(
    url="https://9f7ca3f6-92c7-4831-9fa7-2e55459009e4.eu-west-1-0.aws.cloud.qdrant.io:6333", 
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6MGJmMjZmMTktNTE0ZC00ZjE2LTk5M2MtMTBkZTUwYTc2MzgyIn0.rD4Oevhnd6Q4Wt6x5PIy30fgn0n96VvaIhIT0_OnH9Y",
)

app = FastAPI()
model = YOLO("yolo26n.pt")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://freya-ethylic-nicolas.ngrok-free.dev",
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

'''
INICIO - metodos para fazer as pesquisas na base de dados
'''

def get_next_id():
    result = qdrant.scroll(
        collection_name="pessoas",
        limit=100
    )[0]

    if not result:
        return 1

    ids = [int(p.id) for p in result if str(p.id).isdigit()]
    
    if not ids:
        return 1

    return max(ids) + 1

class Geo(BaseModel):
    lat: float
    lon: float

'''
# Lista de caminhos e nomes
pessoas = [
    {"nome": "Pessoa 1", "foto": "C:\PAP\data\pessoasProcurar\pessoa1.jpg"},
    {"nome": "Pessoa 2", "foto": "C:\PAP\data\pessoasProcurar\pessoa2.jpg"}
]

known_face_encodings = []
known_face_names = []

for p in pessoas:
    img = face_recognition.load_image_file(p["foto"])
    encodings = face_recognition.face_encodings(img)
    if encodings:
        known_face_encodings.append(encodings[0])
        known_face_names.append(p["nome"])

# 🔹 carregar rosto conhecido
try:
    known_image = face_recognition.load_image_file(r"C:\PAP\data\pessoasProcurar\pessoa1.jpg")
    known_encoding = face_recognition.face_encodings(known_image)[0]
except Exception as e:
    print(f"Erro ao carregar imagem de referência: {e}")
    known_encoding = None
    '''

@app.post("/pessoas_criar")
def criar_pessoa(nome: str = Form(...),idade: int = Form(...),lat: float = Form(...),lon: float = Form(...),imagem: UploadFile = File(...)):
    
    # converter imagem → embedding
    def gerar_embedding(imagem):
        return np.random.rand(128).tolist()
    
    embedding = gerar_embedding(imagem)

    person_id = get_next_id()

    qdrant.upsert(
        collection_name="pessoas",
        points=[
            PointStruct(
                id=person_id,
                vector=embedding,
                payload={
                    "nome": nome,
                    "idade": idade,
                    "local_de_residencia": {
                        "lat": lat,
                        "lon": lon
                    },
                    "ultimas_localizacoes": []
                }
            )
        ]
    )

    return {"status": "ok", "id": person_id}

@app.get("/pessoas_listar")
def listar_pessoas():
    result = qdrant.scroll(
        collection_name="pessoas",
        limit=100
    )

    pessoas = []
    points = result[0] or []

    for p in points:
        pessoas.append({
            "id": p.id,
            "nome": p.payload.get("nome"),
            "idade": p.payload.get("idade"),
            "local_de_residencia": p.payload.get("local_de_residencia"),
            "localizacoes": p.payload.get("ultimas_localizacoes", [])
        })

    return pessoas

@app.get("/pessoas/{person_id}")
def get_pessoa(person_id: int):
    res = qdrant.retrieve(
        collection_name="pessoas",
        ids=[person_id]
    )

    if not res:
        return {"erro": "Pessoa não encontrada"}

    p = res[0]

    return {
        "id": p.id,
        "nome": p.payload.get("nome"),
        "idade": p.payload.get("idade"),
        "local_de_residencia": p.payload.get("local_de_residencia"),
        "localizacoes": p.payload.get("ultimas_localizacoes", [])
    }


@app.post("/pessoas/{person_id}/localizacao")
def adicionar_localizacao(person_id: str, lat: float, lon: float):
    ponto = qdrant.retrieve(
        collection_name="pessoas",
        ids=[person_id]
    )[0]

    localizacoes = ponto.payload.get("ultimas_localizacoes", [])

    nova = {
        "lat": lat,
        "lon": lon,
        "timestamp": datetime.now().isoformat()
    }

    localizacoes.append(nova)

    qdrant.set_payload(
        collection_name="pessoas",
        payload={"ultimas_localizacoes": localizacoes},
        points=[person_id]
    )

    return {"status": "ok"}

'''
FIM - metodos para fazer as pesquisas na base de dados
'''

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("Cliente conectado!")

    try:
        while True:
            data = await ws.receive_text()
            img_bytes = base64.b64decode(data.split(",")[1])
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            yolo_results  = model(frame)[0]
            detections = []
            alerta_confirmado = False  # 🔹 Variável de controle do alerta

            for box in yolo_results .boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                name = None 

                if cls == 0:
                    person_img = frame[y1:y2, x1:x2]

                    if person_img.size > 0:
                        rgb = cv2.cvtColor(person_img, cv2.COLOR_BGR2RGB)
                        face_locations = face_recognition.face_locations(rgb, model="hog")
                        encodings = face_recognition.face_encodings(rgb, face_locations)

                        for encoding in encodings:
                            search_result = qdrant.query_points(
                                collection_name="pessoas",
                                query=encoding,
                                limit=1
                            )

     
                            if search_result.points:
                                score = search_result.points[0].score
                                payload = search_result.points[0].payload


                                # 🔥 Ajusta este valor (muito importante)
                                if score > 0.6:
                                    name = payload.get("nome")
                                    alerta_confirmado = True
                                    break


                detections.append({
                    "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1,
                    "conf": conf, "cls": cls, "name": name
                })

            # 🔹 AGORA ENVIAMOS UM DICIONÁRIO COMPLETO
            await ws.send_json({
                "detections": detections,
                "dispararAlerta": alerta_confirmado
            })

    except WebSocketDisconnect:
        print("O cliente desconectou de forma esperada.")
    except Exception as e:
        print(f"Erro inesperado: {e}")    
    finally:
        print("Conexão limpa.")

