import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from './Icons.jsx';
import { ModalComp, FuelTankCapsule } from './Components.jsx';
import { db, auth, APP_ID, collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, setDoc, getDoc } from './firebaseConfig.js';

const App = () => {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [expandedVehicles, setExpandedVehicles] = useState(new Set());
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [modalType, setModalType] = useState(null);
    const [activeVehicleId, setActiveVehicleId] = useState(null);
    const [scannerActive, setScannerActive] = useState(false);
    const scannerRef = useRef(null);
    const chartRef = useRef(null);

    const [bndSettings, setBndSettings] = useState({
        name: "BND EQUIPOS S.A.",
        description: "Mantenimiento Industrial & Gestión de Activos Críticos",
        address: "Parque Industrial Logístico, Nave 4",
        phone: "+54 9 11 5555-0101",
        email: "tecnica@bndequipos.com",
        web: "www.bndequipos.com"
    });

    const [form, setForm] = useState({ 
        nombre: '', cuit: '', responsable: '', mail: '', tel: '',
        marca: '', modelo: '', serie: '', patente: '', año: '', serviceInterval: 250, 
        horometro: '', horas: '', litros: '', nota: '', motivo: '', tankCapacity: 1000,
        insumos: [], insumoManual: '', fecha: new Date().toISOString().split('T')[0]
    });

    // --- SINCRONIZACIÓN FIREBASE ---
    useEffect(() => {
        const initSync = async () => {
            if (!db || !auth) return;
            auth.onAuthStateChanged((u) => {
                setUser(u);
                if (u) {
                    const configRef = doc(db, "artifacts", APP_ID, "public", "data", "config", "bnd_info");
                    getDoc(configRef).then(snap => { if(snap.exists()) setBndSettings(snap.data()); });

                    const q = collection(db, "artifacts", APP_ID, "public", "data", "companies");
                    const unsub = onSnapshot(q, (snapshot) => {
                        setCompanies(snapshot.docs.map(document => ({ id: document.id, ...document.data() })));
                        setLoading(false);
                    });
                    return () => unsub();
                } else { setLoading(false); }
            });
        };
        initSync();
    }, []);

    // --- CÁLCULOS MEMOIZADOS ---
    const alerts = useMemo(() => {
        let list = [];
        companies.forEach(emp => {
            const fuelPerc = ((emp.currentFuel || 0) / (emp.tankCapacity || 1000)) * 100;
            if (fuelPerc <= 25) list.push({ type: 'FUEL', companyName: emp.nombre, companyId: emp.id, value: fuelPerc.toFixed(1) });
            
            (emp.vehiculos || []).forEach(veh => {
                if (!veh.operativo) {
                    list.push({ 
                        type: 'BREAKDOWN', ...veh, companyId: emp.id, companyName: emp.nombre,
                        workflowStatus: veh.workflowStatus || 'PENDIENTE',
                        breakageMotive: (veh.eventos || []).slice().reverse().find(e => e.tipo === 'BAJA')?.motivo || "Falla técnica no reportada"
                    });
                }
                const rest = (parseFloat(veh.serviceInterval) || 250) - ((parseFloat(veh.horometroTotal) || 0) - (parseFloat(veh.ultimoServiceHoras) || 0));
                if (rest < 50 && veh.operativo) list.push({ type: 'MAINTENANCE', ...veh, companyId: emp.id, companyName: emp.nombre, rest });
            });
        });
        return list.sort((a,b) => (a.type === 'BREAKDOWN' ? -1 : 1));
    }, [companies]);

    const projectionsData = useMemo(() => {
        let list = [];
        companies.forEach(emp => {
            (emp.vehiculos || []).forEach(veh => {
                const regs = (veh.eventos || []).filter(e => e.tipo === 'REGISTRO').sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
                let avg = 0; 
                if (regs.length >= 2) { 
                    const dH = (parseFloat(regs[regs.length-1].horas) || 0) - (parseFloat(regs[0].horas) || 0); 
                    const dD = Math.max(1, (new Date(regs[regs.length-1].fecha) - new Date(regs[0].fecha)) / 86400000); 
                    avg = dH / dD; 
                }
                const restHs = (parseFloat(veh.serviceInterval) || 250) - ((parseFloat(veh.horometroTotal) || 0) - (parseFloat(veh.ultimoServiceHoras) || 0));
                let dateEst = null; 
                if (avg > 0 && restHs > 0) { 
                    dateEst = new Date(); dateEst.setDate(dateEst.getDate() + Math.ceil(restHs / avg)); 
                }
                list.push({ ...veh, empresaNombre: emp.nombre, companyId: emp.id, estDate: dateEst, avgUsage: avg, restHs: restHs });
            });
        });
        return list.sort((a,b) => (a.estDate || Infinity) - (b.estDate || Infinity));
    }, [companies]);

    const activeCompany = useMemo(() => companies.find(c => c.id === selectedCompanyId), [companies, selectedCompanyId]);

    // --- GRÁFICOS ---
    useEffect(() => {
        if (modalType === 'details' && activeCompany && chartRef.current) {
            const ctx = chartRef.current.getContext('2d');
            let allEvents = activeCompany.vehiculos.flatMap(v => (v.eventos || []).filter(e => e.litros > 0));
            const labels = Array.from({length: 6}, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); return d.toISOString().substring(0, 7); });
            const dataPoints = labels.map(m => allEvents.filter(e => e.fecha && e.fecha.startsWith(m)).reduce((sum, e) => sum + parseFloat(e.litros || 0), 0));
            
            if (window.myChartCompVFinal) window.myChartCompVFinal.destroy();
            window.myChartCompVFinal = new window.Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels.map(m => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][parseInt(m.split('-')[1])-1]),
                    datasets: [{ label: 'Diésel (L)', data: dataPoints, borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.05)', fill: true, tension: 0.4, borderWidth: 3 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    }, [modalType, activeCompany]);

    // --- MANEJADORES ---
    const saveBndSettings = async () => {
        const docRef = doc(db, "artifacts", APP_ID, "public", "data", "config", "bnd_info");
        await setDoc(docRef, bndSettings);
        setActiveTab('dashboard');
    };

    const handleAddCompany = async () => {
        if(!form.nombre) return;
        const coll = collection(db, "artifacts", APP_ID, "public", "data", "companies");
        await addDoc(coll, { 
            nombre: form.nombre, cuit: form.cuit, responsable: form.responsable, 
            tankCapacity: parseFloat(form.tankCapacity) || 1000, 
            currentFuel: parseFloat(form.tankCapacity) || 1000, 
            vehiculos: [] 
        });
        setModalType(null); setForm({...form, nombre: '', cuit: '', responsable: ''});
    };

    const handleDailyLog = async () => {
        if (!form.horas || !form.litros) return;
        const h = parseFloat(form.horas); const l = parseFloat(form.litros);
        const updated = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, horometroTotal: h, eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'REGISTRO', fecha: form.fecha, horas: h, litros: l, nota: form.nota }] } : v);
        const newFuel = Math.max(0, (activeCompany.currentFuel || 0) - l);
        await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated, currentFuel: newFuel });
        setModalType(null); setForm({ ...form, horas: '', litros: '', nota: '' });
    };

    const handleToggleStatus = async (vId, currentStatus) => {
        if(currentStatus) { setActiveVehicleId(vId); setModalType('downtime'); }
        else {
            const updated = activeCompany.vehiculos.map(v => v.id === vId ? { ...v, operativo: true, workflowStatus: 'PENDIENTE', eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'ALTA', fecha: new Date().toLocaleDateString(), nota: 'Revitalización Manual' }] } : v);
            await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        }
    };

    const handleConfirmDowntime = async () => {
        const updated = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, operativo: false, workflowStatus: 'PENDIENTE', eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'BAJA', fecha: new Date().toLocaleDateString(), motivo: form.motivo }] } : v);
        await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        setModalType(null); setForm({...form, motivo: ''});
    };

    const handleUpdateWorkflow = async (cId, vId, newStatus) => {
        if (newStatus === 'REPARADO') { setActiveVehicleId(vId); setSelectedCompanyId(cId); setModalType('repair_finish'); return; }
        const comp = companies.find(c => c.id === cId);
        const updated = comp.vehiculos.map(v => v.id === vId ? { ...v, workflowStatus: newStatus } : v);
        await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "companies", cId), { vehiculos: updated });
    };

    const handleRepairSubmit = async () => {
        const comp = companies.find(c => c.id === selectedCompanyId);
        const updated = comp.vehiculos.map(v => v.id === activeVehicleId ? { ...v, operativo: true, workflowStatus: 'PENDIENTE', eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'REPARACION', fecha: new Date().toLocaleDateString(), nota: form.nota }] } : v);
        await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "companies", selectedCompanyId), { vehiculos: updated });
        setModalType(null); setForm({...form, nota: ''});
        setActiveTab('companies');
    };

    const handleAddVehicle = async () => {
        const ref = doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id);
        const h = parseFloat(form.horometro) || 0;
        const v = { id: Date.now().toString(), ...form, horometroTotal: h, ultimoServiceHoras: h, operativo: true, workflowStatus: 'PENDIENTE', eventos: [{ id: Date.now(), tipo: 'ALTA', fecha: new Date().toLocaleDateString(), horas: h, nota: 'Alta inicial' }] };
        await updateDoc(ref, { vehiculos: arrayUnion(v) });
        setModalType(null);
    };

    const handleHistoricalData = async () => {
        const h = parseFloat(form.horas);
        if(isNaN(h)) return;
        const updated = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, horometroTotal: Math.max(v.horometroTotal, h), eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'REGISTRO', fecha: form.fecha, horas: h, nota: "Sincronización Histórica" }] } : v);
        await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        setModalType(null);
    };

    const handleServiceReset = async () => {
        const updated = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, ultimoServiceHoras: v.horometroTotal, eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'SERVICE', fecha: new Date().toLocaleDateString(), horas: v.horometroTotal, insumos: form.insumos, nota: form.nota }] } : v);
        await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        setModalType(null); setForm({...form, insumos: [], nota: ''});
    };

    const refillTank = async () => {
        await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { currentFuel: activeCompany.tankCapacity });
        setModalType(null);
    };

    const downloadPDF = (company, vehicle) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 45, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text(bndSettings.name.toUpperCase(), 15, 25);
        doc.setFontSize(10); doc.text(bndSettings.description, 15, 33);
        doc.setFillColor(251, 191, 36); doc.rect(0, 45, 210, 2, 'F');
        doc.setTextColor(15, 23, 42); doc.setFontSize(14); doc.text("EXPEDIENTE TECNICO DE UNIDAD", 15, 60);
        doc.setFontSize(10); doc.text(`Cliente: ${company.nombre}`, 15, 75); doc.text(`Equipo: ${vehicle.nombre} | Patente: ${vehicle.patente || '-'}`, 15, 82);
        const tableData = (vehicle.eventos || []).slice().reverse().map(ev => [ev.fecha, ev.tipo, `${ev.horas || '-'} HS`, ev.litros || '-', ev.nota || ev.motivo || '-']);
        doc.autoTable({ startY: 90, head: [['FECHA', 'TIPO', 'HS', 'DIESEL', 'DETALLES']], body: tableData, headStyles: { fillColor: [15, 23, 42] } });
        doc.save(`Expediente_${vehicle.nombre}.pdf`);
    };

    const startScanner = () => {
        setScannerActive(true);
        setTimeout(() => {
            scannerRef.current = new window.Html5Qrcode("reader");
            scannerRef.current.start({ facingMode: "environment" }, { fps: 10, qrbox: 200 }, (txt) => {
                if (txt.startsWith("sp-asset:")) { const [_, cId, vId] = txt.split(":"); setSelectedCompanyId(cId); setActiveTab('companies'); setScannerActive(false); scannerRef.current.stop(); }
            }, () => {}).catch(err => console.error(err));
        }, 500);
    };

    const generateQR = (vId) => {
        const div = document.getElementById(`qr-container-${vId}`);
        if(!div) return;
        div.innerHTML = "";
        new window.QRCode(div, { text: `sp-asset:${selectedCompanyId}:${vId}`, width: 160, height: 160, colorDark : "#0f172a", colorLight : "#ffffff" });
    };

    const toggleHistory = (id) => { const ns = new Set(expandedVehicles); if (ns.has(id)) ns.delete(id); else ns.add(id); setExpandedVehicles(ns); };

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-slate-900 border-t-yellow-400 rounded-full animate-spin"></div></div>;

    return (
        <div className="flex h-screen bg-slate-50 relative overflow-hidden leading-none text-slate-900">
            
            {/* SIDEBAR */}
            <aside className={`sidebar-mobile lg:w-64 bg-white border-r border-slate-200 p-6 flex flex-col lg:static ${sidebarOpen ? 'open' : ''}`}>
                <div className="flex items-center justify-between lg:justify-start gap-3 mb-10 leading-none">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg"><Icon name="wrench" size={18} className="text-black"/></div>
                        <h1 className="text-lg font-extrabold uppercase italic tracking-tighter leading-none">BND Pro</h1>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 leading-none"><Icon name="x" size={18}/></button>
                </div>
                <nav className="space-y-1.5 flex-1 overflow-y-auto leading-none">
                    {[
                        { id: 'dashboard', label: 'Panel de Alertas', icon: 'dashboard' },
                        { id: 'companies', label: 'Directorio', icon: 'company' },
                        { id: 'calendar', label: 'Proyecciones', icon: 'calendar' },
                        { id: 'config', label: 'Configuración', icon: 'settings' }
                    ].map(item => (
                        <button key={item.id} onClick={() => {setActiveTab(item.id); setSelectedCompanyId(null); setSidebarOpen(false);}} 
                            className={`w-full p-3.5 rounded-xl transition-all flex items-center gap-3 font-bold text-xs leading-none ${activeTab === item.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}>
                            <Icon name={item.icon} size={16}/> <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="pt-6 border-t leading-none">
                     <button onClick={startScanner} className="w-full p-3.5 bg-yellow-400 text-black rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase shadow-md shadow-yellow-100 transition-transform active:scale-95 transition-all"><Icon name="qr" size={14}/> <span>Escanear</span></button>
                </div>
            </aside>

            <main className="flex-1 p-5 sm:p-8 lg:p-10 overflow-y-auto relative leading-none">
                <header className="lg:hidden absolute top-0 left-0 w-full h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md z-40 border-b leading-none">
                     <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-50 rounded-lg leading-none"><Icon name="menu" size={18}/></button>
                     <h1 className="text-sm font-black uppercase tracking-widest italic leading-none">BND EQUIPOS</h1>
                     <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center shadow-md"><Icon name="wrench" size={16} className="text-black"/></div>
                </header>

                {activeTab === 'dashboard' && (
                    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pt-10 lg:pt-0 leading-none">
                        <div className="px-2 leading-none"><h2 className="text-3xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">Panel de Alertas</h2></div>
                        <div className="grid gap-4 leading-none">
                            {alerts.map((a, i) => {
                                const statusColors = { 'PENDIENTE': 'border-l-red-500 bg-red-50/10', 'VISTA': 'border-l-orange-500 bg-orange-50/10', 'REVISION': 'border-l-yellow-400 bg-yellow-50/10' };
                                const colorClass = a.type === 'BREAKDOWN' ? statusColors[a.workflowStatus] : a.type === 'FUEL' ? 'border-l-amber-500 bg-amber-50/10' : 'border-l-yellow-400';
                                return (
                                    <div key={i} className={`glass-card p-5 flex flex-col md:flex-row justify-between items-center gap-6 border-l-[10px] ${colorClass}`}>
                                        <div className="flex items-center gap-6 w-full leading-none group">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${a.type === 'BREAKDOWN' ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-400 text-black shadow-lg'}`}>
                                                <Icon name={a.type === 'FUEL' ? 'fuel' : 'alert'} size={24}/>
                                            </div>
                                            <div className="leading-none">
                                                <h4 className="text-lg font-black uppercase italic leading-none mb-1.5 tracking-tight">{a.nombre || (a.type === 'FUEL' ? 'STOCK BAJO' : 'AVISO')}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{a.companyName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 leading-none">
                                            <div className="text-right leading-none shrink-0 min-w-[100px]">
                                                {a.type === 'BREAKDOWN' ? (
                                                    <div className="space-y-1.5 leading-none"><p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none">{a.workflowStatus}</p><p className="text-[9px] font-bold text-slate-400 italic max-w-[180px] truncate">{a.breakageMotive}</p></div>
                                                ) : a.type === 'MAINTENANCE' ? (
                                                    <p className="text-2xl font-black text-slate-900 leading-none">-{a.rest?.toFixed(1)} HS</p>
                                                ) : (
                                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">Stock: {a.value}%</p>
                                                )}
                                            </div>
                                            {a.type === 'BREAKDOWN' ? (
                                                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 shrink-0 leading-none">
                                                    {[
                                                        { id: 'PENDIENTE', label: 'Pendiente', color: 'bg-red-500' },
                                                        { id: 'VISTA', label: 'Vista', color: 'bg-orange-500' },
                                                        { id: 'REVISION', label: 'En Revisión', color: 'bg-yellow-400' },
                                                        { id: 'REPARADO', label: 'Reparado', color: 'bg-emerald-500' }
                                                    ].map(step => (
                                                        <button key={step.id} onClick={() => handleUpdateWorkflow(a.companyId, a.id, step.id)}
                                                            className={`workflow-step ${a.workflowStatus === step.id ? `${step.color} ${step.id === 'REVISION' ? 'text-black' : 'text-white'} active shadow-md` : 'text-slate-400 hover:text-slate-600'}`}>
                                                            {step.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <button onClick={() => { setSelectedCompanyId(a.companyId); setActiveTab('companies'); }} className="btn-premium px-5 py-2.5 text-[9px] uppercase shadow-md">Detalle</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'companies' && !activeCompany && (
                    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-20 pt-10 lg:pt-0 leading-none">
                        <div className="flex justify-between items-end border-b pb-6 px-2 leading-none">
                            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Directorio</h2>
                            <button onClick={() => setModalType('company')} className="btn-accent px-8 py-4 text-[9px] uppercase shadow-xl">Nuevo Cliente</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 leading-none">
                            {companies.map(emp => (
                                <div key={emp.id} className="glass-card p-6 flex flex-col min-h-[300px] transition-all leading-none">
                                    <div className="flex justify-between items-start mb-6 leading-none">
                                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-yellow-400 shadow-xl"><Icon name="company" size={24}/></div>
                                        <FuelTankCapsule capacity={emp.tankCapacity || 1000} current={emp.currentFuel || 0} />
                                    </div>
                                    <h3 className="text-xl font-black uppercase italic mb-1.5 truncate tracking-tight leading-none">{emp.nombre}</h3>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-8 leading-none">CUIT: {emp.cuit}</p>
                                    <div className="mt-auto flex gap-3 leading-none">
                                        <button onClick={() => setSelectedCompanyId(emp.id)} className="flex-1 btn-premium py-3.5 text-[9px] uppercase tracking-widest shadow-md">Ver Flota</button>
                                        <button onClick={() => { setSelectedCompanyId(emp.id); setModalType('details'); }} className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-yellow-400 transition-all"><Icon name="chart" size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="max-w-3xl mx-auto space-y-10 animate-fade-in pt-10 lg:pt-0 leading-none">
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Configuración</h2>
                        <div className="glass-card p-10 space-y-8 shadow-2xl leading-none">
                            <div className="grid grid-cols-1 gap-6 leading-none">
                                <div className="space-y-2 leading-none"><label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Razón Social</label><input className="w-full input-premium font-black shadow-inner" value={bndSettings.name} onChange={e => setBndSettings({...bndSettings, name: e.target.value})} /></div>
                                <div className="space-y-2 leading-none"><label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Eslogan Corporativo</label><input className="w-full input-premium shadow-inner" value={bndSettings.description} onChange={e => setBndSettings({...bndSettings, description: e.target.value})} /></div>
                                <div className="space-y-2 leading-none"><label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Dirección Física</label><input className="w-full input-premium shadow-inner" value={bndSettings.address} onChange={e => setBndSettings({...bndSettings, address: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4 leading-none">
                                    <div className="space-y-2 leading-none"><label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Teléfono</label><input className="w-full input-premium shadow-inner" value={bndSettings.phone} onChange={e => setBndSettings({...bndSettings, phone: e.target.value})} /></div>
                                    <div className="space-y-2 leading-none"><label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Email Técnico</label><input className="w-full input-premium shadow-inner" value={bndSettings.email} onChange={e => setBndSettings({...bndSettings, email: e.target.value})} /></div>
                                </div>
                            </div>
                            <button onClick={saveBndSettings} className="btn-premium w-full p-6 text-[11px] uppercase tracking-widest mt-4 shadow-2xl transition-all">Impactar Membrete</button>
                        </div>
                    </div>
                )}

                {activeCompany && (
                    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300 pb-20 pt-10 lg:pt-0 leading-none">
                        <button onClick={() => setSelectedCompanyId(null)} className="flex items-center gap-2 font-black text-[9px] uppercase hover:text-yellow-600 transition-all mb-4 group leading-none"><Icon name="chevronLeft" size={14}/> Directorio</button>
                        <div className="glass-card p-8 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 bg-slate-900 text-white relative overflow-hidden border-none shadow-xl leading-none">
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-yellow-400/5 blur-[80px] pointer-events-none"></div>
                            <div className="space-y-4 relative z-10 leading-none"><h2 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter leading-none">{activeCompany.nombre}</h2><div className="flex flex-wrap gap-2 leading-none"><div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-[7px] font-black uppercase tracking-widest">{activeCompany.cuit}</div><div className="bg-yellow-400/10 text-yellow-400 px-3 py-1.5 rounded-lg border border-yellow-400/10 text-[7px] font-black uppercase tracking-widest italic">{activeCompany.responsable}</div></div></div>
                            <button onClick={() => setModalType('vehicle')} className="btn-accent px-8 py-4 text-[9px] uppercase relative z-10 shadow-2xl">Vincular Equipo</button>
                        </div>

                        <div className="grid gap-6 leading-none">
                            {(activeCompany.vehiculos || []).map(v => {
                                const hsCiclo
