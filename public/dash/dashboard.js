const API = "http://127.0.0.1:8000";

    /* ── Mostrar/Esconder campo de texto adicional ── */
    function toggleOutroSexo() {
        const select = document.getElementById("sexo");
        const grupoOutro = document.getElementById("outro-grupo");
        const campoTexto = document.getElementById("sexo-outro-texto");

        if (select.value === "Outro") {
            grupoOutro.style.display = "flex";
        } else {
            grupoOutro.style.display = "none";
            campoTexto.value = ""; // Limpa o campo caso mude de seleção
        }
    }

    /* ── Navegação ── */
    function switchPanel(name) {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById('panel-' + name).classList.add('active');
        const idx = ['add', 'missing', 'found'].indexOf(name);
        document.querySelectorAll('.nav-item')[idx].classList.add('active');
    }

    /* ── Adicionar linha de localização ── */
    function adicionarLocalizacao() {
        let container = document.getElementById("locContainer");
        let row = document.createElement("div");
        row.className = "loc-row";
        row.innerHTML = `
            <div class="form-group"><label>Latitude</label><input type="text" placeholder="ex: 38.71"></div>
            <div class="form-group"><label>Longitude</label><input type="text" placeholder="ex: -9.13"></div>
            <div class="form-group"><label>Data</label><input type="text" placeholder="DD/MM/AAAA"></div>
            <div class="form-group"><label>Hora</label><input type="text" placeholder="HH:MM"></div>
            <button class="btn-remove" onclick="this.closest('.loc-row').remove()">✕</button>
        `;
        container.appendChild(row);
    }

    /* ── Criar pessoa ── */
    async function criarPessoa() {
        let formData = new FormData();
        let fileInput = document.getElementById("imagem");

        let nome = document.getElementById("nome").value.trim();
        let idade = parseInt(document.getElementById("idade").value);

        // Lógica para obter a opção selecionada ou o texto digitado em "Outro"
        let sexoSelect = document.getElementById("sexo").value;
        let sexoOutroTexto = document.getElementById("sexo-outro-texto").value.trim();
        let sexo = (sexoSelect === "Outro") ? sexoOutroTexto : sexoSelect;

        let lat = parseFloat(document.getElementById("lat").value);
        let lon = parseFloat(document.getElementById("lon").value);

        if (!nome) { alert("Nome é obrigatório"); return; }
        if (/\d/.test(nome)) { alert("O nome não pode conter números"); return; }
        if (isNaN(idade) || !Number.isInteger(idade) || idade <= 0) { alert("Idade inválida"); return; }
        
        if (!sexoSelect) { alert("Selecione um sexo"); return; }
        if (sexoSelect === "Outro" && !sexoOutroTexto) { alert("Especifique o sexo selecionado"); return; }
        
        if (isNaN(lat) || isNaN(lon)) { alert("Coordenadas de residência inválidas"); return; }
        if (lat < -90 || lat > 90) { alert("Latitude deve estar entre -90 e 90"); return; }
        if (lon < -180 || lon > 180) { alert("Longitude deve estar entre -180 e 180"); return; }
        if (!fileInput.files[0]) { alert("Seleciona uma imagem"); return; }

        let historico = [];
        let divs = document.querySelectorAll(".loc-row");
        for (let index = 0; index < divs.length; index++) {
            let div = divs[index];
            let inputs = div.querySelectorAll("input");
            let latVal = inputs[0].value;
            let lonVal = inputs[1].value;
            let dataVal = inputs[2].value;
            let horaVal = inputs[3].value;

            if (latVal || lonVal) {
                if (isNaN(latVal) || isNaN(lonVal)) { alert("Latitude/Longitude de localização inválidas"); return; }
                if (latVal < -90 || latVal > 90) { alert("Latitude deve estar entre -90 e 90"); return; }
                if (lonVal < -180 || lonVal > 180) { alert("Longitude deve estar entre -180 e 180"); return; }

                if (dataVal) {
                    let regexData = /^\d{2}\/\d{2}\/\d{4}$/;
                    if (!regexData.test(dataVal)) { alert(`Localização ${index + 1}: data inválida (DD/MM/AAAA)`); return; }
                    let [dia, mes, ano] = dataVal.split("/").map(Number);
                    let dataObj = new Date(ano, mes - 1, dia);
                    if (dataObj.getFullYear() !== ano || dataObj.getMonth() !== mes - 1 || dataObj.getDate() !== dia) {
                        alert(`Localização ${index + 1}: data inexistente`); return;
                    }
                    if (dataObj > new Date()) { alert(`Localização ${index + 1}: data não pode ser no futuro`); return; }
                }

                if (horaVal) {
                    let regexHora = /^\d{2}:\d{2}$/;
                    if (!regexHora.test(horaVal)) { alert(`Localização ${index + 1}: hora inválida (HH:MM)`); return; }
                    let [horas, minutos] = horaVal.split(":").map(Number);
                    if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
                        alert(`Localização ${index + 1}: hora inválida`); return;
                    }
                }

                historico.push({
                    lat: parseFloat(latVal),
                    lon: parseFloat(lonVal),
                    data: dataVal,
                    hora: horaVal
                });
            }
        }

        formData.append("nome", nome);
        formData.append("idade", idade);
        formData.append("sexo", sexo);
        formData.append("lat", lat);
        formData.append("lon", lon);
        formData.append("imagem", fileInput.files[0]);
        formData.append("historico", JSON.stringify(historico));

        let res = await fetch(`${API}/pessoas_criar`, { method: "POST", body: formData });

        if (!res.ok) { alert("Erro ao criar pessoa"); return; }

        // Limpar formulário
        document.getElementById("nome").value = "";
        document.getElementById("idade").value = "";
        document.getElementById("sexo").selectedIndex = 0; // Reset ao dropdown
        document.getElementById("outro-grupo").style.display = "none";
        document.getElementById("sexo-outro-texto").value = "";
        document.getElementById("lat").value = "";
        document.getElementById("lon").value = "";
        document.getElementById("imagem").value = "";
        document.getElementById("locContainer").innerHTML = "";

        await carregarPessoas();
        await carregarPessoasEncontradas();
        switchPanel('missing');
    }

    /* ── Toggle detalhes ── */
    async function togglePessoa(id, el) {
        let li = el.closest(".person-row");
        let detalheDiv = li.querySelector(".person-details");
        let chevron = el.querySelector(".chevron");
        let isOpen = detalheDiv.classList.contains("open");

        if (isOpen) {
            detalheDiv.classList.remove("open");
            chevron.classList.remove("open");
            return;
        }

        chevron.classList.add("open");

        if (detalheDiv.dataset.loaded !== "true") {
            detalheDiv.innerHTML = `<p class="loading-text">A carregar...</p>`;
            detalheDiv.classList.add("open");

            let res = await fetch(`${API}/pessoas/${id}`);
            let p = await res.json();

            let locsHTML = p.localizacoes && p.localizacoes.length > 0
                ? p.localizacoes.map(loc => `
                    <div class="loc-item">
                        <span class="loc-pin">◎</span>
                        <span class="loc-coords">${loc.lat} | ${loc.lon}</span>
                        <span class="loc-time">${loc.data && loc.hora ? `${loc.data} ${loc.hora}` : 'Sem registo de tempo'}</span>
                    </div>
                `).join("")
                : `<div class="loc-item" style="color:var(--text-3); font-size:13px;">Nenhuma localização registada.</div>`;

            detalheDiv.innerHTML = `
                <div class="detail-row">
                    <span class="detail-key">Idade</span>
                    <span>${p.idade} anos</span>
                </div>
                <div class="detail-row">
                    <span class="detail-key">Residência</span>
                    <span style="font-family:'DM Mono',monospace; font-size:12px;">Lat: ${p.local_de_residencia?.lat} | Lon: ${p.local_de_residencia?.lon}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-key">Sexo</span>
                    <span>${p.sexo}</span>
                </div>
                <p class="section-label" style="margin-top:14px;">Histórico de localizações</p>
                <div class="loc-list">${locsHTML}</div>
            `;
            detalheDiv.dataset.loaded = "true";
        } else {
            detalheDiv.classList.add("open");
        }
    }

    /* ── Carregar desaparecidas ── */
    async function carregarPessoas() {
        try {
            let res = await fetch(`${API}/pessoas_listar`);
            let data = await res.json();
    
            document.getElementById("badge-missing").textContent = data.length;
            document.getElementById("stat-missing").textContent = data.length;
    
            let lista = document.getElementById("lista");
            lista.innerHTML = "";
    
            if (data.length === 0) {
                lista.innerHTML = `<div class="empty"><div class="empty-icon">◎</div>Nenhuma pessoa desaparecida registada.</div>`;
                return;
            }
    
            data.forEach(p => {
                let row = document.createElement("div");
                row.className = "person-row";
                row.dataset.id = p.id;  // guardamos o id no elemento para fácil remoção
                row.innerHTML = `
                    <div class="person-header">
                        <div class="person-name" onclick="togglePessoa('${p.id}', this)">
                            <span class="chevron">&#9654;</span>
                            ${p.nome}
                            <span class="badge-missing">Desaparecido/a</span>
                        </div>
                        <div class="person-actions">
                            <button class="btn-action btn-found" onclick="event.stopPropagation(); marcarDescoberta('${p.id}', this)">
                                Encontrada?
                            </button>
                            <button class="btn-action btn-loc" onclick="event.stopPropagation(); addLoc('${p.id}')">
                                + Localização
                            </button>
                        </div>
                    </div>
                    <div class="person-details"></div>
                `;
                lista.appendChild(row);
            });
        } catch (e) {
            console.error("Erro ao carregar lista:", e);
        }
    }
 

    /* ── Carregar encontradas ── */
    async function carregarPessoasEncontradas() {
        try {
            let res = await fetch(`${API}/pessoas_listar_encontradas`);
            let data = await res.json();
    
            document.getElementById("badge-found").textContent = data.length;
            document.getElementById("stat-found").textContent = data.length;
    
            let lista = document.getElementById("listaEnc");
            lista.innerHTML = "";
    
            if (data.length === 0) {
                lista.innerHTML = `<div class="empty"><div class="empty-icon">✓</div>Nenhuma pessoa encontrada ainda.</div>`;
                return;
            }
    
            data.forEach(p => {
                let row = document.createElement("div");
                row.className = "found-row";
                row.innerHTML = `
                    <div class="found-dot"></div>
                    <span class="found-name">${p.nome}</span>
                `;
                lista.appendChild(row);
            });
        } catch (e) {
            console.error("Erro ao carregar encontradas:", e);
        }
    }

    /* ── Marcar como encontrada ── */
    async function marcarDescoberta(id, btn) {
        if (!confirm("Tens a certeza que esta pessoa foi encontrada?")) return;
    
        let res = await fetch(`${API}/pessoas/${id}/estado`, { method: "POST" });
    
        if (res.ok) {
            // Remove a linha da lista de desaparecidas
            let row = document.querySelector(`.person-row[data-id="${id}"]`);
            if (row) row.remove();
    
            // Atualiza o contador de desaparecidas
            let missingCount = document.getElementById("lista").querySelectorAll(".person-row").length;
            document.getElementById("badge-missing").textContent = missingCount;
            document.getElementById("stat-missing").textContent = missingCount;
    
            // Mostra empty state se não houver mais nenhuma
            if (missingCount === 0) {
                document.getElementById("lista").innerHTML =
                    `<div class="empty"><div class="empty-icon">◎</div>Nenhuma pessoa desaparecida registada.</div>`;
            }
    
            // Recarrega a lista de encontradas
            await carregarPessoasEncontradas();
        } else {
            alert("Erro ao atualizar estado");
        }
    }

    /* ── Adicionar localização via prompt ── */
    async function addLoc(id) {
        let lat = prompt("Latitude:");
        let lon = prompt("Longitude:");
        let data = prompt("Data (ex: 01/01/2026):");
        let hora = prompt("Hora (ex: 12:00):");

        if (!lat || !lon || !data || !hora) return;

        let url = `${API}/pessoas/${id}/localizacao?lat=${parseFloat(lat)}&lon=${parseFloat(lon)}&data=${encodeURIComponent(data)}&hora=${encodeURIComponent(hora)}`;

        try {
            let res = await fetch(url, { method: "POST" });
            if (res.ok) {
                alert("Localização adicionada!");
                let nameEl = document.querySelector(`.person-name[onclick*="'${id}'"]`);
                if (nameEl) {
                    let detalheDiv = nameEl.closest(".person-row").querySelector(".person-details");
                    detalheDiv.dataset.loaded = "false";
                    if (detalheDiv.classList.contains("open")) {
                        detalheDiv.classList.remove("open");
                        nameEl.querySelector(".chevron").classList.remove("open");
                        await togglePessoa(id, nameEl);
                    }
                }
            } else {
                console.error("Erro no servidor:", await res.text());
            }
        } catch (e) {
            console.error("Erro na requisição:", e);
        }
    }

    /* ── Init ── */
    carregarPessoas();
    carregarPessoasEncontradas();