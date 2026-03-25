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

// Configuration Firebase pour le site en ligne
// Note: Ces clés sont sécurisées par les règles Firebase dans la console
const firebaseConfig = {
  apiKey: "AIzaSyCM7fDi1IJraLuPcbxTZihFG1LerTmHxIs",
  authDomain: "sudoo-a3714.firebaseapp.com",
  databaseURL: "https://sudoo-a3714-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sudoo-a3714",
  storageBucket: "sudoo-a3714.firebasestorage.app",
  messagingSenderId: "548895008144",
  appId: "1:548895008144:web:22810c005302a80a133f15"
};

// Vérifier si Firebase est configuré
function isFirebaseConfigured() {
    return firebaseConfig.apiKey && 
           firebaseConfig.apiKey !== "VOTRE_API_KEY" && 
           firebaseConfig.apiKey.length > 20;
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
