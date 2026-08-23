// CONFIGURACIÓN OFICIAL CON TU CLAVE ASIGNADA
const API_KEY = "cc7fd0b064f20f833bbfd523dd22d57b"; 
const ENDPOINT_LIVE = "https://api-sports.io";
const ENDPOINT_FIXTURES = `https://api-sports.io{new Date().toISOString().split('T')[0]}`;

// IDs de competición oficiales para Sudamérica (128 Libertadores, 129 Sudamericana, 103 Liga Argentina)
const TARGET_LEAGUES =; 

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("matches-grid");
    const indicator = document.getElementById("status-indicator");
    const searchInput = document.getElementById("search-input");
    const navLinks = document.querySelectorAll(".nav-link");

    let cachePartidos = [];
    let filtroLigaActivo = "all";
    let terminoBusqueda = "";

    // Sincronización transparente e inmediata al iniciar la app
    inicializarApp();

    // Buscador predictivo en vivo (ej. "River") sin borrar filtros de liga
    searchInput.addEventListener("input", (e) => {
        terminoBusqueda = e.target.value.toLowerCase().trim();
        aplicarFiltrosYRenderizar();
    });

    // Pestañas automáticas que sincronizan datos en segundo plano
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            navLinks.forEach(l => l.classList.remove("active"));
            e.target.classList.add("active");
            filtroLigaActivo = e.target.getAttribute("data-league");
            
            sincronizarServidorSilencioso();
            aplicarFiltrosYRenderizar();
        });
    });

    async function inicializarApp() {
        // FLUJO DE DATOS: Lee de inmediato el almacenamiento del dispositivo para evitar pantallas en blanco
        const localData = localStorage.getItem("golfutbol_cached_data");
        if (localData) {
            cachePartidos = JSON.parse(localData);
            aplicarFiltrosYRenderizar();
        } else {
            grid.innerHTML = '<div class="feedback-msg">Conectando a los servidores de GolFutbol...</div>';
        }
        await sincronizarServidorSilencioso();
    }

    async function sincronizarServidorSilencioso() {
        try {
            // Llamada en paralelo a partidos del día y eventos en vivo de API-Sports
            const [resLive, resFixtures] = await Promise.all([
                fetch(ENDPOINT_LIVE, { headers: { "x-apisports-key": API_KEY } }),
                fetch(ENDPOINT_FIXTURES, { headers: { "x-apisports-key": API_KEY } })
            ]);

            const dataLive = await resLive.json();
            const dataFixtures = await resFixtures.json();

            const combinados = [...(dataLive.response || []), ...(dataFixtures.response || [])];
            
            // Filtrar ligas requeridas y remover duplicados por ID de partido
            const mapaUnico = {};
            combinados.forEach(item => {
                if(TARGET_LEAGUES.includes(item.league.id)) {
                    mapaUnico[item.fixture.id] = item;
                }
            });

            cachePartidos = Object.values(mapaUnico);
            
            // Guardado persistente en memoria offline
            localStorage.setItem("golfutbol_cached_data", JSON.stringify(cachePartidos));
            
            const ultimaHora = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            actualizarIndicador(`✓ GolFutbol sincronizado en tiempo real (${ultimaHora})`);
            aplicarFiltrosYRenderizar();

        } catch (error) {
            console.error("Fallo de red en segundo plano:", error);
            actualizarIndicador("⚠️ Modo Offline activo. Mostrando datos guardados en la memoria.");
        }
    }

    function aplicarFiltrosYRenderizar() {
        grid.innerHTML = "";
        let partidosFiltrados = cachePartidos;

        if (filtroLigaActivo !== "all") {
            partidosFiltrados = partidosFiltrados.filter(p => p.league.id == filtroLigaActivo);
        }

        if (terminoBusqueda !== "") {
            partidosFiltrados = partidosFiltrados.filter(p => 
                p.teams.home.name.toLowerCase().includes(terminoBusqueda) || 
                p.teams.away.name.toLowerCase().includes(terminoBusqueda)
            );
        }

        if (partidosFiltrados.length === 0) {
            grid.innerHTML = `<div class="feedback-msg">No se encontraron partidos o programaciones para "${terminoBusqueda || 'esta liga'}".</div>`;
            return;
        }

        partidosFiltrados.forEach(item => {
            const f = item.fixture;
            const t = item.teams;
            const g = item.goals;
            
            const esVivo = f.status.short !== "NS" && f.status.short !== "FT";
            const horaLocal = new Date(f.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const incidencias = item.events ? `${item.events.length} eventos clave` : "Estadísticas conectadas";

            const card = document.createElement("div");
            card.classList.add("match-card");

            card.innerHTML = `
                <div class="match-meta">
                    <span>🏆 ${item.league.name}</span>
                    ${esVivo ? `<span class="live-badge"><span class="logo-dot"></span> EN VIVO</span>` : `<span>${f.status.long}</span>`}
                </div>
                <div class="team-row">
                    <div class="team-info"><span>${t.home.name}</span></div>
                    <div class="team-score ${g.home === null ? 'score-pending' : ''}">${g.home !== null ? g.home : '-'}</div>
                </div>
                <div class="team-row">
                    <div class="team-info"><span>${t.away.name}</span></div>
                    <div class="team-score ${g.away === null ? 'score-pending' : ''}">${g.away !== null ? g.away : '-'}</div>
                </div>
                <div class="match-footer">
                    <span class="match-time">${esVivo ? `Minuto ${f.status.elapsed}'` : `Horario: ${horaLocal} hs`}</span>
                    <span class="match-stats-preview">📊 ${incidencias}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function actualizarIndicador(texto) {
        indicator.textContent = texto;
        indicator.classList.remove("hidden");
    }
});
