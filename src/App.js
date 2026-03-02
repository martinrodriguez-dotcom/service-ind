// --- ACCESO A REACT Y LIBRERÍAS DESDE EL GLOBAL (CDN) ---
const { useState, useMemo, useEffect } = React;

// Extraemos los iconos del objeto global 'lucide' cargado en index.html
const { 
  Menu, X, LayoutDashboard, Building2, Settings, Plus, ChevronRight, 
  AlertTriangle, Fuel, Clock, Calendar, ChevronLeft, Save, History, 
  Mail, Phone, User, Info, Hash, Truck, CheckCircle2, Wrench, 
  Moon, Sun, Download, Activity, AlertCircle, ClipboardList,
  FileDown, DollarSign, QrCode 
} = lucide;

// --- IMPORTACIONES CON RUTAS ABSOLUTAS PARA EVITAR 404 ---
// Usamos '/src/...' para que el navegador encuentre los archivos sin importar el nivel de carpeta
import { subscribeToCompanies, addCompany, addVehicleToCompany, updateCompanyVehicles } from '/src/services/firestoreService.js';
import { calculateAlerts, getVidaUtilColor, SERVICE_INTERVAL_DEFAULT } from '/src/utils/maintenanceLogic.js';
import { downloadVehiclePDF } from '/src/utils/pdfGenerator.js';
import { 
  Modal, GuantesInput, GuantesButton, 
  ServiceFormContent, DowntimeFormContent, 
  LogFormContent, CompanyFormContent, VehicleFormContent 
} from '/src/components/Forms.js';

const App = () => {
  // --- ESTADOS DE SISTEMA ---
  const [companies, setCompanies] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // Estados de Modales
  const [showLogForm, setShowLogForm] = useState(null); 
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(null); 
  const [showDowntimeForm, setShowDowntimeForm] = useState(null); 
  const [scanning, setScanning] = useState(false);

  // --- CONEXIÓN FIREBASE EN TIEMPO REAL ---
  useEffect(() => {
    const unsubscribe = subscribeToCompanies((data) => {
      setCompanies(data);
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE ALERTAS ---
  const alerts = useMemo(() => calculateAlerts(companies), [companies]);

  // --- HANDLERS DE DATOS ---
  const handleToggleOperativo = async (companyId, vehicleId, currentStatus) => {
    if (currentStatus) {
      setShowDowntimeForm({ companyId, vehicleId });
    } else {
      const company = companies.find(c => c.id === companyId);
      const updatedVehicles = company.vehiculos.map(v => v.id === vehicleId ? {
        ...v, operativo: true, motivoBaja: '',
        eventos: [...v.eventos, { id: Date.now(), tipo: 'ALTA', fecha: new Date().toLocaleDateString(), nota: 'Vuelta a operatividad' }]
      } : v);
      await updateCompanyVehicles(companyId, updatedVehicles);
    }
  };

  const handleCloseService = async (companyId, vehicleId, serviceData) => {
    const company = companies.find(c => c.id === companyId);
    const updatedVehicles = company.vehiculos.map(v => v.id === vehicleId ? {
      ...v, ultimoServiceHoras: v.horometroTotal,
      eventos: [...v.eventos, { 
        id: Date.now(), tipo: 'SERVICE', fecha: new Date().toLocaleDateString(), 
        horas: v.horometroTotal, insumos: serviceData.insumos,
        tecnico: serviceData.tecnico, costo: parseFloat(serviceData.costo) || 0
      }]
    } : v);
    await updateCompanyVehicles(companyId, updatedVehicles);
    setShowServiceForm(null);
  };

  const addDailyLog = async (companyId, vehicleId, logData) => {
    const company = companies.find(c => c.id === companyId);
    const updatedVehicles = company.vehiculos.map(v => v.id === vehicleId ? {
      ...v, horometroTotal: parseFloat(logData.horas),
      eventos: [...v.eventos, { 
        id: Date.now(), tipo: 'REGISTRO', fecha: new Date().toLocaleDateString(), 
        horas: parseFloat(logData.horas), litros: parseFloat(logData.litros) 
      }]
    } : v);
    await updateCompanyVehicles(companyId, updatedVehicles);
    setShowLogForm(null);
  };

  const handleDowntime = async (motivo) => {
    const { companyId, vehicleId } = showDowntimeForm;
    const company = companies.find(c => c.id === companyId);
    const updatedVehicles = company.vehiculos.map(v => v.id === vehicleId ? {
      ...v, operativo: false, motivoBaja: motivo,
      eventos: [...v.eventos, { id: Date.now(), tipo: 'BAJA', fecha: new Date().toLocaleDateString(), motivo }]
    } : v);
    await updateCompanyVehicles(companyId, updatedVehicles);
    setShowDowntimeForm(null);
  };

  const ThemeWrapper = ({ children }) => (
    <div className={`${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} min-h-screen transition-colors duration-300 font-sans`}>
      {children}
    </div>
  );

  return (
    <ThemeWrapper>
      <div className="flex h-screen overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 lg:static ${darkMode ? 'bg-slate-950 border-r border-slate-900' : 'bg-white border-r border-slate-200'}`}>
          <div className="p-8 border-b border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 p-2.5 rounded-2xl text-white shadow-xl shadow-orange-900/40"><Wrench size={24} /></div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">ServicePro</h1>
            </div>
          </div>
          <nav className="p-6 space-y-3">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Alertas de Service' },
              { id: 'companies', icon: Building2, label: 'Gestión Empresas' }
            ].map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSelectedCompany(null); setIsMenuOpen(false); }} className={`flex items-center w-full px-6 py-4 gap-4 rounded-[1.5rem] font-black transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                <item.icon size={22} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="absolute bottom-0 w-full p-6 space-y-4">
             <GuantesButton darkMode={darkMode} variant="secondary" onClick={() => {setScanning(true); setTimeout(() => setScanning(false), 2000);}}>
                <QrCode size={20}/> Leer Etiqueta
             </GuantesButton>
             <button onClick={() => setDarkMode(!darkMode)} className="flex items-center justify-between w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 font-black text-xs uppercase tracking-widest">
              <span>MODO {darkMode ? 'OSCURO' : 'CLARO'}</span>
              <div className={`w-10 h-6 rounded-full p-1 ${darkMode ? 'bg-orange-600' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-4' : ''}`} />
              </div>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          <header className="lg:hidden p-5 border-b flex justify-between items-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
            <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-900 dark:text-white"><Menu /></button>
            <span className="font-black text-xl tracking-tighter">SERVICEPRO</span>
            <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black">SP</div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-10">
            
            {activeTab === 'dashboard' && (
              <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in">
                <header className="space-y-2">
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-slate-900 dark:text-white">Monitor de Alertas</h2>
                    <p className="text-slate-400 font-bold border-l-4 border-orange-600 pl-4">Atención crítica requerida.</p>
                </header>

                <div className="grid gap-6">
                  {alerts.map((alert, i) => (
                    <button key={i} onClick={() => {
                      const company = companies.find(c => c.id === alert.empresaId);
                      setSelectedCompany(company);
                      setActiveTab('companies');
                    }} className={`group p-8 rounded-[2.5rem] border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-6 ${alert.operativo ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200'}`}>
                      <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-3xl ${!alert.operativo ? 'bg-red-600 text-white' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600'}`}>
                          {alert.operativo ? <AlertTriangle size={40} /> : <AlertCircle size={40} />}
                        </div>
                        <div className="text-left">
                          <p className="font-black text-3xl tracking-tight text-slate-900 dark:text-white">{alert.vehiculoNombre}</p>
                          <p className="text-slate-400 font-black uppercase text-xs flex items-center gap-2"><Building2 size={14}/> {alert.empresaNombre}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-2xl text-slate-900 dark:text-white">{alert.hsRestantes.toFixed(0)} hs <span className="text-xs opacity-40">libres</span></p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Proyección: {alert.estDate}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'companies' && !selectedCompany && (
              <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex justify-between items-end border-b pb-10 border-slate-200 dark:border-slate-800">
                   <h2 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">Directorio</h2>
                   <div className="w-64"><GuantesButton darkMode={darkMode} onClick={() => setShowCompanyForm(true)}><Plus size={24}/> Alta Empresa</GuantesButton></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {companies.map(emp => (
                    <button key={emp.id} onClick={() => setSelectedCompany(emp)} className={`p-10 rounded-[3rem] border-2 transition-all text-left group ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-orange-500' : 'bg-white border-slate-50 hover:border-orange-500'}`}>
                      <div className="flex justify-between items-start mb-10">
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] text-slate-400 group-hover:bg-orange-600 group-hover:text-white transition-all"><Building2 size={40} /></div>
                        <div className="text-right">
                          <p className="text-4xl font-black text-slate-900 dark:text-white">{emp.vehiculos?.length || 0}</p>
                          <p className="text-[10px] font-black uppercase opacity-40 text-slate-400">Equipos</p>
                        </div>
                      </div>
                      <h3 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{emp.nombre}</h3>
                      <p className="text-slate-400 font-bold text-xs flex items-center gap-2"><Hash size={12}/> CUIT: {emp.cuit}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedCompany && (
              <div className="max-w-7xl mx-auto space-y-12 animate-in slide-in-from-right-10">
                <button onClick={() => setSelectedCompany(null)} className="flex items-center gap-3 font-black text-slate-400 hover:text-orange-600 uppercase text-xs">
                  <ChevronLeft size={28} /> VOLVER
                </button>

                <div className={`p-8 sm:p-16 rounded-[4rem] border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex flex-col xl:flex-row justify-between gap-12 border-b-4 border-slate-50 dark:border-slate-800 pb-16">
                    <div>
                      <h2 className="text-6xl sm:text-7xl font-black tracking-tighter text-slate-900 dark:text-white mb-6">{selectedCompany.nombre}</h2>
                      <div className="flex gap-4">
                        <span className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl text-xs font-black text-slate-500 flex items-center gap-3"><Hash size={16}/> {selectedCompany.cuit}</span>
                      </div>
                    </div>
                    <div className="w-72"><GuantesButton darkMode={darkMode} onClick={() => setShowVehicleForm(true)}><Truck size={24}/> Registrar Equipo</GuantesButton></div>
                  </div>

                  <div className="mt-24 space-y-32">
                    {selectedCompany.vehiculos?.map(veh => {
                      const hsConsumidas = veh.horometroTotal - veh.ultimoServiceHoras;
                      const hsRestantes = Math.max(0, SERVICE_INTERVAL_DEFAULT - hsConsumidas);
                      const progress = (hsRestantes / SERVICE_INTERVAL_DEFAULT) * 100;

                      return (
                        <div key={veh.id} className={`p-8 sm:p-14 rounded-[4.5rem] border-2 relative ${darkMode ? 'bg-slate-950 border-slate-900' : 'bg-slate-50 border-slate-200/50'}`}>
                          
                          <div className="absolute -top-8 right-12 flex items-center gap-5 bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xl border dark:border-slate-800">
                            <span className={`text-[10px] font-black uppercase ${veh.operativo ? 'text-emerald-500' : 'text-red-500'}`}>
                              {veh.operativo ? 'EN MARCHA' : 'EQUIPO PARADO'}
                            </span>
                            <button onClick={() => handleToggleOperativo(selectedCompany.id, veh.id, veh.operativo)} className={`w-16 h-9 rounded-full p-1.5 ${veh.operativo ? 'bg-emerald-500' : 'bg-red-500'}`} >
                              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${veh.operativo ? 'translate-x-7' : ''}`} />
                            </button>
                          </div>

                          <div className="space-y-12">
                            <div className="flex flex-wrap justify-between items-center gap-8">
                                <div className="flex items-center gap-8">
                                  <div className="p-6 bg-slate-950 text-white rounded-[2rem]"><Truck size={48} /></div>
                                  <div>
                                    <h4 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{veh.nombre}</h4>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase opacity-60">ID: #{veh.id}</p>
                                  </div>
                                </div>
                                <div className="flex gap-4">
                                  <div className="w-48"><GuantesButton darkMode={darkMode} variant="outline" onClick={() => setShowLogForm(veh.id)}><Activity size={20}/> Carga Diaria</GuantesButton></div>
                                  <div className="w-16"><GuantesButton darkMode={darkMode} variant="secondary" onClick={() => downloadVehiclePDF(selectedCompany, veh)}><FileDown size={20}/></GuantesButton></div>
                                  <div className="w-48"><GuantesButton darkMode={darkMode} onClick={() => setShowServiceForm(veh.id)}><CheckCircle2 size={20}/> Service</GuantesButton></div>
                                </div>
                            </div>

                            <div className={`p-10 rounded-[3rem] border-2 space-y-8 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <div className="flex justify-between items-end">
                                   <p className="text-xs font-black uppercase text-slate-400">Vida Útil del Aceite</p>
                                   <span className="text-5xl font-black text-slate-900 dark:text-white">{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-10 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border dark:border-slate-800">
                                  <div className={`h-full transition-all duration-1000 ${getVidaUtilColor(progress)}`} style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                  { label: 'HORÓMETRO', val: veh.horometroTotal, icon: Clock, unit: 'hs' },
                                  { label: 'RESTANTES', val: hsRestantes.toFixed(0), icon: Wrench, unit: 'hs', color: progress < 10 ? 'text-red-600' : '' },
                                  { label: 'INVERSIÓN', val: `$${veh.eventos?.reduce((a, b) => a + (b.costo || 0), 0).toLocaleString()}`, icon: DollarSign, unit: 'AR$', color: 'text-emerald-500' }
                                ].map((s, i) => (
                                  <div key={i} className={`p-8 rounded-[2.5rem] border-2 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50 shadow-sm'}`}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><s.icon size={14} className="text-orange-600"/> {s.label}</p>
                                    <p className={`text-4xl font-black text-slate-900 dark:text-white ${s.color || ''}`}>{s.val} <span className="text-[10px] font-bold opacity-30 uppercase">{s.unit}</span></p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* MODALES */}
        {showServiceForm && (
          <Modal title="Mantenimiento" darkMode={darkMode} onClose={() => setShowServiceForm(null)}>
            <ServiceFormContent darkMode={darkMode} onSubmit={(data) => handleCloseService(selectedCompany.id, showServiceForm, data)} />
          </Modal>
        )}

        {showDowntimeForm && (
          <Modal title="Parada Técnica" darkMode={darkMode} onClose={() => setShowDowntimeForm(null)}>
             <DowntimeFormContent darkMode={darkMode} onSubmit={handleDowntime} />
          </Modal>
        )}

        {showLogForm && (
          <Modal title="Control Diario" darkMode={darkMode} onClose={() => setShowLogForm(null)}>
             <LogFormContent darkMode={darkMode} onSubmit={(data) => addDailyLog(selectedCompany.id, showLogForm, data)} />
          </Modal>
        )}

        {showCompanyForm && (
          <Modal title="Alta Empresa" darkMode={darkMode} onClose={() => setShowCompanyForm(false)}>
             <CompanyFormContent darkMode={darkMode} onSubmit={async (data) => { await addCompany(data); setShowCompanyForm(false); }} />
          </Modal>
        )}

        {showVehicleForm && (
          <Modal title="Nuevo Equipo" darkMode={darkMode} onClose={() => setShowVehicleForm(false)}>
            <VehicleFormContent darkMode={darkMode} onSubmit={async (data) => { await addVehicleToCompany(selectedCompany.id, data); setShowVehicleForm(false); }} />
          </Modal>
        )}
      </div>
    </ThemeWrapper>
  );
};

export default App;
