// Configuration Firebase pour le Sudoku Quotidien
// 
// INSTRUCTIONS POUR CONFIGURER FIREBASE:
// 
// 1. Allez sur https://console.firebase.google.com/
// 2. Créez un nouveau projet (ou utilisez un projet existant)
// 3. Dans les paramètres du projet, ajoutez une application Web
// 4. Copiez les informations de configuration ci-dessous
// 5. Dans Firebase Console, allez dans "Realtime Database" et créez une base de données
// 6. Configurez les règles de sécurité (voir ci-dessous)
// 
// RÈGLES DE SÉCURITÉ FIREBASE RECOMMANDÉES:
// {
//   "rules": {
//     "scores": {
//       "$date": {
//         ".read": true,
//         ".write": true,
//         ".indexOn": ["time"]
//       }
//     }
//   }
// }

// IMPORTANT: Remplacez ces valeurs par vos propres clés Firebase
// Ne commitez JAMAIS vos vraies clés API dans un dépôt public!
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://VOTRE_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

// Vérifier si Firebase est configuré
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "VOTRE_API_KEY" && 
           firebaseConfig.databaseURL !== "VOTRE_DATABASE_URL";
}

// Initialiser Firebase
function initFirebase() {
    try {
        if (!isFirebaseConfigured()) {
            console.warn("Firebase n'est pas configuré. Le classement ne sera pas disponible.");
            return null;
        }
        
        if (typeof firebase === 'undefined') {
            console.warn("Firebase SDK non chargé.");
            return null;
        }
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        return firebase.database();
    } catch (error) {
        console.error("Erreur lors de l'initialisation de Firebase:", error);
        return null;
    }
}

// EXEMPLE DE CONFIGURATION (À REMPLACER PAR VOS PROPRES VALEURS):
// 
// const firebaseConfig = {
//     apiKey: "VOTRE_API_KEY_ICI",
//     authDomain: "votre-projet.firebaseapp.com",
//     databaseURL: "https://votre-projet-default-rtdb.firebaseio.com",
//     projectId: "votre-projet",
//     storageBucket: "votre-projet.appspot.com",
//     messagingSenderId: "VOTRE_SENDER_ID",
//     appId: "VOTRE_APP_ID"
// };
