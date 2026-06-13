# LiveEye — Manual de Instalação (Windows)

Sistema de deteção de pessoas desaparecidas que usa YOLO + reconhecimento facial.

---

## Índice

1. [Arquitetura](#arquitetura)
2. [Pré-requisitos](#pré-requisitos)
3. [Obter o Código](#obter-o-código)
4. [Base de Dados MySQL](#base-de-dados-mysql)
5. [Configurar Variáveis de Ambiente (`.env`)](#configurar-variáveis-de-ambiente-env)
6. [Backend Python](#backend-python)
7. [Frontend React](#frontend-react)
8. [Correr Tudo](#correr-tudo)
9. [Fluxo de Utilização Inicial](#fluxo-de-utilização-inicial)
10. [Resolução de Problemas no Windows](#resolução-de-problemas-no-windows)
11. [Endpoints Principais](#endpoints-principais)

---

## Arquitetura

```
liveeyedetect/
├── python/server.py              # Backend FastAPI (YOLO + face_recognition)
├── python/yolo26n.pt             # Modelo YOLO
├── liveeye/                      # Frontend React (Vite)
├── BD/schema_liveeyedetect.sql   # Schema MySQL
├── requirements.txt              # Dependências Python
└── .env                          # Configuração (credenciais)
```

| Componente | Tecnologia | Porta |
|---|---|---|
| Backend | Python + FastAPI + YOLO + face_recognition | `8000` |
| Frontend | React + Vite + Tailwind CSS | `5173` |
| Base de dados | MySQL / MariaDB | `3306` |
| Base vectorial | Qdrant Cloud (online) | — |
| Email | Gmail SMTP (App Password) | — |

---

## Pré-requisitos

Antes de começar, instala os seguintes programas no Windows (PC ou Servidor):

| Programa | Versão | Download | Porquê |
|---|---|---|---|
| **Python** | **3.12** (exata) | https://www.python.org/downloads/release/python-3129/ | O backend corre em Python. As dependências (torch, dlib) têm wheels para 3.12 |
| **Node.js** | **18+** (LTS) | https://nodejs.org/ | Necessário para o frontend React + Vite |
| **MySQL** | **8+** ou MariaDB 10.4+ | https://dev.mysql.com/downloads/installer/ ou https://www.apachefriends.org/ (XAMPP) | Base de dados relacional da aplicação |
| **Git** | — | https://git-scm.com/download/win | Só necessário se usares a opção GitHub para obter o código |
| **CMake** | — | https://cmake.org/download/ | Necessário para compilar o dlib |
| **VS Build Tools** | — | https://visualstudio.microsoft.com/visual-cpp-build-tools/ | Necessário para compilar o dlib (selecionar "Desktop development with C++") |

### Notas importantes da instalação

- **Python:** Marca a opção **"Add Python to PATH"** durante a instalação
- **MySQL:** Anota o **root password** que definires durante a instalação
- **CMake + VS Build Tools:** Sem estes, o `dlib` (usado pelo `face_recognition`) não compila no Windows

---

## Obter o Código

Tens duas opções:

### Opção A — GitHub (recomendado)

```cmd
git clone https://github.com/a14486-oficina/liveeyedetect.git
cd liveeyedetect
```

### Opção B — Pasta ZIPada

1. Extrai o conteúdo do ZIP para uma pasta à tua escolha (ex: `C:\LiveEye`)
2. Abre a **PowerShell** ou **Command Prompt** como Administrador
3. Navega até à pasta:
   ```cmd
   cd C:\caminho\para\liveeyedetect
   ```

> **Nota:** A partir daqui, todos os comandos assumem que estás na pasta raiz do projeto (`liveeyedetect/`).

---

## Base de Dados MySQL

### 1. Cria a base de dados

**Opção A — Command Line:**

Abre o MySQL Command Line Client ou corre:

```cmd
mysql -u root -p < BD\schema_liveeyedetect.sql
```

( Vai pedir a password que definiste durante a instalação do MySQL )

**Opção B — phpMyAdmin (se usares XAMPP):**

1. Abre `http://localhost/phpmyadmin`
2. Clica em **"Novo"** e cria uma base de dados chamada `liveeyedetect`
3. Clica na base de dados criada
4. Vai ao separador **"Importar"**
5. Escolhe o ficheiro `BD\schema_liveeyedetect.sql`
6. Clica em **"Executar"**

### O que este schema cria:

- `utilizadores` — Contas de utilizador (admin, agentes)
- `pessoas_desaparecidas` — Pessoas reportadas como desaparecidas
- `pessoas_encontradas` — Pessoas marcadas como encontradas
- `localizacoes` — Últimas localizações conhecidas
- `deteccoes` — Registos de deteções feitas pelo sistema

---

## Configurar Variáveis de Ambiente (`.env`)

### 1. Copiar o ficheiro de exemplo

```cmd
copy .env.example .env
```

### 2. Preencher as credenciais

Abre o ficheiro `.env` no Bloco de Notas e preenche os valores:

| Variável | Estado | O que fazer |
|---|---|---|
| `QDRANT_URL` | ✅ Já preenchido | Não mexer |
| `QDRANT_API_KEY` | ✅ Já preenchido | Não mexer |
| `MySQL_HOST` | `localhost` | Alterar se o MySQL estiver noutro servidor |
| `MySQL_PORT` | `3306` | Alterar se usares porta diferente |
| `MySQL_USER` | ⚠️ **Preencher** | O teu utilizador MySQL (ex: `root`) |
| `MySQL_PASSWORD` | ⚠️ **Preencher** | A tua password do MySQL |
| `MySQL_DATABASE` | `liveeyedetect` | Alterar se deres outro nome à base de dados |
| `GMAIL_USER` | ✅ Já preenchido | `liveeyedetect@gmail.com` — não mexer |
| `GMAIL_APP_PASSWORD` | ✅ Já preenchido | Não mexer |
| `ADMIN_EMAIL` | ✅ Já preenchido | `a14486@oficina.pt` — não mexer |
| `ADMIN_PASSWORD` |  ✅ Já preenchido |

> ⚠️ **Importante:** O `.env` contém credenciais sensíveis. **Nunca** partilhes este ficheiro nem o adiciones ao Git (já está no `.gitignore`).

---

## Backend Python

### 1. Criar e ativar o ambiente virtual

```cmd
python -m venv venv
venv\Scripts\activate
```

Se tudo correr bem, vais ver `(venv)` no início da linha da consola.

### 2. Instalar as dependências

```cmd
pip install -r requirements.txt
```

Isto instala: FastAPI, Uvicorn, Torch, Ultralytics (YOLO), OpenCV, face_recognition, mysql-connector, qdrant-client, etc.

### 3. ⚠️ Resolver possíveis erros com dlib

O pacote `face_recognition` depende do `dlib`, que precisa de ser compilado. Se der erro durante o `pip install`, verifica os pré-requisitos abaixo.

#### Verificar CMake

```cmd
cmake --version
```

- ✅ Se aparecer `cmake version 3.x.x` — está instalado, avança
- ❌ Se aparecer `'cmake' não é reconhecido` — **solução:**
  1. Download: https://cmake.org/download/ (Windows x64 Installer)
  2. Durante a instalação, marca **"Add CMake to system PATH"**
  3. Reinicia a consola
  4. Corre `cmake --version` novamente para confirmar

#### Verificar Visual Studio Build Tools

Abre a **PowerShell como Administrador** e corre:

```powershell
Get-Command cl -ErrorAction SilentlyContinue
```

- ✅ Se aparecer o caminho do compilador (ex: `C:\Program Files\...\cl.exe`) — está instalado, avança
- ❌ Se não aparecer nada — **solução:**
  1. Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
  2. Executa o instalador
  3. Seleciona **"Desktop development with C++"**
  4. Clica em **"Install"** (pode demorar alguns minutos)
  5. Reinicia o computador
  6. Abre a PowerShell e corre `Get-Command cl` novamente para confirmar

#### Após confirmar ambos

```cmd
pip install -r requirements.txt
```

Se ainda assim falhar, instala o dlib manualmente:

```cmd
pip install dlib==19.24.2
pip install face-recognition==1.3.0
```

### 4. Iniciar o servidor backend

```cmd
cd python
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Deixa esta consola aberta. O servidor backend está a correr em `http://localhost:8000`.

### Para testar:

Abre `http://localhost:8000` no browser. Deves ver uma resposta JSON do FastAPI.

---

## Frontend React

### 1. Instalar as dependências

Noutra consola (ou após parares o backend), navega até à pasta `liveeye`:

```cmd
cd liveeye
npm install
```

Isto lê o `package.json` e instala: React, React Router, Vite, Tailwind CSS, etc.

### 2. Iniciar o servidor de desenvolvimento

```cmd
npm run dev
```

Deixa esta consola aberta. O frontend está disponível em `http://localhost:5173`.

> 🔁 **Proxy automático:** O `vite.config.js` já tem proxy configurado. Isto significa que os pedidos da API (ex: `/login`, `/pessoas_listar`) e os WebSockets (`/ws`, `/ws-signal`) são redirecionados automaticamente para o backend em `http://localhost:8000`. Não precisas de configurar CORS.

---

## Correr Tudo

Precisas de **duas consolas** abertas ao mesmo tempo:

| Consola | Comando | O que faz |
|---|---|---|
| **Consola 1 — Backend** | `venv\Scripts\activate` depois `cd python` depois `uvicorn server:app --host 0.0.0.0 --port 8000 --reload` | API + WebSockets |
| **Consola 2 — Frontend** | `cd liveeye` depois `npm run dev` | Interface web |

Depois abre no browser:

| Ambiente | Frontend | Backend |
|---|---|---|
| PC local | `http://localhost:5173` | `http://localhost:8000` |
| Servidor | `http://IP_DO_SERVIDOR:5173` | `http://IP_DO_SERVIDOR:8000` |

---

## Fluxo de Utilização Inicial

1. **Abrir o frontend** em `http://localhost:5173`
2. **Fazer login como admin** (as credenciais estão na tabela `utilizadores` da base de dados — email e password que definiste no `.env`)
3. **Gerar código de convite** — Vai à área de admin e cria um código de registo
4. **Registar um utilizador** — Usa o código de convite para criar uma conta de agente
5. **Adicionar pessoas desaparecidas** — Com fotos, dados pessoais, última localização
6. **Ligar câmara de vigilância** — O YOLO deteta pessoas em tempo real
7. **Reconhecimento facial** — O sistema compara as faces detetadas com a base de dados
8. **Notificações** — Se houver match, o sistema regista a deteção e mostra no dashboard

---

## Resolução de Problemas no Windows

| Problema | Causa provável | Solução |
|---|---|---|
| `'python' não é reconhecido` | Python não está no PATH | Reinstala o Python com **"Add Python to PATH"** marcado |
| `dlib` / `face_recognition` não instala | CMake ou VS Build Tools em falta | Instala CMake + VS Build Tools (ver pré-requisitos) |
| `mysql` não encontrado | MySQL não está no PATH | Adiciona `C:\Program Files\MySQL\MySQL Server 8.0\bin` ao PATH ou usa o "MySQL Command Line Client" |
| Porta `8000` já ocupada | Outro programa a usar a porta | `netstat -ano \| findstr :8000` → `taskkill /PID <PID> /F` |
| Porta `5173` já ocupada | Outro programa a usar a porta | `npm run dev -- --port 5174` para usar outra porta |
| CORS errors no browser | Backend não está a correr | Confirma que o backend está ativo em `http://localhost:8000` |
| WebSocket não liga | Firewall ou backend parado | Desativa a firewall temporariamente ou adiciona exceção para a porta 8000 |
| Qdrant não conecta | Credenciais erradas | Confirma `QDRANT_URL` e `QDRANT_API_KEY` no `.env`. Verifica se o cluster está **Ativo** no Qdrant Cloud |
| `pip install` muito lento | Repositório padrão lento | Usa `pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple` |
| Módulo `_socket` ou `_ssl` não encontrado | Python corrompido ou conflito de versões | Reinstala o Python 3.12 e cria um novo ambiente virtual |

---

## Endpoints Principais

| Método | Rota | Descrição |
|---|---|---|
| POST | `/login` | Autenticação de utilizador |
| POST | `/registar` | Registar novo utilizador com código de convite |
| POST | `/pessoas_criar` | Criar registo de pessoa desaparecida |
| GET | `/pessoas_listar` | Listar pessoas desaparecidas |
| PUT | `/pessoa_encontrada/{id}` | Marcar pessoa como encontrada |
| GET | `/pessoa_detalhes/{id}` | Obter detalhes de uma pessoa |
| POST | `/pessoa_adicionar_loc` | Adicionar localização a uma pessoa |
| GET | `/utilizador_perfil` | Obter perfil do utilizador autenticado |
| PUT | `/utilizador_atualizar` | Atualizar perfil do utilizador |
| PUT | `/utilizador_password` | Alterar password |
| DELETE | `/utilizador_eliminar` | Eliminar conta |
| POST | `/recuperar/pedir` | Pedir recuperação de password (email) |
| POST | `/recuperar/verificar` | Verificar código de recuperação |
| POST | `/recuperar/redefinir` | Redefinir password |
| WS | `/ws` | WebSocket para deteção em tempo real |
| WS | `/ws-signal` | WebSocket para signaling |
| WS | `/ws-monitor` | WebSocket para monitorização |
