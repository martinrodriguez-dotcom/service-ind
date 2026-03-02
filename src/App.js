const { useState, useMemo, useEffect } = React;
const { 
  Menu, X, LayoutDashboard, Building2, Plus, AlertTriangle, Clock, 
  ChevronLeft, Truck, CheckCircle2, Wrench, Moon, Sun, DollarSign, QrCode,
  Activity, AlertCircle, FileDown, Hash, User, ClipboardList
} = lucide;

// RUTAS RELATIVAS (SIN barra inicial /)
import { subscribeToCompanies, addCompany, addVehicleToCompany, updateCompanyVehicles } from './services/firestoreService.js';
import { calculateAlerts, getVidaUtilColor, SERVICE_INTERVAL_DEFAULT } from './utils/maintenanceLogic.js';
import { downloadVehiclePDF } from './utils/pdfGenerator.js';
import { 
  Modal, GuantesInput, GuantesButton, 
  ServiceFormContent, DowntimeFormContent, 
  LogFormContent, CompanyFormContent, VehicleFormContent 
} from './components/Forms.js';

const App = () => {
  const [companies, setCompanies] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  
  const [showLogForm, setShowLogForm] = useState(null); 
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(null); 
  const [showDowntimeForm, setShowDowntimeForm] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToCompanies((data) => setCompanies(data));
    return () => unsubscribe();
  }, []);

  const alerts = useMemo(() => calculateAlerts(companies), [companies]);

  const handleToggleOperativo = async (companyId, vehicleId, currentStatus) => {
    if (currentStatus) { setShowDowntimeForm({ companyId, vehicleId }); } 
    else {
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

  return (
    <div className={`${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} min-h-screen flex`}>
      {/* SIDEBAR */}
      <aside className={`w-72 border-r ${darkMode ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} hidden lg:block`}>
        <div className="p-8 border-b border-slate-900 flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-xl text-white"><Wrench size={24} /></div>
          <h1 className="text-2xl font-black uppercase">ServicePro</h1>
        </div>
        <nav className="p-6 space-y-2">
          <button onClick={() => {setActiveTab('dashboard'); setSelectedCompany(null);}} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${activeTab === 'dashboard' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>
            <LayoutDashboard size={20}/> Dashboard
          </button>
          <button onClick={() => {setActiveTab('companies'); setSelectedCompany(null);}} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${activeTab === 'companies' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>
            <Building2 size={20}/> Empresas
          </button>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <h2 className="text-5xl font-black tracking-tighter">Monitor de Alertas</h2>
            <div className="grid gap-4">
              {alerts.map((alert, i) => (
                <div key={i} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-600/20 text-orange-600 rounded-2xl"><AlertTriangle size={32}/></div>
                    <div>
                      <p className="text-2xl font-black">{alert.vehiculoNombre}</p>
                      <p className="text-slate-500 font-bold uppercase text-xs">{alert.empresaNombre}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-orange-500">{alert.hsRestantes.toFixed(0)} hs</p>
                    <p className="text-[10px] text-slate-500">PROYECCIÓN: {alert.estDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'companies' && !selectedCompany && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-5xl font-black tracking-tighter">Empresas</h2>
              <button onClick={() => setShowCompanyForm(true)} className="bg-orange-600 p-4 rounded-2xl font-black flex items-center gap-2"><Plus/> ALTA</button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {companies.map(emp => (
                <button key={emp.id} onClick={() => setSelectedCompany(emp)} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 text-left hover:border-orange-600 transition-all">
                  <h3 className="text-3xl font-black mb-2">{emp.nombre}</h3>
                  <p className="text-slate-500 font-bold text-xs uppercase">CUIT: {emp.cuit}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCompany && (
           <div className="max-w-5xl mx-auto space-y-8">
              <button onClick={() => setSelectedCompany(null)} className="text-slate-500 font-black flex items-center gap-2"><ChevronLeft/> VOLVER</button>
              <h2 className="text-6xl font-black">{selectedCompany.nombre}</h2>
              <button onClick={() => setShowVehicleForm(true)} className="bg-orange-600 p-4 rounded-2xl font-black">NUEVO EQUIPO</button>
              <div className="space-y-6">
                {selectedCompany.vehiculos?.map(veh => (
                  <div key={veh.id} className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-slate-800 rounded-2xl"><Truck size={32}/></div>
                      <div>
                        <p className="text-3xl font-black">{veh.nombre}</p>
                        <p className="text-orange-500 font-black">{veh.horometroTotal} HS TOTALES</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setShowLogForm(veh.id)} className="bg-slate-800 p-3 rounded-xl"><Activity size={20}/></button>
                       <button onClick={() => setShowServiceForm(veh.id)} className="bg-orange-600 p-3 rounded-xl"><CheckCircle2 size={20}/></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}
      </main>

      {/* MODALES SIMPLIFICADOS */}
      {showCompanyForm && <Modal title="Alta Empresa" onClose={() => setShowCompanyForm(false)} darkMode={darkMode}><CompanyFormContent darkMode={darkMode} onSubmit={async(d)=>{await addCompany(d); setShowCompanyForm(false);}}/></Modal>}
      {showVehicleForm && <Modal title="Nuevo Equipo" onClose={() => setShowVehicleForm(false)} darkMode={darkMode}><VehicleFormContent darkMode={darkMode} onSubmit={async(d)=>{await addVehicleToCompany(selectedCompany.id, d); setShowVehicleForm(false);}}/></Modal>}
      {showServiceForm && <Modal title="Service" onClose={() => setShowServiceForm(null)} darkMode={darkMode}><ServiceFormContent darkMode={darkMode} onSubmit={(d)=>handleCloseService(selectedCompany.id, showServiceForm, d)}/></Modal>}
      {showLogForm && <Modal title="Carga Diaria" onClose={() => setShowLogForm(null)} darkMode={darkMode}><LogFormContent darkMode={darkMode} onSubmit={async(d)=>{
          const company = companies.find(c => c.id === selectedCompany.id);
          const updated = company.vehiculos.map(v => v.id === showLogForm ? {...v, horometroTotal: parseFloat(d.horas)} : v);
          await updateCompanyVehicles(selectedCompany.id, updated);
          setShowLogForm(null);
      }}/></Modal>}
    </div>
  );
};

export default App;
