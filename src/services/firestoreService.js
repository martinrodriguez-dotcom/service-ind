// Importamos la base de datos usando la ruta absoluta desde la raíz
import { db } from "/src/firebase.js";

// Importamos las funciones directamente de los servidores de Google para evitar errores de compilación
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * SERVICIOS DE FIRESTORE - SERVICEPRO EAM
 * Lógica de persistencia de datos en la nube.
 */

const COLLECTION_NAME = "companies";

// Suscripción en tiempo real a las empresas
export const subscribeToCompanies = (callback) => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(q, (snapshot) => {
      const companies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(companies);
    });
  } catch (error) {
    console.error("Error en suscripción Firestore:", error);
  }
};

// Crear una nueva empresa en el sistema
export const addCompany = async (companyData) => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      ...companyData,
      fechaAlta: new Date().toLocaleDateString(),
      vehiculos: []
    });
  } catch (error) {
    console.error("Error al añadir empresa:", error);
    alert("Error de escritura en Firebase. Revisa las Reglas de Seguridad.");
  }
};

// Agregar un vehículo a una empresa específica
export const addVehicleToCompany = async (companyId, vehicleData) => {
  const companyRef = doc(db, COLLECTION_NAME, companyId);
  const initialHoras = parseFloat(vehicleData.horometroInicial);
  
  const newVehicle = {
    id: Date.now(), 
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

// Actualizar el array de vehículos (Cargas diarias, Services, Bajas)
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
