const { useState, useEffect, useMemo, useRef } = React;
const { Icon, FuelTankCapsule, db, auth, APP_ID, fb, FIREBASE_API_KEY } = window;
const { DashboardView, CompaniesView, CompanyDetailView, ConfigView, CalendarView, MetricsView } = window.AppViews;

const App = () => {
    // --- ESTADOS DE AUTENTICACIÓN Y ROLES ---
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); 
    const [userName, setUserName] = useState(''); 
    const [userCompanyId, setUserCompanyId] = useState(null); 
    const [authLoading, setAuthLoading] = useState(true);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [usersList, setUsersList] = useState([]);

    // --- ESTADOS PARA GESTIÓN DE CONTRASEÑAS Y USUARIOS ---
    const [newUser, setNewUser] = useState({ 
        email: '', password: '', nombre: '', role: 'operario', companyId: '' 
    });
    const [editingUserId, setEditingUserId] = useState(null); 
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
    const [expandedInfo, setExpandedInfo] = useState({});
    
    const scannerRef = useRef(null);
    const chartRef = useRef(null); 

    const [bndSettings, setBndSettings] = useState({
        name: "BND", description: "Gestión de Activos Industriales",
        address: "-", phone: "-", email: "-", web: "-"
    });

    const [form, setForm] = useState({ 
        nombre: '', cuit: '', responsable: '', mail: '', tel: '',
        marca: '', modelo: '', serie: '', patente: '', año: '', serviceInterval: 250, 
        horometro: '', horas: '', litros: '', nota: '', motivo: '', tankCapacity: 1000,
        criticalFuelPerc: 25, insumos: [], insumoManual: '', fecha: new Date().toISOString().split('T')[0]
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
                            setUserName(userData.nombre || 'USUARIO BND'); 
                            if (userData.companyId) setUserCompanyId(userData.companyId);
                            if (userData.requiresPasswordChange) setModalType('force_password_change');
                        } else {
                            await fb.setDoc(userDocRef, { 
                                email: u.email, nombre: 'Admin Master', role: 'admin', requiresPasswordChange: false 
                            });
                            setRole('admin');
                            setUserName('Admin Master');
                        }
                    } catch (e) { 
                        setRole('operario'); 
                        setUserName('Operario BND');
                    }

                    const configRef = fb.doc(db, "artifacts", APP_ID, "public", "data", "config", "bnd_info");
                    fb.getDoc(configRef).then(snap => { 
                        if(snap.exists()) setBndSettings(snap.data()); 
                    });

                    const q = fb.collection(db, "artifacts", APP_ID, "public", "data", "companies");
                    const unsub = fb.onSnapshot(q, (snapshot) => {
                        setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                        setLoading(false);
                        setAuthLoading(false);
                    });
                    
                    return () => unsub();
                    
                } else { 
                    setUser(null); setRole(null); setUserName(''); setUserCompanyId(null);
                    setLoading(false); setAuthLoading(false); 
                }
            });
        };

        if (window.db) initSync(); else window.addEventListener('firebase-ready', initSync);
    }, []);

    useEffect(() => {
        if (role === 'admin' && db) {
            const unsub = fb.onSnapshot(fb.collection(db, "artifacts", APP_ID, "public", "data", "users"), (snap) => {
                setUsersList(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
            });
            return () => unsub();
        }
    }, [role]);

    useEffect(() => {
        if (role === 'operario' && userCompanyId && activeTab === 'companies' && !selectedCompanyId) {
            setSelectedCompanyId(userCompanyId);
        }
        if (role === 'operario' && userCompanyId && activeTab === 'calendar' && !selectedCompanyId) {
            setSelectedCompanyId(userCompanyId);
        }
    }, [role, userCompanyId, activeTab, selectedCompanyId]);

    // --- MANEJADORES DE AUTENTICACIÓN Y USUARIOS ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthLoading(true); setLoginError('');
        try { await fb.signInWithEmailAndPassword(auth, loginEmail, loginPassword); } 
        catch (err) { setLoginError('Correo o contraseña incorrectos.'); setAuthLoading(false); }
    };

    const handleLogout = async () => { 
        await fb.signOut(auth); 
        setActiveTab('dashboard'); setActiveVehicleId(null); 
        setSelectedCompanyId(null); setIsolatedVehicleId(null);
    };

    const handleRegisterUser = async (e) => {
        e.preventDefault();
        if (newUser.role === 'operario' && !newUser.companyId) { alert("Asigne una empresa al operario."); return; }
        try {
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
                method: 'POST', body: JSON.stringify({ email: newUser.email, password: newUser.password, returnSecureToken: true })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            
            await fb.setDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", data.localId), {
                nombre: newUser.nombre, role: newUser.role, email: newUser.email, 
                companyId: newUser.role === 'operario' ? newUser.companyId : null,
                requiresPasswordChange: true
            });
            
            setModalType(null); setNewUser({ email: '', password: '', nombre: '', role: 'operario', companyId: '' });
            alert("Usuario creado. Se le pedirá cambiar la contraseña en su primer ingreso.");
        } catch (err) { alert("Error al crear usuario: " + err.message); }
    };

    const handleUpdateUserSubmit = async () => {
        if (newUser.role === 'operario' && !newUser.companyId) { alert("Asigne una empresa al operario."); return; }
        try {
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", editingUserId), {
                nombre: newUser.nombre, role: newUser.role, companyId: newUser.role === 'operario' ? newUser.companyId : null
            });
            if (user && editingUserId === user.uid) {
                setUserName(newUser.nombre); setRole(newUser.role);
                if(newUser.role === 'operario') setUserCompanyId(newUser.companyId);
            }
            setModalType(null); setEditingUserId(null);
            setNewUser({ email: '', password: '', nombre: '', role: 'operario', companyId: '' });
        } catch (error) { alert("Error al actualizar los datos."); }
    };

    const handleUpdateUserRole = async (uid, newRole) => {
        if(window.confirm(`¿Estás seguro de cambiar los permisos a ${newRole.toUpperCase()}?`)) {
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", uid), { 
                role: newRole 
            });
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setPwdError('Las contraseñas no coinciden.'); return; }
        try {
            await fb.updatePassword(auth.currentUser, newPassword);
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", auth.currentUser.uid), { requiresPasswordChange: false });
            setModalType(null);
        } catch (err) { setPwdError('Error al actualizar.'); }
    };

    // --- LÓGICA DE NEGOCIO Y CÁLCULOS ---
    const activeCompany = useMemo(() => companies.find(c => c.id === selectedCompanyId), [companies, selectedCompanyId]);
    const activeVehicle = useMemo(() => activeCompany?.vehiculos?.find(v => v.id === activeVehicleId), [activeCompany, activeVehicleId]);
    const displayedVehicles = useMemo(() => {
        if (!activeCompany) return [];
        if (isolatedVehicleId) return activeCompany.vehiculos.filter(v => v.id === isolatedVehicleId);
        return activeCompany.vehiculos;
    }, [activeCompany, isolatedVehicleId]);

    const alerts = useMemo(() => {
        let list = [];
        const relevantCompanies = role === 'admin' ? companies : companies.filter(c => c.id === userCompanyId);
        relevantCompanies.forEach(emp => {
            const fuelPerc = ((emp.currentFuel || 0) / (emp.tankCapacity || 1000)) * 100;
            const criticalLevel = emp.criticalFuelPerc || 25;
            if (fuelPerc <= criticalLevel) list.push({ type: 'FUEL', companyName: emp.nombre, companyId: emp.id, value: fuelPerc.toFixed(1) });
            (emp.vehiculos || []).forEach(veh => {
                if (!veh.operativo) list.push({ type: 'BREAKDOWN', ...veh, companyId: emp.id, companyName: emp.nombre, workflowStatus: veh.workflowStatus || 'PENDIENTE', breakageMotive: (veh.eventos || []).slice().reverse().find(e => e.tipo === 'BAJA')?.motivo || "Falla reportada" });
                const rest = (parseFloat(veh.serviceInterval) || 250) - ((parseFloat(veh.horometroTotal) || 0) - (parseFloat(veh.ultimoServiceHoras) || 0));
                if (rest < 50 && veh.operativo) list.push({ type: 'MAINTENANCE', ...veh, companyId: emp.id, companyName: emp.nombre, rest });
            });
        });
        return list.sort((a,b) => (a.type === 'BREAKDOWN' ? -1 : 1));
    }, [companies, role, userCompanyId]);

    const companyProjections = useMemo(() => {
        if (!activeCompany) return null;
        const allFuelEvents = (activeCompany.vehiculos || []).flatMap(v => 
            (v.eventos || []).filter(e => e.tipo === 'REGISTRO' && parseFloat(e.litros) > 0).map(e => ({ fecha: new Date(e.fecha), litros: parseFloat(e.litros) }))
        ).sort((a,b) => a.fecha - b.fecha);

        let fuelEstDate = null; let fuelAvg = 0;
        const criticalLiters = (activeCompany.tankCapacity || 1000) * ((activeCompany.criticalFuelPerc || 25) / 100);
        const currentFuel = activeCompany.currentFuel || 0;

        if (allFuelEvents.length >= 2) {
            const daysDiff = Math.max(1, (allFuelEvents[allFuelEvents.length - 1].fecha - allFuelEvents[0].fecha) / 86400000);
            fuelAvg = allFuelEvents.reduce((sum, e) => sum + e.litros, 0) / daysDiff;
            if (fuelAvg > 0 && currentFuel > criticalLiters) {
                fuelEstDate = new Date(); fuelEstDate.setDate(fuelEstDate.getDate() + ((currentFuel - criticalLiters) / fuelAvg));
            }
        } else if (currentFuel <= criticalLiters) fuelEstDate = new Date(); 

        const vProjs = (activeCompany.vehiculos || []).map(veh => {
            const regs = (veh.eventos || []).filter(e => e.tipo === 'REGISTRO').sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
            let avg = 0; 
            if (regs.length >= 2) avg = ((parseFloat(regs[regs.length-1].horas) || 0) - (parseFloat(regs[0].horas) || 0)) / Math.max(1, (new Date(regs[regs.length-1].fecha) - new Date(regs[0].fecha)) / 86400000); 
            const restHs = (parseFloat(veh.serviceInterval) || 250) - ((parseFloat(veh.horometroTotal) || 0) - (parseFloat(veh.ultimoServiceHoras) || 0));
            let estDate = null; if (avg > 0 && restHs > 0) { estDate = new Date(); estDate.setDate(estDate.getDate() + Math.ceil(restHs / avg)); }
            return { ...veh, estDate, avgUsage: avg, restHs };
        }).sort((a,b) => (a.estDate || Infinity) - (b.estDate || Infinity));

        return { fuelEstDate, fuelAvg, criticalLiters, currentFuel, vProjs };
    }, [activeCompany]);

    const intelligenceData = useMemo(() => {
        let allVehicles = [];
        let eventCounts = { REGISTRO: 0, SERVICE: 0, REPARACION: 0, BAJA: 0 };
        let breaksPerCompany = {};

        companies.forEach(comp => {
            breaksPerCompany[comp.nombre] = 0;
            (comp.vehiculos || []).forEach(v => {
                let totalLitros = 0; let hsTrabajadas = 0;
                const regs = (v.eventos || []).filter(e => e.tipo === 'REGISTRO').sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
                if (regs.length >= 2) {
                    hsTrabajadas = (parseFloat(regs[regs.length-1].horas) || 0) - (parseFloat(regs[0].horas) || 0);
                    totalLitros = regs.reduce((sum, e) => sum + parseFloat(e.litros || 0), 0);
                }
                const lPh = hsTrabajadas > 0 ? (totalLitros / hsTrabajadas) : 0;
                let avgDiario = 0;
                if (regs.length >= 2) avgDiario = hsTrabajadas / Math.max(1, (new Date(regs[regs.length-1].fecha) - new Date(regs[0].fecha)) / 86400000);

                allVehicles.push({ id: v.id, nombre: v.nombre, companyName: comp.nombre, lPh: parseFloat(lPh.toFixed(2)), avgDiario: parseFloat(avgDiario.toFixed(1)) });

                (v.eventos || []).forEach(e => {
                    if (e.tipo === 'REGISTRO') eventCounts.REGISTRO++;
                    if (e.tipo === 'SERVICE') eventCounts.SERVICE++;
                    if (e.tipo === 'REPARACION' || e.tipo === 'BAJA') { eventCounts.REPARACION++; breaksPerCompany[comp.nombre]++; }
                });
            });
        });

        return { 
            topConsumidores: [...allVehicles].sort((a,b) => b.lPh - a.lPh).slice(0, 5), 
            eventCounts, breaksPerCompany, 
            topUso: [...allVehicles].sort((a,b) => b.avgDiario - a.avgDiario).slice(0, 5) 
        };
    }, [companies]);

    const chartGastosData = {
        labels: ['Cargas Diésel', 'Services', 'Roturas/Reparaciones'],
        datasets: [{ data: [intelligenceData.eventCounts.REGISTRO, intelligenceData.eventCounts.SERVICE, intelligenceData.eventCounts.REPARACION], backgroundColor: ['#3b82f6', '#10b981', '#ef4444'], borderWidth: 0 }]
    };

    const chartSeveridadData = {
        labels: Object.keys(intelligenceData.breaksPerCompany),
        datasets: [{ label: 'Nº Roturas Históricas', data: Object.values(intelligenceData.breaksPerCompany), backgroundColor: '#f59e0b', borderRadius: 8 }]
    };

    // --- OPERACIONES ADMIN (CRUD) ---
    const saveBndSettings = async () => { await fb.setDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "config", "bnd_info"), bndSettings); setActiveTab('dashboard'); };
    const handleDeleteCompany = async (id) => { if(confirm("¿Eliminar la empresa y TODA su flota permanentemente?")) await fb.deleteDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", id)); };
    const handleEditCompanySubmit = async () => { await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", selectedCompanyId), { nombre: form.nombre, cuit: form.cuit, responsable: form.responsable, tankCapacity: parseFloat(form.tankCapacity), criticalFuelPerc: parseFloat(form.criticalFuelPerc) || 25 }); setModalType(null); };
    const handleDeleteVehicle = async (vId) => { if(confirm("¿Eliminar este equipo permanentemente?")) { await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: activeCompany.vehiculos.filter(v => v.id !== vId) }); setActiveVehicleId(null); } };
    const handleEditVehicleSubmit = async () => { await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, nombre: form.nombre, marca: form.marca, modelo: form.modelo, serie: form.serie, patente: form.patente, serviceInterval: parseFloat(form.serviceInterval) } : v) }); setModalType(null); };
    const handleAddCompany = async () => { if(!form.nombre) return; await fb.addDoc(fb.collection(db, "artifacts", APP_ID, "public", "data", "companies"), { nombre: form.nombre, cuit: form.cuit, responsable: form.responsable, tankCapacity: parseFloat(form.tankCapacity) || 1000, criticalFuelPerc: parseFloat(form.criticalFuelPerc) || 25, currentFuel: parseFloat(form.tankCapacity) || 1000, vehiculos: [] }); setModalType(null); setForm({...form, nombre: '', cuit: '', responsable: ''}); };
    
    // CREACIÓN DE VEHÍCULO CON NUMERACIÓN AUTOMÁTICA
    const handleAddVehicle = async () => { 
        const h = parseFloat(form.horometro) || 0; 
        const nuevoNumero = (activeCompany.vehiculos || []).length + 1; // Calculamos el índice secuencial
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: fb.arrayUnion({ 
                id: Date.now().toString(), 
                numeroInterno: nuevoNumero, // Asignamos el número
                ...form, 
                horometroTotal: h, 
                ultimoServiceHoras: h, 
                operativo: true, 
                workflowStatus: 'PENDIENTE', 
                eventos: [{ id: Date.now(), tipo: 'ALTA', fecha: new Date().toLocaleDateString(), horas: h, nota: 'Alta inicial del equipo' }] 
            }) 
        }); 
        setModalType(null); 
    };

    // --- OPERACIONES DE CAMPO ---
    const handleDailyLog = async () => {
        const h = parseFloat(form.horas); const l = parseFloat(form.litros);
        const updatedVehicles = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, horometroTotal: h, eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'REGISTRO', fecha: form.fecha, horas: h, litros: l, nota: form.nota }] } : v);
        const newFuel = Math.max(0, activeCompany.currentFuel - l);
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: updatedVehicles, currentFuel: newFuel });
        setModalType(null); setForm({...form, horas: '', litros: '', nota: ''});
    };
    const handleToggleStatus = async (vId, active) => { if(active) { setActiveVehicleId(vId); setModalType('downtime'); } else { await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: activeCompany.vehiculos.map(v => v.id === vId ? { ...v, operativo: true, workflowStatus: 'PENDIENTE', eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'ALTA', fecha: new Date().toLocaleDateString(), nota: 'Puesta en marcha manual' }] } : v) }); } };
    const handleConfirmDowntime = async () => { await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, operativo: false, workflowStatus: 'PENDIENTE', eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'BAJA', fecha: new Date().toLocaleDateString(), motivo: form.motivo }] } : v) }); setModalType(null); setForm({...form, motivo: ''}); };
    const handleUpdateWorkflow = async (cId, vId, ns) => { if(ns === 'REPARADO') { setActiveVehicleId(vId); setSelectedCompanyId(cId); setModalType('repair_finish'); return; } await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", cId), { vehiculos: companies.find(x => x.id === cId).vehiculos.map(v => v.id === vId ? {...v, workflowStatus: ns} : v) }); };
    const handleRepairSubmit = async () => { await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", selectedCompanyId), { vehiculos: companies.find(c => c.id === selectedCompanyId).vehiculos.map(v => v.id === activeVehicleId ? { ...v, operativo: true, workflowStatus: 'PENDIENTE', eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'REPARACION', fecha: new Date().toLocaleDateString(), nota: form.nota }] } : v) }); setModalType(null); };
    const handleHistoricalData = async () => { const h = parseFloat(form.horas); if(isNaN(h)) return; await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { ...v, horometroTotal: Math.max(v.horometroTotal, h), eventos: [...(v.eventos || []), { id: Date.now(), tipo: 'REGISTRO', fecha: form.fecha, horas: h, nota: "Sincronización Histórica" }] } : v) }); setModalType(null); };
    const handleServiceReset = async () => { await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { vehiculos: activeCompany.vehiculos.map(x => x.id === activeVehicleId ? { ...x, ultimoServiceHoras: x.horometroTotal, eventos: [...(x.eventos || []), { id: Date.now(), tipo: 'SERVICE', fecha: new Date().toLocaleDateString(), horas: x.horometroTotal, insumos: form.insumos, nota: form.nota }] } : x) }); setModalType(null); setForm({...form, insumos: [], nota: ''}); };
    const refillTank = async () => { await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { currentFuel: activeCompany.tankCapacity }); setModalType(null); };

    // --- UTILIDADES ---
    const downloadPDF = (company, vehicle) => {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.text("BND", 15, 25); doc.setFontSize(10); doc.text(bndSettings.description, 15, 33);
        doc.setTextColor(0, 0, 0); doc.text(`Cliente: ${company.nombre}`, 15, 55); doc.text(`Equipo: ${vehicle.nombre} | Patente: ${vehicle.patente || '-'}`, 15, 62);
        const body = (vehicle.eventos || []).slice().reverse().map(e => [e.fecha, e.tipo, `${e.horas} HS`, e.litros || '-', e.nota || e.motivo || '-']);
        doc.autoTable({ startY: 70, head: [['FECHA', 'TIPO', 'HS', 'DIESEL', 'DETALLE']], body, headStyles: { fillColor: [15, 23, 42] } });
        doc.save(`BND_${vehicle.nombre}.pdf`);
    };

    const startScanner = () => {
        setScannerActive(true);
        setTimeout(() => {
            scannerRef.current = new window.Html5Qrcode("reader");
            scannerRef.current.start(
                { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, 
                (txt) => {
                    if (txt.startsWith("sp-asset:")) { 
                        const [_, cid, vid] = txt.split(":"); 
                        if (role === 'operario' && cid !== userCompanyId) {
                            alert("Acceso denegado: Este equipo no pertenece a tu flota.");
                            setScannerActive(false); scannerRef.current.stop(); return;
                        }
                        setSelectedCompanyId(cid); setIsolatedVehicleId(vid); setActiveVehicleId(vid); setActiveTab('companies'); 
                        setScannerActive(false); scannerRef.current.stop(); 
                        setTimeout(() => setModalType('log'), 500);
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

    const handlePrintQR = () => {
        const qrContainer = document.getElementById(`qr-container-${activeVehicleId}`);
        if (!qrContainer) return;
        const printWindow = window.open('', '', 'width=600,height=600');
        printWindow.document.write(`<html><head><title>Impresión BND</title><style>@page { size: auto; margin: 0mm; } body { font-family: 'Arial', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; } h1 { font-size: 50px; font-weight: 900; font-style: italic; margin: 0 0 15px 0; color: #000; } .qr-box { padding: 15px; border: 6px solid #000; border-radius: 15px; display: inline-block; } h2 { font-size: 25px; font-weight: 900; margin: 15px 0 0 0; text-transform: uppercase; letter-spacing: 2px; color: #000; text-align: center; }</style></head><body><h1>BND</h1><div class="qr-box">${qrContainer.innerHTML}</div><h2>${activeVehicle?.nombre || 'EQUIPO'}</h2></body></html>`);
        printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const toggleHistory = (id) => { const ns = new Set(expandedVehicles); if (ns.has(id)) ns.delete(id); else ns.add(id); setExpandedVehicles(ns); };
    const toggleInfo = (id) => { setExpandedInfo(p => ({ ...p, [id]: !p[id] })); };

    // --- VISTAS DE CARGA Y LOGIN ---
    if (authLoading || loading) return <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-900 text-white font-black uppercase tracking-[0.2em] animate-pulse w-full">Cargando BND...</div>;

    if (!user) return (
        <div className="flex h-[100dvh] items-center justify-center bg-slate-900 px-4 md:px-6 select-none w-full" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="glass-card p-8 md:p-12 w-full max-w-sm md:max-w-md bg-white/5 backdrop-blur-2xl border-white/10 text-center">
                <img src="./icon.png" alt="BND Logo" className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-2xl shadow-2xl shadow-yellow-400/20 object-cover" />
                <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter mb-2">BND</h1>
                <p className="text-[9px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-8 md:mb-10">Control de Activos</p>
                {loginError && <p className="bg-red-500/20 text-red-400 text-[10px] md:text-xs font-bold p-3 rounded-xl mb-6 border border-red-500/30 uppercase">{loginError}</p>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="email" required className="input-premium px-5 py-3 w-full rounded-xl bg-white/10 border-none text-white text-center text-sm md:text-base font-bold" placeholder="USUARIO" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                    <input type="password" required className="input-premium px-5 py-3 w-full rounded-xl bg-white/10 border-none text-white text-center text-sm md:text-base font-bold" placeholder="PASSWORD" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                    <button type="submit" className="btn-accent w-full px-5 py-3 rounded-xl text-sm font-black mt-4 uppercase shadow-lg">Entrar</button>
                </form>
            </div>
        </div>
    );

    const nav = [ { id: 'dashboard', label: 'Alertas', icon: 'dashboard' } ];
    if (role === 'admin') {
        nav.push({ id: 'companies', label: 'Directorio', icon: 'company' });
        nav.push({ id: 'calendar', label: 'Proyecciones', icon: 'calendar' });
        nav.push({ id: 'metrics', label: 'Métricas', icon: 'chart' }); 
        nav.push({ id: 'config', label: 'Admin', icon: 'settings' });
    } else {
        nav.push({ id: 'companies', label: 'Mi Flota', icon: 'company' });
        nav.push({ id: 'calendar', label: 'Mis Proyecciones', icon: 'calendar' });
    }

    // --- INTERFAZ PRINCIPAL ---
    return (
        <div className="flex h-[100dvh] bg-slate-50 overflow-hidden select-none w-full" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
            {sidebarOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[190] lg:hidden" onClick={() => setSidebarOpen(false)} />}
            
            <aside className={`fixed inset-y-0 left-0 z-[200] w-72 bg-white flex flex-col p-6 md:p-8 border-r border-slate-100 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center gap-4 mb-8">
                    <img src="./icon.png" alt="BND" className="w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-md object-cover" />
                    <div><h1 className="text-2xl md:text-3xl font-black italic tracking-tighter">BND</h1><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{role}</p><p className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[150px] mt-0.5">{userName}</p></div>
                </div>
                <nav className="flex-1 space-y-2 overflow-y-auto">
                    {nav.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); if(role === 'admin') setSelectedCompanyId(null); setActiveVehicleId(null); setIsolatedVehicleId(null); setSidebarOpen(false); }} className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs md:text-sm transition-all ${activeTab === item.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-300' : 'text-slate-400 hover:bg-slate-100'}`}>
                            <Icon name={item.icon} size={18}/> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="pt-4 border-t border-slate-100 space-y-3 mt-auto">
                    <button onClick={startScanner} className="btn-accent px-4 py-3 w-full rounded-xl text-xs md:text-sm font-black shadow-md flex items-center justify-center gap-2"><Icon name="qr" size={16}/> ESCANEAR</button>
                    <button onClick={handleLogout} className="w-full px-4 py-3 text-[10px] font-black uppercase text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">Cerrar Sesión</button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="lg:hidden h-16 sm:h-20 flex items-center justify-between px-5 bg-white/90 backdrop-blur-md border-b border-slate-100 shrink-0 z-50">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-50 rounded-lg active:scale-95"><Icon name="menu" size={24}/></button>
                    <span className="font-black italic tracking-tighter text-xl sm:text-2xl">BND</span>
                    <img src="./icon.png" alt="BND" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-sm object-cover" />
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 space-y-6 md:space-y-8 pb-32">
                    {/* INYECCIÓN DINÁMICA DE VISTAS DESDE AppViews.jsx */}
                    {activeTab === 'dashboard' && <DashboardView alerts={alerts} handleUpdateWorkflow={handleUpdateWorkflow} setSelectedCompanyId={setSelectedCompanyId} setIsolatedVehicleId={setIsolatedVehicleId} setActiveVehicleId={setActiveVehicleId} setActiveTab={setActiveTab} />}
                    {activeTab === 'companies' && !activeCompany && role === 'admin' && <CompaniesView companies={companies} role={role} setForm={setForm} setModalType={setModalType} setSelectedCompanyId={setSelectedCompanyId} setActiveVehicleId={setActiveVehicleId} handleDeleteCompany={handleDeleteCompany} />}
                    {activeTab === 'companies' && activeCompany && <CompanyDetailView role={role} activeCompany={activeCompany} activeVehicle={activeVehicle} activeVehicleId={activeVehicleId} isolatedVehicleId={isolatedVehicleId} displayedVehicles={displayedVehicles} expandedVehicles={expandedVehicles} setSelectedCompanyId={setSelectedCompanyId} setIsolatedVehicleId={setIsolatedVehicleId} setActiveVehicleId={setActiveVehicleId} setForm={setForm} setModalType={setModalType} handleDeleteVehicle={handleDeleteVehicle} handleToggleStatus={handleToggleStatus} downloadPDF={downloadPDF} generateQR={generateQR} toggleHistory={toggleHistory} />}
                    {activeTab === 'config' && role === 'admin' && <ConfigView bndSettings={bndSettings} setBndSettings={setBndSettings} saveBndSettings={saveBndSettings} usersList={usersList} companies={companies} handleUpdateUserRole={handleUpdateUserRole} setNewUser={setNewUser} setModalType={setModalType} setEditingUserId={setEditingUserId} />}
                    {activeTab === 'calendar' && <CalendarView role={role} userCompanyId={userCompanyId} companies={companies} selectedCompanyId={selectedCompanyId} setSelectedCompanyId={setSelectedCompanyId} companyProjections={companyProjections} />}
                    {activeTab === 'metrics' && role === 'admin' && <MetricsView intelligenceData={intelligenceData} chartGastosData={chartGastosData} chartSeveridadData={chartSeveridadData} expandedInfo={expandedInfo} toggleInfo={toggleInfo} />}
                </div>
            </main>

            {/* INYECCIÓN DINÁMICA DE MODALES DESDE AppModals.jsx */}
            <window.AppModals 
                modalType={modalType} setModalType={setModalType} role={role} companies={companies} 
                activeCompany={activeCompany} activeVehicle={activeVehicle} activeVehicleId={activeVehicleId} 
                form={form} setForm={setForm} newUser={newUser} setNewUser={setNewUser} 
                newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} pwdError={pwdError} 
                handleRegisterUser={handleRegisterUser} handleUpdateUserSubmit={handleUpdateUserSubmit} handleChangePassword={handleChangePassword} 
                handleAddCompany={handleAddCompany} handleEditCompanySubmit={handleEditCompanySubmit} handleAddVehicle={handleAddVehicle} handleEditVehicleSubmit={handleEditVehicleSubmit} 
                handleDailyLog={handleDailyLog} handleServiceReset={handleServiceReset} handleConfirmDowntime={handleConfirmDowntime} handleRepairSubmit={handleRepairSubmit} handleHistoricalData={handleHistoricalData} 
                handlePrintQR={handlePrintQR} refillTank={refillTank} chartRef={chartRef}
            />

            {/* OVERLAY DEL ESCÁNER QR */}
            {scannerActive && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/98 backdrop-blur-md flex flex-col items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-[320px] md:max-w-[400px] aspect-square relative mb-10">
                        <div id="reader" className="w-full h-full rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border-[8px] md:border-[12px] border-yellow-400 shadow-2xl"></div>
                        <div className="absolute inset-0 pointer-events-none border-[30px] md:border-[40px] border-transparent after:absolute after:inset-6 md:after:inset-8 after:border-2 after:border-yellow-400/50 after:animate-pulse"></div>
                    </div>
                    <button onClick={() => { setScannerActive(false); if(scannerRef.current) scannerRef.current.stop(); }} className="px-12 py-5 md:px-16 md:py-6 bg-white text-slate-900 rounded-2xl md:rounded-3xl font-black text-sm md:text-lg shadow-xl active:scale-95 transition-transform tracking-widest">CANCELAR</button>
                </div>
            )}
        </div>
    );
};

window.App = App;
