import cv2
from faceRecognition import FaceRecognitionSystem

system = FaceRecognitionSystem()

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = system.recognize(frame)

    for face in results:
        top, right, bottom, left = face["location"]
        name = face["name"]

        cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
        cv2.putText(frame, name, (left, top - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        if name != "Unknown":
            print(f"[ALERTA] {name} detetado!")

    cv2.imshow("Face Recognition", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()