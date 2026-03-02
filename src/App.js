// --- ACCESO A REACT Y LIBRERÍAS (Ya cargadas en index.html) ---
const { useState, useMemo, useEffect } = React;
// Lucide se accede mediante el objeto global 'lucide'
const { 
  Menu, X, LayoutDashboard, Building2, Plus, AlertTriangle, Truck, 
  CheckCircle2, Wrench, Activity, ChevronLeft, Clock, Hash, 
  DollarSign, Moon, Sun, FileDown, User, AlertCircle, QrCode
} = lucide;

const App = () => {
  // --- ESTADOS DE SISTEMA ---
  const [companies, setCompanies] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  
  // Modales
  const [showLogForm, setShowLogForm] = useState(null); 
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(null); 
  const [showDowntimeForm, setShowDowntimeForm] = useState(null);

  // --- CONEXIÓN CON EL SERVICIO (window.firestoreService) ---
  useEffect(() => {
    if (window.firestoreService) {
      const unsubscribe = window.firestoreService.subscribeToCompanies((data) => {
        setCompanies(data);
      });
      return () => unsubscribe();
    }
  }, []);

  // --- LÓGICA DE ALERTAS (Mantenimiento cada 250hs) ---
  const alerts = useMemo(() => {
    let allAlerts = [];
    companies.forEach(c => {
      (c.vehiculos || []).forEach(v => {
        const hsConsumidas = v.horometroTotal - v.ultimoServiceHoras;
        const hsRestantes = 250 - hsConsumidas;
        if (hsRestantes < 50) {
          allAlerts.push({
            ...v,
            empresaNombre: c.nombre,
            empresaId: c.id,
            hsRestantes,
            progress: (hsRestantes / 250) * 100
          });
        }
      });
    });
    return allAlerts.sort((a, b) => a.hsRestantes - b.hsRestantes);
  }, [companies]);

  // --- HANDLERS ---
  const handleToggleOperativo = async (companyId, vehicleId, currentStatus) => {
    if (currentStatus) {
      setShowDowntimeForm({ companyId, vehicleId });
    } else {
      const company = companies.find(c => c.id === companyId);
      const updatedVehicles = company.vehiculos.map(v => v.id === vehicleId ? {
        ...v, operativo: true, motivoBaja: '',
        eventos: [...v.eventos, { id: Date.now(), tipo: 'ALTA', fecha: new Date().toLocaleDateString(), nota: 'Vuelta a servicio' }]
      } : v);
      await window.firestoreService.updateCompanyVehicles(companyId, updatedVehicles);
    }
  };

  // --- UI COMPONENTS (Simulando Guantes UI) ---
  const Card = ({ children, className = "" }) => (
    <div className={`rounded-[2.5rem] border-2 p-8 transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'} ${className}`}>
      {children}
    </div>
  );

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* SIDEBAR */}
      <aside className={`w-72 border-r transition-colors ${darkMode ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} hidden lg:flex flex-col`}>
        <div className="p-8 border-b border-slate-900/50 flex items-center gap-3">
          <div className="bg-orange-600 p-2.5 rounded-2xl text-white shadow-lg shadow-orange-900/40"><Wrench size={24} /></div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">ServicePro</h1>
        </div>
        
        <nav className="p-6 flex-1 space-y-3">
          <button onClick={() => {setActiveTab('dashboard'); setSelectedCompany(null);}} 
            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all ${activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-slate-500 hover:bg-slate-900'}`}>
            <LayoutDashboard size={22}/> DASHBOARD
          </button>
          <button onClick={() => {setActiveTab('companies'); setSelectedCompany(null);}} 
            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all ${activeTab === 'companies' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-slate-500 hover:bg-slate-900'}`}>
            <Building2 size={22}/> EMPRESAS
          </button>
        </nav>

        <div className="p-6">
           <button onClick={() => setDarkMode(!darkMode)} className="w-full p-4 rounded-2xl bg-slate-900 flex justify-between items-center font-black text-xs uppercase tracking-widest border border-slate-800">
              <span className="flex items-center gap-2">{darkMode ? <Moon size={16}/> : <Sun size={16}/>} {darkMode ? 'Oscuro' : 'Claro'}</span>
              <div className={`w-10 h-6 rounded-full p-1 ${darkMode ? 'bg-orange-600' : 'bg-slate-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-4' : ''}`} />
              </div>
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-12 relative">
        
        {activeTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
            <header>
              <h2 className="text-5xl lg:text-7xl font-black tracking-tighter">Monitor de Alertas</h2>
              <p className="text-slate-500 font-bold border-l-4 border-orange-600 pl-4 mt-2">Mantenimiento preventivo requerido.</p>
            </header>

            <div className="grid gap-6">
              {alerts.map((alert, i) => (
                <button key={i} onClick={() => {
                  const company = companies.find(c => c.id === alert.empresaId);
                  setSelectedCompany(company);
                  setActiveTab('companies');
                }} className={`group p-8 rounded-[2.5rem] border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-6 text-left ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-orange-500' : 'bg-white border-slate-100 hover:border-orange-600'}`}>
                  <div className="flex items-center gap-6">
                    <div className="p-5 bg-orange-600/10 text-orange-600 rounded-3xl group-hover:bg-orange-600 group-hover:text-white transition-all"><AlertTriangle size={36}/></div>
                    <div>
                      <p className="text-3xl font-black tracking-tighter">{alert.nombre}</p>
                      <p className="text-slate-500 font-black uppercase text-xs tracking-widest flex items-center gap-2"><Building2 size={14}/> {alert.empresaNombre}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-orange-600">{alert.hsRestantes.toFixed(0)} HS</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PARA EL SERVICE</p>
                  </div>
                </button>
              ))}
              {alerts.length === 0 && (
                <div className="py-24 text-center border-4 border-dashed border-slate-900 rounded-[4rem]">
                   <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4 opacity-20"/>
                   <p className="text-slate-600 font-black uppercase tracking-widest">Operatividad Total</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'companies' && !selectedCompany && (
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex justify-between items-end border-b-4 border-slate-900 pb-10">
              <h2 className="text-6xl font-black tracking-tighter">Directorio</h2>
              <button onClick={() => setShowCompanyForm(true)} className="bg-orange-600 px-8 py-4 rounded-2xl font-black text-white hover:bg-orange-700 transition-all flex items-center gap-3 shadow-xl shadow-orange-900/20">
                <Plus/> NUEVA EMPRESA
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {companies.map(emp => (
                <button key={emp.id} onClick={() => setSelectedCompany(emp)} className={`p-10 rounded-[3.5rem] border-2 text-left group transition-all ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-orange-600' : 'bg-white border-slate-100 hover:border-orange-600 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-10">
                    <div className="p-6 bg-slate-950 rounded-[2rem] text-slate-500 group-hover:text-orange-500 transition-all"><Building2 size={42}/></div>
                    <div className="text-right">
                       <p className="text-4xl font-black">{emp.vehiculos?.length || 0}</p>
                       <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Equipos</p>
                    </div>
                  </div>
                  <h3 className="text-4xl font-black tracking-tighter mb-2">{emp.nombre}</h3>
                  <p className="text-slate-500 font-bold text-sm flex items-center gap-2 uppercase tracking-widest"><Hash size={14}/> CUIT: {emp.cuit}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCompany && (
           <div className="max-w-6xl mx-auto space-y-12 animate-in slide-in-from-right-10 duration-500">
              <button onClick={() => setSelectedCompany(null)} className="flex items-center gap-3 font-black text-slate-500 hover:text-orange-600 transition-all uppercase tracking-widest text-xs">
                <ChevronLeft size={24}/> VOLVER AL DIRECTORIO
              </button>
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 border-b-4 border-slate-900 pb-16">
                 <div>
                    <h2 className="text-7xl lg:text-8xl font-black tracking-tighter leading-none">{selectedCompany.nombre}</h2>
                    <div className="flex gap-4 mt-6">
                       <span className="px-6 py-3 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-black text-slate-500 flex items-center gap-2"><Hash size={14}/> {selectedCompany.cuit}</span>
                       <span className="px-6 py-3 bg-orange-600/10 rounded-2xl border border-orange-600/20 text-xs font-black text-orange-600 flex items-center gap-2"><User size={14}/> {selectedCompany.responsable || 'ADMIN'}</span>
                    </div>
                 </div>
                 <button onClick={() => setShowVehicleForm(true)} className="bg-orange-600 px-8 py-5 rounded-3xl font-black text-white flex items-center gap-3 shadow-2xl shadow-orange-900/40">
                    <Truck/> VINCULAR EQUIPO
                 </button>
              </div>

              <div className="grid gap-12 mt-16">
                 {(selectedCompany.vehiculos || []).map(veh => {
                    const hsRestantes = 250 - (veh.horometroTotal - veh.ultimoServiceHoras);
                    const progress = (hsRestantes / 250) * 100;
                    
                    return (
                      <Card key={veh.id} className="relative overflow-hidden group">
                         <div className={`absolute top-0 right-0 px-8 py-3 font-black text-[10px] uppercase tracking-[0.3em] ${veh.operativo ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'}`}>
                            {veh.operativo ? '● OPERATIVO' : '● PARADA TÉCNICA'}
                         </div>
                         
                         <div className="flex flex-col lg:flex-row justify-between gap-12">
                            <div className="space-y-8 flex-1">
                               <div className="flex items-center gap-6">
                                  <div className="p-5 bg-slate-950 rounded-[1.5rem] shadow-inner"><Truck size={42}/></div>
                                  <div>
                                     <h4 className="text-4xl font-black tracking-tighter">{veh.nombre}</h4>
                                     <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest opacity-40">ASSET ID: #{veh.id}</p>
                                  </div>
                               </div>

                               <div className="space-y-4">
                                  <div className="flex justify-between items-end">
                                     <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Activity size={14} className="text-orange-600"/> VIDA ÚTIL DEL CICLO</p>
                                     <span className={`text-4xl font-black ${hsRestantes < 50 ? 'text-red-500 animate-pulse' : ''}`}>{progress.toFixed(0)}%</span>
                                  </div>
                                  <div className="h-6 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                     <div className={`h-full transition-all duration-1000 ${hsRestantes < 50 ? 'bg-red-600' : 'bg-orange-600'}`} style={{width: `${progress}%`}}></div>
                                  </div>
                               </div>
                            </div>

                            <div className="w-full lg:w-72 space-y-4">
                               <button onClick={() => setShowLogForm(veh.id)} className="w-full p-5 rounded-2xl bg-slate-800 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-700 transition-all border border-slate-700">
                                  <Clock size={18}/> CARGA DIARIA
                               </button>
                               <button onClick={() => handleToggleOperativo(selectedCompany.id, veh.id, veh.operativo)} className={`w-full p-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${veh.operativo ? 'bg-red-600/10 text-red-600 border border-red-600/20 hover:bg-red-600 hover:text-white' : 'bg-emerald-600 text-white'}`}>
                                  {veh.operativo ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>} 
                                  {veh.operativo ? 'INFORMAR BAJA' : 'DAR DE ALTA'}
                               </button>
                            </div>
                         </div>
                      </Card>
                    );
                 })}
              </div>
           </div>
        )}
      </main>

      {/* FOOTER SIMPLE (MOBILE) */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-900 p-4 flex justify-around items-center z-50">
          <button onClick={() => setActiveTab('dashboard')} className={`p-4 rounded-2xl ${activeTab === 'dashboard' ? 'text-orange-600' : 'text-slate-500'}`}><LayoutDashboard/></button>
          <button onClick={() => setActiveTab('companies')} className={`p-4 rounded-2xl ${activeTab === 'companies' ? 'text-orange-600' : 'text-slate-500'}`}><Building2/></button>
      </footer>

    </div>
  );
};

// --- REGISTRO GLOBAL ---
window.App = App;
