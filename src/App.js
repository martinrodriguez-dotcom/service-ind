const { useState, useMemo, useEffect } = React;
const { 
  LayoutDashboard, Building2, Plus, AlertTriangle, Truck, 
  CheckCircle2, Wrench, Activity, ChevronLeft, Clock, Hash, 
  DollarSign, Moon, Sun, FileDown, User, AlertCircle, QrCode
} = lucide;

const App = () => {
  const [companies, setCompanies] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  
  // Modales
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  useEffect(() => {
    if (window.firestoreService) {
      const unsubscribe = window.firestoreService.subscribeToCompanies((data) => {
        setCompanies(data);
      });
      return () => unsubscribe();
    }
  }, []);

  const alerts = useMemo(() => {
    let allAlerts = [];
    companies.forEach(c => {
      (c.vehiculos || []).forEach(v => {
        const hsRestantes = 250 - (v.horometroTotal - v.ultimoServiceHoras);
        if (hsRestantes < 50) {
          allAlerts.push({ ...v, empresaNombre: c.nombre, hsRestantes });
        }
      });
    });
    return allAlerts.sort((a, b) => a.hsRestantes - b.hsRestantes);
  }, [companies]);

  // Acceso seguro a componentes externos
  const { Modal, CompanyFormContent, VehicleFormContent } = window.GuantesForms || {};

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-900 p-6 flex flex-col gap-8 bg-slate-950">
        <div className="flex items-center gap-3">
            <div className="bg-orange-600 p-2 rounded-xl"><Wrench size={24} /></div>
            <h1 className="text-xl font-black uppercase tracking-tighter">ServicePro</h1>
        </div>
        <nav className="flex flex-col gap-2">
            <button onClick={() => {setActiveTab('dashboard'); setSelectedCompany(null);}} 
                className={`p-4 rounded-2xl flex items-center gap-4 font-bold ${activeTab === 'dashboard' ? 'bg-orange-600' : 'text-slate-500'}`}>
                <LayoutDashboard /> Dashboard
            </button>
            <button onClick={() => {setActiveTab('companies'); setSelectedCompany(null);}} 
                className={`p-4 rounded-2xl flex items-center gap-4 font-bold ${activeTab === 'companies' ? 'bg-orange-600' : 'text-slate-500'}`}>
                <Building2 /> Empresas
            </button>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="max-w-4xl mx-auto space-y-10">
            <h2 className="text-5xl font-black">Dashboard de Alertas</h2>
            <div className="grid gap-4">
              {alerts.map((a, i) => (
                <div key={i} className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 flex justify-between items-center">
                   <div>
                      <p className="text-2xl font-black">{a.nombre}</p>
                      <p className="text-slate-500 font-bold uppercase text-xs">{a.empresaNombre}</p>
                   </div>
                   <div className="text-right font-black text-3xl text-orange-500">{a.hsRestantes.toFixed(0)} HS</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'companies' && !selectedCompany && (
           <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                 <h2 className="text-5xl font-black">Directorio</h2>
                 <button onClick={() => setShowCompanyForm(true)} className="bg-orange-600 px-6 py-3 rounded-xl font-black">+ EMPRESA</button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {companies.map(emp => (
                  <button key={emp.id} onClick={() => setSelectedCompany(emp)} className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-left hover:border-orange-600 transition-all">
                    <h3 className="text-2xl font-black">{emp.nombre}</h3>
                    <p className="text-slate-500 font-bold text-xs uppercase">Equipos: {emp.vehiculos?.length || 0}</p>
                  </button>
                ))}
              </div>
           </div>
        )}

        {selectedCompany && (
           <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right">
              <button onClick={() => setSelectedCompany(null)} className="text-slate-500 font-black flex items-center gap-2 uppercase text-xs tracking-widest"><ChevronLeft/> Volver</button>
              <h2 className="text-6xl font-black">{selectedCompany.nombre}</h2>
              <button onClick={() => setShowVehicleForm(true)} className="bg-orange-600 px-6 py-3 rounded-xl font-black">NUEVO EQUIPO</button>
              <div className="space-y-4">
                {(selectedCompany.vehiculos || []).map(v => (
                  <div key={v.id} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-800 rounded-xl"><Truck/></div>
                        <p className="text-xl font-black">{v.nombre} - <span className="text-orange-500">{v.horometroTotal} hs</span></p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}
      </main>

      {/* MODALES DINÁMICOS */}
      {showCompanyForm && Modal && (
          <Modal title="Alta Empresa" onClose={() => setShowCompanyForm(false)} darkMode={true}>
              <CompanyFormContent onSubmit={async(d) => { await window.firestoreService.addCompany(d); setShowCompanyForm(false); }} />
          </Modal>
      )}

      {showVehicleForm && Modal && (
          <Modal title="Vincular Equipo" onClose={() => setShowVehicleForm(false)} darkMode={true}>
              <VehicleFormContent onSubmit={async(d) => { await window.firestoreService.addVehicleToCompany(selectedCompany.id, d); setShowVehicleForm(false); }} />
          </Modal>
      )}
    </div>
  );
};

// EXPORTACIÓN AL OBJETO GLOBAL
window.App = App;
