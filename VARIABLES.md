# Variables du site Nodus

Cette version conserve les trois fichiers du site et son fonctionnement local.
Aucun script Python, appel réseau ou API n'a été ajouté.
Les données d'exemple existantes restent visibles pour travailler sur l'interface.

## Où modifier les données ?

Tout se trouve dans app-a.js :

| Variable | Donnée |
|---|---|
| site.name, companyName, version | Nom du site, entreprise et version |
| currentUser.id | Clé interne du profil affiché |
| currentUser.userID | Nom de connexion, sans e-mail |
| currentUser.name, role | Nom et rôle du profil ; les initiales du bouton sont calculées |
| roles, rights | Libellés des rôles et droits affichés |
| users | Liste des fiches utilisateurs |
| users[].id | Clé stable d'une fiche |
| users[].userID | Nom de connexion unique (3 à 64 caractères) |
| users[].name, role, active, lastLogin | Nom, rôle, statut et date ISO de dernière connexion ou null |
| devices | Liste des équipements |
| devices[].id, name | Clé de la machine et nom affiché |
| devices[].type | router, switch ou firewall |
| devices[].ip, brand, model | Adresse IP, marque et modèle |
| devices[].protocol, port | Protocole affiché et port disponible pour le futur programme |
| devices[].location, os | Emplacement et système disponibles pour le futur programme |
| groups | Correspondance des types : ROUTEUR, SWITCH, PARE-FEU |
| selected | Équipement actuellement sélectionné |
| connected | État de connexion affiché ; reste faux sans service réseau |
| shell.sessionId | Identifiant de la future session ; null actuellement |
| shell.command | Dernière commande saisie |
| shell.output | Dernier texte affiché dans le terminal |
| shell.error | Erreur de connexion |
| history, historyIndex | Historique et position de navigation du terminal |
| dashboard.total | Nombre total, calculé depuis devices |
| dashboard.byType | Compteurs par catégorie, calculés |
| dashboard.byBrand | Compteurs par marque, calculés |

Les compteurs sont recalculés par renderDashboard(). Ne pas les saisir à la main.
Le graphique des marques utilise désormais devices, comme celui des catégories.

## Emplacements pour le futur travail du groupe

- toggleConnection() : bouton Connecter ; aucune connexion réelle actuellement.
- runCommand(raw) : commande saisie ; aucun envoi actuellement.
- line(text, cls) : affichage d'une sortie de terminal.
- updateConnection() : affichage de l'état connected.
- selectDevice(id) : informations de la machine sélectionnée.
- Formulaire userEditor : ajout et édition des fiches locales.
- Formulaire changePasswordForm : champs currentPass et newPass. Ne jamais stocker les mots de passe dans les variables globales ou localStorage.
- Profil : currentUser définit uniquement l'affichage, pas une authentification ni des droits réels.

## userID et sauvegarde existante

Le champ HTML s'appelle bien userID, avec type=text et autocomplete=username.
La validation accepte lettres, chiffres, point, tiret et underscore, avec un premier caractère alphanumérique.
Les identifiants enregistrés sont normalisés en minuscules ; les doublons sont refusés.

Le fonctionnement de sauvegarde locale est conservé. La clé utilisée est nodus.users.userID.v2.
Les anciennes données nodus.users.v1 sont préservées sans conversion automatique :
elles pouvaient contenir des adresses e-mail. La première ouverture charge les fiches définies en haut du fichier.
Ensuite, les fiches sauvegardées dans le navigateur prennent la priorité.
Ces fiches ne sont pas des comptes authentifiés.

## Installation

Remplacer ensemble index-a.html, app-a.js, style.css et logo.png.
Ne pas reprendre config.js, nodus-api.js ou nodus-model.js de la version précédente :
cette version ne les utilise pas. Rien n'a été publié automatiquement.
