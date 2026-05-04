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
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue
from ultralytics import YOLO
from pydantic import BaseModel
from dotenv import load_dotenv
import cv2
import base64
import numpy as np
import face_recognition
import datetime
import os
 
load_dotenv()
 
qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
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
 
# ── Utilitários ──────────────────────────────────────────────────────────────
 
def get_next_id():
    result = qdrant.scroll(collection_name="pessoas", limit=100)[0]
    if not result:
        return 1
    ids = [int(p.id) for p in result if str(p.id).isdigit()]
    return max(ids) + 1 if ids else 1
 
# ── Endpoints REST ───────────────────────────────────────────────────────────
 
@app.post("/pessoas_criar")
async def criar_pessoa(
    nome: str = Form(...),
    idade: int = Form(...),
    sexo: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    historico: str = Form("[]"),
    imagem: UploadFile = File(...),
):
    contents = await imagem.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
 
    encodings = face_recognition.face_encodings(rgb)
    if not encodings:
        return {"erro": "Nenhum rosto detetado na imagem"}
 
    embedding = encodings[0].tolist()
    person_id = get_next_id()
 
    import json
    try:
        localizacoes_iniciais = json.loads(historico)
    except Exception:
        localizacoes_iniciais = []
 
    qdrant.upsert(
        collection_name="pessoas",
        points=[
            PointStruct(
                id=person_id,
                vector=embedding,
                payload={
                    "nome": nome,
                    "idade": idade,
                    "sexo": sexo,
                    "local_de_residencia": {"lat": lat, "lon": lon},
                    "ultimas_localizacoes": localizacoes_iniciais,
                    "Desaparecida": True,
                }
            )
        ]
    )
 
    return {"status": "ok", "id": person_id}
 
 
@app.get("/pessoas_listar")
def listar_pessoas():
    try:
        result = qdrant.scroll(
            collection_name="pessoas",
            scroll_filter=Filter(
                must=[FieldCondition(key="Desaparecida", match=MatchValue(value=True))]
            ),
            limit=100,
            with_payload=True,
        )
        return [
            {
                "id": p.id,
                "nome": p.payload.get("nome"),
                "idade": p.payload.get("idade"),
                "local_de_residencia": p.payload.get("local_de_residencia"),
                "localizacoes": p.payload.get("ultimas_localizacoes", []),
            }
            for p in result[0] or []
        ]
    except Exception as e:
        print("ERRO listar_pessoas:", e)
        return []
 
 
@app.get("/pessoas_listar_encontradas")
def listar_pessoas_encontradas():
    try:
        result = qdrant.scroll(
            collection_name="pessoas",
            scroll_filter=Filter(
                must=[FieldCondition(key="Desaparecida", match=MatchValue(value=False))]
            ),
            limit=100,
            with_payload=True,
        )
        return [
            {"id": p.id, "nome": p.payload.get("nome")}
            for p in result[0] or []
        ]
    except Exception as e:
        print("ERRO listar_encontradas:", e)
        return []
 
 
@app.get("/pessoas/{person_id}")
def get_pessoa(person_id: int):
    res = qdrant.retrieve(collection_name="pessoas", ids=[person_id], with_payload=True)
    if not res:
        return {"erro": "Pessoa não encontrada"}
    p = res[0]
    return {
        "id": p.id,
        "nome": p.payload.get("nome"),
        "idade": p.payload.get("idade"),
        "sexo": p.payload.get("sexo"),
        "local_de_residencia": p.payload.get("local_de_residencia"),
        "localizacoes": p.payload.get("ultimas_localizacoes", []),
    }
 
 
@app.post("/pessoas/{person_id}/localizacao")
def adicionar_localizacao(person_id: int, lat: float, lon: float, data: str = "", hora: str = ""):
    res = qdrant.retrieve(collection_name="pessoas", ids=[person_id], with_payload=True)
    if not res:
        return {"erro": "Pessoa não encontrada"}
 
    localizacoes = res[0].payload.get("ultimas_localizacoes", [])
    localizacoes.append({
        "lat": lat,
        "lon": lon,
        "data": data,
        "hora": hora,
        "timestamp": datetime.datetime.now().isoformat(),  # CORRIGIDO: datetime.datetime
    })
 
    qdrant.set_payload(
        collection_name="pessoas",
        payload={"ultimas_localizacoes": localizacoes},
        points=[person_id],
    )
    return {"status": "ok"}
 
 
@app.post("/pessoas/{pessoa_id}/estado")
def atualizar_estado(pessoa_id: int):
    qdrant.set_payload(
        collection_name="pessoas",
        payload={"Desaparecida": False},
        points=[pessoa_id],
    )
    return {"ok": True}
 
 
# ── WebSocket ────────────────────────────────────────────────────────────────
 
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
 
            yolo_results = model(frame)[0]
            detections = []
            alerta_confirmado = False
 
            for box in yolo_results.boxes:
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
                                limit=1,
                            )
                            if search_result.points and search_result.points[0].score > 0.6:
                                name = search_result.points[0].payload.get("nome")
                                alerta_confirmado = True
                                break
 
                detections.append({
                    "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1,
                    "conf": conf, "cls": cls, "name": name,
                })
 
            await ws.send_json({
                "detections": detections,
                "dispararAlerta": alerta_confirmado,
            })
 
    except WebSocketDisconnect:
        print("O cliente desconectou de forma esperada.")
    except Exception as e:
        print(f"Erro inesperado: {e}")
    finally:
        print("Conexão limpa.")