const { useState, useEffect, useMemo, useRef } = React;
const { Icon, ModalComp, FuelTankCapsule, db, auth, APP_ID, fb, FIREBASE_API_KEY } = window;

const App = () => {
    // --- ESTADOS DE AUTENTICACIÓN Y ROLES ---
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); 
    const [authLoading, setAuthLoading] = useState(true);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [usersList, setUsersList] = useState([]);

    // Estados para gestión de contraseñas y nuevos usuarios
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'operario' });
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdError, setPwdError] = useState('');

    // --- ESTADOS DE LA APLICACIÓN ---
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [isolatedVehicleId, setIsolatedVehicleId] = useState(null);
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
        name: "BND",
        description: "Gestión de Activos Industriales",
        address: "-", phone: "-", email: "-", web: "-"
    });

    const [form, setForm] = useState({ 
        nombre: '', cuit: '', responsable: '', mail: '', tel: '',
        marca: '', modelo: '', serie: '', patente: '', año: '', serviceInterval: 250, 
        horometro: '', horas: '', litros: '', nota: '', motivo: '', tankCapacity: 1000,
        insumos: [], insumoManual: '', fecha: new Date().toISOString().split('T')[0]
    });

    // --- SINCRONIZACIÓN FIREBASE Y VERIFICACIÓN DE ROL ---
    useEffect(() => {
        const initSync = async () => {
            if (!db || !auth) return;
            fb.onAuthStateChanged(auth, async (u) => {
                if (u) {
                    setUser(u);
                    try {
                        const userDocRef = fb.doc(db, "artifacts", APP_ID, "public", "data", "users", u.uid);
                        const userDoc = await fb.getDoc(userDocRef);
                        if(userDoc.exists()) {
                            const userData = userDoc.data();
                            if (userData.role === 'suspendido') {
                                await fb.signOut(auth);
                                alert("Cuenta suspendida por administración.");
                                return;
                            }
                            setRole(userData.role); 
                            if (userData.requiresPasswordChange) setModalType('force_password_change');
                        } else {
                            await fb.setDoc(userDocRef, { email: u.email, role: 'operario', requiresPasswordChange: false });
                            setRole('operario');
                        }
                    } catch (e) { setRole('operario'); }

                    const configRef = fb.doc(db, "artifacts", APP_ID, "public", "data", "config", "bnd_info");
                    fb.getDoc(configRef).then(snap => { if(snap.exists()) setBndSettings(snap.data()); });

                    const q = fb.collection(db, "artifacts", APP_ID, "public", "data", "companies");
                    const unsub = fb.onSnapshot(q, (snapshot) => {
                        setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                        setLoading(false);
                        setAuthLoading(false);
                    });
                    return () => unsub();
                } else { 
                    setUser(null); setRole(null); setLoading(false); setAuthLoading(false); 
                }
            });
        };
        if (window.db) initSync();
        else window.addEventListener('firebase-ready', initSync);
    }, []);

    useEffect(() => {
        if (role === 'admin' && db) {
            const unsub = fb.onSnapshot(fb.collection(db, "artifacts", APP_ID, "public", "data", "users"), (snap) => {
                setUsersList(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
            });
            return () => unsub();
        }
    }, [role]);

    // --- MANEJADORES DE AUTENTICACIÓN ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthLoading(true); setLoginError('');
        try { await fb.signInWithEmailAndPassword(auth, loginEmail, loginPassword); } 
        catch (err) { setLoginError('Correo o contraseña incorrectos.'); setAuthLoading(false); }
    };

    const handleLogout = async () => { await fb.signOut(auth); setActiveTab('dashboard'); setIsolatedVehicleId(null); };

    const handleRegisterUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
                method: 'POST', body: JSON.stringify({ email: newUser.email, password: newUser.password, returnSecureToken: true })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            await fb.setDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", data.localId), {
                role: newUser.role, email: newUser.email, requiresPasswordChange: true
            });
            setModalType(null); setNewUser({ email: '', password: '', role: 'operario' });
            alert("Usuario creado. Se le pedirá cambiar la contraseña en su primer ingreso.");
        } catch (err) { alert(err.message); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setPwdError('No coinciden.'); return; }
        try {
            await fb.updatePassword(auth.currentUser, newPassword);
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", auth.currentUser.uid), { requiresPasswordChange: false });
            setModalType(null);
        } catch (err) { setPwdError('Error al actualizar. Intenta cerrar sesión y volver a entrar.'); }
    };

    const handleUpdateUserRole = async (uid, newRole) => {
        if(window.confirm(`¿Cambiar permisos a ${newRole.toUpperCase()}?`)) {
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", uid), { role: newRole });
        }
    };

    // --- LÓGICA DE NEGOCIO Y CÁLCULOS ---
    const activeCompany = useMemo(() => companies.find(c => c.id === selectedCompanyId), [companies, selectedCompanyId]);
    const activeVehicle = useMemo(() => activeCompany?.vehiculos?.find(v => v.id === activeVehicleId), [activeCompany, activeVehicleId]);
    
    // Filtro mágico para mostrar SÓLO el vehículo escaneado o toda la flota
    const displayedVehicles = useMemo(() => {
        if (!activeCompany) return [];
        if (isolatedVehicleId) return activeCompany.vehiculos.filter(v => v.id === isolatedVehicleId);
        return activeCompany.vehiculos;
    }, [activeCompany, isolatedVehicleId]);

    const alerts = useMemo(() => {
        let list = [];
        companies.forEach(emp => {
            const fuelPerc = ((emp.currentFuel || 0) / (emp.tankCapacity || 1000)) * 100;
            if (fuelPerc <= 25) list.push({ type: 'FUEL', companyName: emp.nombre, companyId: emp.id, value: fuelPerc.toFixed(1) });
            (emp.vehiculos || []).forEach(veh => {
                if (!veh.operativo) list.push({ type: 'BREAKDOWN', ...veh, companyId: emp.id, companyName: emp.nombre, workflowStatus: veh.workflowStatus || 'PENDIENTE', breakageMotive: (veh.eventos || []).slice().reverse().find(e => e.tipo === 'BAJA')?.motivo || "Falla" });
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
                let dateEst = null; if (avg > 0 && restHs > 0) { dateEst = new Date(); dateEst.setDate(dateEst.getDate() + Math.ceil(restHs / avg)); }
                list.push({ ...veh, empresaNombre: emp.nombre, companyId: emp.id, estDate: dateEst, avgUsage: avg, restHs: restHs });
            });
        });
        return list.sort((a,b) => (a.estDate || Infinity) - (b.estDate || Infinity));
    }, [companies]);

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

    // --- OPERACIONES ADMIN (CRUD) ---
    const saveBndSettings = async () => {
        const docRef = fb.doc(db, "artifacts", APP_ID, "public", "data", "config", "bnd_info");
        await fb.setDoc(docRef, bndSettings);
        setActiveTab('dashboard');
    };

    const handleDeleteCompany = async (id) => {
        if(confirm("Se eliminará la empresa y su flota. ¿Confirmar?")) {
            await fb.deleteDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", id));
        }
    };

    const handleEditCompanySubmit = async () => {
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", selectedCompanyId), {
            nombre: form.nombre, cuit: form.cuit, responsable: form.responsable, tankCapacity: parseFloat(form.tankCapacity)
        });
        setModalType(null);
    };

    const handleDeleteVehicle = async (vId) => {
        if(confirm("¿Eliminar equipo permanentemente?")) {
            const updated = activeCompany.vehiculos.filter(v => v.id !== vId);
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        }
    };

    const handleEditVehicleSubmit = async () => {
        const updated = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? {
            ...v, nombre: form.nombre, marca: form.marca, modelo: form.modelo, serie: form.serie, patente: form.patente, serviceInterval: parseFloat(form.serviceInterval)
        } : v);
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        setModalType(null);
    };

    const handleAddCompany = async () => {
        if(!form.nombre) return;
        const coll = fb.collection(db, "artifacts", APP_ID, "public", "data", "companies");
        await fb.addDoc(coll, { nombre: form.nombre, cuit: form.cuit, responsable: form.responsable, tankCapacity: parseFloat(form.tankCapacity) || 1000, currentFuel: parseFloat(form.tankCapacity) || 1000, vehiculos: [] });
        setModalType(null); setForm({...form, nombre: '', cuit: '', responsable: ''});
    };

    const handleAddVehicle = async () => {
        const h = parseFloat(form.horometro) || 0;
        const v = { id: Date.now().toString(), ...form, horometroTotal: h, ultimoServiceHoras: h, operativo: true, workflowStatus: 'PENDIENTE', eventos: [{ id: Date.now(), tipo: 'ALTA', fecha: new Date().toLocaleDateString(), horas: h, nota: 'Alta inicial' }] };
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: fb.arrayUnion(v) });
        setModalType(null);
    };

    // --- OPERACIONES DE CAMPO ---
    const handleDailyLog = async () => {
        const h = parseFloat(form.horas); const l = parseFloat(form.litros);
        const updated = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, horometroTotal: h, eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'REGISTRO', fecha: form.fecha, horas: h, litros: l, nota: form.nota }] } : v);
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated, currentFuel: Math.max(0, activeCompany.currentFuel - l) });
        setModalType(null); setForm({...form, horas: '', litros: '', nota: ''});
    };

    const handleToggleStatus = async (vId, active) => {
        if(active) { setActiveVehicleId(vId); setModalType('downtime'); }
        else {
            const updated = activeCompany.vehiculos.map(v => v.id === vId ? { ...v, operativo: true, workflowStatus: 'PENDIENTE', eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'ALTA', fecha: new Date().toLocaleDateString(), nota: 'Puesta en marcha' }] } : v);
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        }
    };

    const handleConfirmDowntime = async () => {
        const updated = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, operativo: false, workflowStatus: 'PENDIENTE', eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'BAJA', fecha: new Date().toLocaleDateString(), motivo: form.motivo }] } : v);
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        setModalType(null); setForm({...form, motivo: ''});
    };

    const handleUpdateWorkflow = async (cId, vId, ns) => {
        if(ns === 'REPARADO') { setActiveVehicleId(vId); setSelectedCompanyId(cId); setIsolatedVehicleId(null); setModalType('repair_finish'); return; }
        const c = companies.find(x => x.id === cId);
        const updated = c.vehiculos.map(v => v.id === vId ? {...v, workflowStatus: ns} : v);
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", cId), { vehiculos: updated });
    };

    const handleRepairSubmit = async () => {
        const comp = companies.find(c => c.id === selectedCompanyId);
        const updated = comp.vehiculos.map(v => v.id === activeVehicleId ? { ...v, operativo: true, workflowStatus: 'PENDIENTE', eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'REPARACION', fecha: new Date().toLocaleDateString(), nota: form.nota }] } : v);
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", selectedCompanyId), { vehiculos: updated });
        setModalType(null); setActiveTab('companies');
    };

    const handleHistoricalData = async () => {
        const h = parseFloat(form.horas); if(isNaN(h)) return;
        const updated = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, horometroTotal: Math.max(v.horometroTotal, h), eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'REGISTRO', fecha: form.fecha, horas: h, nota: "Sincronización Histórica" }] } : v);
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        setModalType(null);
    };

    const handleServiceReset = async () => {
        const v = activeCompany.vehiculos.find(x => x.id === activeVehicleId);
        const updated = activeCompany.vehiculos.map(x => x.id === activeVehicleId ? { ...x, ultimoServiceHoras: x.horometroTotal, eventos: [...(x.eventos || []), { id: Date.now(), tipo: 'SERVICE', fecha: new Date().toLocaleDateString(), horas: x.horometroTotal, insumos: form.insumos, nota: form.nota }] } : x);
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updated });
        setModalType(null); setForm({...form, insumos: [], nota: ''});
    };

    const refillTank = async () => {
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { currentFuel: activeCompany.tankCapacity });
        setModalType(null);
    };

    // --- UTILIDADES PDF Y QR ---
    const downloadPDF = (company, vehicle) => {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.text("BND", 15, 25);
        doc.setFontSize(10); doc.text(bndSettings.description, 15, 33);
        doc.setTextColor(0, 0, 0); doc.text(`Cliente: ${company.nombre}`, 15, 55);
        doc.text(`Equipo: ${vehicle.nombre} | Patente: ${vehicle.patente || '-'}`, 15, 62);
        const body = (vehicle.eventos || []).slice().reverse().map(e => [e.fecha, e.tipo, `${e.horas} HS`, e.litros || '-', e.nota || e.motivo || '-']);
        doc.autoTable({ startY: 70, head: [['FECHA', 'TIPO', 'HS', 'DIESEL', 'DETALLE']], body, headStyles: { fillColor: [15, 23, 42] } });
        doc.save(`BND_${vehicle.nombre}.pdf`);
    };

    // ESCÁNER QR - PROPORCIÓN 1:1 PERFECTA
    const startScanner = () => {
        setScannerActive(true);
        setTimeout(() => {
            scannerRef.current = new window.Html5Qrcode("reader");
            scannerRef.current.start(
                { facingMode: "environment" }, 
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, 
                (txt) => {
                    if (txt.startsWith("sp-asset:")) { 
                        const [_, cid, vid] = txt.split(":"); 
                        setSelectedCompanyId(cid); 
                        setIsolatedVehicleId(vid); 
                        setActiveTab('companies'); 
                        setScannerActive(false); 
                        scannerRef.current.stop(); 
                    }
                }, 
                (err) => {}
            ).catch(e => console.error("Error cámara:", e));
        }, 500);
    };

    const generateQR = (vid) => {
        const div = document.getElementById(`qr-container-${vid}`);
        if(!div) return; div.innerHTML = "";
        new window.QRCode(div, { text: `sp-asset:${selectedCompanyId}:${vid}`, width: 180, height: 180, colorDark : "#0f172a" });
    };

    // MOTOR DE IMPRESIÓN QR AISLADO (LIMPIO)
    const handlePrintQR = () => {
        const qrContainer = document.getElementById(`qr-container-${activeVehicleId}`);
        if (!qrContainer) return;
        const printWindow = window.open('', '', 'width=600,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Impresión BND</title>
                    <style>
                        @page { size: auto; margin: 0mm; }
                        body { font-family: 'Arial', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        h1 { font-size: 50px; font-weight: 900; font-style: italic; margin: 0 0 15px 0; color: #000; }
                        .qr-box { padding: 15px; border: 6px solid #000; border-radius: 15px; display: inline-block; }
                        h2 { font-size: 25px; font-weight: 900; margin: 15px 0 0 0; text-transform: uppercase; letter-spacing: 2px; color: #000; text-align: center; }
                    </style>
                </head>
                <body>
                    <h1>BND</h1>
                    <div class="qr-box">${qrContainer.innerHTML}</div>
                    <h2>${activeVehicle?.nombre || 'EQUIPO'}</h2>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const toggleHistory = (id) => { const ns = new Set(expandedVehicles); if (ns.has(id)) ns.delete(id); else ns.add(id); setExpandedVehicles(ns); };

    // --- VISTAS DE CARGA Y LOGIN ---
    if (authLoading || loading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-black uppercase tracking-[0.2em] animate-pulse">Cargando BND...</div>;

    if (!user) return (
        <div className="flex h-screen items-center justify-center bg-slate-900 px-6 select-none">
            <div className="glass-card p-8 md:p-12 w-full max-w-sm md:max-w-md bg-white/5 backdrop-blur-2xl border-white/10 text-center">
                <img src="./icon.png" alt="BND Logo" className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-2xl shadow-2xl shadow-yellow-400/20 object-cover" />
                <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter mb-2">BND</h1>
                <p className="text-[9px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-10">Control de Activos</p>
                {loginError && <p className="bg-red-500/20 text-red-400 text-[10px] md:text-xs font-bold p-3 rounded-xl mb-6 border border-red-500/30 uppercase">{loginError}</p>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="email" required className="input-premium bg-white/10 border-none text-white text-center text-base md:text-sm" placeholder="USUARIO" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                    <input type="password" required className="input-premium bg-white/10 border-none text-white text-center text-base md:text-sm" placeholder="PASSWORD" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                    <button type="submit" className="btn-accent w-full text-base md:text-sm mt-4 uppercase shadow-2xl shadow-yellow-400/10">Entrar</button>
                </form>
            </div>
        </div>
    );

    // --- INTERFAZ PRINCIPAL ---
    const nav = [ { id: 'dashboard', label: 'Alertas', icon: 'dashboard' }, { id: 'companies', label: 'Directorio', icon: 'company' }, { id: 'calendar', label: 'Proyecciones', icon: 'calendar' } ];
    if (role === 'admin') nav.push({ id: 'config', label: 'Admin', icon: 'settings' });

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden select-none">
            
            {/* OVERLAY MOBILE */}
            <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
            
            {/* SIDEBAR ADAPTABLE (PC/Mobile) */}
            <aside className={`sidebar-mobile lg:w-64 flex flex-col p-6 md:p-8 border-r border-slate-100 ${sidebarOpen ? 'open' : ''}`}>
                <div className="flex items-center gap-4 mb-10 md:mb-12">
                    <img src="./icon.png" alt="BND Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-lg shadow-yellow-100 object-cover" />
                    <div><h1 className="text-2xl md:text-3xl font-black italic tracking-tighter">BND</h1><p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{role}</p></div>
                </div>
                <nav className="flex-1 space-y-2 md:space-y-3">
                    {nav.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setSelectedCompanyId(null); setIsolatedVehicleId(null); setSidebarOpen(false); }} className={`w-full p-4 md:p-5 rounded-2xl flex items-center gap-3 md:gap-4 font-black text-xs md:text-sm transition-all ${activeTab === item.id ? 'bg-slate-900 text-white shadow-xl md:shadow-2xl shadow-slate-300' : 'text-slate-400 hover:bg-slate-50'}`}>
                            <Icon name={item.icon} size={18}/> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="pt-6 border-t border-slate-100 space-y-3">
                    <button onClick={startScanner} className="btn-accent w-full shadow-lg text-xs md:text-sm"><Icon name="qr" size={16} className="mr-2"/> ESCANEAR</button>
                    <button onClick={handleLogout} className="w-full p-3 md:p-4 text-[9px] md:text-[10px] font-black uppercase text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors">Cerrar Sesión</button>
                </div>
            </aside>

            {/* CONTENEDOR DE CONTENIDO */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* HEADER MOBILE */}
                <header className="lg:hidden h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 bg-white/80 backdrop-blur-xl border-b border-slate-100 shrink-0 z-50">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 sm:p-3 bg-slate-50 rounded-xl active:scale-90 transition-transform"><Icon name="menu" size={20}/></button>
                    <span className="font-black italic tracking-tighter text-xl sm:text-2xl">BND</span>
                    <img src="./icon.png" alt="BND Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl shadow-md object-cover" />
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 space-y-6 md:space-y-8 pb-32">
                    
                    {/* VISTA: PANEL DE ALERTAS */}
                    {activeTab === 'dashboard' && (
                        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
                            <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight">Alertas Activas</h2>
                            <div className="grid gap-3 md:gap-4">
                                {alerts.map((a, i) => (
                                    <div key={i} className={`glass-card p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 md:gap-5 border-l-[8px] md:border-l-[12px] ${a.type === 'BREAKDOWN' ? 'border-l-red-500' : 'border-l-yellow-400'}`}>
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${a.type === 'BREAKDOWN' ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-yellow-50 text-yellow-600'}`}>
                                            <Icon name={a.type === 'FUEL' ? 'fuel' : 'alert'} size={24}/>
                                        </div>
                                        <div className="flex-1 text-center md:text-left leading-tight">
                                            <h4 className="font-black uppercase text-base md:text-lg italic tracking-tight">{a.nombre || 'DEPÓSITO DIESEL'}</h4>
                                            <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">{a.companyName}</p>
                                        </div>
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            {a.type === 'BREAKDOWN' ? (
                                                <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 w-full justify-between">
                                                    {['PENDIENTE', 'REVISION', 'REPARADO'].map(s => (
                                                        <button key={s} onClick={() => handleUpdateWorkflow(a.companyId, a.id, s)} className={`workflow-step px-2 md:px-4 text-[8px] md:text-[9px] ${a.workflowStatus === s ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>{s.slice(0,3)}</button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <button onClick={() => { setSelectedCompanyId(a.companyId); setIsolatedVehicleId(null); setActiveTab('companies'); }} className="btn-premium w-full md:w-auto text-[10px] md:text-xs">GESTIONAR</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VISTA: DIRECTORIO DE EMPRESAS */}
                    {activeTab === 'companies' && !activeCompany && (
                        <div className="max-w-6xl mx-auto animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
                                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">Clientes</h2>
                                {role === 'admin' && <button onClick={() => { setForm({nombre:'', cuit:'', responsable:'', tankCapacity:1000}); setModalType('company'); }} className="btn-accent w-full sm:w-auto shadow-xl text-xs md:text-sm">+ NUEVO CLIENTE</button>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {companies.map(emp => (
                                    <div key={emp.id} className="glass-card p-5 md:p-6 relative group active:scale-[0.98] transition-transform">
                                        {role === 'admin' && (
                                            <div className="absolute top-3 right-3 md:top-4 md:right-4 flex gap-2">
                                                <button onClick={() => { setSelectedCompanyId(emp.id); setForm({nombre: emp.nombre, cuit: emp.cuit, responsable: emp.responsable, tankCapacity: emp.tankCapacity}); setModalType('edit_company'); }} className="p-2 md:p-2.5 bg-slate-100 hover:bg-yellow-400 rounded-lg md:rounded-xl transition-colors"><Icon name="settings" size={14}/></button>
                                                <button onClick={() => handleDeleteCompany(emp.id)} className="p-2 md:p-2.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg md:rounded-xl transition-colors"><Icon name="x" size={14}/></button>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start mb-6 md:mb-8">
                                            <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-yellow-400 shadow-xl md:shadow-2xl"><Icon name="company" size={24}/></div>
                                            <FuelTankCapsule capacity={emp.tankCapacity} current={emp.currentFuel} />
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-black uppercase italic truncate mb-1 pr-12 md:pr-16">{emp.nombre}</h3>
                                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 md:mb-8">ID: {emp.cuit}</p>
                                        <button onClick={() => { setSelectedCompanyId(emp.id); setIsolatedVehicleId(null); }} className="btn-premium w-full text-sm md:text-base italic uppercase">Abrir Flota</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VISTA: FLOTA DE LA EMPRESA SELECCIONADA */}
                    {activeCompany && (
                        <div className="max-w-5xl mx-auto animate-fade-in pb-20">
                            <button onClick={() => { setSelectedCompanyId(null); setIsolatedVehicleId(null); }} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-black uppercase mb-6 md:mb-8 text-slate-400 hover:text-slate-900 transition-colors"><Icon name="chevronLeft" size={16}/> Volver</button>
                            <div className="glass-card p-6 md:p-8 bg-slate-900 text-white mb-6 md:mb-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-yellow-400/5 blur-[80px] md:blur-[100px] pointer-events-none" />
                                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-3 md:mb-4 leading-none">{activeCompany.nombre}</h2>
                                <div className="flex flex-wrap gap-3 md:gap-4">
                                    <div className="px-3 py-1.5 md:px-4 md:py-2 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest">{activeCompany.cuit}</div>
                                    {role === 'admin' && !isolatedVehicleId && <button onClick={() => { setForm({nombre:'', marca:'', modelo:'', serie:'', patente:'', serviceInterval: 250, horometro: ''}); setModalType('vehicle'); }} className="btn-accent text-[9px] md:text-xs px-4">+ EQUIPO</button>}
                                </div>
                            </div>

                            {/* BANNER MODO AISLAMIENTO */}
                            {isolatedVehicleId && (
                                <div className="mb-6 flex justify-between items-center bg-yellow-50 p-4 rounded-xl border border-yellow-200 shadow-sm animate-fade-in">
                                    <span className="text-yellow-800 font-bold text-[10px] uppercase flex items-center gap-2"><Icon name="qr" size={14}/> Equipo Localizado por QR</span>
                                    <button onClick={() => setIsolatedVehicleId(null)} className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm">VER FLOTA COMPLETA</button>
                                </div>
                            )}

                            <div className="grid gap-4 md:gap-5">
                                {displayedVehicles.map(v => {
                                    const ciclo = (v.horometroTotal || 0) - (v.ultimoServiceHoras || 0);
                                    const perc = Math.max(0, 100 - (ciclo / (v.serviceInterval || 250) * 100));
                                    return (
                                        <div key={v.id} className="glass-card p-5 md:p-6 border-l-[8px] md:border-l-[10px] border-l-yellow-400 relative group overflow-hidden">
                                            {role === 'admin' && (
                                                <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2">
                                                    <button onClick={() => { setActiveVehicleId(v.id); setForm({nombre: v.nombre, marca: v.marca, modelo: v.modelo, serie: v.serie, patente: v.patente, serviceInterval: v.serviceInterval}); setModalType('edit_vehicle'); }} className="p-2 md:p-2.5 bg-slate-50 hover:bg-yellow-400 rounded-lg md:rounded-xl transition-colors"><Icon name="settings" size={12}/></button>
                                                    <button onClick={() => handleDeleteVehicle(v.id)} className="p-2 md:p-2.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg md:rounded-xl transition-colors"><Icon name="x" size={12}/></button>
                                                </div>
                                            )}
                                            <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8">
                                                <div className="flex-1 space-y-4 md:space-y-6">
                                                    <div className="flex items-center gap-4 md:gap-5">
                                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-xl md:rounded-[1.5rem] flex items-center justify-center shadow-inner"><Icon name="truck" size={24} className="text-slate-800"/></div>
                                                        <div>
                                                            <h4 className="font-black uppercase text-lg md:text-2xl italic tracking-tight pr-16">{v.nombre}</h4>
                                                            <p className="font-black text-slate-900 text-lg md:text-xl mono">{(v.horometroTotal || 0).toLocaleString()} <span className="text-[10px] md:text-xs text-slate-300 ml-1 uppercase">HS</span></p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-end px-1"><span className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Ciclo ({v.serviceInterval}h)</span><span className={`text-xs md:text-sm font-black mono ${perc < 20 ? 'text-red-500' : 'text-slate-900'}`}>{perc.toFixed(0)}%</span></div>
                                                        <div className="h-2 md:h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ${perc < 20 ? 'bg-red-500' : 'bg-slate-900'}`} style={{width: `${perc}%`}} /></div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-1 md:w-48 gap-2 md:gap-3 shrink-0">
                                                    <button onClick={() => { setActiveVehicleId(v.id); setModalType('log'); }} className="btn-premium w-full text-[10px] md:text-xs font-black">CARGAR</button>
                                                    <button onClick={() => { setActiveVehicleId(v.id); setModalType('service'); }} className="btn-accent w-full text-[10px] md:text-xs font-black">SERVICE</button>
                                                    <button onClick={() => handleToggleStatus(v.id, v.operativo)} className={`p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-sm transition-all ${v.operativo ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white' : 'bg-emerald-500 text-white'}`}>{v.operativo ? 'ROTO' : 'REVIVIR'}</button>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => downloadPDF(activeCompany, v)} className="flex-1 p-3 md:p-4 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl md:rounded-2xl transition-all shadow-sm flex items-center justify-center"><Icon name="download" size={16}/></button>
                                                        <button onClick={() => { setActiveVehicleId(v.id); setModalType('qr'); setTimeout(() => generateQR(v.id), 100); }} className="flex-1 p-3 md:p-4 bg-slate-50 hover:bg-yellow-400 rounded-xl md:rounded-2xl transition-all shadow-sm flex items-center justify-center"><Icon name="qr" size={16}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => toggleHistory(v.id)} className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase text-slate-300 hover:text-slate-900 transition-all border-t border-slate-50 mt-4 md:mt-6 pt-3 md:pt-4 tracking-[0.2em]"><Icon name="history" size={14}/> AUDITORÍA <Icon name="chevronDown" size={14} className={expandedVehicles.has(v.id) ? 'rotate-180 transition-transform' : ''}/></button>
                                            {expandedVehicles.has(v.id) && (
                                                <div className="mt-3 md:mt-4 overflow-x-auto rounded-xl md:rounded-2xl border border-slate-50 bg-slate-50/30 p-2 animate-fade-in">
                                                    <table className="w-full history-table">
                                                        <thead><tr><th>Fecha</th><th>Evento</th><th>Lectura</th><th>Detalles</th></tr></thead>
                                                        <tbody>{[...(v.eventos || [])].reverse().map((ev, idx) => ( <tr key={idx} className="hover:bg-white transition-all"><td className="font-bold opacity-30 italic">{ev.fecha}</td><td><span className="font-black text-[7px] md:text-[8px] uppercase border-2 px-2 py-1 rounded-lg bg-white shadow-sm">{ev.tipo}</span></td><td className="mono font-black text-xs">{ev.horas?.toLocaleString()} HS</td><td className="text-slate-500 italic text-[10px] md:text-[11px] leading-tight">{ev.litros ? `-${ev.litros}L | ` : ''}{ev.insumos?.length ? ` Reps: ${ev.insumos.join(", ")} | ` : ''}{ev.nota || ev.motivo || '-'}</td></tr> ))}</tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* VISTA: CONFIGURACIÓN Y ROLES (SOLO ADMIN) */}
                    {activeTab === 'config' && role === 'admin' && (
                        <div className="max-w-4xl mx-auto space-y-10 md:space-y-12 animate-fade-in">
                            <div className="space-y-4 md:space-y-6">
                                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Config</h2>
                                <div className="glass-card p-6 md:p-10 space-y-6 md:space-y-8 bg-white shadow-2xl">
                                    <div className="grid grid-cols-1 gap-4 md:gap-6">
                                        <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Razón Social</label><input className="w-full input-premium font-black text-lg md:text-xl" value={bndSettings.name} onChange={e => setBndSettings({...bndSettings, name: e.target.value})} /></div>
                                        <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Descripción</label><input className="w-full input-premium text-sm md:text-base" value={bndSettings.description} onChange={e => setBndSettings({...bndSettings, description: e.target.value})} /></div>
                                        <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Dirección Física</label><input className="w-full input-premium text-sm md:text-base" value={bndSettings.address} onChange={e => setBndSettings({...bndSettings, address: e.target.value})} /></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Teléfono</label><input className="w-full input-premium text-sm md:text-base" value={bndSettings.phone} onChange={e => setBndSettings({...bndSettings, phone: e.target.value})} /></div>
                                            <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Email</label><input className="w-full input-premium text-sm md:text-base" value={bndSettings.email} onChange={e => setBndSettings({...bndSettings, email: e.target.value})} /></div>
                                        </div>
                                    </div>
                                    <button onClick={saveBndSettings} className="btn-premium w-full text-sm md:text-lg uppercase shadow-2xl shadow-slate-300">Guardar Cambios</button>
                                </div>
                            </div>

                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-200 pb-4 gap-4">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Accesos</h2>
                                    <button onClick={() => setModalType('register_user')} className="btn-accent px-6 w-full sm:w-auto text-xs md:text-sm">+ AGREGAR</button>
                                </div>
                                <div className="glass-card overflow-x-auto shadow-2xl">
                                    <table className="w-full history-table min-w-[400px]">
                                        <thead><tr><th>Usuario</th><th>Permisos / Rol</th></tr></thead>
                                        <tbody>
                                            {usersList.map(u => (
                                                <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                                                    <td className="font-black text-slate-700 italic text-xs md:text-sm">{u.email}</td>
                                                    <td>
                                                        <select value={u.role} onChange={(e) => handleUpdateUserRole(u.uid, e.target.value)} className={`text-[9px] md:text-[10px] font-black uppercase px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl border-2 appearance-none cursor-pointer transition-all ${u.role === 'admin' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : u.role === 'suspendido' ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                            <option value="operario">Operario</option>
                                                            <option value="admin">Admin</option>
                                                            <option value="suspendido">Suspender</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VISTA: PROYECCIONES */}
                    {activeTab === 'calendar' && (
                        <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 animate-fade-in">
                            <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Proyecciones</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {projectionsData.map((p, i) => (
                                    <div key={i} className="glass-card p-6 md:p-8 flex flex-col gap-5 md:gap-6 shadow-2xl shadow-slate-200 border-t-4 border-t-blue-500">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 rounded-xl md:rounded-2xl text-blue-600 flex items-center justify-center shadow-inner"><Icon name="truck" size={24}/></div>
                                                <div className="leading-tight">
                                                    <p className="font-black uppercase italic text-lg md:text-xl truncate pr-4">{p.nombre}</p>
                                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.empresaNombre}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 md:p-5 rounded-2xl md:rounded-3xl space-y-3 md:space-y-4">
                                            <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Próximo Service</span><span className="text-base md:text-lg font-black italic text-blue-600">{p.estDate ? p.estDate.toLocaleDateString() : 'SIN DATOS'}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Promedio Diario</span><span className="text-base md:text-lg font-black mono">{p.avgUsage.toFixed(1)} HS</span></div>
                                            <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Resta Ciclo</span><span className="text-base md:text-lg font-black mono">{Math.max(0, p.restHs).toFixed(1)} HS</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* --- SISTEMA DINÁMICO DE MODALES --- */}
            {modalType && (
                <ModalComp 
                    title={modalType.replace(/_/g,' ')} 
                    onClose={() => { if(modalType !== 'force_password_change') setModalType(null); }}
                    hideClose={modalType === 'force_password_change'}
                >
                    {modalType === 'register_user' && (
                        <form onSubmit={handleRegisterUser} className="space-y-4 md:space-y-5">
                            <input type="email" required className="input-premium text-sm md:text-base" placeholder="EMAIL" onChange={e => setNewUser({...newUser, email: e.target.value})} />
                            <input type="text" required className="input-premium text-sm md:text-base" placeholder="PASSWORD TEMPORAL" onChange={e => setNewUser({...newUser, password: e.target.value})} />
                            <select className="input-premium appearance-none text-sm md:text-base" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                <option value="operario">Operario (Limitado)</option>
                                <option value="admin">Administrador (Total)</option>
                            </select>
                            <button type="submit" className="btn-accent w-full mt-2 md:mt-4 text-xs md:text-sm">CREAR ACCESO</button>
                        </form>
                    )}

                    {modalType === 'force_password_change' && (
                        <div className="space-y-6 md:space-y-8 text-center">
                            <img src="./icon.png" alt="BND Logo" className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-[1.5rem] md:rounded-[2rem] shadow-2xl object-cover" />
                            <h2 className="text-2xl md:text-3xl font-black uppercase italic leading-none">Nueva Seguridad</h2>
                            <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Debes actualizar tu contraseña temporal para activar tu cuenta de operario.</p>
                            {pwdError && <p className="text-red-500 font-bold text-[10px] md:text-xs">{pwdError}</p>}
                            <form onSubmit={handleChangePassword} className="space-y-3 md:space-y-4">
                                <input type="password" required className="input-premium text-center text-lg md:text-xl tracking-widest" placeholder="NUEVA CLAVE" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                <input type="password" required className="input-premium text-center text-lg md:text-xl tracking-widest" placeholder="CONFIRMAR CLAVE" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                <button type="submit" className="btn-accent w-full text-sm md:text-lg mt-2 md:mt-4">ACTIVAR CUENTA</button>
                            </form>
                        </div>
                    )}

                    {modalType === 'company' && (
                        <div className="space-y-3 md:space-y-4">
                            <input className="input-premium text-sm md:text-base" placeholder="RAZÓN SOCIAL" onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} />
                            <input className="input-premium text-sm md:text-base" placeholder="CUIT" onChange={e => setForm({...form, cuit: e.target.value})} />
                            <input className="input-premium text-sm md:text-base" placeholder="RESPONSABLE" onChange={e => setForm({...form, responsable: e.target.value})} />
                            <input className="input-premium text-sm md:text-base" type="number" placeholder="LITROS DEPÓSITO" onChange={e => setForm({...form, tankCapacity: e.target.value})} />
                            <button onClick={handleAddCompany} className="btn-accent w-full mt-2 md:mt-4 text-xs md:text-sm">REGISTRAR CLIENTE</button>
                        </div>
                    )}

                    {modalType === 'edit_company' && (
                        <div className="space-y-3 md:space-y-4">
                            <input className="input-premium text-sm md:text-base" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} />
                            <input className="input-premium text-sm md:text-base" value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} />
                            <input className="input-premium text-sm md:text-base" value={form.responsable} onChange={e => setForm({...form, responsable: e.target.value})} />
                            <input className="input-premium text-sm md:text-base" type="number" value={form.tankCapacity} onChange={e => setForm({...form, tankCapacity: e.target.value})} />
                            <button onClick={handleEditCompanySubmit} className="btn-premium w-full mt-2 md:mt-4 text-xs md:text-sm uppercase">Guardar Cambios</button>
                        </div>
                    )}

                    {modalType === 'vehicle' && (
                        <div className="space-y-3 md:space-y-4">
                            <input className="input-premium text-lg md:text-xl font-black italic" placeholder="BND-XX (INTERNO)" onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} />
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <input className="input-premium text-xs md:text-sm" placeholder="MARCA" onChange={e => setForm({...form, marca: e.target.value})} />
                                <input className="input-premium text-xs md:text-sm" placeholder="MODELO" onChange={e => setForm({...form, modelo: e.target.value})} />
                                <input className="input-premium text-xs md:text-sm" placeholder="SERIE" onChange={e => setForm({...form, serie: e.target.value})} />
                                <input className="input-premium text-xs md:text-sm" placeholder="PATENTE" onChange={e => setForm({...form, patente: e.target.value})} />
                                <input className="input-premium text-xs md:text-sm" type="number" placeholder="HORÓMETRO INICIAL" onChange={e => setForm({...form, horometro: e.target.value})} />
                                <input className="input-premium text-xs md:text-sm" type="number" placeholder="CICLO SERVICE" defaultValue="250" onChange={e => setForm({...form, serviceInterval: e.target.value})} />
                            </div>
                            <button onClick={handleAddVehicle} className="btn-premium w-full mt-2 md:mt-4 text-xs md:text-sm uppercase">Vincular Maquinaria</button>
                        </div>
                    )}

                    {modalType === 'edit_vehicle' && (
                        <div className="space-y-3 md:space-y-4">
                            <input className="input-premium text-lg md:text-xl font-black italic" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} />
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <input className="input-premium text-xs md:text-sm" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} />
                                <input className="input-premium text-xs md:text-sm" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} />
                                <input className="input-premium text-xs md:text-sm" value={form.serie} onChange={e => setForm({...form, serie: e.target.value})} />
                                <input className="input-premium text-xs md:text-sm" value={form.patente} onChange={e => setForm({...form, patente: e.target.value})} />
                                <input className="input-premium text-xs md:text-sm" type="number" value={form.serviceInterval} onChange={e => setForm({...form, serviceInterval: e.target.value})} />
                            </div>
                            <button onClick={handleEditVehicleSubmit} className="btn-premium w-full mt-2 md:mt-4 text-xs md:text-sm uppercase">Actualizar Datos</button>
                        </div>
                    )}

                    {modalType === 'log' && (
                        <div className="space-y-6 md:space-y-8">
                            <div className="grid grid-cols-2 gap-3 md:gap-4 text-center">
                                <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Horómetro Final</label><input type="number" className="input-premium text-2xl md:text-4xl text-center font-black" onChange={e => setForm({...form, horas: e.target.value})} /></div>
                                <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga Diesel (L)</label><input type="number" className="input-premium text-2xl md:text-4xl text-center font-black" onChange={e => setForm({...form, litros: e.target.value})} /></div>
                            </div>
                            <textarea className="input-premium !h-32 md:!h-40 pt-4 md:pt-6 text-xs md:text-sm" placeholder="NOTAS DE LA JORNADA / NOVEDADES..." onChange={e => setForm({...form, nota: e.target.value.toUpperCase()})} />
                            <button onClick={handleDailyLog} className="btn-accent w-full text-base md:text-xl shadow-2xl">IMPACTAR PLANILLA</button>
                        </div>
                    )}

                    {modalType === 'service' && (
                        <div className="space-y-6 md:space-y-8">
                            <div className="bg-slate-900 p-6 md:p-8 rounded-3xl md:rounded-[2rem] text-center text-white shadow-2xl border-t-4 md:border-t-8 border-t-yellow-400">
                                <p className="text-[9px] md:text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-2 md:mb-4 italic">Certificación de Service</p>
                                <p className="text-4xl md:text-5xl font-black italic tracking-tighter">HS {activeCompany?.vehiculos?.find(v => v.id === activeVehicleId)?.horometroTotal?.toLocaleString()}</p>
                            </div>
                            <div className="space-y-3 md:space-y-4">
                                <label className="text-[10px] md:text-xs font-black uppercase text-slate-800 ml-2">Checklist de Insumos</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Aceite 15W40', 'Filtro Aceite', 'Filtro Aire', 'Filtro Comb.', 'Hidráulico', 'Refrigerante'].map(item => (
                                        <button key={item} onClick={() => setForm(p => ({ ...p, insumos: p.insumos.includes(item) ? p.insumos.filter(i => i !== item) : [...p.insumos, item] }))} className={`px-4 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase border-2 transition-all ${form.insumos.includes(item) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>{item}</button>
                                    ))}
                                </div>
                                <div className="flex gap-3 md:gap-4 mt-2">
                                    <input className="flex-1 input-premium text-xs shadow-sm" placeholder="Otro..." value={form.insumoManual} onChange={e => setForm({...form, insumoManual: e.target.value})} />
                                    <button onClick={() => { if(form.insumoManual) setForm(p => ({ ...p, insumos: [...p.insumos, form.insumoManual.toUpperCase()], insumoManual: '' })); }} className="px-5 md:px-6 bg-slate-900 text-white rounded-xl font-black hover:bg-yellow-400 hover:text-black shadow-lg transition-all">+</button>
                                </div>
                            </div>
                            <textarea className="input-premium !h-24 md:!h-32 pt-4 text-xs md:text-sm" placeholder="RECOMENDACIONES TÉCNICAS..." onChange={e => setForm({...form, nota: e.target.value.toUpperCase()})} />
                            <button onClick={handleServiceReset} className="btn-accent w-full text-sm md:text-lg shadow-xl uppercase">Cerrar Ciclo y Reiniciar</button>
                        </div>
                    )}

                    {modalType === 'downtime' && (
                        <div className="space-y-8 md:space-y-10 text-center animate-fade-in">
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-red-100 rounded-3xl md:rounded-[2.5rem] flex items-center justify-center mx-auto border-4 border-red-500 shadow-2xl animate-pulse"><Icon name="alert" size={40} className="text-red-600"/></div>
                            <div className="leading-none">
                                <h3 className="text-2xl md:text-3xl font-black uppercase italic text-red-600">Reportar Rotura</h3>
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 md:mt-4 leading-relaxed">Se notificará inmediatamente al panel de alertas.</p>
                            </div>
                            <textarea className="input-premium !h-32 md:!h-40 pt-4 md:pt-6 text-sm md:text-base text-red-600 border-red-200 bg-red-50/50 font-bold" placeholder="MOTIVO DE LA PARADA TÉCNICA..." onChange={e => setForm({...form, motivo: e.target.value.toUpperCase()})} />
                            <button onClick={handleConfirmDowntime} className="w-full p-5 md:p-6 bg-red-600 text-white font-black rounded-2xl md:rounded-3xl text-lg md:text-xl shadow-2xl border-b-[6px] md:border-b-8 border-b-red-800 active:translate-y-2 transition-all">EMITIR PARADA</button>
                        </div>
                    )}

                    {modalType === 'repair_finish' && (
                        <div className="space-y-6 md:space-y-8 text-center animate-fade-in">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto shadow-2xl text-white shadow-emerald-200"><Icon name="check" size={32}/></div>
                            <h3 className="text-2xl md:text-3xl font-black uppercase italic text-emerald-600 leading-none">Equipo Reparado</h3>
                            <textarea className="input-premium !h-32 md:!h-40 pt-4 md:pt-6 text-xs md:text-sm font-bold" placeholder="DETALLE DE LA REPARACIÓN REALIZADA..." onChange={e => setForm({...form, nota: e.target.value.toUpperCase()})} />
                            <button onClick={handleRepairSubmit} className="btn-premium w-full text-base md:text-lg bg-emerald-600 shadow-emerald-100">DAR DE ALTA UNIDAD</button>
                        </div>
                    )}

                    {modalType === 'historical' && (
                        <div className="space-y-4 md:space-y-6 animate-fade-in">
                            <div className="p-4 bg-slate-50 border rounded-xl text-[10px] md:text-xs font-bold text-slate-400 italic">Carga de registros históricos. Sincroniza el horómetro total.</div>
                            <div className="grid grid-cols-2 gap-3 md:gap-4"><input className="input-premium text-xs md:text-sm" type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} /><input className="input-premium text-xs md:text-sm" type="number" placeholder="HS Totales" value={form.horas} onChange={e => setForm({...form, horas: e.target.value})} /></div>
                            <button onClick={handleHistoricalData} className="btn-premium w-full mt-2 md:mt-4 text-xs md:text-sm uppercase">Sincronizar Historial</button>
                        </div>
                    )}

                    {/* REDISEÑO DE CÓDIGO QR Y MOTOR DE IMPRESIÓN */}
                    {modalType === 'qr' && (
                        <div className="space-y-6 md:space-y-8 text-center flex flex-col items-center animate-fade-in py-6 md:py-8">
                            <div className="space-y-1">
                                <p className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">BND</p>
                            </div>
                            <div className="p-6 md:p-8 bg-white rounded-3xl md:rounded-[2rem] shadow-2xl border-4 border-slate-900" id={`qr-container-${activeVehicleId}`}></div>
                            <div className="space-y-1">
                                <p className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-widest">{activeVehicle?.nombre}</p>
                            </div>
                            <button onClick={handlePrintQR} className="btn-premium w-full text-base md:text-lg shadow-2xl mt-2 md:mt-4">IMPRIMIR ETIQUETA</button>
                        </div>
                    )}

                    {modalType === 'details' && (
                        <div className="space-y-8 md:space-y-10">
                            <div className="bg-slate-900 p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 shadow-2xl border-l-[10px] md:border-l-[15px] border-l-yellow-400">
                                <div className="text-center md:text-left"><p className="text-[9px] md:text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1 md:mb-2 italic">Stock Depósito Central</p><p className="text-4xl md:text-5xl font-black text-white mono">{(activeCompany.currentFuel || 0).toLocaleString()} <span className="text-xs md:text-sm opacity-30">L</span></p></div>
                                {role === 'admin' && <button onClick={() => { if(confirm("¿Cargar depósito al 100%?")) refillTank(); }} className="btn-accent px-6 py-3 md:px-8 md:py-4 shadow-xl shadow-yellow-400/10 w-full md:w-auto text-xs md:text-sm">CARGAR</button>}
                            </div>
                            <div className="space-y-3 md:space-y-4">
                                <p className="text-[10px] md:text-xs font-black uppercase italic text-slate-400 ml-2 md:ml-4">Consumo Mensual Proyectado</p>
                                <div className="glass-card p-4 md:p-6 bg-white"><canvas ref={chartRef}></canvas></div>
                            </div>
                        </div>
                    )}
                </ModalComp>
            )}

            {/* SCANNER MODAL OVERLAY */}
            {scannerActive && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 md:p-8 select-none">
                    <div className="w-full max-w-sm md:max-w-md aspect-square relative mb-8 md:mb-12">
                        <div id="reader" className="w-full h-full rounded-3xl md:rounded-[3rem] overflow-hidden border-[8px] md:border-[10px] border-yellow-400 shadow-2xl shadow-yellow-400/20"></div>
                        <div className="absolute inset-0 pointer-events-none border-[30px] md:border-[40px] border-transparent after:absolute after:inset-8 md:after:inset-10 after:border-2 after:border-yellow-400/50 after:animate-pulse"></div>
                    </div>
                    <button onClick={() => { setScannerActive(false); if(scannerRef.current) scannerRef.current.stop(); }} className="px-12 py-5 md:px-16 md:py-6 bg-white text-slate-900 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl shadow-2xl transition-transform active:scale-90">CANCELAR</button>
                </div>
            )}

        </div>
    );
};

window.App = App;
