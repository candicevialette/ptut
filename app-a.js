const devices = [
    { id: 'rt-core', name: 'RT-CORE-01', type: 'router', ip: '192.168.10.1', brand: 'Cisco', model: 'ISR 4331', location: 'Siège · Baie principale', os: 'IOS XE 17.9' },
    { id: 'rt-edge', name: 'RT-EDGE-02', type: 'router', ip: '192.168.10.2', brand: 'MikroTik', model: 'CCR2004', location: 'Siège · Accès WAN', os: 'RouterOS 7.15' },
    { id: 'sw-core', name: 'SW-CORE-01', type: 'switch', ip: '192.168.10.10', brand: 'Cisco', model: 'Catalyst 9200', location: 'Siège · Baie principale', os: 'IOS XE 17.9' },
    { id: 'sw-access', name: 'SW-ACCESS-02', type: 'switch', ip: '192.168.10.11', brand: 'Aruba', model: 'CX 6200F', location: 'Siège · Étage 1', os: 'AOS-CX 10.13' },
    { id: 'fw-main', name: 'FW-MAIN-01', type: 'firewall', ip: '192.168.10.254', brand: 'Fortinet', model: 'FortiGate 60F', location: 'Siège · Périmètre réseau', os: 'FortiOS 7.4' },
    { id: 'fw-backup', name: 'FW-BACKUP-02', type: 'firewall', ip: '192.168.10.253', brand: 'Netgate', model: '4200', location: 'Siège · Secours', os: 'pfSense Plus 24.03' }
];

const groups = [['router', 'Routeurs', 'ROUTEUR'], ['switch', 'Switchs', 'SWITCH'], ['firewall', 'Pare-feu', 'PARE-FEU']];
let selected = devices[0];
let connected = false;
let history = [];
let historyIndex = 0;

const $ = id => document.getElementById(id);

// Génération de la liste latérale des équipements
if ($('devices')) {$('devices').innerHTML = groups.map(([type, title]) => 
        `<details open>
            <summary>${title}<span class="count">${devices.filter(d => d.type === type).length}</span><span class="chevron" aria-hidden="true"></span></summary>
            ${devices.filter(d => d.type === type).map(d => `<button class="devicebutton" data-id="${d.id}" aria-pressed="false">${d.name}</button>`).join('')}
        </details>`
    ).join('');

    document.querySelectorAll('.devicebutton').forEach(b => b.addEventListener('click', () => {
        selectDevice(b.dataset.id);
        location.hash = 'console';
        showRoute();
    }));
}

function selectDevice(id) {
    const d = devices.find(d => d.id === id);
    if (!d) return;
    selected = d;
    connected = false;
    history = [];
    historyIndex = 0;
    
    if ($('log'))$('log').replaceChildren();
    if ($('command'))$('command').value = '';
    if ($('deviceName'))$('deviceName').textContent = d.name;
    if ($('deviceType'))$('deviceType').textContent = groups.find(g => g[0] === d.type)[2];
    if ($('deviceIp'))$('deviceIp').textContent = d.ip;
    if ($('bottomIp'))$('bottomIp').textContent = d.ip;
    if ($('deviceModel'))$('deviceModel').textContent = d.brand + ' ' + d.model;
    if ($('terminalName'))$('terminalName').textContent = d.name;
    if ($('breadcrumbDevice'))$('breadcrumbDevice').textContent = d.name;
    if ($('breadcrumbType'))$('breadcrumbType').textContent = groups.find(g => g[0] === d.type)[1];
    if ($('prompt'))$('prompt').textContent = d.name.toLowerCase() + ' #';

    document.querySelectorAll('.devicebutton').forEach(b => {
        b.classList.toggle('selected', b.dataset.id === id);
        b.setAttribute('aria-pressed', String(b.dataset.id === id));
    });

    const parentDetails = document.querySelector(`[data-id="${id}"]`)?.closest('details');
    if (parentDetails) parentDetails.open = true;

    updateConnection();
}

function updateConnection() {
    if ($('connect'))$('connect').innerHTML = connected ? 'Déconnecter <span>↗</span>' : 'Connecter <span>↗</span>';
    if ($('bottomState'))$('bottomState').textContent = connected ? 'Connecté · démonstration' : 'Prêt à se connecter';
    if ($('statusDot'))$('statusDot').classList.toggle('active', connected);
    if ($('commandForm'))$('commandForm').hidden = !connected;
    
    const welcome = document.querySelector('.terminalwelcome');
    if (welcome) welcome.hidden = connected || ($('log') &&$('log').childElementCount > 0);
}

function line(text, cls = '') {
    const el = document.createElement('div');
    el.className = 'logline ' + cls;
    el.textContent = text;
    if ($('log'))$('log').append(el);
    if ($('terminalBody')) $('terminalBody').scrollTop =$('terminalBody').scrollHeight;
}

function toggleConnection() {
    connected = !connected;
    if (connected) {
        if ($('log'))$('log').replaceChildren();
        line('AZUR · SESSION DE DÉMONSTRATION', 'muted');
        line('Connexion simulée à ' + selected.ip + ' sur le port 22…', 'muted');
        line('Session ouverte sur ' + selected.name + '.', 'success');
        line(selected.brand + ' ' + selected.model + ' / ' + selected.os, 'muted');
        line('Aucune commande ne sera transmise à un équipement réel.', 'muted');
        line('Saisissez help pour consulter les commandes disponibles.');
    } else {
        line('Session de démonstration fermée.', 'muted');
    }
    updateConnection();
    if (connected && $('command'))$('command').focus();
}

if ($('connect'))$('connect').addEventListener('click', toggleConnection);
if ($('clear'))$('clear').addEventListener('click', () => {
    if ($('log'))$('log').replaceChildren();
    updateConnection();
    if (connected && $('command'))$('command').focus();
});

if ($('expand'))$('expand').addEventListener('click', () => {
    const active = document.querySelector('.console').classList.toggle('expanded');
    $('expand').setAttribute('aria-label', active ? 'Réduire la console' : 'Agrandir la console');
    $('expand').title = active ? 'Réduire la console' : 'Agrandir la console';
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const consoleEl = document.querySelector('.console');
        if (consoleEl) consoleEl.classList.remove('expanded');
        if ($('expand')) {
            $('expand').setAttribute('aria-label', 'Agrandir la console');$('expand').title = 'Agrandir la console';
        }
    }
});

function runCommand(raw) {
    if (!connected) return;
    const c = raw.trim();
    if (!c) return;

    history.push(c);
    historyIndex = history.length;
    line(selected.name.toLowerCase() + ' # ' + c, 'command');

    switch (c.toLowerCase()) {
        case 'help':
            line('Commandes de démonstration :\n  show version       Modèle et version du système\n  show interfaces    Interfaces et adresses IP\n  show hostname      Nom de l’équipement\n  clear              Effacer le terminal\n  exit               Fermer la session', 'muted');
            break;
        case 'show version':
            line(selected.brand + ' ' + selected.model + '\nSystème : ' + selected.os + '\nDisponibilité simulée : 12 jours, 04:32');
            break;
        case 'show interfaces':
            line('Interface     Adresse IP         État\n────────────  ─────────────────  ────\nManagement    ' + selected.ip.padEnd(17) + '  UP\nEthernet 1    10.0.0.1           UP\nEthernet 2    Non attribuée      DOWN');
            break;
        case 'show hostname':
            line(selected.name);
            break;
        case 'clear':
            if ($('log'))$('log').replaceChildren();
            break;
        case 'exit':
            toggleConnection();
            break;
        default:
            line('Commande non prise en charge dans la démo. Saisissez help.', 'muted');
    }
}

if ($('commandForm')) {$('commandForm').addEventListener('submit', e => {
        e.preventDefault();
        const c = $('command').value;
        $('command').value = '';
        runCommand(c);
    });
}

if ($('command')) {$('command').addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            historyIndex = Math.max(0, Math.min(history.length, historyIndex + (e.key === 'ArrowUp' ? -1 : 1)));
            $('command').value = history[historyIndex] || '';
        }
    });
}

function renderDashboard() {
    const total = devices.length;
    const counts = groups.map(([type, label]) => ({
        type,
        label,
        count: devices.filter(d => d.type === type).length
    }));

    if ($('sidebarTotal'))$('sidebarTotal').textContent = total;
    
    if ($('machineStats')) {$('machineStats').innerHTML = '<div class="statcard totalstat"><span>Total des machines</span><strong>' + total + '</strong><small>Équipements répertoriés</small></div>' + 
            counts.map(g => '<div class="statcard"><span>' + g.label + '</span><strong>' + g.count + '</strong><small>' + (total ? Math.round(g.count / total * 100) : 0) + ' % de l’inventaire</small></div>').join('');
    }

    // Graphique gauche (Catégories) aligné sur le style du graphique droit
    if ($('machineChart')) {$('machineChart').innerHTML = counts.map(g => `
            <div class="chartitem">
                <div class="chartlabel">
                    <span>${g.label}</span>
                    <span class="chartcount">${g.count} machine${g.count > 1 ? 's' : ''}</span>
                </div>
                <div class="barbg">
                    <div class="barfill ${g.type}" style="width: ${total ? Math.round((g.count / total) * 100) : 0}%;"></div>
                </div>
            </div>
        `).join('');
    }

    if ($('machineList')) {$('machineList').innerHTML = devices.map(d => '<button class="inventoryrow" data-machine="' + d.id + '"><span><strong>' + d.name + '</strong><small>' + d.brand + ' · ' + d.ip + '</small></span><span aria-hidden="true">↗</span></button>').join('');
        document.querySelectorAll('[data-machine]').forEach(b => b.addEventListener('click', () => {
            selectDevice(b.dataset.machine);
            location.hash = 'console';
        }));
    }
}

// Gestion des vues selon l'URL (Routage)
function showRoute() {
    const hash = location.hash || '#dashboard';
    const isDash = hash === '#dashboard';
    const isUsers = hash === '#users';
    const isConsole = !isDash && !isUsers;

    if ($('dashboard'))$('dashboard').hidden = !isDash;
    if ($('users'))$('users').hidden = !isUsers;
    if ($('consoleview'))$('consoleview').hidden = !isConsole;

    if (isDash) {
        if ($('breadcrumbType'))$('breadcrumbType').textContent = 'Tableau de bord';
        if ($('breadcrumbDevice'))$('breadcrumbDevice').textContent = 'Vue d’ensemble';
        document.title = 'Nodus — Tableau de bord';
    } else if (isUsers) {
        if ($('breadcrumbType'))$('breadcrumbType').textContent = 'Sécurité';
        if ($('breadcrumbDevice'))$('breadcrumbDevice').textContent = 'Gestion des utilisateurs';
        document.title = 'Nodus — Utilisateurs';
    } else {
        if ($('breadcrumbType'))$('breadcrumbType').textContent = groups.find(g => g[0] === selected.type)[1];
        if ($('breadcrumbDevice'))$('breadcrumbDevice').textContent = selected.name;
        document.title = 'Nodus — Console réseau';
    }

    window.scrollTo(0, 0);
}

// Profil : ouverture, fermeture et navigation au clavier.
document.addEventListener('DOMContentLoaded', () => {
    selectDevice(selected.id);
    renderDashboard();
    showRoute();

    const avatarBtn = $('avatarBtn');
    const profileMenu = $('profileMenu');
    const passForm = $('changePasswordForm');
    const message = $('passwordMessage');
    if (!avatarBtn || !profileMenu) return;

    function closeProfile(restoreFocus = false) {
        profileMenu.hidden = true;
        avatarBtn.setAttribute('aria-expanded', 'false');
        avatarBtn.setAttribute('aria-label', 'Ouvrir mon profil');
        passForm?.reset();
        if (message) message.textContent = 'Démonstration : aucun mot de passe ne sera modifié.';
        if (restoreFocus) avatarBtn.focus();
    }

    avatarBtn.addEventListener('click', () => {
        if (!profileMenu.hidden) { closeProfile(true); return; }
        profileMenu.hidden = false;
        avatarBtn.setAttribute('aria-expanded', 'true');
        avatarBtn.setAttribute('aria-label', 'Fermer mon profil');
        $('closeProfile')?.focus();
    });
    $('closeProfile')?.addEventListener('click', () => closeProfile(true));
    document.addEventListener('click', event => {
        if (!profileMenu.hidden && !event.target.closest('.userprofile')) closeProfile();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !profileMenu.hidden) {
            event.preventDefault();
            closeProfile(true);
        }
    });
    document.querySelector('.userprofile').addEventListener('focusout', event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closeProfile();
    });
    window.addEventListener('hashchange', () => closeProfile());

    // Aucun serveur d'authentification n'est fourni dans cette maquette.
    // Ne pas enregistrer ni transmettre les mots de passe dans le navigateur.
    passForm?.addEventListener('submit', event => {
        event.preventDefault();
        if (!passForm.reportValidity()) return;
        passForm.reset();
        message.textContent = 'Modification indisponible dans la démonstration. Le formulaire doit être relié au serveur d’authentification.';
    });
});

window.addEventListener('hashchange', showRoute);
