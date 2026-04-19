import face_recognition
import os
import pickle

KNOWN_FACES_DIR = "data/encodings"

class FaceRecognitionSystem:
    def __init__(self):
        self.known_encodings = []
        self.known_names = []
        self.load_known_faces()

    def load_known_faces(self):
        for file in os.listdir(KNOWN_FACES_DIR):
            if file.endswith(".pkl"):
                with open(os.path.join(KNOWN_FACES_DIR, file), "rb") as f:
                    data = pickle.load(f)
                    self.known_encodings.append(data["encoding"])
                    self.known_names.append(data["name"])

    def recognize(self, frame):
        rgb_frame = frame[:, :, ::-1]

        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        results = []

        for encoding, location in zip(face_encodings, face_locations):
            matches = face_recognition.compare_faces(self.known_encodings, encoding)
            name = "Unknown"

            if True in matches:
                first_match_index = matches.index(True)
                name = self.known_names[first_match_index]

            results.append({
                "name": name,
                "location": location
            })

        return results