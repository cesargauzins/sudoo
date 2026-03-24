# Configuration Firebase Sécurisée

## ⚠️ IMPORTANT - Sécurité

**NE JAMAIS** committer vos vraies clés API Firebase dans un dépôt Git public!

## Instructions de Configuration

1. **Copiez le fichier de configuration**:
   ```bash
   cp firebase-config.js firebase-config.local.js
   ```

2. **Modifiez `firebase-config.local.js`** avec vos vraies clés Firebase obtenues depuis:
   - https://console.firebase.google.com/
   - Paramètres du projet > Applications Web

3. **Mettez à jour `index.html`** pour utiliser votre fichier local:
   ```html
   <script src="firebase-config.local.js"></script>
   ```

4. Le fichier `firebase-config.local.js` est déjà dans `.gitignore` et ne sera pas commité.

## Rotation des Clés Compromises

Si vos clés ont été exposées publiquement:

1. Allez dans la [Console Firebase](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Allez dans **Paramètres du projet** > **Clés d'API**
4. Supprimez l'ancienne clé et créez-en une nouvelle
5. Mettez à jour votre fichier `firebase-config.local.js`

## Alternative: Variables d'Environnement

Pour une meilleure sécurité en production, utilisez des variables d'environnement et un outil de build comme Vite, Webpack, ou Parcel.
