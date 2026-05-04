function togglePassword(icon) {
        const input = document.getElementById("password");
        if (input.type === "password") {
            input.type = "text";
            icon.style.color = "var(--accent)";
        } else {
            input.type = "password";
            icon.style.color = "";
        }
    }
 
    function mostrarErro(msg) {
        const box = document.getElementById("error-box");
        document.getElementById("error-text").textContent = msg;
        box.classList.add("visible");
    }
 
    function esconderErro() {
        document.getElementById("error-box").classList.remove("visible");
    }
 
    async function fazerLogin() {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const btn = document.getElementById("btn-login");
 
        esconderErro();
 
        if (!username || !password) {
            mostrarErro("Preenche todos os campos.");
            return;
        }
 
        // Estado de loading
        btn.classList.add("loading");
        btn.disabled = true;
 
        try {
            const res = await fetch("http://127.0.0.1:8000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
 
            if (res.ok) {
                // Sucesso
                document.getElementById("form-area").style.display = "none";
                document.getElementById("success-area").classList.add("visible");
 
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1200);
            } else {
                const data = await res.json().catch(() => ({}));
                mostrarErro(data.detail || "Credenciais inválidas.");
                btn.classList.remove("loading");
                btn.disabled = false;
            }
        } catch (e) {
            mostrarErro("Não foi possível ligar ao servidor.");
            btn.classList.remove("loading");
            btn.disabled = false;
        }
    }
 
    // Submeter com Enter
    document.addEventListener("keydown", e => {
        if (e.key === "Enter") fazerLogin();
    });