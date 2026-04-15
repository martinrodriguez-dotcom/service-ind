import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, query, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

// Exponemos la llave de API para la creación silenciosa de usuarios
window.FIREBASE_API_KEY = firebaseConfig.apiKey;

// Exponemos las herramientas al objeto global 'window'
window.db = getFirestore(app);
window.auth = getAuth(app);
window.APP_ID = "bnd-pro-definitive-v99";

window.fb = { 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    doc, 
    arrayUnion, 
    query, 
    setDoc, 
    getDoc, 
    deleteDoc, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updatePassword
};

window.dispatchEvent(new Event('firebase-ready'));
