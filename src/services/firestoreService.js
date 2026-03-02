import { db } from "../firebase.js";
import { collection, addDoc, updateDoc, doc, onSnapshot, query, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const COLLECTION_NAME = "companies";

export const subscribeToCompanies = (callback) => {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const addCompany = async (data) => {
  await addDoc(collection(db, COLLECTION_NAME), { ...data, vehiculos: [] });
};

export const addVehicleToCompany = async (companyId, v) => {
  const ref = doc(db, COLLECTION_NAME, companyId);
  const vNew = { 
    id: Date.now(), nombre: v.nombre, horometroTotal: parseFloat(v.horometroInicial), 
    ultimoServiceHoras: parseFloat(v.horometroInicial), operativo: true, eventos: [] 
  };
  await updateDoc(ref, { vehiculos: arrayUnion(vNew) });
};

export const updateCompanyVehicles = async (id, vehs) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), { vehiculos: vehs });
};
