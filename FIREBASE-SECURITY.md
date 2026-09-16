# Configuration Firebase Sécurisée

## ℹ️ À propos des clés Firebase Frontend

**Les clés API Firebase pour le frontend sont publiques par design.**

- ✅ Ces clés sont faites pour être exposées dans le code client
- ✅ La vraie sécurité vient des **règles Firebase** dans la console
- ✅ Tous les sites web utilisant Firebase exposent ces clés
- ✅ Ce ne sont PAS des clés admin (pas d'accès privilégié)

**Source officielle** : [Firebase Documentation](https://firebase.google.com/docs/projects/api-keys)

> "Unlike how API keys are typically used, API keys for Firebase services are not used to control access to backend resources; that can only be done with Firebase Security Rules."

## ⚠️ Ce qu'il faut vraiment protéger

- ❌ **Service Account Keys** (clés admin backend) - NE JAMAIS committer!
- ❌ **Variables d'environnement sensibles** (.env avec secrets)
- ✅ **Clés Firebase frontend** (apiKey, etc.) - OK pour Git

## Instructions de Configuration

**Pour un site statique (GitHub Pages, Netlify, etc.)** :

1. **Mettez vos clés Firebase dans `firebase-config.js`**
2. **Configurez les règles de sécurité dans la Console Firebase** (voir GUIDE-FIREBASE.md)
3. **Commitez et pushez** : vos règles Firebase protègent votre base

**Pour un projet privé sensible** :

1. Créez `firebase-config.local.js` avec vos clés
2. Ajoutez-le à `.gitignore`  
3. Utilisez `firebase-config.js` avec des placeholders pour Git

## 🔒 Vraie Sécurité = Règles Firebase

La protection de votre base de données se fait dans la Console Firebase avec des règles comme :

```json
{
  "rules": {
    "scores": {
      "$date": {
        ".read": true,
        "$difficulty": {
          "$scoreId": {
            ".write": true,
            ".validate": "newData.hasChildren(['name', 'time', 'difficulty'])"
          },
          ".indexOn": ["time"]
        }
      }
    }
  }
}
```

Ces règles empêchent :
- ✅ Écriture en dehors de `/scores/`
- ✅ Données invalides (sans nom ou temps)
- ✅ Abus et spam

## Protection Additionnelle

**Limiter les domaines autorisés** (recommandé) :

1. Console Firebase → **Paramètres du projet**
2. Section **Clés d'API** → Restrictions
3. Ajoutez votre domaine (ex: `votre-site.github.io`)
4. Cela empêche l'utilisation de vos clés sur d'autres sites

**App Check** (optionnel pour anti-spam) :

Firebase App Check peut limiter les abus en vérifiant que les requêtes viennent de votre app légitime.
