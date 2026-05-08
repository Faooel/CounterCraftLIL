const ddragonURL = 'https://ddragon.leagueoflegends.com/cdn/15.23.1/data/fr_FR/champion.json';
const iconBaseURL = 'https://ddragon.leagueoflegends.com/cdn/15.23.1/img/champion/';

const searchInput = document.getElementById('searchInput');
const championList = document.getElementById('championList');

let allChampions = [];
let championRoles = {};

// 🎯 Séparation des filtres :
let selectedRoleFilter = null;     // Filtre champions
let defaultRoleSelection = null;   // Rôle par défaut pour modal
let selectedCounterRole = null;    // Rôle sélectionné dans modal

// Utiliser une chaîne vide pour que l'API appelle le même domaine (Localhost ou Render)
const apiUrl = ""; 

// ==============================
// CHARGEMENT DES DONNÉES
// ==============================

async function loadChampionRoles() {
  const res = await fetch('/static/championRoles.json');
  championRoles = await res.json();
}

async function loadChampions() {
  const res = await fetch(ddragonURL);
  const data = await res.json();
  allChampions = Object.values(data.data);
  updateChampionList();
  populateCounterSelect();
}

// ==============================
// FILTRE 1 : CHAMPIONS
// ==============================

document.querySelectorAll('.role-filter').forEach(icon => {
  icon.addEventListener('click', () => {
    const role = icon.dataset.role;
    
    if (selectedRoleFilter === role) {
      selectedRoleFilter = null;
      document.querySelectorAll('.role-filter').forEach(i => {
        i.classList.remove('border-emerald-500', 'active');
        i.classList.add('border-transparent');
      });
      document.querySelector('.role-filter[data-role=""]').classList.add('border-emerald-500', 'active');
      document.querySelector('.role-filter[data-role=""]').classList.remove('border-transparent');
      document.getElementById('clearRoleFilter').classList.add('hidden');
    } else {
      selectedRoleFilter = role;
      document.querySelectorAll('.role-filter').forEach(i => {
        i.classList.remove('border-emerald-500', 'active');
        i.classList.add('border-transparent');
      });
      icon.classList.remove('border-transparent');
      icon.classList.add('border-emerald-500', 'active');
      if (role === '') {
        document.getElementById('clearRoleFilter').classList.add('hidden');
      } else {
        document.getElementById('clearRoleFilter').classList.remove('hidden');
      }
    }
    updateChampionList();
  });
});

document.getElementById('clearRoleFilter').addEventListener('click', () => {
  selectedRoleFilter = null;
  document.querySelectorAll('.role-filter').forEach(i => {
    i.classList.remove('border-emerald-500', 'active');
    i.classList.add('border-transparent');
  });
  document.querySelector('.role-filter[data-role=""]').classList.add('border-emerald-500', 'active');
  document.querySelector('.role-filter[data-role=""]').classList.remove('border-transparent');
  document.getElementById('clearRoleFilter').classList.add('hidden');
  updateChampionList();
});

function updateChampionList() {
  const search = searchInput.value.toLowerCase();
  const filtered = allChampions.filter(champ => {
    const matchesSearch = champ.name.toLowerCase().includes(search);
    const roles = championRoles[champ.id] || [];
    const matchesRole = !selectedRoleFilter || roles.includes(selectedRoleFilter);
    return matchesSearch && matchesRole;
  });

  championList.innerHTML = filtered.map(champ => `
    <div class="champion-card text-center cursor-pointer group" onclick="openModal('${champ.id}')">
      <div class="relative">
        <img 
          src="${iconBaseURL + champ.image.full}" 
          class="w-full aspect-square rounded-lg shadow-lg transition-all border-2 border-gray-700 group-hover:border-emerald-500/60 group-hover:shadow-emerald-500/30" 
        />
      </div>
      <p class="text-[10px] sm:text-xs mt-1 font-medium text-gray-300 group-hover:text-emerald-400 transition-colors truncate px-1">${champ.name}</p>
    </div>
  `).join('');
}

searchInput.addEventListener('input', updateChampionList);

// ==============================
// FILTRE 2 : ROLE PAR DÉFAUT
// ==============================

document.querySelectorAll('.default-role').forEach(icon => {
  icon.addEventListener('click', () => {
    const role = icon.dataset.role;
    if (defaultRoleSelection === role) {
      icon.classList.remove('border-cyan-500', 'opacity-100');
      icon.classList.add('border-transparent', 'opacity-60');
      defaultRoleSelection = null;
    } else {
      document.querySelectorAll('.default-role').forEach(i => {
        i.classList.remove('border-cyan-500', 'opacity-100');
        i.classList.add('border-transparent', 'opacity-60');
      });
      icon.classList.remove('border-transparent', 'opacity-60');
      icon.classList.add('border-cyan-500', 'opacity-100');
      defaultRoleSelection = role;
    }
  });
});

// ==============================
// MODAL CHAMPION
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

// ==============================
// RÉCUPÉRATION COUNTERS
// ==============================

async function renderCounters(championName) {
  try {
    const res = await fetch(`${apiUrl}/counters/${championName}`);
    const counters = await res.json();
    const grouped = {};

    for (const c of counters) {
      const role = c.role || "All";
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push(c);
    }

    modalCounters.innerHTML = Object.entries(grouped).map(([role, list]) => `
      <div class="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
        <div class="flex items-center gap-2 mb-3">
          <img src="/static/icon/${role}.png" class="w-8 h-8" />
          <h3 class="font-semibold text-lg text-emerald-400">${role}</h3>
        </div>
        <div class="space-y-2">
          ${list.sort((a,b)=>a.rank-b.rank).map(counter => `
            <div class="counter-item flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
              <div class="flex items-center gap-3">
                <img src="${iconBaseURL + counter.name + '.png'}" class="w-12 h-12 rounded-lg border-2 border-gray-600" />
                <div>
                  <p class="font-semibold text-white">${counter.name}</p>
                  ${counter.comment ? `<p class="text-sm text-gray-400">${counter.comment}</p>` : ''}
                </div>
              </div>
              <button 
                data-champion="${selectedChampion.name}" 
                data-counter="${counter.name}" 
                data-role="${role}"
                onclick="handleDelete(this)"
                class="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all p-2 rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Erreur lors du chargement des counters:", err);
  }
}

async function handleDelete(button) {
    const champion = button.dataset.champion;
    const counterName = button.dataset.counter;
    const role = button.dataset.role;
    
    // On appelle ta fonction existante
    await deleteCounter(champion, counterName, role);
}

async function deleteCounter(champion, counterName, role) {
  if (!confirm(`Supprimer ${counterName} (${role}) ?`)) return;

  // encodeURIComponent permet de gérer proprement l'apostrophe de Kai'Sa
  const url = `${apiUrl}/counters/${encodeURIComponent(champion)}/${encodeURIComponent(counterName)}/${encodeURIComponent(role)}`;
  
  const res = await fetch(url, { method: "DELETE" });

  if (res.ok) {
    // Supprimer l'élément visuellement sans attendre
    renderCounters(champion);
  } else {
    alert("Erreur lors de la suppression.");
  }
}

// ==============================
// SELECT CHAMPION POUR AJOUT
// ==============================

const counterChampion = document.getElementById('counterChampion');
const addCounterBtn = document.getElementById('addCounterBtn');
const addCounterModal = document.getElementById('addCounterModal');
const addCounterForm = document.getElementById('addCounterForm');
const counterNote = document.getElementById('counterNote');
const counterOrder = document.getElementById('counterOrder');

function populateCounterSelect() {
  counterChampion.innerHTML = allChampions.map(c => `
    <option value="${c.id}" data-url="${iconBaseURL + c.image.full}">${c.name}</option>
  `).join('');

  new TomSelect('#counterChampion', {
    maxOptions: 999,
    render: {
      option: (data, esc) =>
        `<div class="flex items-center gap-2 p-2"><img src="${esc(data.url)}" class="w-8 h-8 rounded"/>${esc(data.text)}</div>`,
      item: (data, esc) =>
        `<div class="flex items-center gap-2"><img src="${esc(data.url)}" class="w-6 h-6 rounded"/>${esc(data.text)}</div>`
    }
  });
}

// ==============================
// ICÔNES DE RÔLE DANS LE MODAL
// ==============================

function updateCounterForRoleOptions() {
  const container = document.getElementById("counterRoleIcons");
  const roles = championRoles[selectedChampion.id] || [];
  container.innerHTML = roles.map(role => `
    <img src="/static/icon/${role}.png" 
         data-role="${role}"
         class="counter-role role-icon w-14 h-14 p-2 rounded-xl bg-gray-700/50 border-2 border-transparent opacity-60 hover:opacity-100 transition-all cursor-pointer" />
  `).join('');
  activateCounterRoleListeners();
}

function activateCounterRoleListeners() {
  const icons = document.querySelectorAll(".counter-role");
  icons.forEach(i => {
    i.classList.add("opacity-60", "border-transparent");
    i.classList.remove("border-emerald-500", "opacity-100");
    i.style.pointerEvents = "auto";
  });

  if (icons.length === 1) {
    selectCounterRoleIcon(icons[0]);
    icons[0].style.pointerEvents = "none";
    return;
  }

  if (defaultRoleSelection) {
    const target = [...icons].find(i => i.dataset.role === defaultRoleSelection);
    if (target) {
      selectCounterRoleIcon(target);
      icons.forEach(i => { if (i !== target) i.style.pointerEvents = "none"; });
    }
  }

  icons.forEach(icon => {
    icon.addEventListener("click", () => selectCounterRoleIcon(icon));
  });
}

function selectCounterRoleIcon(icon) {
  document.querySelectorAll(".counter-role").forEach(i => {
    i.classList.add("opacity-60", "border-transparent");
    i.classList.remove("border-emerald-500", "opacity-100");
  });
  icon.classList.remove("opacity-60", "border-transparent");
  icon.classList.add("border-emerald-500", "opacity-100");
  selectedCounterRole = icon.dataset.role;
}

// ==============================
// AJOUT COUNTER
// ==============================

addCounterBtn.addEventListener('click', () => {
  counterNote.value = '';
  counterOrder.value = '1';
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
  if (!selectedCounterRole) {
    alert("Sélectionne un rôle !");
    return;
  }

  const payload = {
    name: counterChampion.value,
    comment: counterNote.value.trim(),
    rank: parseInt(counterOrder.value) || 1,
    role: selectedCounterRole
  };

  const res = await fetch(`${apiUrl}/counters/${selectedChampion.name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json();
    alert("Erreur API : " + (errData.detail || "Inconnue"));
    return;
  }

  closeAddCounterModal();
  renderCounters(selectedChampion.name);
});

// ==============================
// INIT
// ==============================

(async () => {
  await loadChampionRoles();
  await loadChampions();
})();