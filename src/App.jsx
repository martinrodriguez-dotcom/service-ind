import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu, X, LayoutDashboard, Building2, Settings, Plus, ChevronRight, 
  AlertTriangle, Fuel, Clock, Calendar, ChevronLeft, Save, History, 
  Mail, Phone, User, Info, Hash, Truck, CheckCircle2, Wrench, 
  Moon, Sun, Download, Activity, AlertCircle, ClipboardList,
  FileDown, DollarSign, QrCode
} from 'lucide-react';

// --- Constantes de Configuración ---
const SERVICE_INTERVAL_DEFAULT = 250; 
const ALERT_THRESHOLD_PERCENT = 10; 

const App = () => {
  // --- Estados de Sistema ---
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

  // --- Carga dinámica de jsPDF para exportación ---
  useEffect(() => {
    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.async = true;
      document.body.appendChild(script);
      
      const autoTableScript = document.createElement('script');
      autoTableScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js";
      autoTableScript.async = true;
      document.body.appendChild(autoTableScript);
    }
  }, []);
  
  // --- Datos del Sistema ---
  const [companies, setCompanies] = useState([
    { 
      id: 1, 
      nombre: 'Constructora Alfa', 
      cuit: '30-12345678-9',
      mail: 'mantenimiento@alfa.com',
      tel: '+54 11 4444-5555',
      responsable: 'Ing. Juan Pérez',
      observaciones: 'Prioridad en excavadoras pesadas.',
      fechaAlta: '2023-10-15',
      vehiculos: [
        { 
          id: 101, 
          nombre: 'Excavadora CAT 320', 
          fechaAlta: '2023-11-01',
          horometroTotal: 4690, 
          ultimoServiceHoras: 4630, 
          operativo: true,
          motivoBaja: '',
          eventos: [
            { id: 1, tipo: 'REGISTRO', fecha: '2024-01-10', horas: 4630, litros: 0 },
            { id: 2, tipo: 'SERVICE', fecha: '2024-01-15', horas: 4630, tecnico: 'Juan Mecanico', insumos: ['Filtro Aceite'], costo: 125000 },
            { id: 3, tipo: 'REGISTRO', fecha: '2024-02-05', horas: 4690, litros: 120 }
          ]
        }
      ]
    }
  ]);

  // --- Lógica de Alertas ---
  const alerts = useMemo(() => {
    let list = [];
    companies.forEach(emp => {
      emp.vehiculos.forEach(veh => {
        const hsConsumidas = veh.horometroTotal - veh.ultimoServiceHoras;
        const hsRestantes = Math.max(0, SERVICE_INTERVAL_DEFAULT - hsConsumidas);
        const progressPercent = (hsRestantes / SERVICE_INTERVAL_DEFAULT) * 100;
        
        const regs = veh.eventos.filter(e => e.tipo === 'REGISTRO').sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
        let diasRestantesStr = "---";
        
        if (regs.length >= 2) {
          const first = regs[0];
          const last = regs[regs.length - 1];
          const diffHs = last.horas - first.horas;
          const diffDays = Math.max(1, (new Date(last.fecha) - new Date(first.fecha)) / (1000*60*60*24));
          const avgHsPerDay = diffHs / diffDays;
          if (avgHsPerDay > 0 && hsRestantes > 0) {
            const estDate = new Date();
            estDate.setDate(estDate.getDate() + Math.ceil(hsRestantes / avgHsPerDay));
            diasRestantesStr = estDate.toLocaleDateString();
          }
        }

        if (progressPercent <= ALERT_THRESHOLD_PERCENT || !veh.operativo) {
          list.push({ 
            empresaId: emp.id,
            empresaNombre: emp.nombre, 
            vehiculoId: veh.id,
            vehiculoNombre: veh.nombre, 
            progress: progressPercent,
            estDate: diasRestantesStr,
            operativo: veh.operativo,
            motivo: veh.motivoBaja,
            hsRestantes: hsRestantes
          });
        }
      });
    });
    return list;
  }, [companies]);

  // --- Handlers de Datos ---
  const handleToggleOperativo = (companyId, vehicleId, currentStatus) => {
    if (currentStatus) {
      setShowDowntimeForm({ companyId, vehicleId });
    } else {
      setCompanies(prev => prev.map(emp => emp.id === companyId ? {
        ...emp,
        vehiculos: emp.vehiculos.map(v => v.id === vehicleId ? {
          ...v, 
          operativo: true, 
          motivoBaja: '',
          eventos: [...v.eventos, { id: Date.now(), tipo: 'ALTA', fecha: new Date().toLocaleDateString(), nota: 'Vuelta a operatividad' }]
        } : v)
      } : emp));
    }
  };

  const handleCloseService = (companyId, vehicleId, serviceData) => {
    setCompanies(prev => prev.map(emp => emp.id === companyId ? {
      ...emp,
      vehiculos: emp.vehiculos.map(v => v.id === vehicleId ? {
        ...v,
        ultimoServiceHoras: v.horometroTotal,
        eventos: [...v.eventos, { 
          id: Date.now(), 
          tipo: 'SERVICE', 
          fecha: new Date().toLocaleDateString(), 
          horas: v.horometroTotal,
          insumos: serviceData.insumos,
          tecnico: serviceData.tecnico,
          costo: parseFloat(serviceData.costo) || 0
        }]
      } : v)
    } : emp));
    setShowServiceForm(null);
  };

  const addDailyLog = (companyId, vehicleId, logData) => {
    setCompanies(prev => prev.map(emp => emp.id === companyId ? {
      ...emp,
      vehiculos: emp.vehiculos.map(v => v.id === vehicleId ? {
        ...v,
        horometroTotal: parseFloat(logData.horas),
        eventos: [...v.eventos, { 
          id: Date.now(), 
          tipo: 'REGISTRO', 
          fecha: new Date().toLocaleDateString(), 
          horas: parseFloat(logData.horas), 
          litros: parseFloat(logData.litros) 
        }]
      } : v)
    } : emp));
    setShowLogForm(null);
  };

  const handleAddCompany = (companyData) => {
    const newCompany = {
      ...companyData,
      id: Date.now(),
      fechaAlta: new Date().toLocaleDateString(),
      vehiculos: []
    };
    setCompanies([...companies, newCompany]);
    setShowCompanyForm(false);
  };

  const handleAddVehicle = (companyId, vehicleData) => {
    setCompanies(prev => prev.map(emp => {
      if (emp.id !== companyId) return emp;
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
      return { ...emp, vehiculos: [...emp.vehiculos, newVehicle] };
    }));
    setShowVehicleForm(false);
  };

  // --- Exportación a PDF ---
  const downloadVehiclePDF = (company, vehicle) => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hsConsumidas = vehicle.horometroTotal - vehicle.ultimoServiceHoras;
    const hsRestantes = Math.max(0, SERVICE_INTERVAL_DEFAULT - hsConsumidas);
    const progress = (hsRestantes / SERVICE_INTERVAL_DEFAULT) * 100;

    doc.setFillColor(33, 37, 41);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("EXPEDIENTE TÉCNICO INDUSTRIAL", 15, 20);
    doc.setFontSize(10);
    doc.text(`ServicePro EAM - Generado el: ${new Date().toLocaleDateString()}`, 15, 30);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Datos del Activo", 15, 55);
    doc.line(15, 57, 195, 57);

    doc.setFontSize(10);
    doc.text(`Empresa: ${company.nombre}`, 15, 65);
    doc.text(`CUIT: ${company.cuit}`, 15, 71);
    doc.text(`Vehículo: ${vehicle.nombre}`, 110, 65);
    doc.text(`ID Interno: #${vehicle.id}`, 110, 71);

    doc.setFontSize(12);
    doc.text(`Estado Operativo: ${progress.toFixed(1)}% de vida útil restante`, 15, 95);

    const tableData = [...vehicle.eventos].reverse().map(ev => [
      ev.fecha,
      ev.tipo,
      ev.horas || '--',
      ev.tipo === 'SERVICE' ? `$${ev.costo?.toLocaleString()}` : ev.tipo === 'REGISTRO' ? `${ev.litros} L` : '--',
      ev.tipo === 'SERVICE' ? ev.insumos.join(', ') : ev.motivo || ev.nota || '--'
    ]);

    doc.autoTable({
      startY: 110,
      head: [['Fecha', 'Tipo', 'Horas', 'Costo/Carga', 'Detalles']],
      body: tableData,
      headStyles: { fillColor: [33, 37, 41] },
      styles: { fontSize: 8 }
    });

    doc.save(`Ficha_${vehicle.nombre}.pdf`);
  };

  // --- UI Helpers ---
  const getVidaUtilColor = (p) => {
    if (p >= 85) return 'bg-emerald-500 shadow-emerald-500/20';
    if (p >= 50) return 'bg-orange-500 shadow-orange-500/20';
    return 'bg-red-600 shadow-red-500/20';
  };

  const ThemeWrapper = ({ children }) => (
    <div className={`${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} min-h-screen transition-colors duration-300 font-sans`}>
      {children}
    </div>
  );

  const GuantesInput = (props) => (
    <input {...props} className={`w-full p-5 sm:p-4 rounded-2xl border-2 transition-all font-bold text-lg outline-none ${darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-orange-500' : 'bg-white border-slate-100 focus:border-orange-600'}`} />
  );

  const GuantesButton = ({ children, onClick, variant = "primary", disabled = false, type = "button" }) => {
    const styles = {
      primary: "bg-orange-600 text-white shadow-lg shadow-orange-900/20 hover:bg-orange-700",
      secondary: darkMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-slate-900 text-white hover:bg-slate-800",
      outline: darkMode ? "border-2 border-slate-700 text-slate-300" : "border-2 border-slate-200 text-slate-600 hover:border-orange-500",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20"
    };
    return (
      <button type={type} disabled={disabled} onClick={onClick} className={`${styles[variant]} p-5 sm:p-4 rounded-3xl font-black text-lg active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50`}>
        {children}
      </button>
    );
  };

  const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-2xl max-h-[92vh] overflow-y-auto sm:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 duration-300 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`p-6 border-b sticky top-0 z-10 flex justify-between items-center ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100'}`}>
          <h3 className="text-2xl font-black tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:rotate-90 transition-transform"><X size={24}/></button>
        </div>
        <div className="p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );

  return (
    <ThemeWrapper>
      <div className="flex h-screen overflow-hidden">
        
        {/* SIDEBAR - Ajustada para mejor lectura */}
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
             <GuantesButton variant="secondary" onClick={() => {setScanning(true); setTimeout(() => setScanning(false), 2000);}}>
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
          
          <header className="lg:hidden p-5 border-b flex justify-between items-center sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-slate-200 dark:border-slate-800">
            <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-sm"><Menu /></button>
            <span className="font-black text-xl tracking-tighter">SERVICEPRO</span>
            <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-orange-900/20">SP</div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-14">
            
            {/* VISTA DASHBOARD: SOLO ALERTAS - RENDERIZADO MEJORADO */}
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
                      setTimeout(() => {
                        const el = document.getElementById(`vehiculo-${alert.vehiculoId}`);
                        if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 100);
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

            {/* VISTA EMPRESAS - RENDERIZADO MEJORADO */}
            {activeTab === 'companies' && !selectedCompany && (
              <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b pb-10 border-slate-200 dark:border-slate-800">
                   <div className="space-y-1">
                      <h2 className="text-5xl sm:text-6xl font-black tracking-tighter">Directorio</h2>
                      <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Gestión de Clientes Industriales</p>
                   </div>
                   <GuantesButton onClick={() => setShowCompanyForm(true)}><Plus size={24}/> Alta Empresa</GuantesButton>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {companies.map(emp => (
                    <button key={emp.id} onClick={() => setSelectedCompany(emp)} className={`p-10 rounded-[3rem] border-2 transition-all text-left group shadow-sm hover:shadow-2xl hover:-translate-y-2 ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-orange-500' : 'bg-white border-slate-50 hover:border-orange-500'}`}>
                      <div className="flex justify-between items-start mb-10">
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] text-slate-600 dark:text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all shadow-inner"><Building2 size={40} /></div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activos</p>
                          <p className="text-4xl font-black text-slate-900 dark:text-white leading-none mt-1">{emp.vehiculos.length}</p>
                        </div>
                      </div>
                      <h3 className="text-3xl font-black tracking-tighter leading-tight mb-2 group-hover:text-orange-600 transition-colors">{emp.nombre}</h3>
                      <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2"><Hash size={12}/> CUIT: {emp.cuit}</p>
                      <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-slate-400 font-bold text-sm">
                        <span className="flex items-center gap-3"><User size={18} className="text-orange-500"/> {emp.responsable}</span>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-all"><ChevronRight /></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DETALLE DE VEHÍCULOS - RENDERIZADO DE ALTO IMPACTO */}
            {selectedCompany && (
              <div className="max-w-7xl mx-auto space-y-12 animate-in slide-in-from-right-10 duration-500">
                <button onClick={() => setSelectedCompany(null)} className="group flex items-center gap-3 font-black text-slate-400 hover:text-orange-600 transition-all uppercase tracking-widest text-xs">
                  <ChevronLeft size={28} className="group-hover:-translate-x-2 transition-transform" /> VOLVER AL LISTADO
                </button>

                <div className={`p-8 sm:p-16 rounded-[4rem] shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex flex-col xl:flex-row justify-between gap-12 border-b-4 border-slate-50 dark:border-slate-800 pb-16">
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-6xl sm:text-8xl font-black tracking-tighter leading-none mb-6">{selectedCompany.nombre}</h2>
                        <div className="flex flex-wrap gap-4">
                           <span className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl text-xs font-black text-slate-500 border border-slate-200 dark:border-slate-700 flex items-center gap-3"><Hash size={16}/> {selectedCompany.cuit}</span>
                           <span className="bg-orange-50 dark:bg-orange-900/20 px-6 py-3 rounded-2xl text-xs font-black text-orange-600 border border-orange-100 dark:border-orange-800 flex items-center gap-3"><User size={16}/> {selectedCompany.responsable}</span>
                           <span className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl text-xs font-black text-slate-500 border border-slate-200 dark:border-slate-700 flex items-center gap-3"><Phone size={16}/> {selectedCompany.tel}</span>
                        </div>
                      </div>
                      {selectedCompany.observaciones && (
                        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl">
                           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2"><Info size={14}/> Notas de Operación</p>
                           <p className="text-sm font-bold italic leading-relaxed text-slate-500">"{selectedCompany.observaciones}"</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-4">
                      <GuantesButton onClick={() => setShowVehicleForm(true)}><Truck size={24}/> Registrar Equipo</GuantesButton>
                      <button className="flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors py-4">Descargar Registro Consolidado</button>
                    </div>
                  </div>

                  <div className="mt-24 space-y-32">
                    {selectedCompany.vehiculos.map(veh => {
                      const hsConsumidas = veh.horometroTotal - veh.ultimoServiceHoras;
                      const hsRestantes = Math.max(0, SERVICE_INTERVAL_DEFAULT - hsConsumidas);
                      const progress = (hsRestantes / SERVICE_INTERVAL_DEFAULT) * 100;
                      const isAlert = progress < 10;

                      return (
                        <div key={veh.id} id={`vehiculo-${veh.id}`} className={`p-8 sm:p-14 rounded-[4.5rem] border-2 transition-all relative scroll-mt-24 shadow-sm ${darkMode ? 'bg-slate-950 border-slate-900' : 'bg-slate-50 border-slate-200/50'} ${!veh.operativo ? 'opacity-80' : ''}`}>
                          
                          {/* TOGGLE OPERATIVIDAD FLOTANTE */}
                          <div className="absolute -top-8 right-12 flex items-center gap-5 bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-2xl border dark:border-slate-800">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${veh.operativo ? 'text-emerald-500' : 'text-red-500'}`}>
                              ESTADO: {veh.operativo ? 'EN MARCHA' : 'EQUIPO PARADO'}
                            </span>
                            <button onClick={() => handleToggleOperativo(selectedCompany.id, veh.id, veh.operativo)} className={`w-16 h-9 rounded-full p-1.5 transition-all shadow-inner ${veh.operativo ? 'bg-emerald-500' : 'bg-red-500'}`} >
                              <div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-md ${veh.operativo ? 'translate-x-7' : ''}`} />
                            </button>
                          </div>

                          <div className="flex flex-col lg:flex-row justify-between gap-16">
                            <div className="flex-1 space-y-12">
                              <div className="flex flex-wrap justify-between items-center gap-8">
                                <div className="flex items-center gap-8">
                                  <div className={`p-6 rounded-[2rem] shadow-2xl transition-all ${!veh.operativo ? 'bg-red-600 text-white' : isAlert ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-950 text-white shadow-slate-950/40'}`}><Truck size={48} /></div>
                                  <div>
                                    <h4 className="text-4xl sm:text-5xl font-black tracking-tighter mb-1">{veh.nombre}</h4>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.4em] opacity-60">ID ASSET: #{veh.id}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                                  <GuantesButton variant="outline" onClick={() => setShowLogForm(veh.id)}><Activity size={20}/> Carga Diaria</GuantesButton>
                                  <GuantesButton variant="secondary" onClick={() => downloadVehiclePDF(selectedCompany, veh)}><FileDown size={20}/></GuantesButton>
                                  <GuantesButton onClick={() => setShowServiceForm(veh.id)}><CheckCircle2 size={20}/> Service</GuantesButton>
                                </div>
                              </div>

                              {/* BARRA DE VIDA ÚTIL MEJORADA */}
                              <div className={`p-10 rounded-[3rem] border-2 space-y-8 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <div className="flex justify-between items-end">
                                   <div className="space-y-1">
                                      <span className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2"><ClipboardList size={16} className="text-orange-500"/> Ciclo de Vida del Aceite</span>
                                      <p className="text-sm font-bold text-slate-500 italic">Próxima renovación a las {SERVICE_INTERVAL_DEFAULT} hs de ciclo.</p>
                                   </div>
                                   <span className={`text-5xl font-black tracking-tighter ${isAlert ? 'text-red-600 animate-pulse' : ''}`}>{progress.toFixed(1)}%</span>
                                </div>
                                
                                {isAlert ? (
                                   <div className="bg-red-600 text-white p-8 rounded-3xl text-center animate-bounce shadow-2xl">
                                      <p className="font-black text-3xl uppercase tracking-tighter mb-1">¡ALERTA TÉCNICA!</p>
                                      <p className="font-black text-xs uppercase tracking-widest opacity-80">Riesgo de daño en motor por horas vencidas</p>
                                   </div>
                                ) : (
                                   <div className="h-10 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden shadow-inner border dark:border-slate-800">
                                      <div 
                                        className={`h-full transition-all duration-1000 ease-out shadow-2xl ${getVidaUtilColor(progress)}`} 
                                        style={{ width: `${progress}%` }}
                                      ></div>
                                   </div>
                                )}
                              </div>

                              {/* GRILLA DE DATOS TÉCNICOS */}
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                  { label: 'HORÓMETRO ACTUAL', val: veh.horometroTotal, icon: Clock, unit: 'hs' },
                                  { label: 'HORAS CONSUMIDAS', val: hsConsumidas, icon: History, unit: 'hs' },
                                  { label: 'HORAS RESTANTES', val: hsRestantes.toFixed(0), icon: Wrench, unit: 'hs', color: isAlert ? 'text-red-600 font-black' : '' },
                                  { label: 'TOTAL INVERTIDO', val: `$${veh.eventos.reduce((a, b) => a + (b.costo || 0), 0).toLocaleString()}`, icon: DollarSign, unit: 'AR$', color: 'text-emerald-500' }
                                ].map((s, i) => (
                                  <div key={i} className={`p-8 rounded-[2.5rem] border-2 transition-all hover:scale-105 hover:border-orange-500 ${darkMode ? 'bg-slate-900 border-slate-800 shadow-none' : 'bg-white border-slate-50 shadow-sm'}`}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><s.icon size={14} className="text-orange-600"/> {s.label}</p>
                                    <p className={`text-4xl font-black tracking-tighter ${s.color || ''}`}>{s.val} <span className="text-[10px] font-bold opacity-30 tracking-normal uppercase">{s.unit}</span></p>
                                  </div>
                                ))}
                              </div>

                              {/* BITÁCORA TÉCNICA - AJUSTADA PARA MOBILE */}
                              <div className="pt-12">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2 px-2"><History size={18} className="text-orange-500"/> HISTORIAL DE VIDA ÚTIL</h5>
                                <div className="overflow-x-auto rounded-[3rem] border-2 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                  <table className="w-full text-left text-sm min-w-[700px]">
                                    <thead className="bg-slate-950 text-white uppercase text-[10px] tracking-widest font-black">
                                      <tr>
                                        <th className="px-10 py-6">Evento / Fecha</th>
                                        <th className="px-10 py-6 text-center">Horas</th>
                                        <th className="px-10 py-6">Observaciones Técnicas</th>
                                        <th className="px-10 py-6 text-right">Inversión</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-50 dark:divide-slate-800">
                                      {[...veh.eventos].reverse().map((ev) => (
                                        <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                          <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                              <div className={`p-2.5 rounded-xl ${ev.tipo === 'SERVICE' ? 'bg-orange-100 text-orange-600' : ev.tipo === 'BAJA' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {ev.tipo === 'REGISTRO' && <Fuel size={18} />}
                                                {ev.tipo === 'SERVICE' && <Wrench size={18} />}
                                                {ev.tipo === 'BAJA' && <AlertCircle size={18} />}
                                                {ev.tipo === 'ALTA' && <CheckCircle2 size={18} />}
                                              </div>
                                              <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">{ev.tipo}</p>
                                                <p className="text-[10px] text-slate-400 font-black">{ev.fecha}</p>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-10 py-6 font-black text-xl text-center">{ev.horas || '--'}</td>
                                          <td className="px-10 py-6">
                                            {ev.tipo === 'REGISTRO' && <p className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-tighter"><Fuel size={12}/> Carga: {ev.litros} Litros</p>}
                                            {ev.tipo === 'BAJA' && <p className="text-xs font-black text-red-600 italic">MOTIVO: {ev.motivo}</p>}
                                            {ev.tipo === 'SERVICE' && <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">MEC: {ev.tecnico} • {ev.insumos.join(', ')}</p>}
                                            {ev.tipo === 'ALTA' && <p className="text-[10px] font-black text-emerald-500 uppercase">Equip. Operativo</p>}
                                          </td>
                                          <td className="px-10 py-6 text-right font-black text-sm">
                                            {ev.costo ? <span className="text-emerald-500 font-black tracking-tighter">${ev.costo.toLocaleString()}</span> : <span className="text-slate-200">--</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
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

        {/* MODALES REUTILIZADOS - ESTILO GUANTES UI */}
        {showServiceForm && (
          <Modal title="Reporte Técnico de Mantenimiento" onClose={() => setShowServiceForm(null)}>
            <ServiceFormContent 
              onSubmit={(data) => handleCloseService(selectedCompany.id, showServiceForm, data)}
              darkMode={darkMode}
              GuantesInput={GuantesInput}
              GuantesButton={GuantesButton}
            />
          </Modal>
        )}

        {showDowntimeForm && (
          <Modal title="Certificado de Parada Técnica" onClose={() => setShowDowntimeForm(null)}>
             <DowntimeFormContent 
               onSubmit={(motivo) => {
                 setCompanies(prev => prev.map(emp => emp.id === showDowntimeForm.companyId ? {
                   ...emp,
                   vehiculos: emp.vehiculos.map(v => v.id === showDowntimeForm.vehicleId ? {
                     ...v, operativo: false, motivoBaja: motivo,
                     eventos: [...v.eventos, { id: Date.now(), tipo: 'BAJA', fecha: new Date().toLocaleDateString(), motivo }]
                   } : v)
                 } : emp));
                 setShowDowntimeForm(null);
               }}
               darkMode={darkMode}
               GuantesButton={GuantesButton}
             />
          </Modal>
        )}

        {showLogForm && (
          <Modal title="Control Diario Operativo" onClose={() => setShowLogForm(null)}>
             <LogFormContent 
               onSubmit={(data) => addDailyLog(selectedCompany.id, showLogForm, data)}
               GuantesInput={GuantesInput}
               GuantesButton={GuantesButton}
             />
          </Modal>
        )}

        {showCompanyForm && (
          <Modal title="Apertura de Cuenta Cliente" onClose={() => setShowCompanyForm(false)}>
             <CompanyFormContent 
               onSubmit={handleAddCompany}
               GuantesInput={GuantesInput}
               GuantesButton={GuantesButton}
               darkMode={darkMode}
             />
          </Modal>
        )}

        {showVehicleForm && (
          <Modal title="Vinculación de Nuevo Equipo" onClose={() => setShowVehicleForm(false)}>
            <VehicleFormContent 
              onSubmit={(data) => handleAddVehicle(selectedCompany.id, data)}
              GuantesInput={GuantesInput}
              GuantesButton={GuantesButton}
            />
          </Modal>
        )}

        {scanning && (
          <div className="fixed inset-0 z-[200] bg-slate-950/95 flex items-center justify-center p-10 text-center animate-in fade-in duration-700">
             <div className="space-y-10">
                <div className="w-80 h-80 border-4 border-orange-600 rounded-[3rem] relative overflow-hidden flex items-center justify-center shadow-2xl shadow-orange-900/40">
                   <div className="absolute w-full h-2 bg-orange-600 animate-bounce top-0" />
                   <QrCode size={140} className="text-white opacity-20" />
                </div>
                <div className="space-y-2">
                   <p className="text-white font-black text-3xl tracking-tighter uppercase animate-pulse">Sincronizando Sensor...</p>
                   <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Apunta la cámara al activo industrial</p>
                </div>
                <button onClick={() => setScanning(false)} className="text-white font-black uppercase text-xs tracking-widest border-2 border-slate-800 px-10 py-5 rounded-3xl hover:bg-white hover:text-black transition-all">Cancelar</button>
             </div>
          </div>
        )}

      </div>
    </ThemeWrapper>
  );
};

// --- Sub-componentes de Formulario ---

const ServiceFormContent = ({ onSubmit, darkMode, GuantesInput, GuantesButton }) => {
  const [form, setForm] = useState({ tecnico: '', costo: '', selectedItems: [] });
  const items = ['Filtro Aceite', 'Filtro Aire', 'Filtro Combustible', 'Aceite Motor', 'Engrase Total', 'Hidráulico'];
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Operario Responsable</label>
        <GuantesInput value={form.tecnico} onChange={e => setForm({...form, tecnico: e.target.value})} placeholder="Nombre del Mecánico" />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Costo Total del Mantenimiento</label>
        <div className="relative">
           <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600" size={24}/>
           <GuantesInput type="number" value={form.costo} onChange={e => setForm({...form, costo: e.target.value})} placeholder="0.00" style={{paddingLeft: '3.5rem'}} />
        </div>
      </div>
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Insumos Reemplazados</label>
        <div className="grid grid-cols-2 gap-3">
          {items.map(item => (
            <button key={item} onClick={() => setForm(f => ({...f, selectedItems: f.selectedItems.includes(item) ? f.selectedItems.filter(i => i !== item) : [...f.selectedItems, item]}))} className={`p-6 rounded-3xl border-2 font-black text-xs uppercase tracking-tight transition-all ${form.selectedItems.includes(item) ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <GuantesButton disabled={!form.tecnico} onClick={() => onSubmit({ tecnico: form.tecnico, insumos: form.selectedItems, costo: form.costo })}>CERTIFICAR SERVICE</GuantesButton>
    </div>
  );
};

const DowntimeFormContent = ({ onSubmit, darkMode, GuantesButton }) => {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Describa la anomalía técnica</label>
        <textarea required value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Pérdida de presión en bomba hidráulica..." className={`w-full p-8 rounded-[2rem] border-2 font-black text-lg outline-none transition-all ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-red-600' : 'bg-slate-50 border-slate-100 focus:border-red-600'}`} rows="5" />
      </div>
      <GuantesButton variant="danger" disabled={!motivo} onClick={() => onSubmit(motivo)}>INFORMAR PARADA TÉCNICA</GuantesButton>
    </div>
  );
};

const LogFormContent = ({ onSubmit, GuantesInput, GuantesButton }) => {
  const [horas, setHoras] = useState('');
  const [litros, setLitros] = useState('');
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Horómetro Actual del Tablero</label>
        <GuantesInput type="number" value={horas} onChange={e => setHoras(e.target.value)} placeholder="00000.0" style={{textAlign: 'center', fontSize: '2.5rem', height: '100px'}} />
      </div>
      <div className="space-y-2 text-center">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Litros de Combustible Cargados</label>
        <GuantesInput type="number" value={litros} onChange={e => setLitros(e.target.value)} placeholder="0" style={{textAlign: 'center', fontSize: '2.5rem', height: '100px'}} />
      </div>
      <GuantesButton disabled={!horas || !litros} onClick={() => onSubmit({ horas, litros })}>GUARDAR DATOS DIARIOS</GuantesButton>
    </div>
  );
};

// --- FORMULARIO DE EMPRESA COMPLETO - RESTAURADO SEGÚN LEY ---
const CompanyFormContent = ({ onSubmit, GuantesInput, GuantesButton, darkMode }) => {
  const [form, setForm] = useState({ 
    nombre: '', 
    cuit: '', 
    mail: '', 
    tel: '', 
    responsable: '', 
    observaciones: '' 
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre / Razón Social</label><GuantesInput required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Techint S.A." /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">CUIT (Sin guiones)</label><GuantesInput required value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} placeholder="30123456789" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Mail de contacto</label><GuantesInput required type="email" value={form.mail} onChange={e => setForm({...form, mail: e.target.value})} placeholder="admin@empresa.com" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Teléfono / WhatsApp</label><GuantesInput required value={form.tel} onChange={e => setForm({...form, tel: e.target.value})} placeholder="+54 9..." /></div>
        <div className="sm:col-span-2 space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Responsable del Área</label><GuantesInput required value={form.responsable} onChange={e => setForm({...form, responsable: e.target.value})} placeholder="Nombre completo del encargado" /></div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Observaciones Especiales</label>
        <textarea 
          value={form.observaciones} 
          onChange={e => setForm({...form, observaciones: e.target.value})} 
          placeholder="Escriba aquí notas relevantes..." 
          rows="3"
          className={`w-full p-6 rounded-3xl border-2 font-black text-sm outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-800 focus:border-orange-500' : 'bg-white border-slate-100 focus:border-orange-600'}`}
        />
      </div>
      <GuantesButton disabled={!form.nombre || !form.cuit} onClick={() => onSubmit(form)}>REGISTRAR EMPRESA EN SISTEMA</GuantesButton>
    </div>
  );
};

// --- FORMULARIO DE EQUIPO COMPLETO - RESTAURADO SEGÚN LEY ---
const VehicleFormContent = ({ onSubmit, GuantesInput, GuantesButton }) => {
  const [form, setForm] = useState({ nombre: '', horometroInicial: '' });
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nombre del Activo / Modelo</label>
        <GuantesInput required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Excavadora CAT 320 GC" style={{textAlign: 'center'}} />
      </div>
      <div className="space-y-2 text-center">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Horómetro Actual de Entrada</label>
        <GuantesInput required type="number" value={form.horometroInicial} onChange={e => setForm({...form, horometroInicial: e.target.value})} placeholder="0" style={{textAlign: 'center', fontSize: '2.5rem', height: '100px'}} />
      </div>
      <GuantesButton disabled={!form.nombre || !form.horometroInicial} onClick={() => onSubmit(form)}>VINCULAR EQUIPO A FLOTA</GuantesButton>
    </div>
  );
};

export default App;
