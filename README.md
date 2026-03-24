# 🎯 Sudoku Quotidien

Un jeu de Sudoku en ligne avec un nouveau défi chaque jour ! Testez vos compétences en logique, gérez vos 3 vies, et comparez votre score avec d'autres joueurs du monde entier.

![Sudoku Quotidien](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Fonctionnalités

### 🎮 Gameplay
- **Sudoku unique par jour** : Chaque date génère automatiquement un nouveau sudoku identique pour tous les joueurs
- **Chronomètre** : Suivez votre temps de résolution
- **Compteur d'erreurs** : Nombre d'erreurs détectées lors des vérifications
- **Barre de progression** : Visualisez votre avancement (% de cases remplies)

### 🏆 Classement Mondial
- **Enregistrement du score** : À la fin du jeu, entrez votre nom pour sauvegarder votre temps
- **Rang mondial** : Découvrez immédiatement votre position parmi tous les joueurs du jour
- **Leaderboard global** : Consultez le classement complet avec les meilleurs temps
- **Médailles** : Les 3 premiers joueurs reçoivent des médailles 🥇🥈🥉
- **Statistiques** : Voyez dans quel percentile vous vous situez

### 🔧 Outils de jeu

#### ✏️ Mode Notes
- Activez avec le bouton "Notes" ou la touche **Espace**
- Marquez les possibilités dans chaque case
- Chaque case peut contenir des mini-chiffres de 1 à 9

#### ⚡ Validation en temps réel
- Les conflits sont automatiquement mis en évidence en orange
- Vérifiez visuellement les doublons dans les lignes, colonnes et blocs 3x3

#### 🎯 Mise en évidence
- Cliquez sur une case : tous les chiffres identiques sont surlignés en jaune
- Facilite la visualisation de la répartition des nombres

#### 💡 Système d'indices
- Obtenez un indice qui remplit automatiquement une case
- Le nombre d'indices utilisés est comptabilisé

#### ⏮️ Undo / Redo
- Annulez vos dernières actions avec le bouton **↶** ou **Ctrl+Z**
- Refaites vos actions avec le bouton **↷** ou **Ctrl+Y**
- Historique complet de vos coups

### 🎨 Interface

#### 🌓 Mode sombre/clair
- Basculez entre les thèmes avec le bouton **🌙**
- Préservez vos yeux lors des sessions nocturnes

#### ⌨️ Raccourcis clavier
- **1-9** : Placer un nombre
- **0, Backspace, Delete** : Effacer une case
- **Espace** : Basculer le mode notes
- **Flèches ↑↓←→** : Naviguer entre les cases
- **Ctrl+Z** : Annuler
- **Ctrl+Y** : Refaire

#### 📱 Design responsive
- Interface adaptée aux mobiles, tablettes et ordinateurs
- Grille parfaitement dimensionnée sur tous les écrans

### 🎉 Après la victoire

#### 🎊 Animation de célébration
- Confettis colorés tombant de l'écran
- Animation de la grille
- Message de félicitations

#### 📤 Partage du score
- Partagez votre temps, nombre d'indices et d'erreurs
- Compatible avec l'API Web Share (mobile) ou copie dans le presse-papier
- Format texte sans spoiler la solution

## 🚀 Comment jouer

1. **Ouvrez** le fichier `index.html` dans votre navigateur
2. **Cliquez** sur une case vide pour la sélectionner
3. **Entrez** un chiffre de 1 à 9 avec votre clavier
4. **Naviguer** avec les flèches du clavier
5. **Utilisez** le mode notes pour marquer vos possibilités
6. **Vérifiez** votre solution avec le bouton "Vérifier"
7. **Partagez** votre score une fois terminé !

## 🎯 Règles du Sudoku

- Remplissez la grille 9×9 avec des chiffres de 1 à 9
- Chaque ligne doit contenir tous les chiffres de 1 à 9
- Chaque colonne doit contenir tous les chiffres de 1 à 9
- Chaque bloc 3×3 doit contenir tous les chiffres de 1 à 9
- Aucun chiffre ne doit se répéter dans une ligne, colonne ou bloc

## 💾 Technologies

- **HTML5** : Structure
- **CSS3** : Design et animations
- **JavaScript** : Logique du jeu
- **Firebase Realtime Database** : Classement mondial en temps réel
- **Algorithme de génération** : Sudoku unique basé sur la date du jour

## ⚙️ Configuration Firebase

Pour activer le classement mondial, vous devez configurer Firebase:

### 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet"
3. Suivez les étapes de création

### 2. Configurer Realtime Database

1. Dans votre projet Firebase, allez dans **Realtime Database**
2. Cliquez sur "Créer une base de données"
3. Choisissez un emplacement proche de vos utilisateurs
4. Commencez en **mode test** (ou configurez vos propres règles)

### 3. Règles de sécurité recommandées

Dans l'onglet "Règles" de Realtime Database, utilisez:

```json
{
  "rules": {
    "scores": {
      "$date": {
        ".read": true,
        ".write": true,
        ".indexOn": ["time"]
      }
    }
  }
}
```

⚠️ **Note**: Ces règles permettent à tout le monde de lire et écrire. Pour un environnement de production, ajoutez une authentification Firebase et des règles plus strictes.

### 4. Obtenir les informations de configuration

1. Dans les paramètres du projet (⚙️), allez dans "Paramètres du projet"
2. Faites défiler jusqu'à "Vos applications"
3. Cliquez sur l'icône Web `</>`
4. Copiez les informations de configuration

### 5. Modifier firebase-config.js

Ouvrez le fichier `firebase-config.js` et remplacez les valeurs:

```javascript
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_AUTH_DOMAIN",
    databaseURL: "VOTRE_DATABASE_URL",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_STORAGE_BUCKET",
    messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
    appId: "VOTRE_APP_ID"
};
```

### 6. Tester

1. Ouvrez `index.html` dans votre navigateur
2. Complétez un Sudoku
3. Entrez votre nom
4. Votre score devrait apparaître dans le classement !

## 🚀 Installation

### Sans classement mondial (mode hors ligne)

1. Téléchargez tous les fichiers
2. Ouvrez `index.html` dans votre navigateur
3. Le jeu fonctionne, mais le classement ne sera pas disponible

### Avec classement mondial

1. Téléchargez tous les fichiers
2. Configurez Firebase (voir ci-dessus)
3. Hébergez les fichiers sur un serveur web (Firebase Hosting, GitHub Pages, Netlify, etc.)
4. Ouvrez l'URL hébergée dans votre navigateur

**Recommandation**: Pour une meilleure expérience, hébergez votre application pour que plusieurs utilisateurs puissent y accéder.

## 🌟 Particularités

- **Sudoku identique pour tous** : La génération déterministe garantit que tous les joueurs ont le même puzzle
- **Compétition quotidienne** : Comparez votre temps avec les joueurs du monde entier
- **Même sudoku pour tous** : Toute personne jouant le même jour aura le même puzzle
- **Génération déterministe** : La date du jour sert de "graine" pour générer le sudoku

---

Créé avec ❤️ pour les amateurs de Sudoku
