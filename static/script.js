const ddragonURL = 'https://ddragon.leagueoflegends.com/cdn/15.23.1/data/fr_FR/champion.json';
const iconBaseURL = 'https://ddragon.leagueoflegends.com/cdn/15.23.1/img/champion/';

const searchInput = document.getElementById('searchInput');
const championList = document.getElementById('championList');

let allChampions = [];
let championRoles = {};
let favorites = []; 

// Filtres globaux
let selectedRoleFilter = null;
let selectedCounterRole = null;

const apiUrl = ""; 

// ==============================
// CHARGEMENT DES DONNÉES
// ==============================

async function loadChampionRoles() {
    try {
        const res = await fetch('/static/championRoles.json');
        championRoles = await res.json();
    } catch (e) { console.error("Erreur roles:", e); }
}

async function loadChampions() {
    try {
        const res = await fetch(ddragonURL);
        const data = await res.json();
        allChampions = Object.values(data.data);
        updateChampionList();
        populateCounterSelect();
    } catch (e) { console.error("Erreur champions:", e); }
}

async function loadFavorites() {
    try {
        const res = await fetch(`${apiUrl}/counters/ALL_DATA`); 
        const data = await res.json();
        const favConfig = data.find(item => item.type === "config_favs");
        favorites = favConfig ? favConfig.list : [];
        updateChampionList();
    } catch (e) { console.error("Erreur favoris", e); }
}

// ==============================
// GESTION DES FAVORIS
// ==============================

async function toggleFavorite(event, champId) {
    event.stopPropagation();
    try {
        const res = await fetch(`${apiUrl}/favorites/${champId}`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            favorites = data.favorites;
            updateChampionList();
        }
    } catch (e) { console.error("Erreur toggle fav:", e); }
}

// ==============================
// FILTRES & AFFICHAGE LISTE
// ==============================

document.querySelectorAll('.role-filter').forEach(icon => {
    icon.addEventListener('click', () => {
        const role = icon.dataset.role;
        selectedRoleFilter = (selectedRoleFilter === role) ? null : role;

        document.querySelectorAll('.role-filter').forEach(i => {
            i.classList.remove('border-emerald-500', 'active');
            i.classList.add('border-transparent');
        });

        if (selectedRoleFilter !== null) {
            icon.classList.remove('border-transparent');
            icon.classList.add('border-emerald-500', 'active');
        }
        updateChampionList();
    });
});

function updateChampionList() {
    const search = searchInput.value ? searchInput.value.toLowerCase() : "";
    
    let filtered = allChampions.filter(champ => {
        const matchesSearch = champ.name.toLowerCase().includes(search);
        const roles = (championRoles && championRoles[champ.id]) ? championRoles[champ.id] : [];
        const matchesRole = !selectedRoleFilter || roles.includes(selectedRoleFilter);
        return matchesSearch && matchesRole;
    });

    // Tri Favoris d'abord
    filtered.sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.name.localeCompare(b.name);
    });

    championList.innerHTML = filtered.map(champ => {
        const isFav = favorites.includes(champ.id);
        return `
        <div class="champion-card text-center cursor-pointer group relative ${isFav ? 'is-favorite' : ''}" 
             onclick="openModal('${champ.id}')">
          <button onclick="toggleFavorite(event, '${champ.id}')" 
                  class="fav-btn absolute top-1 right-1 z-10 p-1 text-gray-500 opacity-0 group-hover:opacity-100 ${isFav ? 'active' : ''}">
            <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          </button>
          <div class="relative">
            <img src="${iconBaseURL + champ.image.full}" 
                 class="w-full aspect-square rounded-lg shadow-lg border-2 ${isFav ? 'border-yellow-500' : 'border-gray-700'} group-hover:border-emerald-500/60 transition-all" />
          </div>
          <p class="text-[10px] mt-1 font-medium ${isFav ? 'text-yellow-500' : 'text-gray-300'} group-hover:text-emerald-400 truncate px-1">
            ${champ.name}
          </p>
        </div>`;
    }).join('');
}

searchInput.addEventListener('input', updateChampionList);

// ==============================
// MODAL & RENDU COUNTERS
// ==============================

let selectedChampion = null;
const modal = document.getElementById('modal');
const modalCounters = document.getElementById('modalCounters');

function openModal(championId) {
    const champ = allChampions.find(c => c.id === championId);
    selectedChampion = champ;
    document.getElementById('modalChampionIcon').src = iconBaseURL + champ.image.full;
    document.getElementById('modalChampionName').textContent = champ.name;
    renderCounters(champ.name);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function renderCounters(championName) {
    try {
        const res = await fetch(`${apiUrl}/counters/${encodeURIComponent(championName)}`);
        const counters = await res.json();
        const grouped = {};
        
        const onlyCounters = Array.isArray(counters) ? counters.filter(c => c.champion) : [];

        for (const c of onlyCounters) {
            const role = c.role || "All";
            if (!grouped[role]) grouped[role] = [];
            grouped[role].push(c);
        }

        modalCounters.innerHTML = Object.entries(grouped).map(([role, list]) => `
            <div class="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50 mb-4">
                <div class="flex items-center gap-2 mb-3">
                    <img src="/static/icon/${role}.png" class="w-8 h-8" />
                    <h3 class="font-semibold text-lg text-emerald-400">${role}</h3>
                </div>
                <div class="space-y-2">
                    ${list.sort((a,b)=>a.rank-b.rank).map(counter => `
                        <div class="counter-item flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <div class="flex items-center gap-3">
                                <img src="${iconBaseURL + counter.name + '.png'}" class="w-12 h-12 rounded-lg border-2 border-gray-600" />
                                <p class="font-semibold text-white">${counter.name}</p>
                            </div>
                            <button onclick="deleteCounter('${championName}', '${counter.name}', '${role}')" class="text-red-400 p-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>`).join('')}
                </div>
            </div>`).join('');
    } catch (err) { console.error("Erreur rendu counters:", err); }
}

async function deleteCounter(champion, counterName, role) {
    if (!confirm(`Supprimer ${counterName} (${role}) ?`)) return;
    try {
        const url = `${apiUrl}/counters/${encodeURIComponent(champion)}/${encodeURIComponent(counterName)}/${encodeURIComponent(role)}`;
        const res = await fetch(url, { method: "DELETE" });
        if (res.ok) renderCounters(champion);
    } catch (e) { console.error("Erreur suppression:", e); }
}

// ==============================
// AJOUT COUNTER (TOMSELECT & ROLES)
// ==============================

const counterChampion = document.getElementById('counterChampion');
const addCounterBtn = document.getElementById('addCounterBtn');
const addCounterModal = document.getElementById('addCounterModal');
const addCounterForm = document.getElementById('addCounterForm');

function populateCounterSelect() {
    if(!counterChampion) return;
    counterChampion.innerHTML = allChampions.map(c => `<option value="${c.id}" data-url="${iconBaseURL + c.image.full}">${c.name}</option>`).join('');

    new TomSelect('#counterChampion', {
        maxOptions: 999,
        render: {
            option: (data, esc) => `<div class="flex items-center gap-2 p-2"><img src="${esc(data.url)}" class="w-8 h-8 rounded"/>${esc(data.text)}</div>`,
            item: (data, esc) => `<div class="flex items-center gap-2"><img src="${esc(data.url)}" class="w-6 h-6 rounded"/>${esc(data.text)}</div>`
        }
    });
}

function updateCounterForRoleOptions() {
    const container = document.getElementById("counterRoleIcons");
    if (!selectedChampion || !container) return;
    
    const roles = championRoles[selectedChampion.id] || [];
    container.innerHTML = roles.map(role => `
        <img src="/static/icon/${role}.png" data-role="${role}" 
             class="counter-role w-14 h-14 p-2 rounded-xl bg-gray-700/50 border-2 border-transparent opacity-60 cursor-pointer transition-all" />
    `).join('');
    activateCounterRoleListeners();
}

function activateCounterRoleListeners() {
    const icons = document.querySelectorAll(".counter-role");
    icons.forEach(icon => {
        icon.addEventListener("click", () => {
            icons.forEach(i => {
                i.classList.remove("border-emerald-500", "opacity-100");
                i.classList.add("opacity-60");
            });
            icon.classList.add("border-emerald-500", "opacity-100");
            icon.classList.remove("opacity-60");
            selectedCounterRole = icon.dataset.role;
        });
    });
}

addCounterBtn.addEventListener('click', () => {
    document.getElementById('counterNote').value = '';
    document.getElementById('counterOrder').value = '1';
    selectedCounterRole = null;
    updateCounterForRoleOptions();
    addCounterModal.classList.remove('hidden');
    addCounterModal.classList.add('flex');
});

function closeAddCounterModal() {
    addCounterModal.classList.add('hidden');
    addCounterModal.classList.remove('flex');
}

addCounterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedCounterRole) return alert("Sélectionne un rôle !");
    
    const payload = {
        name: counterChampion.value,
        comment: document.getElementById('counterNote').value.trim(),
        rank: parseInt(document.getElementById('counterOrder').value) || 1,
        role: selectedCounterRole
    };

    try {
        const res = await fetch(`${apiUrl}/counters/${selectedChampion.name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeAddCounterModal();
            renderCounters(selectedChampion.name);
        }
    } catch (e) { console.error("Erreur ajout:", e); }
});

// ==============================
// INIT
// ==============================

(async () => {
    await loadChampionRoles();
    await loadChampions();
    await loadFavorites();
})();