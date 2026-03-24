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

const firebaseConfig = {
  apiKey: "AIzaSyC0QWx7sXzRP9GjxAZUfQG8NCrk248Mk6A",
  authDomain: "sudoo-38033.firebaseapp.com",
  databaseURL: "https://sudoo-38033-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sudoo-38033",
  storageBucket: "sudoo-38033.firebasestorage.app",
  messagingSenderId: "876407813860",
  appId: "1:876407813860:web:fd78f7543d61cf147f1ef1"
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
//     apiKey: "AIzaSyAbc123def456ghi789jkl012mno345pqr",
//     authDomain: "sudoku-quotidien.firebaseapp.com",
//     databaseURL: "https://sudoku-quotidien-default-rtdb.firebaseio.com",
//     projectId: "sudoku-quotidien",
//     storageBucket: "sudoku-quotidien.appspot.com",
//     messagingSenderId: "123456789012",
//     appId: "1:123456789012:web:abc123def456ghi789"
// };
