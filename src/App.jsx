import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu, X, LayoutDashboard, Building2, Settings, Plus, ChevronRight, 
  AlertTriangle, Fuel, Clock, Calendar, ChevronLeft, Save, History, 
  Mail, Phone, User, Info, Hash, Truck, CheckCircle2, Wrench, 
  Moon, Sun, Download, Activity, AlertCircle, ClipboardList,
  FileDown, DollarSign, QrCode
} from 'lucide-react';

// Importaciones de nuestros módulos separados
import { subscribeToCompanies, addCompany, addVehicleToCompany, updateCompanyVehicles } from './services/firestoreService';
import { calculateAlerts, getVidaUtilColor, SERVICE_INTERVAL_DEFAULT } from './utils/maintenanceLogic';
import { downloadVehiclePDF } from './utils/pdfGenerator';
import { 
  Modal, GuantesInput, GuantesButton, 
  ServiceFormContent, DowntimeFormContent, 
  LogFormContent, CompanyFormContent, VehicleFormContent 
} from './components/Forms';

const App = () => {
  // --- Estados de Sistema ---
  const [companies, setCompanies] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // Modales
  const [showLogForm, setShowLogForm] = useState(null); 
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(null); 
  const [showDowntimeForm, setShowDowntimeForm] = useState(null); 
  const [scanning, setScanning] = useState(false);

  // --- Conexión en Tiempo Real con Firestore ---
  useEffect(() => {
    const unsubscribe = subscribeToCompanies((data) => {
      setCompanies(data);
    });
    return () => unsubscribe();
  }, []);

  // --- Lógica de Alertas (Memoizada) ---
  const alerts = useMemo(() => calculateAlerts(companies), [companies]);

  // --- Handlers de Datos (Conectados a Firebase) ---
  
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
      ...v,
      ultimoServiceHoras: v.horometroTotal,
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
      ...v,
      horometroTotal: parseFloat(logData.horas),
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

  // --- UI Helpers ---
  const ThemeWrapper = ({ children }) => (
    <div className={`${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} min-h-screen transition-colors duration-300 font-sans`}>
      {children}
    </div>
  );

  return (
    <ThemeWrapper>
      <div className="flex h-screen overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-out lg:static ${darkMode ? 'bg-slate-950 border-r border-slate-900' : 'bg-white border-r border-slate-200'}`}>
          <div className="p-8 border-b border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 p-2.5 rounded-2xl text-white shadow-xl shadow-orange-900/40"><Wrench size={24} /></div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">ServicePro</h1>
            </div>
          </div>
          <nav className="p-6 space-y-3">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Alertas de Service' },
              { id: 'companies', icon: Building2, label: 'Gestión Empresas' },
              { id: 'config', icon: Settings, label: 'Configuración' }
            ].map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSelectedCompany(null); setIsMenuOpen(false); }} className={`flex items-center w-full px-6 py-4 gap-4 rounded-[1.5rem] font-black transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'}`}>
                <item.icon size={22} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="absolute bottom-0 w-full p-6 space-y-4">
             <GuantesButton darkMode={darkMode} variant="secondary" onClick={() => {setScanning(true); setTimeout(() => setScanning(false), 2000);}}>
                <QrCode size={20}/> Leer Etiqueta
             </GuantesButton>
             <button onClick={() => setDarkMode(!darkMode)} className="flex items-center justify-between w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 font-black text-xs uppercase tracking-widest">
              <span className="flex items-center gap-2">{darkMode ? <Moon size={16}/> : <Sun size={16}/>} MODO {darkMode ? 'OSCURO' : 'CLARO'}</span>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-orange-600' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-4' : ''}`} />
              </div>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          <header className="lg:hidden p-5 border-b flex justify-between items-center sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-sm"><Menu /></button>
            <span className="font-black text-xl tracking-tighter">SERVICEPRO</span>
            <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-orange-900/20">SP</div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-14">
            
            {activeTab === 'dashboard' && (
              <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
                <header className="space-y-2">
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-tight">Monitor de Alertas</h2>
                    <p className="text-slate-400 font-bold text-lg max-w-2xl italic border-l-4 border-orange-600 pl-4">Atención crítica requerida por agotamiento de vida útil o averías técnicas.</p>
                </header>

                <div className="grid gap-6">
                  {alerts.map((alert, i) => (
                    <button key={i} onClick={() => {
                      const company = companies.find(c => c.id === alert.empresaId);
                      setSelectedCompany(company);
                      setActiveTab('companies');
                    }} className={`group p-8 rounded-[2.5rem] border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-left ${alert.operativo ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-orange-500 shadow-xl' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 shadow-none'}`}>
                      <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-3xl shadow-2xl transition-all group-hover:scale-110 ${!alert.operativo ? 'bg-red-600 text-white' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'}`}>
                          {alert.operativo ? <AlertTriangle size={40} /> : <AlertCircle size={40} />}
                        </div>
                        <div>
                          <p className="font-black text-3xl tracking-tight mb-1">{alert.vehiculoNombre}</p>
                          <p className="text-slate-400 font-black uppercase text-xs tracking-widest flex items-center gap-2"><Building2 size={14} className="text-orange-600"/> {alert.empresaNombre}</p>
                          {!alert.operativo && <p className="text-red-600 font-bold text-sm mt-2 flex items-center gap-2"><Activity size={14}/> PARADA POR: {alert.motivo}</p>}
                        </div>
                      </div>
                      <div className="w-full sm:w-auto flex flex-col items-end gap-3 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-200 dark:border-slate-800">
                        <span className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md ${alert.progress < 10 ? 'bg-red-600 text-white animate-pulse' : 'bg-orange-600 text-white'}`}>
                          {alert.progress < 10 ? 'Urgente: Service' : 'Alerta Preventiva'}
                        </span>
                        <div className="text-right">
                          <p className="font-black text-2xl text-slate-900 dark:text-white">{alert.hsRestantes.toFixed(0)} hs <span className="text-sm font-medium opacity-40 italic">disponibles</span></p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimado: {alert.estDate}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {alerts.length === 0 && (
                    <div className="bg-white dark:bg-slate-900 border-4 border-dashed border-slate-100 dark:border-slate-800 p-24 rounded-[4rem] text-center space-y-6 shadow-sm">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner"><CheckCircle2 size={48} /></div>
                      <div>
                        <p className="text-2xl font-black tracking-tight">OPERATIVIDAD AL 100%</p>
                        <p className="text-slate-400 font-bold mt-2">No hay incidencias reportadas en la flota.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'companies' && !selectedCompany && (
              <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b pb-10 border-slate-200 dark:border-slate-800">
                   <div className="space-y-1">
                      <h2 className="text-5xl sm:text-6xl font-black tracking-tighter">Directorio</h2>
                      <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Gestión de Clientes Industriales</p>
                   </div>
                   <div className="w-full sm:w-auto">
                    <GuantesButton darkMode={darkMode} onClick={() => setShowCompanyForm(true)}><Plus size={24}/> Alta Empresa</GuantesButton>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {companies.map(emp => (
                    <button key={emp.id} onClick={() => setSelectedCompany(emp)} className={`p-10 rounded-[3rem] border-2 transition-all text-left group shadow-sm hover:shadow-2xl hover:-translate-y-2 ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-orange-500' : 'bg-white border-slate-50 hover:border-orange-500'}`}>
                      <div className="flex justify-between items-start mb-10">
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] text-slate-600 dark:text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all shadow-inner"><Building2 size={40} /></div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activos</p>
                          <p className="text-4xl font-black text-slate-900 dark:text-white leading-none mt-1">{emp.vehiculos?.length || 0}</p>
                        </div>
                      </div>
                      <h3 className="text-3xl font-black tracking-tighter leading-tight mb-2 group-hover:text-orange-600 transition-colors text-slate-900 dark:text-white">{emp.nombre}</h3>
                      <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2"><Hash size={12}/> CUIT: {emp.cuit}</p>
                      <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-slate-400 font-bold text-sm">
                        <span className="flex items-center gap-3"><User size={18} className="text-orange-500"/> {emp.responsable}</span>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-all text-orange-600"><ChevronRight /></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedCompany && (
              <div className="max-w-7xl mx-auto space-y-12 animate-in slide-in-from-right-10 duration-500">
                <button onClick={() => setSelectedCompany(null)} className="group flex items-center gap-3 font-black text-slate-400 hover:text-orange-600 transition-all uppercase tracking-widest text-xs">
                  <ChevronLeft size={28} className="group-hover:-translate-x-2 transition-transform" /> VOLVER AL LISTADO
                </button>

                <div className={`p-8 sm:p-16 rounded-[4rem] shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex flex-col xl:flex-row justify-between gap-12 border-b-4 border-slate-50 dark:border-slate-800 pb-16">
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-6xl sm:text-8xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-6">{selectedCompany.nombre}</h2>
                        <div className="flex flex-wrap gap-4">
                           <span className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl text-xs font-black text-slate-500 border border-slate-200 dark:border-slate-700 flex items-center gap-3"><Hash size={16}/> {selectedCompany.cuit}</span>
                           <span className="bg-orange-50 dark:bg-orange-900/20 px-6 py-3 rounded-2xl text-xs font-black text-orange-600 border border-orange-100 dark:border-orange-800 flex items-center gap-3"><User size={16}/> {selectedCompany.responsable}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <GuantesButton darkMode={darkMode} onClick={() => setShowVehicleForm(true)}><Truck size={24}/> Registrar Equipo</GuantesButton>
                    </div>
                  </div>

                  <div className="mt-24 space-y-32">
                    {selectedCompany.vehiculos?.map(veh => {
                      const hsConsumidas = veh.horometroTotal - veh.ultimoServiceHoras;
                      const hsRestantes = Math.max(0, SERVICE_INTERVAL_DEFAULT - hsConsumidas);
                      const progress = (hsRestantes / SERVICE_INTERVAL_DEFAULT) * 100;
                      const isAlert = progress < 10;

                      return (
                        <div key={veh.id} className={`p-8 sm:p-14 rounded-[4.5rem] border-2 transition-all relative shadow-sm ${darkMode ? 'bg-slate-950 border-slate-900' : 'bg-slate-50 border-slate-200/50'} ${!veh.operativo ? 'opacity-80' : ''}`}>
                          
                          <div className="absolute -top-8 right-12 flex items-center gap-5 bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-2xl border dark:border-slate-800">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${veh.operativo ? 'text-emerald-500' : 'text-red-500'}`}>
                              ESTADO: {veh.operativo ? 'EN MARCHA' : 'EQUIPO PARADO'}
                            </span>
                            <button onClick={() => handleToggleOperativo(selectedCompany.id, veh.id, veh.operativo)} className={`w-16 h-9 rounded-full p-1.5 transition-all shadow-inner ${veh.operativo ? 'bg-emerald-500' : 'bg-red-500'}`} >
                              <div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-md ${veh.operativo ? 'translate-x-7' : ''}`} />
                            </button>
                          </div>

                          <div className="flex flex-col lg:flex-row justify-between gap-16">
                            <div className="flex-1 space-y-12 text-slate-900 dark:text-white">
                              <div className="flex flex-wrap justify-between items-center gap-8">
                                <div className="flex items-center gap-8">
                                  <div className={`p-6 rounded-[2rem] shadow-2xl transition-all ${!veh.operativo ? 'bg-red-600 text-white' : isAlert ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-950 text-white shadow-slate-950/40'}`}><Truck size={48} /></div>
                                  <div>
                                    <h4 className="text-4xl sm:text-5xl font-black tracking-tighter mb-1">{veh.nombre}</h4>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.4em] opacity-60">ID ASSET: #{veh.id}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                                  <GuantesButton darkMode={darkMode} variant="outline" onClick={() => setShowLogForm(veh.id)}><Activity size={20}/> Carga Diaria</GuantesButton>
                                  <GuantesButton darkMode={darkMode} variant="secondary" onClick={() => downloadVehiclePDF(selectedCompany, veh)}><FileDown size={20}/></GuantesButton>
                                  <GuantesButton darkMode={darkMode} onClick={() => setShowServiceForm(veh.id)}><CheckCircle2 size={20}/> Service</GuantesButton>
                                </div>
                              </div>

                              <div className={`p-10 rounded-[3rem] border-2 space-y-8 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <div className="flex justify-between items-end">
                                   <div className="space-y-1">
                                      <span className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2"><ClipboardList size={16} className="text-orange-500"/> Ciclo de Aceite</span>
                                      <p className="text-sm font-bold text-slate-500 italic">Próximo service a las {SERVICE_INTERVAL_DEFAULT} hs.</p>
                                   </div>
                                   <span className={`text-5xl font-black tracking-tighter ${isAlert ? 'text-red-600 animate-pulse' : ''}`}>{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-10 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden shadow-inner border dark:border-slate-800">
                                  <div className={`h-full transition-all duration-1000 ease-out shadow-2xl ${getVidaUtilColor(progress)}`} style={{ width: `${progress}%` }}></div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                  { label: 'HORÓMETRO', val: veh.horometroTotal, icon: Clock, unit: 'hs' },
                                  { label: 'RESTANTES', val: hsRestantes.toFixed(0), icon: Wrench, unit: 'hs', color: isAlert ? 'text-red-600' : '' },
                                  { label: 'INVERSIÓN', val: `$${veh.eventos.reduce((a, b) => a + (b.costo || 0), 0).toLocaleString()}`, icon: DollarSign, unit: 'AR$', color: 'text-emerald-500' }
                                ].map((s, i) => (
                                  <div key={i} className={`p-8 rounded-[2.5rem] border-2 transition-all ${darkMode ? 'bg-slate-900 border-slate-800 shadow-none' : 'bg-white border-slate-50 shadow-sm'}`}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><s.icon size={14} className="text-orange-600"/> {s.label}</p>
                                    <p className={`text-4xl font-black tracking-tighter ${s.color || ''}`}>{s.val} <span className="text-[10px] font-bold opacity-30 uppercase">{s.unit}</span></p>
                                  </div>
                                ))}
                              </div>
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
          <Modal title="Reporte de Mantenimiento" darkMode={darkMode} onClose={() => setShowServiceForm(null)}>
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
          <Modal title="Nueva Empresa" darkMode={darkMode} onClose={() => setShowCompanyForm(false)}>
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
