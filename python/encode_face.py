import face_recognition
import pickle
import os

def save_face(image_path, name):
    image = face_recognition.load_image_file(image_path)
    encoding = face_recognition.face_encodings(image)[0]

    data = {
        "name": name,
        "encoding": encoding
    }

    os.makedirs("data/encodings", exist_ok=True)

    with open(f"data/encodings/{name}.pkl", "wb") as f:
        pickle.dump(data, f)

    print(f"[OK] Face guardada para {name}")

# EXEMPLO
save_face(r"C:\PAP\data\pessoasProcurar\pessoa1.jpg", "pessoa1")