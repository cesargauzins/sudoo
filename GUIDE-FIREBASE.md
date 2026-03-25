# 🔥 GUIDE COMPLET - Configuration Firebase Sécurisée

## ✅ Ce qui a été fait automatiquement:

1. ✅ `script.js` supprimé (n'était pas utilisé)
2. ✅ `index.html` modifié pour charger `firebase-config.local.js`
3. ✅ `firebase-config.local.js` créé avec un template
4. ✅ `.gitignore` configuré pour protéger vos clés

## 🚀 Vos étapes à suivre:

### 1️⃣ Créer le nouveau projet Firebase

1. Allez sur https://console.firebase.google.com/
2. Cliquez sur **"Ajouter un projet"**
3. Nom: `sudoku-quotidien` (ou autre)
4. Désactivez Google Analytics
5. **"Créer le projet"**

### 2️⃣ Configurer Realtime Database

1. Menu gauche → **"Realtime Database"**
2. **"Créer une base de données"**
3. Emplacement: **Europe** (ou proche de vous)
4. Mode: **"Mode test"** pour commencer
5. **"Activer"**

### 3️⃣ SÉCURISER la base (IMPORTANT!)

1. Onglet **"Règles"** dans Realtime Database
2. Remplacez par:

```json
{
  "rules": {
    "scores": {
      "$date": {
        ".read": true,
        "$scoreId": {
          ".write": true,
          ".validate": "newData.hasChildren(['name', 'time'])"
        },
        ".indexOn": ["time"]
      }
    }
  }
}
```

3. **"Publier"**

### 4️⃣ Obtenir vos clés

1. ⚙️ **Paramètres du projet**
2. Section **"Vos applications"**
3. Cliquez sur **</>** (icône Web)
4. Surnom: "Sudoku Web"
5. **"Enregistrer l'application"**
6. **COPIEZ** toute la configuration affichée

### 5️⃣ Coller vos clés dans le bon fichier

1. Ouvrez `firebase-config.local.js`
2. Remplacez les valeurs par vos VRAIES clés copiées
3. Sauvegardez le fichier

### 6️⃣ Tester

1. Ouvrez `index.html` dans votre navigateur
2. Jouez au Sudoku
3. Vérifiez que le classement fonctionne
4. Dans la console Firebase, vérifiez que les scores apparaissent dans `/scores/`

## 🔒 Sécurité garantie:

- ✅ `firebase-config.local.js` N'EST PAS dans Git (protégé par `.gitignore`)
- ✅ `firebase-config.js` contient seulement des placeholders
- ✅ Les règles Firebase limitent les abus
- ✅ Aucun secret ne sera jamais committé

## ❓ Problème?

Si le classement ne s'affiche pas:
1. Ouvrez la Console du navigateur (F12)
2. Regardez les erreurs
3. Vérifiez que vous avez bien modifié `firebase-config.local.js` avec VOS vraies clés
