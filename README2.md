# 🚀 Guide de Déploiement - Sudoku Quotidien

Ce guide explique comment mettre en ligne votre site Sudoku Quotidien étape par étape.

---

## 📋 Pré-requis

- Un compte Firebase (gratuit)
- Un compte sur une plateforme d'hébergement (GitHub, Netlify, ou Vercel)
- Les fichiers du projet prêts

---

## 🔥 Étape 1 : Configuration Firebase

### 1.1 Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur **"Ajouter un projet"**
3. Donnez un nom à votre projet (ex: "sudoku-quotidien")
4. Désactivez Google Analytics (optionnel)
5. Cliquez sur **"Créer le projet"**

### 1.2 Configurer Realtime Database

1. Dans le menu de gauche, cliquez sur **"Realtime Database"**
2. Cliquez sur **"Créer une base de données"**
3. Choisissez une localisation (ex: `europe-west1`)
4. Sélectionnez **"Démarrer en mode test"** (vous pourrez sécuriser plus tard)
5. Cliquez sur **"Activer"**

### 1.3 Configurer les règles de sécurité

Dans l'onglet **"Règles"** de Realtime Database, remplacez par :

```json
{
  "rules": {
    "scores": {
      "$date": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Cliquez sur **"Publier"**.

### 1.4 Récupérer la configuration

1. Allez dans **Paramètres du projet** (⚙️ en haut à gauche)
2. Descendez jusqu'à **"Vos applications"**
3. Cliquez sur l'icône **Web** `</>`
4. Donnez un nom à votre app (ex: "sudoku-web")
5. Cochez **"Configurer aussi Firebase Hosting"** si vous voulez utiliser Firebase Hosting
6. Cliquez sur **"Enregistrer l'application"**
7. **Copiez la configuration Firebase** qui ressemble à :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "votre-projet.firebaseapp.com",
  databaseURL: "https://votre-projet-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "votre-projet",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

### 1.5 Modifier firebase-config.js

Ouvrez le fichier `firebase-config.js` et remplacez la configuration par la vôtre :

```javascript
// Configuration Firebase
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT.firebaseapp.com",
  databaseURL: "https://VOTRE_PROJECT-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "VOTRE_PROJECT",
  storageBucket: "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_MESSAGING_ID",
  appId: "VOTRE_APP_ID"
};

// Reste du code...
```

---

## 🌐 Étape 2 : Choisir une méthode de déploiement

### Option A : GitHub Pages (Recommandé - Gratuit)

#### 2.1 Préparer les fichiers

Assurez-vous d'avoir ces fichiers :
- `index.html`
- `script-fixed.js`
- `styles-new.css`
- `firebase-config.js` (avec votre configuration Firebase)

**Note :** Ces fichiers sont prêts à être déployés tels quels. L'`index.html` les référence correctement.

#### 2.2 Créer un compte GitHub

1. Allez sur [github.com](https://github.com)
2. Créez un compte gratuit si vous n'en avez pas

#### 2.3 Créer un dépôt

1. Cliquez sur **"New repository"**
2. Nom du dépôt : `sudoku-quotidien` (ou autre nom)
3. Choisissez **"Public"**
4. Cochez **"Add a README file"**
5. Cliquez sur **"Create repository"**

#### 2.4 Upload les fichiers

1. Dans votre dépôt, cliquez sur **"Add file" > "Upload files"**
2. Glissez tous vos fichiers (HTML, CSS, JS)
3. Cliquez sur **"Commit changes"**

#### 2.5 Activer GitHub Pages

1. Allez dans **Settings** (onglet en haut)
2. Dans le menu de gauche, cliquez sur **Pages**
3. Source : sélectionnez **"Deploy from a branch"**
4. Branch : sélectionnez **"main"** et **"/ (root)"**
5. Cliquez sur **"Save"**

#### 2.6 Accéder à votre site

Attendez 1-2 minutes, puis votre site sera disponible à :
```
https://VOTRE-USERNAME.github.io/sudoku-quotidien/
```

---

### Option B : Netlify (Très simple - Gratuit)

#### 2.1 Créer un compte

1. Allez sur [netlify.com](https://www.netlify.com/)
2. Inscrivez-vous gratuitement

#### 2.2 Déployer par glisser-déposer

1. Sur le tableau de bord, vous verrez **"Want to deploy a new site without connecting to Git?"**
2. Glissez-déposez **tous vos fichiers** dans la zone
3. Attendez quelques secondes

#### 2.3 Personnaliser le nom

1. Cliquez sur **"Site settings"**
2. Cliquez sur **"Change site name"**
3. Choisissez un nom : `mon-sudoku-quotidien` → `mon-sudoku-quotidien.netlify.app`

Votre site est en ligne ! 🎉

---

### Option C : Vercel (Moderne - Gratuit)

#### 2.1 Créer un compte

1. Allez sur [vercel.com](https://vercel.com/)
2. Inscrivez-vous avec GitHub

#### 2.2 Créer un nouveau projet

1. Cliquez sur **"Add New" > "Project"**
2. Importez votre dépôt GitHub OU
3. Utilisez **"Deploy from template"** et uploadez vos fichiers

#### 2.3 Configurer

- Framework Preset : **"Other"** (site statique)
- Cliquez sur **"Deploy"**

Votre site sera en ligne en quelques secondes !

---

## ✅ Étape 3 : Vérification

### 3.1 Tester le site

1. Ouvrez votre site dans un navigateur
2. Vérifiez que le Sudoku se charge correctement
3. Jouez une partie complète
4. Entrez votre nom dans le leaderboard
5. Vérifiez que votre score apparaît

### 3.2 Vérifier Firebase

1. Retournez dans [Firebase Console](https://console.firebase.google.com/)
2. Ouvrez **"Realtime Database"**
3. Vous devriez voir vos données sous `scores/DATE/`

---

## 🎨 Étape 4 : Personnalisation (Optionnel)

### 4.1 Nom de domaine personnalisé

**GitHub Pages :**
- Settings > Pages > Custom domain

**Netlify :**
- Site settings > Domain management > Add custom domain

**Vercel :**
- Project settings > Domains > Add

### 4.2 HTTPS

Toutes ces plateformes activent HTTPS automatiquement (nécessaire pour Firebase).

---

## 🔒 Étape 5 : Sécuriser Firebase (Recommandé)

Une fois votre site en ligne, sécurisez votre base de données :

```json
{
  "rules": {
    "scores": {
      "$date": {
        ".read": true,
        "$scoreId": {
          ".write": "!data.exists() && newData.child('name').isString() && newData.child('name').val().length >= 2 && newData.child('name').val().length <= 10 && newData.child('time').isNumber() && newData.child('hints').isNumber() && newData.child('errors').isNumber() && newData.child('timestamp').isNumber()"
        }
      }
    }
  }
}
```

Ces règles permettent :
- ✅ Lecture publique du classement
- ✅ Écriture uniquement pour nouveaux scores valides
- ✅ Nom entre 2 et 10 caractères
- ✅ Validation des types de données (time, hints, errors, timestamp)
- ❌ Modification de scores existants
- ❌ Noms trop courts ou trop longs

---

## 📊 Étape 6 : Suivi (Optionnel)

### Google Analytics

1. Créez un compte [Google Analytics](https://analytics.google.com/)
2. Créez une propriété
3. Copiez le code de suivi
4. Ajoutez-le dans `<head>` de `index.html`

---

## 🐛 Dépannage

### Le Sudoku ne se charge pas

✅ Vérifiez que tous les fichiers sont bien uploadés
✅ Ouvrez la console du navigateur (F12) pour voir les erreurs
✅ Vérifiez les chemins dans `index.html` (script-fixed.js, styles-new.css, firebase-config.js)

### Le leaderboard ne fonctionne pas

✅ Vérifiez votre configuration Firebase dans `firebase-config.js`
✅ Vérifiez que Realtime Database est activée
✅ Vérifiez les règles de sécurité
✅ Vérifiez que l'URL de la database est correcte
✅ Assurez-vous que votre site utilise HTTPS

### Erreur CORS

Firebase nécessite que votre site soit hébergé (pas en local).
Les options ci-dessus (GitHub Pages, Netlify, Vercel) résolvent ce problème.

---

## 📱 Bonus : Rendre le site responsive

Le site est déjà adapté aux mobiles grâce au CSS responsive inclus.

---

## 🎉 C'est tout !

Votre Sudoku Quotidien est maintenant en ligne ! Partagez le lien avec vos amis et défiez-les chaque jour ! 🏆

**Questions ?** Consultez la documentation :
- [Firebase Docs](https://firebase.google.com/docs)
- [GitHub Pages Docs](https://docs.github.com/pages)
- [Netlify Docs](https://docs.netlify.com)
- [Vercel Docs](https://vercel.com/docs)
