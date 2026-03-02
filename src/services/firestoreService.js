import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  arrayUnion 
} from "firebase/firestore";

/**
 * SERVICIOS DE FIRESTORE
 * Funciones para CRUD de Empresas, Vehículos y Eventos
 */

const COLLECTION_NAME = "companies";

// Suscripción en tiempo real a las empresas
export const subscribeToCompanies = (callback) => {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (snapshot) => {
    const companies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(companies);
  });
};

// Crear una nueva empresa
export const addCompany = async (companyData) => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      ...companyData,
      fechaAlta: new Date().toLocaleDateString(),
      vehiculos: []
    });
  } catch (error) {
    console.error("Error al añadir empresa:", error);
  }
};

// Agregar un vehículo a una empresa
export const addVehicleToCompany = async (companyId, vehicleData) => {
  const companyRef = doc(db, COLLECTION_NAME, companyId);
  const initialHoras = parseFloat(vehicleData.horometroInicial);
  
  const newVehicle = {
    id: Date.now(), // ID interno para el array
    nombre: vehicleData.nombre,
    fechaAlta: new Date().toLocaleDateString(),
    horometroTotal: initialHoras,
    ultimoServiceHoras: initialHoras, 
    operativo: true,
    motivoBaja: '',
    eventos: [{
      id: Date.now() + 1,
      tipo: 'ALTA',
      fecha: new Date().toLocaleDateString(),
      horas: initialHoras,
      nota: 'Registro Inicial'
    }]
  };

  try {
    await updateDoc(companyRef, {
      vehiculos: arrayUnion(newVehicle)
    });
  } catch (error) {
    console.error("Error al añadir vehículo:", error);
  }
};

// Actualizar vehículos (para registros diarios, services o bajas)
export const updateCompanyVehicles = async (companyId, updatedVehicles) => {
  const companyRef = doc(db, COLLECTION_NAME, companyId);
  try {
    await updateDoc(companyRef, {
      vehiculos: updatedVehicles
    });
  } catch (error) {
    console.error("Error al actualizar vehículos:", error);
  }
};
