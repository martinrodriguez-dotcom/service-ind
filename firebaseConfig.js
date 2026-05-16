// Importaciones de Firebase Modular (Versión 9/10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    arrayUnion,
    enableIndexedDbPersistence // <-- LA MAGIA DEL MODO OFFLINE
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    updatePassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. CONFIGURACIÓN DE TU PROYECTO
// (⚠️ Reemplaza esto con los datos de tu Firebase real)
const firebaseConfig = {
    apiKey: "AIzaSyTu_API_KEY_AQUI...",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// CONSTANTES GLOBALES DE LA APP
const APP_ID = "bnd_control_activos"; // ID de tu estructura en Firebase
const FIREBASE_API_KEY = firebaseConfig.apiKey;

// 2. INICIALIZACIÓN
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 3. ACTIVACIÓN DEL MODO OFFLINE AVANZADO
enableIndexedDbPersistence(db)
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn("⚠️ BND Offline: Múltiples pestañas abiertas. La persistencia solo funciona en una.");
      } else if (err.code == 'unimplemented') {
          console.warn("⚠️ BND Offline: Tu navegador actual no soporta almacenamiento offline.");
      }
  });

// 4. EXPORTACIÓN AL ENTORNO GLOBAL (Para que React lo consuma sin empaquetadores complejos)
window.db = db;
window.auth = auth;
window.APP_ID = APP_ID;
window.FIREBASE_API_KEY = FIREBASE_API_KEY;

// Empaquetamos los métodos de Firebase en un objeto global para mantener App.jsx limpio
window.fb = {
    doc,
    collection,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    arrayUnion,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword
};

// 5. DISPARADOR DE LISTO
// Avisa a la aplicación React que la base de datos ya está viva y (ahora) con soporte offline.
window.dispatchEvent(new Event('firebase-ready'));
