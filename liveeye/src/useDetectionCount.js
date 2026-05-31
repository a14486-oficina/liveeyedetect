import { useState, useEffect, useCallback } from "react";
import { API } from "./api.js";

/**
 * useDetectionCount
 * -----------------
 * Faz polling ao servidor a cada 5 segundos para contar deteções não vistas
 * (visto = 0 na tabela `detecoes`).
 *
 * Funciona em qualquer dispositivo — não depende do emissor estar ativo
 * no mesmo browser.
 *
 * Retorna:
 *   count        — número de deteções não vistas
 *   marcarVistas — função que marca todas como vistas e reseta o contador
 */
export function useDetectionCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`${API}/detecoes/nao_vistas`);
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count ?? 0);
    } catch {
      /* silent — sem conexão ou servidor offline */
    }
  }, []);

  useEffect(() => {
    fetchCount(); // chamada imediata ao montar
    const interval = setInterval(fetchCount, 5000); // a cada 5 s
    return () => clearInterval(interval);
  }, [fetchCount]);

  const marcarVistas = useCallback(async () => {
    try {
      await fetch(`${API}/detecoes/marcar_vistas`, { method: "POST" });
      setCount(0);
    } catch {
      /* silent */
    }
  }, []);

  return { count, marcarVistas };
}