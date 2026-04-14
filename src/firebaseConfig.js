import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, query, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Credenciales de tu proyecto
const firebaseConfig = {
    apiKey: "AIzaSyA_RnRMxTrKDcNtyLfPRxHxVpqnKhTFemQ",
    authDomain: "service-ind.firebaseapp.com",
    projectId: "service-ind",
    storageBucket: "service-ind.firebasestorage.app",
    messagingSenderId: "659187337339",
    appId: "1:659187337339:web:ad95e28d129883de4dfade"
};

// Inicialización
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ID DEFINITIVO PARA PERSISTENCIA TOTAL
const APP_ID = "bnd-pro-definitive-v99";

// Autenticación automática anónima
const initAuth = async () => {
    try {
        await signInAnonymously(auth);
        window.dispatchEvent(new Event('firebase-ready'));
    } catch (e) {
        console.error("Error de Autenticación en Firebase:", e);
    }
};

initAuth();

// Exportamos todo para que App.jsx lo pueda consumir
export { 
    db, 
    auth, 
    APP_ID, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    doc, 
    arrayUnion, 
    query, 
    setDoc, 
    getDoc, 
    deleteDoc 
};
