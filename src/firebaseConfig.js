import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, query, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyA_RnRMxTrKDcNtyLfPRxHxVpqnKhTFemQ",
    authDomain: "service-ind.firebaseapp.com",
    projectId: "service-ind",
    storageBucket: "service-ind.firebasestorage.app",
    messagingSenderId: "659187337339",
    appId: "1:659187337339:web:ad95e28d129883de4dfade"
};

const app = initializeApp(firebaseConfig);

// Exponemos Firebase al entorno global para que App.jsx lo consuma
window.db = getFirestore(app);
window.auth = getAuth(app);
window.APP_ID = "bnd-pro-definitive-v99";
window.fb = { collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, query, setDoc, getDoc, deleteDoc, onAuthStateChanged };

const initAuth = async () => {
    try {
        await signInAnonymously(window.auth);
        window.dispatchEvent(new Event('firebase-ready'));
    } catch (e) {
        console.error("Error de Autenticación Firebase", e);
    }
};

initAuth();
