# LiveEye

Sistema de deteção de pessoas desaparecidas que usa YOLO + reconhecimento facial.

## Arquitetura

```
PAP/
├── python/server.py          # Backend FastAPI (YOLO + face_recognition)
├── python/yolo26n.pt         # Modelo YOLO treinado
├── liveeye/                  # Frontend React (Vite)
├── BD/schema_liveeyedetect.sql  # Schema MySQL
├── Dockerfile                # Container para o backend Python
├── requirements.txt          # Dependências Python
└── .env                      # Configuração (credenciais)
```

## Pré-requisitos

- **Python** 3.12 (ver `.python-version`)
- **Node.js** 18+
- **MySQL** 8+ (ou MariaDB 10.4+)
- **Conta Qdrant Cloud** (gratuita em https://cloud.qdrant.io)
- **Git**

## Setup rápido (Windows)

### 🪄 Método automático (recomendado)

```batch
install.bat        - faz tudo (venv, pip, npm, .env)
start.bat          - inicia backend + frontend
```

Passo a passo:

1. **Pré-requisitos:** Python 3.12, Node.js 18+, MySQL, Git
2. **Instalar:** faz duplo clique em `install.bat`
3. **Configurar:** abre `.env` e preenche as credenciais (ver tabela abaixo)
4. **Base de dados:** importa o schema —
   ```
   mysql -u root -p < BD\schema_liveeyedetect.sql
   ```
5. **Iniciar:** faz duplo clique em `start.bat`

Depois abre no browser:
| Ambiente | Frontend | Backend |
| -------- | -------- | ------- |
| PC local | http://localhost:5173 | http://localhost:8000 |
| Servidor | http://IP_DO_SERVIDOR:5173 | http://IP_DO_SERVIDOR:8000 |

### 📋 Método manual

<details>
<summary>Clique para expandir</summary>

#### 1. Clonar

```bash
git clone https://github.com/a14486-oficina/Projeto.git
cd Projeto
```

#### 2. Base de dados MySQL

```bash
mysql -u root -p < BD/schema_liveeyedetect.sql
```

#### 3. Configurar variáveis de ambiente

```bash
copy .env.example .env
```

Abre o `.env` e preenche:

| Variável            | Onde obter                                                |
| ------------------- | --------------------------------------------------------- |
| `QDRANT_URL`        | Dashboard do Qdrant Cloud                                 |
| `QDRANT_API_KEY`    | Dashboard do Qdrant Cloud (API Key)                       |
| `MySQL_*`           | As tuas credenciais MySQL                                 |
| `GMAIL_USER`        | Gmail que vai enviar emails de recuperação                |
| `GMAIL_APP_PASSWORD`| App Password do Gmail                                     |
| `ADMIN_EMAIL`       | Email do admin (tem de existir na tabela `utilizadores`)  |

#### 4. Backend Python

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

> **Nota (Windows):** `dlib` (usado pelo `face_recognition`) precisa de CMake + C++ Build Tools. Se falhar, segue: https://github.com/ageitgey/face_recognition

Iniciar:

```bash
cd python
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

#### 5. Frontend React

```bash
cd liveeye
npm install
npm run dev
```

Abre em `http://localhost:5173`.

#### 6. Verificar

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

</details>

## Docker

O `Dockerfile` empacota apenas o backend Python. Para construir:

```bash
docker build -t liveeye-backend .
docker run -p 10000:10000 --env-file .env liveeye-backend
```

## Endpoints principais

| Método | Rota                      | Descrição                    |
| ------ | ------------------------- | ---------------------------- |
| POST   | `/login`                  | Autenticação                 |
| POST   | `/registar`               | Registar com código convite  |
| POST   | `/pessoas_criar`          | Criar pessoa desaparecida    |
| GET    | `/pessoas_listar`         | Listar desaparecidos         |
| POST   | `/pessoas/{id}/estado`    | Marcar como encontrada       |
| WS     | `/ws`                     | WebSocket para deteção video |
| WS     | `/ws-signal`              | WebSocket para signaling     |
| WS     | `/ws-monitor`             | WebSocket para monitorização |
