import face_recognition
from qdrant_client import QdrantClient
"""
# carregar imagem
image = face_recognition.load_image_file(r"C:\PAP\data\pessoasProcurar\pessoa1.jpg")

# gerar encoding (embedding)
encodings = face_recognition.face_encodings(image)

if len(encodings) == 0:
    print("Nenhuma face detetada na imagem!")
    exit()

embedding = encodings[0]
"""

qdrant_client = QdrantClient(
    url="https://9f7ca3f6-92c7-4831-9fa7-2e55459009e4.eu-west-1-0.aws.cloud.qdrant.io:6333", 
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6MGJmMjZmMTktNTE0ZC00ZjE2LTk5M2MtMTBkZTUwYTc2MzgyIn0.rD4Oevhnd6Q4Wt6x5PIy30fgn0n96VvaIhIT0_OnH9Y",
)
"""
print(qdrant_client.get_collections())

qdrant_client.upsert(
    collection_name="pessoas",
    points=[
        {
            "id": 1,  # ID do embedding
            "vector": embedding.tolist(),
            "payload": {
                "person_id": 1,
                "nome": "Teste",
                "idade": 30,
                "local_de_residencia": {
                    "lat": 38.7223,
                    "lon": -9.1393
                },
                "ultimas_localizacoes": []
            }
        }
    ]
)
"""

qdrant_client.create_payload_index(
    collection_name="pessoas",
    field_name="Desaparecida",
    field_schema="bool"  # tipo booleano
)