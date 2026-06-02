import { useState, useEffect, useCallback } from "react";
import { API } from "./api.js";

/**
 * useDetectionCount
 * -----------------
 * Faz polling ao servidor a cada 5 segundos.
 * Retorna o número de pessoas DISTINTAS com deteções não vistas.
 * O badge da sidebar reflete pessoas, não rows individuais.
 */
export function useDetectionCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`${API}/detecoes/nao_vistas`);
      if (!res.ok) return;
      const data = await res.json();
      // person_ids é array de IDs únicos — o count é o número de pessoas distintas
      setCount((data.person_ids ?? []).length);
    } catch {
      /* silent — servidor offline */
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { count };
}