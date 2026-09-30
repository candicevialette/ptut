// VARIABLES ÉQUIPEMENTS : remplacer ces valeurs par celles de votre projet.
const devices = [
    { id: 'rt-core', name: 'RT-CORE-01', type: 'router', ip: '192.168.10.1', brand: 'Cisco', model: 'ISR 4331', protocol: 'SSH', port: 22, location: 'Siège · Baie principale', os: 'IOS XE 17.9' },
    { id: 'rt-edge', name: 'RT-EDGE-02', type: 'router', ip: '192.168.10.2', brand: 'MikroTik', model: 'CCR2004', protocol: 'SSH', port: 22, location: 'Siège · Accès WAN', os: 'RouterOS 7.15' },
    { id: 'sw-core', name: 'SW-CORE-01', type: 'switch', ip: '192.168.10.10', brand: 'Cisco', model: 'Catalyst 9200', protocol: 'SSH', port: 22, location: 'Siège · Baie principale', os: 'IOS XE 17.9' },
    { id: 'sw-access', name: 'SW-ACCESS-02', type: 'switch', ip: '192.168.10.11', brand: 'Aruba', model: 'CX 6200F', protocol: 'SSH', port: 22, location: 'Siège · Étage 1', os: 'AOS-CX 10.13' },
    { id: 'fw-main', name: 'FW-MAIN-01', type: 'firewall', ip: '192.168.10.254', brand: 'Fortinet', model: 'FortiGate 60F', protocol: 'SSH', port: 22, location: 'Siège · Périmètre réseau', os: 'FortiOS 7.4' },
    { id: 'fw-backup', name: 'FW-BACKUP-02', type: 'firewall', ip: '192.168.10.253', brand: 'Netgate', model: '4200', protocol: 'SSH', port: 22, location: 'Siège · Secours', os: 'pfSense Plus 24.03' }
];

// VARIABLES GÉNÉRALES ET PROFIL : aucune authentification implémentée ici.
const site = { name: 'Nodus', companyName: 'NOM DE L’ENTREPRISE', version: 'v0.1' };
const currentUser = { id: 'admin-system', userID: 'admin', name: 'Admin Système', role: 'admin' };
const roles = {admin:'Super Admin',operator:'Opérateur',readonly:'Lecture seule'};
const rights = {admin:'Administration complète des équipements et des utilisateurs.',operator:'Administration des équipements, sans gestion des utilisateurs.',readonly:'Consultation des équipements, sans modification.'};
// VARIABLES UTILISATEURS : id = clé stable ; userID = nom de connexion (pas une adresse mail).
let users = [
{id:'admin-system',name:'Admin Système',userID:'admin',role:'admin',active:true,lastLogin:null},
{id:'network-tech',name:'Technicien Réseau',userID:'tech',role:'operator',active:true,lastLogin:null},
{id:'security-audit',name:'Auditeur Sécurité',userID:'audit',role:'readonly',active:false,lastLogin:null}
];
// VARIABLES SHELL : points de repère pour votre futur programme, sans transport réseau.
const shell = { sessionId: null, command: '', output: '', error: '' };
// Compteurs calculés à partir de devices par renderDashboard().
const dashboard = { total: 0, byType: [], byBrand: [] };

const groups = [['router', 'Routeurs', 'ROUTEUR'], ['switch', 'Switchs', 'SWITCH'], ['firewall', 'Pare-feu', 'PARE-FEU']];
let selected = devices[0];
// État d’affichage uniquement : à alimenter après une vraie connexion côté serveur.
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
    ['deviceProtocol','terminalProtocol','bottomProtocol'].forEach(id => { if ($(id)) $(id).textContent = d.protocol; });
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
    if ($('bottomState'))$('bottomState').textContent = connected ? 'Connecté' : 'Prêt à se connecter';
    if ($('statusDot'))$('statusDot').classList.toggle('active', connected);
    if ($('commandForm'))$('commandForm').hidden = !connected;
    
    const welcome = document.querySelector('.terminalwelcome');
    if (welcome) welcome.hidden = connected || ($('log') &&$('log').childElementCount > 0);
}

function line(text, cls = '') {
    shell.output = String(text); // Dernier texte reçu/affiché ; le journal visuel est #log.
    const el = document.createElement('div');
    el.className = 'logline ' + cls;
    el.textContent = text;
    if ($('log'))$('log').append(el);
    if ($('terminalBody')) $('terminalBody').scrollTop =$('terminalBody').scrollHeight;
}

// Une session réelle nécessite une passerelle SSH côté serveur.
function toggleConnection() {
    connected = false;
    if ($('log')) $('log').replaceChildren();
    line('Service SSH non configuré. Impossible d’ouvrir une session sur ' + selected.name + '.', 'muted');
    updateConnection();
    if ($('bottomState')) $('bottomState').textContent = 'Service SSH non configuré';
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
    shell.command = raw; // À transmettre plus tard par votre programme ; aucun envoi ici.
    if (!raw.trim()) return;
    line('Aucune session SSH active. Configurez la passerelle serveur pour exécuter des commandes.', 'muted');
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

    dashboard.total = total;
    dashboard.byType = counts;
    const brands = new Map();
    devices.forEach(d => brands.set(d.brand, (brands.get(d.brand) || 0) + 1));
    dashboard.byBrand = [...brands].map(([brand, count]) => ({brand, count}));
    if ($('brandChart')) {
        $('brandChart').replaceChildren();
        dashboard.byBrand.forEach(({brand, count}, index) => {
            const item = document.createElement('div'); item.className = 'chartitem';
            const label = document.createElement('div'); label.className = 'chartlabel';
            const title = document.createElement('span'); title.textContent = brand;
            const value = document.createElement('span'); value.className = 'chartcount'; value.textContent = count + ' machine' + (count > 1 ? 's' : '');
            label.append(title, value);
            const bg = document.createElement('div'); bg.className = 'barbg';
            const bar = document.createElement('div'); bar.className = 'barfill';
            bar.style.width = (total ? count / total * 100 : 0) + '%';
            bar.style.backgroundColor = ['#456ba2','#454096','#46969d'][index % 3];
            bg.append(bar); item.append(label, bg); $('brandChart').append(item);
        });
    }
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
    const hash = ['#dashboard', '#users', '#console'].includes(location.hash) ? location.hash : '#dashboard';
    const isDash = hash === '#dashboard';
    const isUsers = hash === '#users';
    const isConsole = hash === '#console';
    document.querySelectorAll('.devicebutton').forEach(button => {
        const active = isConsole && button.dataset.id === selected.id;
        button.classList.toggle('selected', active);
        button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.sidenav .dashboardlink').forEach(link => {
        if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });

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
    $('companyName').textContent = site.companyName;
    $('footerName').textContent = site.name + ' CONSOLE';
    $('appVersion').textContent = site.version;
    $('profileName').textContent = currentUser.name;
    $('profileUserID').textContent = currentUser.userID;
    $('profileRole').textContent = roles[currentUser.role];
    $('profileBadge').textContent = roles[currentUser.role];
    $('profileRights').textContent = rights[currentUser.role];
    $('avatarBtn').textContent = currentUser.name.split(/\s+/).map(part => part[0]).slice(0,2).join('').toUpperCase();
    selectDevice(selected.id);
    renderDashboard();
    showRoute();

    const avatarBtn = $('avatarBtn');
    const profileMenu = $('profileMenu');
    const passForm = $('changePasswordForm');
    const message = $('passwordMessage');
    if (!avatarBtn || !profileMenu) return;
    profileMenu.hidden = true;
    avatarBtn.setAttribute('aria-expanded', 'false');

    function closeProfile(restoreFocus = false) {
        profileMenu.hidden = true;
        avatarBtn.setAttribute('aria-expanded', 'false');
        avatarBtn.setAttribute('aria-label', 'Ouvrir mon profil');
        passForm?.reset();
        ['currentPass', 'newPass'].forEach(id => { if ($(id)) { $(id).type = 'password'; $(id).value = ''; } });
        if (message) message.textContent = '';
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

    // Brancher ici le service d'authentification avant la mise en production.
    // Champs à lire lors du futur branchement : $('currentPass').value et $('newPass').value.
    // Ne jamais conserver les mots de passe dans une variable globale ou localStorage.
    passForm?.addEventListener('submit', event => {
        event.preventDefault();
        if (!passForm.reportValidity()) return;
        passForm.reset();
        message.textContent = 'Service d’authentification non configuré. Le mot de passe n’a pas été modifié.';
    });
});

window.addEventListener('hashchange', showRoute);

// Afficher uniquement à la demande ; masquer à chaque fermeture du profil.
document.querySelectorAll('.passwordtoggle').forEach(button => {
    button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.password);
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(reveal));
        const label = (reveal ? 'Masquer ' : 'Afficher ') + (input.id === 'currentPass' ? 'le mot de passe actuel' : 'le nouveau mot de passe');
        button.setAttribute('aria-label', label);
        button.title = label;
        input.focus();
    });
});
document.getElementById('changePasswordForm')?.addEventListener('reset', () => {
    document.querySelectorAll('.passwordtoggle').forEach(button => {
        document.getElementById(button.dataset.password).type = 'password';
        button.setAttribute('aria-pressed', 'false');
        const label = 'Afficher ' + (button.dataset.password === 'currentPass' ? 'le mot de passe actuel' : 'le nouveau mot de passe');
        button.setAttribute('aria-label', label);
        button.title = label;
    });
});


// Gestion locale des fiches utilisateurs. Aucun mot de passe ni droit serveur
// n'est stocké ici. Remplacer ce stockage par une API authentifiée en production.
(() => {
    // Clé distincte pour préserver les anciennes fiches contenant des e-mails.
    const KEY = 'nodus.users.userID.v2';
    const dialog = document.getElementById('userDialog');
    const form = document.getElementById('userEditor');
    const table = document.getElementById('userRows');
    const feedback = document.getElementById('usersFeedback');
    const error = document.getElementById('userError');
    const name = document.getElementById('userName');
    const userID = document.getElementById('userID');
    const role = document.getElementById('userRole');
    const status = document.getElementById('userStatus');

    let snapshot = null;
    let editing = null;
    let opener = null;
    let storageOK = true;

    function validRows(rows) {
        return Array.isArray(rows) && rows.length > 0 && rows.every(user =>
            user && typeof user.id === 'string' && typeof user.name === 'string' && user.name.trim() &&
            typeof user.userID === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/.test(user.userID) &&
            Object.hasOwn(roles, user.role) && typeof user.active === 'boolean' &&
            (user.lastLogin === null || (typeof user.lastLogin === 'string' && !Number.isNaN(Date.parse(user.lastLogin))))
        ) && new Set(rows.map(u=>u.id)).size === rows.length &&
        new Set(rows.map(u=>u.userID.trim().toLowerCase())).size === rows.length &&
        rows.some(u=>u.role === 'admin' && u.active);
    }
    try {
        snapshot = localStorage.getItem(KEY);
        if (snapshot !== null) {
            const data = JSON.parse(snapshot);
            if (data.version !== 1 || !validRows(data.users)) throw Error('invalid');
            users = data.users;
        }
    } catch {
        storageOK = false;
        feedback.textContent = 'Le stockage local est inaccessible ou invalide. Les données existantes n’ont pas été écrasées ; l’enregistrement est indisponible.';
    }

    function el(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function render() {
        table.replaceChildren();
        users.forEach(user => {
            const tr = el('tr');
            const identity = el('td');
            identity.append(el('strong',user.name),el('br'),el('small',user.userID));
            const roleCell=el('td'); roleCell.append(el('span',roles[user.role],'rolebadge '+user.role));
            const state=el('td'); state.append(el('span',user.active?'Actif':'Inactif','statusbadge '+(user.active?'active':'inactive')));
            const login=el('td',user.lastLogin?new Date(user.lastLogin).toLocaleString('fr-FR'):'Non renseignée');
            const actions=el('td'), button=el('button','Éditer','textlink');
            button.type='button';button.dataset.editUser=user.id;
            button.setAttribute('aria-label','Éditer '+user.name);
            button.addEventListener('click',()=>openEditor(user.id,button));
            actions.append(button);tr.append(identity,roleCell,state,login,actions);table.append(tr);
        });
    }
    function updateRights() { document.getElementById('userRights').textContent=rights[role.value]; }
    function openEditor(id, source) {
        const user=users.find(u=>u.id===id);
        editing=user?.id||null;opener=source;form.reset();name.setCustomValidity('');userID.setCustomValidity('');error.textContent='';
        name.value=user?.name||'';userID.value=user?.userID||'';role.value=user?.role||'readonly';status.value=user?.active===false?'inactive':'active';
        document.getElementById('userDialogTitle').textContent=user?'Modifier l’utilisateur':'Ajouter un utilisateur';
        document.getElementById('saveUser').textContent=user?'Enregistrer les modifications':'Ajouter l’utilisateur';
        updateRights();dialog.showModal();name.focus();
    }
    function closeEditor() { dialog.close(); }
    document.getElementById('addUser').addEventListener('click',event=>openEditor(null,event.currentTarget));
    document.getElementById('cancelUser').addEventListener('click',closeEditor);
    document.getElementById('closeUser').addEventListener('click',closeEditor);
    dialog.addEventListener('close',()=>{
        form.reset();error.textContent='';
        const replacement=[...table.querySelectorAll('[data-edit-user]')].find(b=>b.dataset.editUser===editing);
        (opener?.isConnected?opener:replacement||document.getElementById('addUser')).focus();
    });
    role.addEventListener('change',updateRights);
    form.addEventListener('input',()=>{name.setCustomValidity('');userID.setCustomValidity('');error.textContent='';});
    form.addEventListener('submit',event=>{
        event.preventDefault();name.value=name.value.trim();userID.value=userID.value.trim().toLowerCase();
        name.setCustomValidity(name.value?'':'Saisissez un nom.');
        userID.setCustomValidity(users.some(u=>u.userID.trim().toLowerCase()===userID.value && u.id!==editing)?'Cet identifiant est déjà utilisé.':'');
        if (!form.reportValidity()) return;
        if (!storageOK) {error.textContent='Le stockage local n’est pas disponible. Aucune modification n’a été enregistrée.';return;}
        const old=users.find(u=>u.id===editing);
        const user={id:editing||crypto.randomUUID(),name:name.value,userID:userID.value,role:role.value,active:status.value==='active',lastLogin:old?.lastLogin||null};
        const next=editing?users.map(u=>u.id===editing?user:u):[...users,user];
        if (!next.some(u=>u.role==='admin'&&u.active)) {error.textContent='Conservez au moins un Super Admin actif.';return;}
        try {
            if (localStorage.getItem(KEY)!==snapshot) {error.textContent='La liste a changé dans un autre onglet. Fermez ce formulaire et rechargez la page avant de réessayer.';return;}
            const data=JSON.stringify({version:1,users:next});
            localStorage.setItem(KEY,data);snapshot=data;
        } catch {error.textContent='Impossible d’enregistrer dans ce navigateur. Aucune modification n’a été appliquée.';return;}
        users=next;render();feedback.textContent=(editing?'Fiche utilisateur modifiée':'Fiche utilisateur ajoutée')+' : '+user.name+'. Enregistrée dans ce navigateur.';closeEditor();
    });
    window.addEventListener('hashchange',()=>{if(dialog.open)closeEditor();});
    render();
})();


