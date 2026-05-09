import { Navigate } from "react-router-dom";

/**
 * AuthGuard — protege rotas que requerem autenticação.
 *
 * Uso no App.jsx:
 *   <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
 *
 * A sessão é guardada em sessionStorage sob a chave "liveeye_user".
 * É limpa automaticamente quando o browser fecha.
 *
 * Para fazer logout em qualquer componente:
 *   sessionStorage.removeItem("liveeye_user");
 *   navigate("/");
 */
const AuthGuard = ({ children }) => {
  const raw = sessionStorage.getItem("liveeye_user");

  if (!raw) {
    // Não autenticado → redireciona para login
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(raw);
    if (!user?.id || !user?.email) throw new Error("Sessão inválida");
  } catch {
    sessionStorage.removeItem("liveeye_user");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AuthGuard;