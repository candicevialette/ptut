const devices = [{
    id: 'rt-core',
    name: 'RT-CORE-01',
    type: 'router',
    ip: '192.168.10.1',
    brand: 'Cisco',
    model: 'ISR 4331',
    location: 'Siège · Baie principale',
    os: 'IOS XE 17.9'
}, {
    id: 'rt-edge',
    name: 'RT-EDGE-02',
    type: 'router',
    ip: '192.168.10.2',
    brand: 'MikroTik',
    model: 'CCR2004',
    location: 'Siège · Accès WAN',
    os: 'RouterOS 7.15'
}, {
    id: 'sw-core',
    name: 'SW-CORE-01',
    type: 'switch',
    ip: '192.168.10.10',
    brand: 'Cisco',
    model: 'Catalyst 9200',
    location: 'Siège · Baie principale',
    os: 'IOS XE 17.9'
}, {
    id: 'sw-access',
    name: 'SW-ACCESS-02',
    type: 'switch',
    ip: '192.168.10.11',
    brand: 'Aruba',
    model: 'CX 6200F',
    location: 'Siège · Étage 1',
    os: 'AOS-CX 10.13'
}, {
    id: 'fw-main',
    name: 'FW-MAIN-01',
    type: 'firewall',
    ip: '192.168.10.254',
    brand: 'Fortinet',
    model: 'FortiGate 60F',
    location: 'Siège · Périmètre réseau',
    os: 'FortiOS 7.4'
}, {
    id: 'fw-backup',
    name: 'FW-BACKUP-02',
    type: 'firewall',
    ip: '192.168.10.253',
    brand: 'Netgate',
    model: '4200',
    location: 'Siège · Secours',
    os: 'pfSense Plus 24.03'
}];
const groups = [['router', 'Routeurs', 'ROUTEUR'], ['switch', 'Switchs', 'SWITCH'], ['firewall', 'Pare-feu', 'PARE-FEU']];
let selected = devices[0]
  , connected = false
  , history = []
  , historyIndex = 0;
const $ = id => document.getElementById(id);
$('devices').innerHTML = groups.map( ([type,title]) => `<details open><summary>${title}<span class="count">${devices.filter(d => d.type === type).length}</span><span class="chevron" aria-hidden="true"></span></summary>${devices.filter(d => d.type === type).map(d => `<button class="devicebutton" data-id="${d.id}" aria-pressed="false">${d.name}</button>`).join('')}</details>`).join('');
document.querySelectorAll('.devicebutton').forEach(b => b.addEventListener('click', () => {
    selectDevice(b.dataset.id);
    location.hash = 'console';
    showRoute()
}
));
function selectDevice(id) {
    const d = devices.find(d => d.id === id);
    if (!d)
        throw new Error('Équipement inconnu');
    selected = d;
    connected = false;
    history = [];
    historyIndex = 0;
    $('log').replaceChildren();
    $('command').value = '';
    $('deviceName').textContent = d.name;
    $('deviceType').textContent = groups.find(g => g[0] === d.type)[2];
    $('deviceIp').textContent = d.ip;
    $('bottomIp').textContent = d.ip;
    $('deviceModel').textContent = d.brand + ' ' + d.model;
    $('terminalName').textContent = d.name;
    $('breadcrumbDevice').textContent = d.name;
    $('breadcrumbType').textContent = groups.find(g => g[0] === d.type)[1];
    $('prompt').textContent = d.name.toLowerCase() + ' #';
    document.querySelectorAll('.devicebutton').forEach(b => {
        b.classList.toggle('selected', b.dataset.id === id);
        b.setAttribute('aria-pressed', String(b.dataset.id === id))
    }
    );
    document.querySelector(`[data-id="${id}"]`).closest('details').open = true;
    updateConnection();
    return {
        id: d.id,
        name: d.name,
        connected: false
    }
}
function updateConnection() {
    $('connect').innerHTML = connected ? 'Déconnecter <span>↗</span>' : 'Connecter <span>↗</span>';
    $('bottomState').textContent = connected ? 'Connecté · démonstration' : 'Prêt à se connecter';
    $('statusDot').classList.toggle('active', connected);
    $('commandForm').hidden = !connected;
    document.querySelector('.terminalwelcome').hidden = connected || $('log').childElementCount > 0
}
function line(text, cls='') {
    const el = document.createElement('div');
    el.className = 'logline ' + cls;
    el.textContent = text;
    $('log').append(el);
    $('terminalBody').scrollTop = $('terminalBody').scrollHeight
}
function toggleConnection() {
    connected = !connected;
    if (connected) {
        $('log').replaceChildren();
        line('AZUR · SESSION DE DÉMONSTRATION', 'muted');
        line('Connexion simulée à ' + selected.ip + ' sur le port 22…', 'muted');
        line('Session ouverte sur ' + selected.name + '.', 'success');
        line(selected.brand + ' ' + selected.model + ' / ' + selected.os, 'muted');
        line('Aucune commande ne sera transmise à un équipement réel.', 'muted');
        line('Saisissez help pour consulter les commandes disponibles.');
    } else {
        line('Session de démonstration fermée.', 'muted')
    }
    updateConnection();
    if (connected)
        $('command').focus()
}
$('connect').addEventListener('click', toggleConnection);
$('clear').addEventListener('click', () => {
    $('log').replaceChildren();
    updateConnection();
    if (connected)
        $('command').focus()
}
);
$('expand').addEventListener('click', () => {
    const active = document.querySelector('.console').classList.toggle('expanded');
    $('expand').setAttribute('aria-label', active ? 'Réduire la console' : 'Agrandir la console');
    $('expand').title = active ? 'Réduire la console' : 'Agrandir la console'
}
);
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelector('.console').classList.remove('expanded');
        $('expand').setAttribute('aria-label', 'Agrandir la console');
        $('expand').title = 'Agrandir la console'
    }
}
);
function runCommand(raw) {
    if (!connected)
        throw new Error('Connectez la démo avant de saisir une commande.');
    const c = raw.trim();
    if (!c)
        return;
    history.push(c);
    historyIndex = history.length;
    line(selected.name.toLowerCase() + ' # ' + c, 'command');
    switch (c.toLowerCase()) {
    case 'help':
        line('Commandes de démonstration (communes à tous les équipements) :\n  show version       Modèle et version du système\n  show interfaces    Interfaces et adresses IP\n  show hostname      Nom de l’équipement\n  clear              Effacer le terminal\n  exit               Fermer la session\n\nCe simulateur utilise des commandes simplifiées.', 'muted');
        break;
    case 'show version':
        line(selected.brand + ' ' + selected.model + '\nSystème : ' + selected.os + '\nDisponibilité simulée : 12 jours, 04:32\nDonnées fictives — démonstration.');
        break;
    case 'show interfaces':
        line('Interface     Adresse IP         État\n────────────  ─────────────────  ────\nManagement    ' + selected.ip.padEnd(17) + '  UP\nEthernet 1    10.0.0.1           UP\nEthernet 2    Non attribuée      DOWN\n\nDonnées fictives — démonstration.');
        break;
    case 'show hostname':
        line(selected.name);
        break;
    case 'clear':
        $('log').replaceChildren();
        break;
    case 'exit':
        toggleConnection();
        break;
    default:
        line('Commande non prise en charge dans la démo. Saisissez help.', 'muted')
    }
    return {
        device: selected.id,
        command: c,
        simulated: true
    }
}
$('commandForm').addEventListener('submit', e => {
    e.preventDefault();
    const c = $('command').value;
    $('command').value = '';
    runCommand(c);
    $('terminalBody').scrollTop = $('terminalBody').scrollHeight
}
);
$('command').addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        historyIndex = Math.max(0, Math.min(history.length, historyIndex + (e.key === 'ArrowUp' ? -1 : 1)));
        $('command').value = history[historyIndex] || ''
    }
}
);
selectDevice(selected.id);
if (document.modelContext?.registerTool) {
    try {
        Promise.resolve(document.modelContext.registerTool({
            name: 'select_demo_device',
            title: 'Sélectionner un équipement de démonstration',
            description: 'Sélectionne un équipement fictif dans la console et ferme la session simulée précédente.',
            inputSchema: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        enum: devices.map(d => d.id)
                    }
                },
                required: ['id'],
                additionalProperties: false
            },
            annotations: {
                readOnlyHint: false,
                untrustedContentHint: false
            },
            execute: input => {
                if (!input || typeof input.id !== 'string' || Object.keys(input).some(k => k !== 'id'))
                    throw new Error('Identifiant invalide');
                return selectDevice(input.id)
            }
        })).catch( () => {}
        );
    } catch {}
}

function renderDashboard() {
    const total = devices.length;
    const counts = groups.map( ([type,label]) => ({
        type,
        label,
        count: devices.filter(d => d.type === type).length
    }));
    $('sidebarTotal').textContent = total;
    $('machineStats').innerHTML = '<div class="statcard totalstat"><span>Total des machines</span><strong>' + total + '</strong><small>Équipements répertoriés</small></div>' + counts.map(g => '<div class="statcard"><span>' + g.label + '</span><strong>' + g.count + '</strong><small>' + (total ? Math.round(g.count / total * 100) : 0) + ' % de l’inventaire</small></div>').join('');
    const max = Math.max(1, ...counts.map(g => g.count));
    $('machineChart').innerHTML = counts.map(g => '<div class="chartrow"><div><span>' + g.label + '</span><strong>' + g.count + ' machines</strong></div><div class="bartrack"><div class="bar ' + g.type + '" style="width:' + g.count / max * 100 + '%"></div></div></div>').join('');
    $('machineList').innerHTML = devices.map(d => '<button class="inventoryrow" data-machine="' + d.id + '"><span><strong>' + d.name + '</strong><small>' + d.brand + ' · ' + d.ip + '</small></span><span aria-hidden="true">↗</span></button>').join('');
    document.querySelectorAll('[data-machine]').forEach(b => b.addEventListener('click', () => {
        selectDevice(b.dataset.machine);
        location.hash = 'console'
    }
    ));
}
function showRoute() {
    const dash = location.hash === '#dashboard';
    const consolePage = location.hash === '#console';
    const admin = dash || consolePage;
    $('home').hidden = admin;
    $('administration').hidden = !admin;
    $('dashboard').hidden = !dash;
    $('consoleview').hidden = !consolePage;
    document.querySelector('.dashboardlink').setAttribute('aria-current', dash ? 'page' : 'false');
    $('breadcrumbType').textContent = dash ? 'Tableau de bord' : groups.find(g => g[0] === selected.type)[1];
    $('breadcrumbDevice').textContent = dash ? 'Vue d’ensemble' : selected.name;
    document.title = dash ? 'Azur — Tableau de bord' : consolePage ? 'Azur — Console réseau' : 'Azur — Tout votre réseau, un seul espace';
    if (admin || !location.hash || location.hash === '#accueil')
        window.scrollTo(0, 0);
}
renderDashboard();
window.addEventListener('hashchange', showRoute);
showRoute();

document.addEventListener('DOMContentLoaded', () => {
    const avatarBtn = document.getElementById('avatarBtn');
    const profileMenu = document.getElementById('profileMenu');

    if (avatarBtn && profileMenu) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = profileMenu.hidden;
            profileMenu.hidden = !isHidden;
            avatarBtn.setAttribute('aria-expanded', !isHidden);
        });

        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target) && e.target !== avatarBtn) {
                profileMenu.hidden = true;
                avatarBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // 1. Gestion du menu Profil (Macaron AD)
    const avatarBtn = document.getElementById('avatarBtn');
    const profileMenu = document.getElementById('profileMenu');

    if (avatarBtn && profileMenu) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche le clic de fermer le menu immédiatement
            const isHidden = profileMenu.hidden;
            profileMenu.hidden = !isHidden; // Alterne l'affichage
            avatarBtn.setAttribute('aria-expanded', !isHidden);
        });

        // Fermer le menu si on clique n'importe où ailleurs sur la page
        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target) && e.target !== avatarBtn) {
                profileMenu.hidden = true;
                avatarBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // 2. Empêcher le rechargement de page quand on change le mot de passe
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Mot de passe mis à jour avec succès ! (Simulation)');
            profileMenu.hidden = true; // Ferme le menu après validation
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // 1. Gestion du menu Profil (Macaron AD)
    const avatarBtn = document.getElementById('avatarBtn');
    const profileMenu = document.getElementById('profileMenu');

    if (avatarBtn && profileMenu) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche le clic de fermer le menu immédiatement
            const isHidden = profileMenu.hidden;
            profileMenu.hidden = !isHidden; // Alterne l'affichage
            avatarBtn.setAttribute('aria-expanded', !isHidden);
        });

        // Fermer le menu si on clique n'importe où ailleurs sur la page
        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target) && e.target !== avatarBtn) {
                profileMenu.hidden = true;
                avatarBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // 2. Empêcher le rechargement de page quand on change le mot de passe
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Mot de passe mis à jour avec succès ! (Simulation)');
            profileMenu.hidden = true; // Ferme le menu après validation
        });
    }
});
