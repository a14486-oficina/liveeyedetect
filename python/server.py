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
from dotenv import load_dotenv
from decimal import Decimal
from typing import Optional
import cv2
import base64
import numpy as np
import face_recognition
import datetime
import os
import json

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
        "http://localhost:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.170.130.134:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Utilitários ──────────────────────────────────────────────────────────────

def get_next_person_id() -> int:
    """
    IDs de pessoa são múltiplos de 10: 10, 20, 30, …
    Cada foto ocupa person_id*10 + foto_index (0, 1, 2).
    """
    result = qdrant.scroll(collection_name="pessoas", limit=1000)[0]
    if not result:
        return 10
    ids = [int(p.id) for p in result if str(p.id).isdigit()]
    # Todos os IDs são do estilo NNN0/NNN1/NNN2 – pegar o maior e subir 10
    max_id = max(ids) if ids else 0
    base = (max_id // 10) * 10
    return base + 10


def _encode_image(img_bgr) -> str:
    """Redimensiona para max 400px de largura e retorna base64 JPEG."""
    h, w = img_bgr.shape[:2]
    if w > 400:
        scale = 400 / w
        img_bgr = cv2.resize(img_bgr, (400, int(h * scale)))
    _, buf = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return base64.b64encode(buf).decode("utf-8")


def _process_upload(contents: bytes):
    """Devolve (img_bgr, embedding) ou lança ValueError se não detetar rosto."""
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb)
    if not encodings:
        raise ValueError("Nenhum rosto detetado")
    return img, encodings[0].tolist()


# ── Endpoints REST ───────────────────────────────────────────────────────────

@app.post("/pessoas_criar")
async def criar_pessoa(
    nome: str = Form(...),
    idade: int = Form(...),
    sexo: str = Form(...),
    lat: Decimal = Form(...),
    lon: Decimal = Form(...),
    historico: str = Form("[]"),
    observacoes: str = Form(""),
    imagem1: UploadFile = File(...),
    imagem2: Optional[UploadFile] = File(None),
    imagem3: Optional[UploadFile] = File(None),
):
    """
    Cria 1 a 3 points no Qdrant para a mesma pessoa.

    Esquema de IDs:
      person_id * 10 + 0  → foto 1 (point principal, tem o payload completo)
      person_id * 10 + 1  → foto 2 (payload mínimo + person_id_ref)
      person_id * 10 + 2  → foto 3 (payload mínimo + person_id_ref)

    Assim, a pesquisa por face pode encontrar qualquer um dos 3 embeddings
    e, através de person_id_ref, recuperar o payload completo.
    """
    person_id = get_next_person_id()

    uploads = [imagem1, imagem2, imagem3]
    processed = []  # lista de (embedding, img_b64)

    for idx, upload in enumerate(uploads):
        if upload is None:
            continue
        contents = await upload.read()
        if not contents:
            continue
        try:
            img, embedding = _process_upload(contents)
        except ValueError as e:
            return {"erro": f"Foto {idx + 1}: {e}"}
        processed.append((embedding, _encode_image(img)))

    if not processed:
        return {"erro": "Nenhuma fotografia válida enviada"}

    try:
        localizacoes_iniciais = json.loads(historico)
    except Exception:
        localizacoes_iniciais = []

    # IDs dos points no Qdrant
    point_id_base = person_id * 10  # ex: 100, 200, 300, …

    points = []
    for foto_idx, (embedding, img_b64) in enumerate(processed):
        point_id = point_id_base + foto_idx

        if foto_idx == 0:
            # Point principal – contém o payload completo
            payload = {
                "person_id": person_id,
                "foto_index": 0,
                "nome": nome,
                "idade": idade,
                "sexo": sexo,
                "local_de_residencia": {"lat": float(lat), "lon": float(lon)},
                "ultimas_localizacoes": localizacoes_iniciais,
                "Desaparecida": True,
                "Observacoes": observacoes,
                # Lista com base64 de todas as fotos (preenchida a seguir)
                "imagens_b64": [],
            }
        else:
            # Points secundários – payload mínimo
            payload = {
                "person_id": person_id,
                "foto_index": foto_idx,
                "nome": nome,          # duplicado para pesquisa rápida
                "Desaparecida": True,
            }

        points.append(PointStruct(id=point_id, vector=embedding, payload=payload))

    # Guardar a lista de base64 no payload do point principal
    todas_imagens = [img_b64 for _, img_b64 in processed]
    points[0].payload["imagens_b64"] = todas_imagens

    qdrant.upsert(collection_name="pessoas", points=points)

    return {"status": "ok", "person_id": person_id, "fotos": len(processed)}


@app.get("/pessoas_listar")
def listar_pessoas():
    """
    Lista pessoas desaparecidas.
    Filtra apenas pelo Qdrant com Desaparecida=True e depois, em Python,
    seleciona só os points principais (id % 10 == 0), evitando depender
    de um payload index em foto_index.
    """
    try:
        result = qdrant.scroll(
            collection_name="pessoas",
            scroll_filter=Filter(
                must=[FieldCondition(key="Desaparecida", match=MatchValue(value=True))]
            ),
            limit=300,
            with_payload=True,
        )
        # Só queremos os points principais: id múltiplo de 10
        return [
            {
                "id": p.payload.get("person_id"),
                "nome": p.payload.get("nome"),
                "idade": p.payload.get("idade"),
                "local_de_residencia": p.payload.get("local_de_residencia"),
                "localizacoes": p.payload.get("ultimas_localizacoes", []),
            }
            for p in (result[0] or [])
            if int(p.id) % 10 == 0
        ]
    except Exception as e:
        print(f"ERRO listar_pessoas: {e}")
        return []


@app.get("/pessoas_listar_encontradas")
def listar_pessoas_encontradas():
    try:
        result = qdrant.scroll(
            collection_name="pessoas",
            scroll_filter=Filter(
                must=[FieldCondition(key="Desaparecida", match=MatchValue(value=False))]
            ),
            limit=300,
            with_payload=True,
        )
        # Só queremos os points principais: id múltiplo de 10
        return [
            {"id": p.payload.get("person_id"), "nome": p.payload.get("nome")}
            for p in (result[0] or [])
            if int(p.id) % 10 == 0
        ]
    except Exception as e:
        print(f"ERRO listar_encontradas: {e}")
        return []


@app.get("/pessoas/{person_id}")
def get_pessoa(person_id: int):
    """Recupera o point principal (foto_index 0) pelo person_id."""
    point_id = person_id * 10
    res = qdrant.retrieve(collection_name="pessoas", ids=[point_id], with_payload=True)
    if not res:
        return {"erro": "Pessoa não encontrada"}
    p = res[0]
    return {
        "id": p.payload.get("person_id"),
        "nome": p.payload.get("nome"),
        "idade": p.payload.get("idade"),
        "sexo": p.payload.get("sexo"),
        "local_de_residencia": p.payload.get("local_de_residencia"),
        "localizacoes": p.payload.get("ultimas_localizacoes", []),
        "imagens_b64": p.payload.get("imagens_b64", []),
        "observacoes": p.payload.get("Observacoes", ""),
    }


@app.post("/pessoas/{person_id}/localizacao")
def adicionar_localizacao(person_id: int, lat: Decimal, lon: Decimal, data: str = "", hora: str = ""):
    point_id = person_id * 10
    res = qdrant.retrieve(collection_name="pessoas", ids=[point_id], with_payload=True)
    if not res:
        return {"erro": "Pessoa não encontrada"}

    localizacoes = res[0].payload.get("ultimas_localizacoes", [])
    localizacoes.append({
        "lat": float(lat),
        "lon": float(lon),
        "data": data,
        "hora": hora,
        "timestamp": datetime.datetime.now().isoformat(),
    })

    qdrant.set_payload(
        collection_name="pessoas",
        payload={"ultimas_localizacoes": localizacoes},
        points=[point_id],
    )
    return {"status": "ok"}


@app.post("/pessoas/{person_id}/estado")
def atualizar_estado(person_id: int):
    """
    Marca a pessoa como não desaparecida.
    Suporta IDs legados (simples) e novos (múltiplos de 10).
    """
    candidates = [person_id, person_id * 10, person_id * 10 + 1, person_id * 10 + 2]
    existing = qdrant.retrieve(collection_name="pessoas", ids=candidates, with_payload=False)
    ids_to_update = [p.id for p in existing]
    if ids_to_update:
        qdrant.set_payload(
            collection_name="pessoas",
            payload={"Desaparecida": False},
            points=ids_to_update,
        )
    return {"ok": True}


@app.post("/migrar_ids_legados")
def migrar_ids_legados():
    """
    Migra registos antigos (IDs simples 1, 2, 3…) para o novo esquema
    de IDs múltiplos de 10 (10, 20, 30…).
    Chama este endpoint UMA vez após atualizar o servidor.
    """
    all_points = qdrant.scroll(collection_name="pessoas", limit=1000, with_payload=True)[0]
    all_ids = {int(p.id) for p in all_points}

    legacy = []
    for p in all_points:
        pid = int(p.id)
        if pid % 10 == 0:
            continue  # já é principal novo
        principal = (pid // 10) * 10
        if principal in all_ids and principal != 0:
            continue  # slot secundário válido (foto 2 ou 3)
        legacy.append(p)

    if not legacy:
        return {"status": "nada a migrar"}

    existing_person_ids = set()
    for p in all_points:
        pid = int(p.id)
        if pid % 10 == 0:
            existing_person_ids.add(pid // 10)
    next_pid = max(existing_person_ids, default=0) + 1

    migrated = []
    for p in legacy:
        old_id = int(p.id)
        payload = dict(p.payload)

        retrieved = qdrant.retrieve(
            collection_name="pessoas", ids=[old_id],
            with_payload=True, with_vectors=True,
        )
        if not retrieved:
            continue
        vector = retrieved[0].vector

        new_point_id = next_pid * 10
        new_payload = {
            **payload,
            "person_id": next_pid,
            "foto_index": 0,
            "imagens_b64": (
                [payload["imagem_b64"]] if payload.get("imagem_b64")
                else payload.get("imagens_b64", [])
            ),
        }
        new_payload.pop("imagem_b64", None)

        qdrant.upsert(
            collection_name="pessoas",
            points=[PointStruct(id=new_point_id, vector=vector, payload=new_payload)]
        )
        qdrant.delete(collection_name="pessoas", points_selector=[old_id])

        migrated.append({"old_id": old_id, "new_id": new_point_id, "person_id": next_pid})
        next_pid += 1

    return {"status": "ok", "migrados": migrated}


# ── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("Cliente conectado via WebSocket")

    try:
        while True:
            data = await ws.receive_text()
            header, encoded = data.split(",", 1)
            img_bytes = base64.b64decode(encoded)
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
                            # Pesquisa em TODOS os points (incluindo fotos 1 e 2)
                            search_result = qdrant.query_points(
                                collection_name="pessoas",
                                query=encoding.tolist(),
                                query_filter=Filter(
                                    must=[FieldCondition(key="Desaparecida", match=MatchValue(value=True))]
                                ),
                                limit=1,
                            )
                            if search_result.points and search_result.points[0].score > 0.95:
                                matched = search_result.points[0]
                                name = matched.payload.get("nome")
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
        print("Cliente desconectado.")
    except Exception as e:
        print(f"Erro inesperado no WebSocket: {e}")
    finally:
        print("Limpeza de conexão concluída.")