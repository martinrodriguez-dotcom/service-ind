import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_RnRMxTrKDcNtyLfPRxHxVpqnKhTFemQ",
  authDomain: "service-ind.firebaseapp.com",
  projectId: "service-ind",
  storageBucket: "service-ind.firebasestorage.app",
  messagingSenderId: "659187337339",
  appId: "1:659187337339:web:ad95e28d129883de4dfade"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
