import { Navigate } from "react-router-dom";

/**
 * AuthGuard — protege rotas que requerem autenticação.
 *
 * Uso no App.jsx:
 *   <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
 *
 * A sessão é guardada em localStorage sob a chave "liveeye_user" com expiração
 * de 8 horas. É limpa automaticamente quando expirar ou ao fazer logout.
 *
 * Para fazer logout em qualquer componente:
 *   localStorage.removeItem("liveeye_user");
 *   navigate("/");
 */

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

const AuthGuard = ({ children }) => {
  const raw = localStorage.getItem("liveeye_user");

  if (!raw) {
    return <Navigate to="/" replace />;
  }

  try {
    const session = JSON.parse(raw);
    const { user, expiresAt } = session;

    // Valida campos mínimos
    if (!user?.id || !user?.email) throw new Error("Sessão inválida");

    // Valida expiração
    if (!expiresAt || Date.now() > expiresAt) {
      localStorage.removeItem("liveeye_user");
      return <Navigate to="/" replace />;
    }
  } catch {
    localStorage.removeItem("liveeye_user");
    return <Navigate to="/" replace />;
  }

  return children;
};

export { SESSION_TTL_MS };
export default AuthGuard;