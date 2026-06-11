from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, Form, File, Request
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
from contextlib import asynccontextmanager
import asyncio
import time
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue
from ultralytics import YOLO
from dotenv import load_dotenv
from decimal import Decimal
from typing import Optional
from passlib.context import CryptContext
from pydantic import BaseModel
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import cv2
import base64
import numpy as np
import face_recognition
import datetime
import os
import json
import mysql.connector
import smtplib
import secrets

load_dotenv()

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

_active_tokens: dict = {}
_rate_limits: defaultdict = defaultdict(list)


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit(request: Request, max_attempts: int = 5, window_sec: int = 60) -> bool:
    ip = _get_client_ip(request)
    now = time.time()
    _rate_limits[ip] = [t for t in _rate_limits[ip] if now - t < window_sec]
    if len(_rate_limits[ip]) >= max_attempts:
        return False
    _rate_limits[ip].append(now)
    return True


async def _cleanup_expired_tokens():
    while True:
        await asyncio.sleep(3600)
        now = time.time()
        expired = [t for t, v in list(_active_tokens.items()) if now - v.get("created_at", 0) > 86400]
        for t in expired:
            _active_tokens.pop(t, None)


@asynccontextmanager
async def lifespan(application: FastAPI):
    task = asyncio.create_task(_cleanup_expired_tokens())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://freya-ethylic-nicolas.ngrok-free.dev",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.1.130:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("yolo26n.pt")


# ── Configuração da password hash ─────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Ligação ao MySQL ──────────────────────────────────────────────────────────
def get_db():
    return mysql.connector.connect(
        host=os.getenv("MySQL_HOST"),
        port=int(os.getenv("MySQL_PORT", 3306)),
        user=os.getenv("MySQL_USER"),
        password=os.getenv("MySQL_PASSWORD"),
        database=os.getenv("MySQL_DATABASE", "liveeyedetect")
    )

# ── Schema para atualizar perfil ─────────────────────────────────────────────
class AtualizarPerfilBody(BaseModel):
    id_utilizador: int
    nome: str
    email: str
 
 
# ── POST /atualizar_perfil ────────────────────────────────────────────────────
@app.post("/atualizar_perfil")
def atualizar_perfil(body: AtualizarPerfilBody):
    """
    Atualiza nome e email do utilizador.
    """
    if not body.nome.strip():
        return {"erro": "O nome não pode estar vazio"}
    if not body.email.strip():
        return {"erro": "O email não pode estar vazio"}
 
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
 
        # Verificar se o email já está a ser usado por outro utilizador
        cursor.execute(
            "SELECT id_utilizador FROM utilizadores WHERE email = %s AND id_utilizador != %s",
            (body.email.strip(), body.id_utilizador)
        )
        if cursor.fetchone():
            cursor.close()
            db.close()
            return {"erro": "Este email já está a ser usado por outra conta"}
 
        cursor.execute(
            "UPDATE utilizadores SET nome = %s, email = %s WHERE id_utilizador = %s",
            (body.nome.strip(), body.email.strip(), body.id_utilizador)
        )
        db.commit()
 
        cursor.execute(
            "SELECT id_utilizador, nome, email FROM utilizadores WHERE id_utilizador = %s",
            (body.id_utilizador,)
        )
        user = cursor.fetchone()
        cursor.close()
        db.close()
 
        return {
            "status": "ok",
            "id": user["id_utilizador"],
            "nome": user["nome"],
            "email": user["email"],
        }
 
    except Exception as e:
        print(f"Erro atualizar_perfil: {e}")
        return {"erro": "Erro no servidor"}

# ── Schema para eliminar conta ────────────────────────────────────────────────
class EliminarContaBody(BaseModel):
    id_utilizador: int
    password: str


# ── POST /eliminar_conta ──────────────────────────────────────────────────────
@app.post("/eliminar_conta")
def eliminar_conta(body: EliminarContaBody):
    """
    Elimina permanentemente a conta de um utilizador.
    Exige confirmação com a password atual antes de apagar.
    """
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Verificar se o utilizador existe
        cursor.execute(
            "SELECT * FROM utilizadores WHERE id_utilizador = %s",
            (body.id_utilizador,)
        )
        user = cursor.fetchone()

        if not user:
            cursor.close()
            db.close()
            return {"erro": "Utilizador não encontrado"}

        # Confirmar a password antes de apagar
        if not pwd_context.verify(body.password[:72], user["password"]):
            cursor.close()
            db.close()
            return {"erro": "Palavra-passe incorreta"}

        # Apagar o utilizador
        cursor.execute(
            "DELETE FROM utilizadores WHERE id_utilizador = %s",
            (body.id_utilizador,)
        )
        db.commit()
        cursor.close()
        db.close()

        return {"status": "ok"}

    except Exception as e:
        print(f"Erro eliminar_conta: {e}")
        return {"erro": "Erro no servidor"}

# ── Schema para alterar password ─────────────────────────────────────────────
class AlterarPasswordBody(BaseModel):
    id_utilizador: int
    password_atual: str
    nova_password: str

# ── GET /detecoes/nao_vistas ──────────────────────────────────────────────────
@app.get("/detecoes/nao_vistas")
def detecoes_nao_vistas():
    """Retorna contagem total e lista de person_ids com deteções não vistas."""
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT DISTINCT person_id FROM detecoes WHERE visto = 0"
        )
        rows = cursor.fetchall()
        cursor.close()
        db.close()
        ids = [r["person_id"] for r in rows]
        return {"count": len(ids), "person_ids": ids}
    except Exception as e:
        print(f"Erro detecoes_nao_vistas: {e}")
        return {"count": 0, "person_ids": []}


# ── POST /detecoes/marcar_vistas ──────────────────────────────────────────────
@app.post("/detecoes/marcar_vistas")
def marcar_vistas():
    """Marca TODAS as deteções não vistas como vistas."""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("UPDATE detecoes SET visto = 1 WHERE visto = 0")
        db.commit()
        cursor.close()
        db.close()
        return {"ok": True}
    except Exception as e:
        print(f"Erro marcar_vistas: {e}")
        return {"ok": False}


# ── POST /detecoes/marcar_vistas/{person_id} ──────────────────────────────────
@app.post("/detecoes/marcar_vistas/{person_id}")
def marcar_vistas_pessoa(person_id: int):
    """Marca como vistas apenas as deteções de uma pessoa específica."""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE detecoes SET visto = 1 WHERE person_id = %s AND visto = 0",
            (person_id,)
        )
        db.commit()
        cursor.close()
        db.close()
        return {"ok": True}
    except Exception as e:
        print(f"Erro marcar_vistas_pessoa: {e}")
        return {"ok": False}


# ── POST /alterar_password ────────────────────────────────────────────────────
@app.post("/alterar_password")
def alterar_password(body: AlterarPasswordBody):
    """
    Altera a password de um utilizador autenticado.
    Verifica a password atual antes de atualizar.
    """
    if len(body.nova_password) < 6:
        return {"erro": "A nova palavra-passe deve ter pelo menos 6 caracteres"}
 
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
 
        # Buscar o utilizador pelo id
        cursor.execute(
            "SELECT * FROM utilizadores WHERE id_utilizador = %s",
            (body.id_utilizador,)
        )
        user = cursor.fetchone()
 
        if not user:
            cursor.close()
            db.close()
            return {"erro": "Utilizador não encontrado"}
 
        # Verificar a password atual
        if not pwd_context.verify(body.password_atual[:72], user["password"]):
            cursor.close()
            db.close()
            return {"erro": "A palavra-passe atual está incorreta"}
 
        # Atualizar com a nova password (hashed)
        hashed = pwd_context.hash(body.nova_password[:72])
        cursor.execute(
            "UPDATE utilizadores SET password = %s WHERE id_utilizador = %s",
            (hashed, body.id_utilizador)
        )
        db.commit()
        cursor.close()
        db.close()
 
        return {"status": "ok"}
 
    except Exception as e:
        print(f"Erro alterar_password: {e}")
        return {"erro": "Erro no servidor"}

# ── Schema do body do login ───────────────────────────────────────────────────
class LoginBody(BaseModel):
    email: str
    password: str

# ── Endpoint POST /login ──────────────────────────────────────────────────────
@app.post("/login")
def login(request: Request, body: LoginBody):
    if not _rate_limit(request, max_attempts=5, window_sec=60):
        return {"erro": "Demasiadas tentativas. Tenta novamente dentro de 1 minuto."}

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM utilizadores WHERE email = %s", (body.email,)
        )
        user = cursor.fetchone()
        cursor.close()
        db.close()

        if not user:
            return {"erro": "Credenciais inválidas"}

        if not pwd_context.verify(body.password[:72], user["password"]):
            return {"erro": "Credenciais inválidas"}

        token = secrets.token_hex(32)
        _active_tokens[token] = {"email": user["email"], "id": user["id_utilizador"], "created_at": time.time()}

        return {
            "status": "ok",
            "id": user["id_utilizador"],
            "nome": user["nome"],
            "email": user["email"],
            "foto": user.get("foto"),
            "token": token,
            "isAdmin": user["email"] == ADMIN_EMAIL,
        }

    except Exception as e:
        print(f"Erro login: {e}")
        return {"erro": "Erro no servidor"}


# ── Schema para registar com convite ─────────────────────────────────────────
class RegistarBody(BaseModel):
    email: str
    password: str
    nome: str = ""
    codigo_convite: str = ""

# ── Endpoint POST /registar ───────────────────────────────────────────────────
@app.post("/registar")
def registar(request: Request, body: RegistarBody):
    if not _rate_limit(request, max_attempts=3, window_sec=60):
        return {"erro": "Demasiadas tentativas. Tenta novamente dentro de 1 minuto."}

    if not body.codigo_convite.strip():
        return {"erro": "Código de convite obrigatório"}

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Verificar se o código existe e não foi usado
        cursor.execute(
            "SELECT * FROM convites WHERE codigo_validacao = %s",
            (body.codigo_convite.strip().upper(),)
        )
        convite = cursor.fetchone()

        if not convite:
            cursor.close()
            db.close()
            return {"erro": "Código de convite inválido"}

        if convite["codigo_usado"]:
            cursor.close()
            db.close()
            return {"erro": "Este código de convite já foi utilizado"}

        # Criar o utilizador
        hashed = pwd_context.hash(body.password[:72])
        cursor.execute(
            "INSERT INTO utilizadores (email, password, nome) VALUES (%s, %s, %s)",
            (body.email, hashed, body.nome)
        )
        novo_id = cursor.lastrowid

        # Marcar o convite como usado
        cursor.execute(
            "UPDATE convites SET codigo_usado = TRUE WHERE codigo_validacao = %s",
            (body.codigo_convite.strip().upper(),)
        )
        db.commit()

        # Devolver os dados do novo utilizador para auto-login
        cursor.execute(
            "SELECT id_utilizador, nome, email FROM utilizadores WHERE id_utilizador = %s",
            (novo_id,)
        )
        user = cursor.fetchone()
        cursor.close()
        db.close()

        token = secrets.token_hex(32)
        _active_tokens[token] = {"email": user["email"], "id": user["id_utilizador"], "created_at": time.time()}

        return {
            "status": "ok",
            "id": user["id_utilizador"],
            "nome": user["nome"],
            "email": user["email"],
            "token": token,
            "isAdmin": user["email"] == ADMIN_EMAIL,
        }

    except mysql.connector.IntegrityError:
        return {"erro": "Email já registado"}
    except Exception as e:
        print(f"Erro registar: {e}")
        return {"erro": f"Erro registar: {e}"}


ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")

def verificar_admin(password_inserida: str) -> bool:
    """Verifica se a password corresponde à do utilizador admin na base de dados."""
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT password FROM utilizadores WHERE email = %s", (ADMIN_EMAIL,))
        user = cursor.fetchone()
        cursor.close()
        db.close()
        if not user:
            return False
        return pwd_context.verify(password_inserida[:72], user["password"])
    except Exception as e:
        print(f"Erro verificar_admin: {e}")
        return False

# ── Schema para gerar convite ─────────────────────────────────────────────────
class GerarConviteBody(BaseModel):
    admin_password: str

# ── Endpoint POST /admin/gerar_convite ────────────────────────────────────────
@app.post("/admin/gerar_convite")
def gerar_convite(request: Request, body: GerarConviteBody):
    """
    Gera um novo código de convite de uso único.
    Protegido por uma password de admin definida no .env (ADMIN_PASSWORD).
    """
    if not _rate_limit(request, max_attempts=10, window_sec=60):
        return {"erro": "Demasiadas tentativas. Tenta novamente dentro de 1 minuto."}

    if not verificar_admin(body.admin_password):
        return {"erro": "Acesso negado"}

    codigo = secrets.token_hex(4).upper()  # ex: A3F9B12C

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO convites (codigo_validacao, codigo_usado) VALUES (%s, FALSE)",
            (codigo,)
        )
        db.commit()
        cursor.close()
        db.close()
        return {"status": "ok", "codigo": codigo}
    except Exception as e:
        print(f"Erro gerar_convite: {e}")
        return {"erro": f"Erro ao gerar convite: {str(e)}"}


# ── Endpoint POST /admin/convites ─────────────────────────────────────────────
# NOTA: usa POST (não GET) para enviar a password de admin no body com segurança
@app.post("/admin/convites")
def listar_convites(body: GerarConviteBody):
    """Lista todos os convites (usados e por usar). Requer password de admin."""
    if not verificar_admin(body.admin_password):
        return {"erro": "Acesso negado"}

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Detecta o nome da coluna PK e se existe created_at
        cursor.execute("SHOW COLUMNS FROM convites")
        cols = [row["Field"] for row in cursor.fetchall()]
        pk = "id_convite" if "id_convite" in cols else "id"
        has_created = "created_at" in cols

        select_created = ", created_at" if has_created else ""
        cursor.execute(
            f"SELECT {pk} AS id, codigo_validacao, codigo_usado{select_created} "
            f"FROM convites ORDER BY {pk} DESC"
        )
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        # Serializar datetime para string
        result = []
        for r in rows:
            created = r.get("created_at")
            result.append({
                "id": r["id"],
                "codigo_validacao": r["codigo_validacao"],
                "codigo_usado": bool(r["codigo_usado"]),
                "created_at": created.isoformat() if created and hasattr(created, "isoformat") else str(created) if created else None,
            })

        return {"status": "ok", "convites": result}
    except Exception as e:
        print(f"Erro listar_convites: {e}")
        return {"erro": f"Erro no servidor: {str(e)}"}


_codigos_recuperacao: dict = {}
 
# ── Schema para recuperação ───────────────────────────────────────────────
class RecuperarPedirBody(BaseModel):
    email: str
 
class RecuperarVerificarBody(BaseModel):
    email: str
    codigo: str
 
class RecuperarRedefinirBody(BaseModel):
    email: str
    codigo: str
    nova_password: str
 
 
def _enviar_email_codigo(destino: str, codigo: str, nome: str):
    """Envia o email com o código de recuperação via Gmail SMTP."""

    gmail_user = os.getenv("GMAIL_USER")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD")
 
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "LiveEye — Código de recuperação de acesso"
    msg["From"]    = f"LiveEye <{gmail_user}>"
    msg["To"]      = destino
 
    html = f"""
    <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f7f6f3; border-radius: 12px;">
      <p style="color: #6b6760; font-size: 14px; margin: 0 0 24px;">Olá{f', {nome}' if nome else ''}! O teu código de recuperação é:</p>
      <div style="background: #fff; border: 1px solid #e2e0d8; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'DM Mono', monospace; font-size: 36px; font-weight: 500; color: #c0392b; letter-spacing: 0.3em;">{codigo}</span>
      </div>
      <p style="color: #a8a49c; font-size: 12px; margin: 0;">
        Este código expira em <strong>15 minutos</strong>.<br>
        Se não pediste esta recuperação, ignora este email.
      </p>
    </div>
    """
 
    msg.attach(MIMEText(html, "html"))
 
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(gmail_user, gmail_pass)
        server.sendmail(gmail_user, destino, msg.as_string())
 
 
# ── POST /recuperar/pedir ─────────────────────────────────────────────────
@app.post("/recuperar/pedir")
def recuperar_pedir(request: Request, body: RecuperarPedirBody):
    if not _rate_limit(request, max_attempts=3, window_sec=60):
        return {"erro": "Demasiados pedidos. Tenta novamente dentro de 1 minuto."}

    try:
        db     = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM utilizadores WHERE email = %s", (body.email,))
        user = cursor.fetchone()
        cursor.close()
        db.close()
 
        if not user:
            return {"status": "ok"}
 
        codigo  = str(secrets.randbelow(900000) + 100000)
        expires = datetime.datetime.now() + datetime.timedelta(minutes=15)
 
        _codigos_recuperacao[body.email] = {"codigo": codigo, "expires": expires}
 
        _enviar_email_codigo(body.email, codigo, user.get("nome", ""))
        return {"status": "ok"}
 
    except Exception as e:
        print(f"Erro recuperar/pedir: {e}")
        return {"erro": "Erro no servidor"}
 
 
# ── POST /recuperar/verificar ─────────────────────────────────────────────
@app.post("/recuperar/verificar")
def recuperar_verificar(body: RecuperarVerificarBody):
    entrada = _codigos_recuperacao.get(body.email)
 
    if not entrada:
        return {"erro": "Nenhum código pedido para este email"}
 
    if datetime.datetime.now() > entrada["expires"]:
        del _codigos_recuperacao[body.email]
        return {"erro": "Código expirado. Pede um novo."}
 
    if entrada["codigo"] != body.codigo:
        return {"erro": "Código inválido"}
 
    return {"status": "ok"}
 
 
# ── POST /recuperar/redefinir ─────────────────────────────────────────────
@app.post("/recuperar/redefinir")
def recuperar_redefinir(body: RecuperarRedefinirBody):
    entrada = _codigos_recuperacao.get(body.email)
 
    if not entrada:
        return {"erro": "Sessão de recuperação inválida"}
 
    if datetime.datetime.now() > entrada["expires"]:
        del _codigos_recuperacao[body.email]
        return {"erro": "Código expirado. Pede um novo."}
 
    if entrada["codigo"] != body.codigo:
        return {"erro": "Código inválido"}
 
    if len(body.nova_password) < 6:
        return {"erro": "A palavra-passe deve ter pelo menos 6 caracteres"}
 
    try:
        hashed = pwd_context.hash(body.nova_password[:72])
        db     = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE utilizadores SET password = %s WHERE email = %s",
            (hashed, body.email)
        )
        db.commit()
        cursor.close()
        db.close()
 
        del _codigos_recuperacao[body.email]
        return {"status": "ok"}
 
    except Exception as e:
        print(f"Erro recuperar/redefinir: {e}")
        return {"erro": "Erro ao atualizar a palavra-passe"}

# ── Utilitários ──────────────────────────────────────────────────────────────

def get_next_person_id() -> int:
    result = qdrant.scroll(collection_name="pessoas", limit=1000)[0]
    if not result:
        return 1
    # Só considera IDs que seguem o esquema person_id * 10 (múltiplos de 10)
    ids = [int(p.id) for p in result if int(p.id) % 10 == 0]
    if not ids:
        return 1
    max_person_id = max(ids) // 10
    return max_person_id + 1


def _encode_image(img_bgr) -> str:
    h, w = img_bgr.shape[:2]
    if w > 400:
        scale = 400 / w
        img_bgr = cv2.resize(img_bgr, (400, int(h * scale)))
    _, buf = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return base64.b64encode(buf).decode("utf-8")


def _process_upload(contents: bytes):
    """Returns (img_bgr, embedding). Raises ValueError if no face detected."""
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Ficheiro de imagem inválido ou corrompido")

    # Redimensionar para máx 800px antes do face_recognition — evita bloqueios com fotos grandes
    h, w = img.shape[:2]
    if max(h, w) > 800:
        scale = 800 / max(h, w)
        img_small = cv2.resize(img, (int(w * scale), int(h * scale)))
    else:
        img_small = img

    rgb = cv2.cvtColor(img_small, cv2.COLOR_BGR2RGB)
    locs = face_recognition.face_locations(rgb, model="hog")
    encodings = face_recognition.face_encodings(rgb, locs)
    if not encodings:
        print("AVISO: Nenhum rosto detetado na foto.")
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
    print(f"\n{'='*60}")
    print(f"[pessoas_criar] PEDIDO RECEBIDO")
    print(f"[pessoas_criar] nome={nome!r}, idade={idade}, sexo={sexo!r}")
    print(f"[pessoas_criar] lat={lat}, lon={lon}")
    print(f"[pessoas_criar] imagem1={imagem1.filename!r} ({imagem1.content_type})")
    print(f"[pessoas_criar] imagem2={imagem2.filename if imagem2 else None}")
    print(f"[pessoas_criar] imagem3={imagem3.filename if imagem3 else None}")

    try:
        person_id = get_next_person_id()
        print(f"[pessoas_criar] person_id={person_id}")
    except Exception as e:
        print(f"[pessoas_criar] ERRO get_next_person_id: {e}")
        return {"erro": f"Erro ao gerar ID: {e}"}

    uploads = [imagem1, imagem2, imagem3]
    processed = []

    for idx, upload in enumerate(uploads):
        if upload is None:
            continue
        contents = await upload.read()
        print(f"[pessoas_criar] foto {idx+1}: {len(contents)} bytes lidos")
        if not contents:
            print(f"[pessoas_criar] foto {idx+1}: VAZIA, a saltar")
            continue
        try:
            img, embedding = _process_upload(contents)
            print(f"[pessoas_criar] foto {idx+1}: processada OK, embedding len={len(embedding)}")
        except Exception as e:
            print(f"[pessoas_criar] foto {idx+1}: ERRO _process_upload: {e}")
            return {"erro": f"Foto {idx + 1}: {e}"}
        processed.append((embedding, _encode_image(img)))

    print(f"[pessoas_criar] total fotos processadas: {len(processed)}")

    if not processed:
        print(f"[pessoas_criar] ABORTADO: nenhuma fotografia válida")
        return {"erro": "Nenhuma fotografia válida enviada"}

    try:
        localizacoes_iniciais = json.loads(historico)
    except Exception:
        localizacoes_iniciais = []

    point_id_base = person_id * 10

    points = []
    for foto_idx, (embedding, img_b64) in enumerate(processed):
        point_id = point_id_base + foto_idx

        if foto_idx == 0:
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
                "imagens_b64": [],
            }
        else:
            payload = {
                "person_id": person_id,
                "foto_index": foto_idx,
                "nome": nome,
                "Desaparecida": True,
            }

        points.append(PointStruct(id=point_id, vector=embedding, payload=payload))

    todas_imagens = [img_b64 for _, img_b64 in processed]
    points[0].payload["imagens_b64"] = todas_imagens

    try:
        qdrant.upsert(collection_name="pessoas", points=points)
        print(f"[pessoas_criar] qdrant.upsert OK — person_id={person_id}, fotos={len(processed)}")
    except Exception as e:
        print(f"[pessoas_criar] ERRO qdrant.upsert: {e}")
        return {"erro": f"Erro ao guardar na base de dados: {e}"}

    print(f"[pessoas_criar] CONCLUÍDO com sucesso")
    print(f"{'='*60}\n")
    return {"status": "ok", "person_id": person_id, "fotos": len(processed)}


@app.get("/pessoas_listar")
def listar_pessoas():
    try:
        result = qdrant.scroll(
            collection_name="pessoas",
            scroll_filter=Filter(
                must=[FieldCondition(key="Desaparecida", match=MatchValue(value=True))]
            ),
            limit=300,
            with_payload=True,
        )
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
    all_points = qdrant.scroll(collection_name="pessoas", limit=1000, with_payload=True)[0]
    all_ids = {int(p.id) for p in all_points}

    legacy = []
    for p in all_points:
        pid = int(p.id)
        if pid % 10 == 0:
            continue
        principal = (pid // 10) * 10
        if principal in all_ids and principal != 0:
            continue
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

_signal_rooms: dict[str, dict] = {}
# { stream_id: {"clients": {ws: role}, "created_at": timestamp} }

_monitors: set[WebSocket] = set()

async def _broadcast_detection(person_id: int, name: str):
    dead = set()
    for ws in _monitors:
        try:
            await ws.send_json({"type": "person_detected", "person_id": person_id, "name": name})
        except Exception:
            dead.add(ws)
    _monitors -= dead

@app.websocket("/ws-signal")
async def ws_signal(ws: WebSocket):
    protocols = ws.headers.get("sec-websocket-protocol", "")
    token = protocols.split(",")[0].strip() if protocols else ""
    if not token or token not in _active_tokens:
        await ws.close(code=4001)
        return
    await ws.accept(subprotocol=token)
    
    my_room: str | None = None
    my_role: str | None = None
    
    print(f"[ws-signal] Cliente ligado (token validado)")
    
    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")
            
            if msg_type == "register":
                stream_id = data["streamId"]
                role = data.get("role", "receiver")
                
                if stream_id not in _signal_rooms:
                    _signal_rooms[stream_id] = {"clients": {}, "created_at": time.time()}
                
                _signal_rooms[stream_id]["clients"][ws] = role
                my_room = stream_id
                my_role = role
                print(f"[ws-signal] {role} entrou na sala {stream_id}")
                
                # Se um receiver entrou numa sala que já tem emitter,
                # avisa o emitter para reenviar a offer (resolve race condition)
                if role == "receiver":
                    for client, r in list(_signal_rooms[stream_id]["clients"].items()):
                        if r == "emitter" and client is not ws:
                            try:
                                await client.send_json({"type": "receiver_joined", "streamId": stream_id})
                                print(f"[ws-signal] Notificado emitter para reenviar offer na sala {stream_id}")
                            except Exception:
                                pass
                
            elif msg_type == "list":
                active = []
                now = time.time()
                for sid, room in list(_signal_rooms.items()):
                    emitters = [c for c, r in room["clients"].items() if r == "emitter"]
                    if emitters:
                        age_sec = int(now - room["created_at"])
                        active.append({"id": sid, "since_seconds": age_sec})
                await ws.send_json({"type": "streams", "streams": active})
                
            elif msg_type in ("offer", "answer", "ice"):
                route_to = data.get("streamId")
                if route_to and route_to in _signal_rooms:
                    for client, role in list(_signal_rooms[route_to]["clients"].items()):
                        if client is not ws:
                            try:
                                await client.send_text(raw)
                            except Exception:
                                pass
                            
    except WebSocketDisconnect:
        print(f"[ws-signal] Cliente desligado (sala: {my_room})")
    except Exception as e:
        print(f"[ws-signal] Erro: {e}")
    finally:
        if my_room and my_room in _signal_rooms:
            _signal_rooms[my_room]["clients"].pop(ws, None)
            if not _signal_rooms[my_room]["clients"]:
                del _signal_rooms[my_room]
                print(f"[ws-signal] Sala {my_room} eliminada (vazia)")
        print(f"[ws-signal] Salas ativas: {len(_signal_rooms)}")


@app.websocket("/ws-monitor")
async def ws_monitor(ws: WebSocket):
    protocols = ws.headers.get("sec-websocket-protocol", "")
    token = protocols.split(",")[0].strip() if protocols else ""
    if not token or token not in _active_tokens:
        await ws.close(code=4001)
        return
    await ws.accept(subprotocol=token)
    _monitors.add(ws)
    print(f"[ws-monitor] Cliente ligado (total: {len(_monitors)})")
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[ws-monitor] Erro: {e}")
    finally:
        _monitors.discard(ws)
        print(f"[ws-monitor] Cliente desligado (total: {len(_monitors)})")


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    protocols = ws.headers.get("sec-websocket-protocol", "")
    token = protocols.split(",")[0].strip() if protocols else ""
    if not token or token not in _active_tokens:
        await ws.close(code=4001)
        return
    await ws.accept(subprotocol=token)
    print("Cliente conectado via WebSocket (token validado)")

    try:
        while True:
            data = await ws.receive_text()
            header, encoded = data.split(",", 1)
            img_bytes = base64.b64decode(encoded)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            yolo_results = model(frame, classes=[0])[0]
            detections = []
            alerta_confirmado = False

            for box in yolo_results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                name = None

                # Crop da cabeca
                person_h = y2 - y1
                head_y2 = y1 + int(person_h * 0.50)
                head_crop = frame[y1:head_y2, x1:x2]

                if head_crop.size > 0:
                    rgb_head = cv2.cvtColor(head_crop, cv2.COLOR_BGR2RGB)

                    # Tentativa 1: deteção HOG normal no crop da cabeça
                    face_locations = face_recognition.face_locations(rgb_head, model="hog")
                    encodings = face_recognition.face_encodings(rgb_head, face_locations)

                    # Tentativa 2: se não detetou cara, força encoding na zona toda (cobre perfis)
                    if not encodings:
                        h, w = rgb_head.shape[:2]
                        if h > 20 and w > 20:
                            forced_loc = (0, w, h, 0)
                            encodings = face_recognition.face_encodings(rgb_head, [forced_loc])

                    matched = None
                    for encoding in encodings:
                        search_result = qdrant.query_points(
                            collection_name="pessoas",
                            query=encoding.tolist(),
                            query_filter=Filter(
                                must=[FieldCondition(key="Desaparecida", match=MatchValue(value=True))]
                            ),
                            limit=1,
                        )
                        if search_result.points and search_result.points[0].score > 0.92:
                            matched = search_result.points[0]
                            name = matched.payload.get("nome")
                            matched_person_id = matched.payload.get("person_id")
                            alerta_confirmado = True

                            # ── guaradr deteção na tabela MySQL 
                            try:
                                db_det = get_db()
                                cur_det = db_det.cursor()
                                cur_det.execute(
                                    "INSERT INTO detecoes (person_id, nome, visto) VALUES (%s, %s, 0)",
                                    (matched_person_id, name),
                                )
                                db_det.commit()
                                cur_det.close()
                                db_det.close()
                            except Exception as db_err:
                                print(f"[ws] Erro ao gravar deteção na BD: {db_err}")

                            break

                detections.append({
                    "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1,
                    "conf": conf, "cls": cls, "name": name,
                    "person_id": matched.payload.get("person_id") if matched else None,
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