import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AuthGuard from "./components/AuthGuard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública */}
        <Route path="/" element={<Login />} />

        {/* Dashboard — inclui câmara e receiver na sidebar */}
        <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />

        {/* Redireciona rotas antigas para o dashboard */}
        <Route path="/camera"   element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/receiver" element={<AuthGuard><Dashboard /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;