// Importamos los módulos directamente desde los servidores de Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * CONFIGURACIÓN GLOBAL DE FIREBASE
 * Reemplaza los valores con los de tu consola de Firebase (Project Settings)
 */
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializar la conexión con Google
const app = initializeApp(firebaseConfig);

// Exportar la base de datos para que firestoreService.js pueda usarla
export const db = getFirestore(app);

export default app;
