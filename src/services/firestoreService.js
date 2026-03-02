/**
 * firestoreService.js
 */
window.firestoreService = {
    subscribeToCompanies: (callback) => {
        if (!window.fb) return;
        const q = window.fb.query(window.fb.collection(window.db, "companies"));
        return window.fb.onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(data);
        });
    },
    addCompany: async (data) => {
        await window.fb.addDoc(window.fb.collection(window.db, "companies"), { ...data, vehiculos: [] });
    },
    addVehicleToCompany: async (companyId, v) => {
        const ref = window.fb.doc(window.db, "companies", companyId);
        const vNew = { 
            id: Date.now(), 
            nombre: v.nombre, 
            horometroTotal: parseFloat(v.horometroInicial), 
            ultimoServiceHoras: parseFloat(v.horometroInicial), 
            operativo: true, 
            eventos: [] 
        };
        await window.fb.updateDoc(ref, { vehiculos: window.fb.arrayUnion(vNew) });
    },
    updateCompanyVehicles: async (id, vehs) => {
        await window.fb.updateDoc(window.fb.doc(window.db, "companies", id), { vehiculos: vehs });
    }
};
