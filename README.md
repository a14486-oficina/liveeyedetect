🚀 1. No outro computador: instalar o básico

Antes de mais, instala:

✔️ Necessário

Git
Python (mesma versão ou semelhante)
Node.js

📥 2. Clonar o projeto do GitHub

No terminal:

git clone https://github.com/a14486-oficina/Projeto.git


Depois entra na pasta:
cd Projeto

🐍 3. Backend Python (YOLO)
Criar ambiente virtual:
python -m venv venv
Ativar:
Windows:
venv\Scripts\activate
Instalar dependências:
pip install -r requirements.txt


⚠️ Importante (YOLO .pt)
Se o modelo .pt não estiver no GitHub:

copiar manualmente do outro PC
OU
fazer download automático no código
Rodar Python server:
python python/server.py

🌐 4. Backend Node.js
Vai para a pasta:
cd server

Instalar dependências:
npm install
Rodar:
node server.js

🌍 5. Frontend (public)
Normalmente:
👉 só abres o HTML:
public/receiver.html

🧠 6. Ordem correta para correr tudo
👉 SEMPRE nesta ordem:
Python (YOLO backend)
Node server
Frontend (browser)

⚠️ Problemas comuns
❌ "module not found"
→ faltou pip install -r requirements.txt
❌ YOLO não funciona
→ faltou .pt model
❌ WebSocket não liga
→ Node server não está a correr

💡 Dica profissional (muito importante)

Se quiseres facilitar MUITO a vida:

👉 cria um start.bat:

@echo off
start cmd /k "cd python && venv\Scripts\activate && python server.py"
start cmd /k "cd server && node server.js"
🚀 Resumo simples

No outro PC:

git clone <repo>
cd projeto
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd server
npm install
node server.js

Se quiseres, posso ajudar-te a dar o próximo nível:
👉 fazer isto arrancar tudo com 1 clique
👉 ou transformar em “instalador automático”

Só diz 👍

---------------------------------------
coisas a fazer 

Ver "style" video #remoteVideo, colocar 600px

face_recognition - biblioteca em python para comprarar Embeddings (para comparar imagens)
https://face-recognition.readthedocs.io/en/latest/face_recognition.html
+
openCV (para tirar um print a frame sempre qeu vir uma pessoa)

Qdrant 
Para guardar os embeddigns e a extra info (payloads)

Depois vou criar o sistema de alertar (vibração e lanterna a piscar)
https://stackoverflow.com/questions/68786850/turn-on-phone-flashlight-on-web-app-using-javascript-and-html
usar o javascript