import os
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, 
    VectorParams, 
    HnswConfigDiff, 
    OptimizersConfigDiff, 
    WalConfigDiff,
    PayloadSchemaType
)

# Substitua com as suas credenciais do Qdrant Cloud
QDRANT_URL = "https://9f7ca3f6-92c7-4831-9fa7-2e55459009e4.eu-west-1-0.aws.cloud.qdrant.io:6333"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6MGJmMjZmMTktNTE0ZC00ZjE2LTk5M2MtMTBkZTUwYTc2MzgyIn0.rD4Oevhnd6Q4Wt6x5PIy30fgn0n96VvaIhIT0_OnH9Y"
COLLECTION_NAME = "pessoas"  # Altere para o nome real da sua coleção

def recriar_colecao():
    print("Conectando ao Qdrant Cloud...")
    client = QdrantClient(url=QDRANT_URL, api_key=API_KEY)
    
    # 1. Deleta a coleção antiga se ela existir
    print(f"Deletando a coleção antiga '{COLLECTION_NAME}'...")
    try:
        client.delete_collection(collection_name=COLLECTION_NAME)
        print("Coleção antiga deletada com sucesso!")
    except Exception as e:
        print(f"Aviso ao deletar (pode não existir ainda): {e}")

    # 2. Cria a nova coleção com as configurações exatas do seu JSON
    print(f"Criando a nova coleção '{COLLECTION_NAME}' vazia...")
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=128, 
            distance=Distance.COSINE,
            on_disk=False
        ),
        hnsw_config=HnswConfigDiff(
            m=16,
            ef_construct=100,
            full_scan_threshold=10000,
            max_indexing_threads=0,
            on_disk=False
        ),
        optimizers_config=OptimizersConfigDiff(
            deleted_threshold=0.2,
            vacuum_min_vector_number=1000,
            indexing_threshold=10000,
            flush_interval_sec=5
        ),
        wal_config=WalConfigDiff(
            wal_capacity_mb=32,
            wal_segments_ahead=0
        ),
        shard_number=1,
        replication_factor=1,
        write_consistency_factor=1,
        on_disk_payload=True
    )
    print("Nova coleção criada com sucesso!")

    # 3. Recriar os índices do Payload Schema mapeados do seu JSON
    print("Recriando os índices de payload...")
    
    client.create_payload_index(collection_name=COLLECTION_NAME, field_name="nome", field_schema=PayloadSchemaType.KEYWORD)
    client.create_payload_index(collection_name=COLLECTION_NAME, field_name="idade", field_schema=PayloadSchemaType.INTEGER)
    client.create_payload_index(collection_name=COLLECTION_NAME, field_name="Desaparecida", field_schema=PayloadSchemaType.BOOL)
    client.create_payload_index(collection_name=COLLECTION_NAME, field_name="local_de_residencia", field_schema=PayloadSchemaType.GEO)
    client.create_payload_index(collection_name=COLLECTION_NAME, field_name="pessoa_id", field_schema=PayloadSchemaType.INTEGER)
    client.create_payload_index(collection_name=COLLECTION_NAME, field_name="ultimas_localizacoes", field_schema=PayloadSchemaType.TEXT)

    print("Todos os índices do Payload Schema foram recriados!")
    print("A coleção está pronta para receber o point 0 do zero.")

if __name__ == "__main__":
    recriar_colecao()