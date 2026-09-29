// Mise à jour de la fonction showRoute
function showRoute() {
    const hash = location.hash || '#dashboard';
    const dash = hash === '#dashboard';
    const usersPage = hash === '#users';
    const consolePage = hash === '#console' || (!dash && !usersPage);

    if ($('home')) $('home').hidden = true;
    if ($('administration')) $('administration').hidden = false;
    if ($('dashboard')) $('dashboard').hidden = !dash;
    if ($('users')) $('users').hidden = !usersPage;
    if ($('consoleview')) $('consoleview').hidden = !consolePage;

    document.querySelectorAll('.sidenav .dashboardlink').forEach(link => {
        const isCurrent = link.getAttribute('href') === hash;
        link.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });

    if (dash) {
        $('breadcrumbType').textContent = 'Tableau de bord';
        $('breadcrumbDevice').textContent = 'Vue d’ensemble';
        document.title = 'Nodus — Tableau de bord';
    } else if (usersPage) {
        $('breadcrumbType').textContent = 'Sécurité';
        $('breadcrumbDevice').textContent = 'Gestion des utilisateurs';
        document.title = 'Nodus — Utilisateurs';
    } else {
        $('breadcrumbType').textContent = groups.find(g => g[0] === selected.type)[1];
        $('breadcrumbDevice').textContent = selected.name;
        document.title = 'Nodus — Console réseau';
    }

    window.scrollTo(0, 0);
}

// Initialisation et gestion des événements
document.addEventListener('DOMContentLoaded', () => {
    const avatarBtn = document.getElementById('avatarBtn');
    const profileMenu = document.getElementById('profileMenu');
    const changePasswordForm = document.getElementById('changePasswordForm');

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

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Mot de passe mis à jour avec succès ! (Simulation)');
            if (profileMenu) profileMenu.hidden = true;
        });
    }
});
