/**
 * SERVICIOS DE FIRESTORE - SERVICEPRO EAM
 * Versión de inyección directa para navegadores (sin npm/console).
 */

const COLLECTION_NAME = "companies";

const firestoreService = {
  // 1. Suscripción en tiempo real a las empresas
  subscribeToCompanies: (callback) => {
    try {
      // Usamos las funciones del global window.fb
      const q = window.fb.query(window.fb.collection(window.db, COLLECTION_NAME));
      
      return window.fb.onSnapshot(q, (snapshot) => {
        const companies = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(companies);
      });
    } catch (error) {
      console.error("Error en suscripción Firestore:", error);
    }
  },

  // 2. Crear una nueva empresa
  addCompany: async (companyData) => {
    try {
      await window.fb.addDoc(window.fb.collection(window.db, COLLECTION_NAME), {
        ...companyData,
        fechaAlta: new Date().toLocaleDateString(),
        vehiculos: []
      });
    } catch (error) {
      console.error("Error al añadir empresa:", error);
      alert("Error de conexión con Firebase.");
    }
  },

  // 3. Agregar un vehículo a una empresa
  addVehicleToCompany: async (companyId, vehicleData) => {
    const companyRef = window.fb.doc(window.db, COLLECTION_NAME, companyId);
    const initialHoras = parseFloat(vehicleData.horometroInicial) || 0;
    
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
      await window.fb.updateDoc(companyRef, {
        vehiculos: window.fb.arrayUnion(newVehicle)
      });
    } catch (error) {
      console.error("Error al añadir vehículo:", error);
    }
  },

  // 4. Actualizar vehículos (Cargas, bajas o services)
  updateCompanyVehicles: async (companyId, updatedVehicles) => {
    const companyRef = window.fb.doc(window.db, COLLECTION_NAME, companyId);
    try {
      await window.fb.updateDoc(companyRef, {
        vehiculos: updatedVehicles
      });
    } catch (error) {
      console.error("Error al actualizar vehículos:", error);
    }
  }
};

// --- REGISTRO GLOBAL ---
// Esto permite que App.js vea las funciones mediante window.firestoreService
window.firestoreService = firestoreService;
