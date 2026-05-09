import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Receiver from "./pages/Receiver";
import Login from "./pages/Login";
import AuthGuard from "./components/AuthGuard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública */}
        <Route path="/" element={<Login />} />

        {/* Rotas protegidas — requerem sessão válida */}
        <Route path="/camera"    element={<AuthGuard><Home /></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/receiver"  element={<AuthGuard><Receiver /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;