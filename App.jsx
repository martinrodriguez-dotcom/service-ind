const { useState, useEffect, useMemo, useRef } = React;
const { Icon, ModalComp, FuelTankCapsule, db, auth, APP_ID, fb, FIREBASE_API_KEY } = window;

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
        email: '', 
        password: '', 
        nombre: '', 
        role: 'operario', 
        companyId: '' 
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
    
    const scannerRef = useRef(null);
    const chartRef = useRef(null);

    const [bndSettings, setBndSettings] = useState({
        name: "BND", 
        description: "Gestión de Activos Industriales",
        address: "-", 
        phone: "-", 
        email: "-", 
        web: "-"
    });

    const [form, setForm] = useState({ 
        nombre: '', 
        cuit: '', 
        responsable: '', 
        mail: '', 
        tel: '',
        marca: '', 
        modelo: '', 
        serie: '', 
        patente: '', 
        año: '', 
        serviceInterval: 250, 
        horometro: '', 
        horas: '', 
        litros: '', 
        nota: '', 
        motivo: '', 
        tankCapacity: 1000,
        criticalFuelPerc: 25, 
        insumos: [], 
        insumoManual: '', 
        fecha: new Date().toISOString().split('T')[0]
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
                            
                            if (userData.companyId) {
                                setUserCompanyId(userData.companyId);
                            }
                            
                            if (userData.requiresPasswordChange) {
                                setModalType('force_password_change');
                            }
                        } else {
                            await fb.setDoc(userDocRef, { 
                                email: u.email, 
                                nombre: 'Admin Master', 
                                role: 'admin', 
                                requiresPasswordChange: false 
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
                        if(snap.exists()) {
                            setBndSettings(snap.data()); 
                        }
                    });

                    const q = fb.collection(db, "artifacts", APP_ID, "public", "data", "companies");
                    const unsub = fb.onSnapshot(q, (snapshot) => {
                        setCompanies(snapshot.docs.map(doc => ({ 
                            id: doc.id, 
                            ...doc.data() 
                        })));
                        setLoading(false); 
                        setAuthLoading(false);
                    });
                    
                    return () => unsub();
                    
                } else { 
                    setUser(null); 
                    setRole(null); 
                    setUserName(''); 
                    setUserCompanyId(null);
                    setLoading(false); 
                    setAuthLoading(false); 
                }
            });
        };
        
        if (window.db) {
            initSync();
        } else {
            window.addEventListener('firebase-ready', initSync);
        }
    }, []);

    // --- ESCUCHA DE USUARIOS (SOLO ADMINISTRADOR) ---
    useEffect(() => {
        if (role === 'admin' && db) {
            const unsub = fb.onSnapshot(fb.collection(db, "artifacts", APP_ID, "public", "data", "users"), (snap) => {
                setUsersList(snap.docs.map(doc => ({ 
                    uid: doc.id, 
                    ...doc.data() 
                })));
            });
            return () => unsub();
        }
    }, [role]);

    // Redirección automática para operarios
    useEffect(() => {
        if (role === 'operario' && userCompanyId && activeTab === 'companies' && !selectedCompanyId) {
            setSelectedCompanyId(userCompanyId);
        }
        if (role === 'operario' && userCompanyId && activeTab === 'calendar' && !selectedCompanyId) {
            setSelectedCompanyId(userCompanyId);
        }
    }, [role, userCompanyId, activeTab, selectedCompanyId]);

    // --- MANEJADORES DE AUTENTICACIÓN Y GESTIÓN DE USUARIOS ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthLoading(true); 
        setLoginError('');
        try { 
            await fb.signInWithEmailAndPassword(auth, loginEmail, loginPassword); 
        } catch (err) { 
            setLoginError('Correo o contraseña incorrectos.'); 
            setAuthLoading(false); 
        }
    };

    const handleLogout = async () => { 
        await fb.signOut(auth); 
        setActiveTab('dashboard'); 
        setActiveVehicleId(null); 
        setSelectedCompanyId(null); 
        setIsolatedVehicleId(null);
    };

    const handleRegisterUser = async (e) => {
        e.preventDefault();
        
        if (newUser.role === 'operario' && !newUser.companyId) {
            alert("Por favor, asigne una empresa al operario."); 
            return;
        }
        
        try {
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
                method: 'POST', 
                body: JSON.stringify({ 
                    email: newUser.email, 
                    password: newUser.password, 
                    returnSecureToken: true 
                })
            });
            
            const data = await res.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }
            
            await fb.setDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", data.localId), {
                nombre: newUser.nombre, 
                role: newUser.role, 
                email: newUser.email, 
                companyId: newUser.role === 'operario' ? newUser.companyId : null,
                requiresPasswordChange: true
            });
            
            setModalType(null); 
            setNewUser({ 
                email: '', 
                password: '', 
                nombre: '', 
                role: 'operario', 
                companyId: '' 
            });
            
            alert("Usuario creado exitosamente. Se le pedirá cambiar la contraseña en su primer ingreso.");
        } catch (err) { 
            alert("Error al crear usuario: " + err.message); 
        }
    };

    const handleUpdateUserSubmit = async () => {
        if (newUser.role === 'operario' && !newUser.companyId) {
            alert("Por favor, asigne una empresa al operario."); 
            return;
        }
        
        try {
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", editingUserId), {
                nombre: newUser.nombre, 
                role: newUser.role, 
                companyId: newUser.role === 'operario' ? newUser.companyId : null
            });
            
            if (user && editingUserId === user.uid) {
                setUserName(newUser.nombre); 
                setRole(newUser.role);
                if(newUser.role === 'operario') {
                    setUserCompanyId(newUser.companyId);
                }
            }

            setModalType(null); 
            setEditingUserId(null);
            setNewUser({ 
                email: '', 
                password: '', 
                nombre: '', 
                role: 'operario', 
                companyId: '' 
            });
        } catch (error) { 
            alert("Hubo un error al actualizar los datos del usuario."); 
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) { 
            setPwdError('Las contraseñas no coinciden.'); 
            return; 
        }
        
        try {
            await fb.updatePassword(auth.currentUser, newPassword);
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", auth.currentUser.uid), { 
                requiresPasswordChange: false 
            });
            setModalType(null);
        } catch (err) { 
            setPwdError('Error al actualizar. Intenta cerrar sesión y volver a entrar.'); 
        }
    };

    // --- LÓGICA DE NEGOCIO Y CÁLCULOS MEMOIZADOS ---
    const activeCompany = useMemo(() => {
        return companies.find(c => c.id === selectedCompanyId);
    }, [companies, selectedCompanyId]);

    const activeVehicle = useMemo(() => {
        return activeCompany?.vehiculos?.find(v => v.id === activeVehicleId);
    }, [activeCompany, activeVehicleId]);

    const displayedVehicles = useMemo(() => {
        if (!activeCompany) return [];
        if (isolatedVehicleId) {
            return activeCompany.vehiculos.filter(v => v.id === isolatedVehicleId);
        }
        return activeCompany.vehiculos;
    }, [activeCompany, isolatedVehicleId]);

    const alerts = useMemo(() => {
        let list = [];
        const relevantCompanies = role === 'admin' ? companies : companies.filter(c => c.id === userCompanyId);
        
        relevantCompanies.forEach(emp => {
            const fuelPerc = ((emp.currentFuel || 0) / (emp.tankCapacity || 1000)) * 100;
            const criticalLevel = emp.criticalFuelPerc || 25;
            
            if (fuelPerc <= criticalLevel) {
                list.push({ 
                    type: 'FUEL', 
                    companyName: emp.nombre, 
                    companyId: emp.id, 
                    value: fuelPerc.toFixed(1) 
                });
            }
            
            (emp.vehiculos || []).forEach(veh => {
                if (!veh.operativo) {
                    list.push({ 
                        type: 'BREAKDOWN', 
                        ...veh, 
                        companyId: emp.id, 
                        companyName: emp.nombre, 
                        workflowStatus: veh.workflowStatus || 'PENDIENTE', 
                        breakageMotive: (veh.eventos || []).slice().reverse().find(e => e.tipo === 'BAJA')?.motivo || "Falla reportada" 
                    });
                }
                
                const rest = (parseFloat(veh.serviceInterval) || 250) - ((parseFloat(veh.horometroTotal) || 0) - (parseFloat(veh.ultimoServiceHoras) || 0));
                
                if (rest < 50 && veh.operativo) {
                    list.push({ 
                        type: 'MAINTENANCE', 
                        ...veh, 
                        companyId: emp.id, 
                        companyName: emp.nombre, 
                        rest 
                    });
                }
            });
        });
        
        return list.sort((a,b) => (a.type === 'BREAKDOWN' ? -1 : 1));
    }, [companies, role, userCompanyId]);

    const companyProjections = useMemo(() => {
        if (!activeCompany) return null;
        
        const allFuelEvents = (activeCompany.vehiculos || []).flatMap(v => 
            (v.eventos || [])
                .filter(e => e.tipo === 'REGISTRO' && parseFloat(e.litros) > 0)
                .map(e => ({ fecha: new Date(e.fecha), litros: parseFloat(e.litros) }))
        ).sort((a,b) => a.fecha - b.fecha);

        let fuelEstDate = null; 
        let fuelAvg = 0;
        const criticalLiters = (activeCompany.tankCapacity || 1000) * ((activeCompany.criticalFuelPerc || 25) / 100);
        const currentFuel = activeCompany.currentFuel || 0;

        if (allFuelEvents.length >= 2) {
            const firstDate = allFuelEvents[0].fecha; 
            const lastDate = allFuelEvents[allFuelEvents.length - 1].fecha;
            const daysDiff = Math.max(1, (lastDate - firstDate) / 86400000);
            const totalLitros = allFuelEvents.reduce((sum, e) => sum + e.litros, 0);
            
            fuelAvg = totalLitros / daysDiff;
            
            if (fuelAvg > 0 && currentFuel > criticalLiters) {
                const daysLeft = (currentFuel - criticalLiters) / fuelAvg;
                fuelEstDate = new Date(); 
                fuelEstDate.setDate(fuelEstDate.getDate() + daysLeft);
            }
        } else if (currentFuel <= criticalLiters) {
            fuelEstDate = new Date(); 
        }

        const vProjs = (activeCompany.vehiculos || []).map(veh => {
            const regs = (veh.eventos || []).filter(e => e.tipo === 'REGISTRO').sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
            let avg = 0; 
            
            if (regs.length >= 2) { 
                const dH = (parseFloat(regs[regs.length-1].horas) || 0) - (parseFloat(regs[0].horas) || 0); 
                const dD = Math.max(1, (new Date(regs[regs.length-1].fecha) - new Date(regs[0].fecha)) / 86400000); 
                avg = dH / dD; 
            }
            
            const restHs = (parseFloat(veh.serviceInterval) || 250) - ((parseFloat(veh.horometroTotal) || 0) - (parseFloat(veh.ultimoServiceHoras) || 0));
            let estDate = null; 
            
            if (avg > 0 && restHs > 0) { 
                estDate = new Date(); 
                estDate.setDate(estDate.getDate() + Math.ceil(restHs / avg)); 
            }
            
            return { 
                ...veh, 
                estDate, 
                avgUsage: avg, 
                restHs 
            };
        }).sort((a,b) => (a.estDate || Infinity) - (b.estDate || Infinity));

        return { fuelEstDate, fuelAvg, criticalLiters, currentFuel, vProjs };
    }, [activeCompany]);

    // --- GRÁFICOS (CHART.JS) ---
    useEffect(() => {
        if (modalType === 'details' && activeCompany && chartRef.current) {
            const ctx = chartRef.current.getContext('2d');
            let allEvents = activeCompany.vehiculos.flatMap(v => (v.eventos || []).filter(e => e.litros > 0));
            
            const labels = Array.from({length: 6}, (_, i) => { 
                const d = new Date(); 
                d.setMonth(d.getMonth() - (5 - i)); 
                return d.toISOString().substring(0, 7); 
            });
            
            const dataPoints = labels.map(m => 
                allEvents.filter(e => e.fecha && e.fecha.startsWith(m))
                         .reduce((sum, e) => sum + parseFloat(e.litros || 0), 0)
            );
            
            if (window.myChartCompVFinal) {
                window.myChartCompVFinal.destroy();
            }
            
            window.myChartCompVFinal = new window.Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels.map(m => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][parseInt(m.split('-')[1])-1]),
                    datasets: [{ 
                        label: 'Diésel (L)', 
                        data: dataPoints, 
                        borderColor: '#fbbf24', 
                        backgroundColor: 'rgba(251, 191, 36, 0.05)', 
                        fill: true, 
                        tension: 0.4, 
                        borderWidth: 3 
                    }]
                },
                options: { 
                    responsive: true, 
                    plugins: { legend: { display: false } } 
                }
            });
        }
    }, [modalType, activeCompany]);

    // --- OPERACIONES DE ADMINISTRADOR (CRUD) ---
    const saveBndSettings = async () => {
        await fb.setDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "config", "bnd_info"), bndSettings);
        setActiveTab('dashboard');
    };

    const handleDeleteCompany = async (id) => {
        if(confirm("Atención: Se eliminará la empresa y TODA su flota permanentemente. ¿Confirmar?")) {
            await fb.deleteDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", id));
        }
    };

    const handleEditCompanySubmit = async () => {
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", selectedCompanyId), {
            nombre: form.nombre, 
            cuit: form.cuit, 
            responsable: form.responsable, 
            tankCapacity: parseFloat(form.tankCapacity), 
            criticalFuelPerc: parseFloat(form.criticalFuelPerc) || 25
        });
        setModalType(null);
    };

    const handleDeleteVehicle = async (vId) => {
        if(confirm("¿Eliminar este equipo permanentemente de la flota?")) {
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
                vehiculos: activeCompany.vehiculos.filter(v => v.id !== vId) 
            });
            setActiveVehicleId(null);
        }
    };

    const handleEditVehicleSubmit = async () => {
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: activeCompany.vehiculos.map(v => v.id === activeVehicleId ? {
                ...v, 
                nombre: form.nombre, 
                marca: form.marca, 
                modelo: form.modelo, 
                serie: form.serie, 
                patente: form.patente, 
                serviceInterval: parseFloat(form.serviceInterval)
            } : v) 
        });
        setModalType(null);
    };

    const handleAddCompany = async () => {
        if(!form.nombre) return;
        
        const coll = fb.collection(db, "artifacts", APP_ID, "public", "data", "companies");
        
        await fb.addDoc(coll, { 
            nombre: form.nombre, 
            cuit: form.cuit, 
            responsable: form.responsable, 
            tankCapacity: parseFloat(form.tankCapacity) || 1000, 
            criticalFuelPerc: parseFloat(form.criticalFuelPerc) || 25, 
            currentFuel: parseFloat(form.tankCapacity) || 1000, 
            vehiculos: [] 
        });
        
        setModalType(null); 
        setForm({...form, nombre: '', cuit: '', responsable: ''});
    };

    const handleAddVehicle = async () => {
        const h = parseFloat(form.horometro) || 0;
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: fb.arrayUnion({ 
                id: Date.now().toString(), 
                ...form, 
                horometroTotal: h, 
                ultimoServiceHoras: h, 
                operativo: true, 
                workflowStatus: 'PENDIENTE', 
                eventos: [{ 
                    id: Date.now(), 
                    tipo: 'ALTA', 
                    fecha: new Date().toLocaleDateString(), 
                    horas: h, 
                    nota: 'Alta inicial del equipo' 
                }] 
            }) 
        });
        
        setModalType(null);
    };

    // --- OPERACIONES DE CAMPO (OPERARIOS Y ADMIN) ---
    const handleDailyLog = async () => {
        const h = parseFloat(form.horas); 
        const l = parseFloat(form.litros);
        
        const updatedVehicles = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { 
            ...v, 
            horometroTotal: h, 
            eventos: [...(v.eventos || []), { 
                id: Date.now(), 
                tipo: 'REGISTRO', 
                fecha: form.fecha, 
                horas: h, 
                litros: l, 
                nota: form.nota 
            }] 
        } : v);
        
        const newFuel = Math.max(0, activeCompany.currentFuel - l);
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: updatedVehicles, 
            currentFuel: newFuel 
        });
        
        setModalType(null); 
        setForm({...form, horas: '', litros: '', nota: ''});
    };

    const handleToggleStatus = async (vId, active) => {
        if(active) { 
            setActiveVehicleId(vId); 
            setModalType('downtime'); 
        } else {
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
                vehiculos: activeCompany.vehiculos.map(v => v.id === vId ? { 
                    ...v, 
                    operativo: true, 
                    workflowStatus: 'PENDIENTE', 
                    eventos: [...(v.eventos || []), { 
                        id: Date.now(), 
                        tipo: 'ALTA', 
                        fecha: new Date().toLocaleDateString(), 
                        nota: 'Puesta en marcha manual' 
                    }] 
                } : v) 
            }); 
        }
    };

    const handleConfirmDowntime = async () => {
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { 
                ...v, 
                operativo: false, 
                workflowStatus: 'PENDIENTE', 
                eventos: [...(v.eventos || []), { 
                    id: Date.now(), 
                    tipo: 'BAJA', 
                    fecha: new Date().toLocaleDateString(), 
                    motivo: form.motivo 
                }] 
            } : v) 
        });
        
        setModalType(null); 
        setForm({...form, motivo: ''});
    };

    const handleUpdateWorkflow = async (cId, vId, ns) => {
        if(ns === 'REPARADO') { 
            setActiveVehicleId(vId); 
            setSelectedCompanyId(cId); 
            setModalType('repair_finish'); 
            return; 
        }
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", cId), { 
            vehiculos: companies.find(x => x.id === cId).vehiculos.map(v => v.id === vId ? {
                ...v, 
                workflowStatus: ns
            } : v) 
        });
    };

    const handleRepairSubmit = async () => {
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", selectedCompanyId), { 
            vehiculos: companies.find(c => c.id === selectedCompanyId).vehiculos.map(v => v.id === activeVehicleId ? { 
                ...v, 
                operativo: true, 
                workflowStatus: 'PENDIENTE', 
                eventos: [...(v.eventos || []), { 
                    id: Date.now(), 
                    tipo: 'REPARACION', 
                    fecha: new Date().toLocaleDateString(), 
                    nota: form.nota 
                }] 
            } : v) 
        });
        
        setModalType(null);
    };

    const handleHistoricalData = async () => {
        const h = parseFloat(form.horas); 
        if(isNaN(h)) return;
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { 
                ...v, 
                horometroTotal: Math.max(v.horometroTotal, h), 
                eventos: [...(v.eventos || []), { 
                    id: Date.now(), 
                    tipo: 'REGISTRO', 
                    fecha: form.fecha, 
                    horas: h, 
                    nota: "Sincronización Histórica" 
                }] 
            } : v) 
        });
        
        setModalType(null);
    };

    const handleServiceReset = async () => {
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: activeCompany.vehiculos.map(x => x.id === activeVehicleId ? { 
                ...x, 
                ultimoServiceHoras: x.horometroTotal, 
                eventos: [...(x.eventos || []), { 
                    id: Date.now(), 
                    tipo: 'SERVICE', 
                    fecha: new Date().toLocaleDateString(), 
                    horas: x.horometroTotal, 
                    insumos: form.insumos, 
                    nota: form.nota 
                }] 
            } : x) 
        });
        
        setModalType(null); 
        setForm({...form, insumos: [], nota: ''});
    };

    const refillTank = async () => { 
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            currentFuel: activeCompany.tankCapacity 
        }); 
        setModalType(null); 
    };

    // --- UTILIDADES PDF Y CÓDIGO QR ---
    const downloadPDF = (company, vehicle) => {
        const { jsPDF } = window.jspdf; 
        const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255); 
        doc.setFontSize(24); 
        doc.text("BND", 15, 25);
        
        doc.setFontSize(10); 
        doc.text(bndSettings.description, 15, 33);
        
        doc.setTextColor(0, 0, 0); 
        doc.text(`Cliente: ${company.nombre}`, 15, 55); 
        doc.text(`Equipo: ${vehicle.nombre} | Patente: ${vehicle.patente || '-'}`, 15, 62);
        
        const body = (vehicle.eventos || []).slice().reverse().map(e => [
            e.fecha, 
            e.tipo, 
            `${e.horas} HS`, 
            e.litros || '-', 
            e.nota || e.motivo || '-'
        ]);
        
        doc.autoTable({ 
            startY: 70, 
            head: [['FECHA', 'TIPO', 'HS', 'DIESEL', 'DETALLE']], 
            body, 
            headStyles: { fillColor: [15, 23, 42] } 
        });
        
        doc.save(`BND_${vehicle.nombre}.pdf`);
    };

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
                        
                        if (role === 'operario' && cid !== userCompanyId) {
                            alert("Acceso denegado: Este equipo no pertenece a tu flota.");
                            setScannerActive(false); 
                            scannerRef.current.stop(); 
                            return;
                        }
                        
                        setSelectedCompanyId(cid); 
                        setIsolatedVehicleId(vid); 
                        setActiveVehicleId(vid); 
                        setActiveTab('companies'); 
                        setScannerActive(false); 
                        scannerRef.current.stop(); 
                        
                        setTimeout(() => setModalType('log'), 500);
                    }
                }, 
                (err) => {
                    // Se ignoran errores para no ensuciar consola
                }
            ).catch(e => console.error("Error cámara:", e));
        }, 500);
    };

    const generateQR = (vid) => {
        const div = document.getElementById(`qr-container-${vid}`);
        if(!div) return; 
        
        div.innerHTML = "";
        new window.QRCode(div, { 
            text: `sp-asset:${selectedCompanyId}:${vid}`, 
            width: 180, 
            height: 180, 
            colorDark : "#0f172a" 
        });
    };

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
                        body { 
                            font-family: 'Arial', sans-serif; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            margin: 0; 
                        } 
                        h1 { 
                            font-size: 50px; 
                            font-weight: 900; 
                            font-style: italic; 
                            margin: 0 0 15px 0; 
                            color: #000; 
                        } 
                        .qr-box { 
                            padding: 15px; 
                            border: 6px solid #000; 
                            border-radius: 15px; 
                            display: inline-block; 
                        } 
                        h2 { 
                            font-size: 25px; 
                            font-weight: 900; 
                            margin: 15px 0 0 0; 
                            text-transform: uppercase; 
                            letter-spacing: 2px; 
                            color: #000; 
                            text-align: center; 
                        }
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
        
        setTimeout(() => { 
            printWindow.print(); 
            printWindow.close(); 
        }, 500);
    };

    const toggleHistory = (id) => { 
        const ns = new Set(expandedVehicles); 
        if (ns.has(id)) {
            ns.delete(id); 
        } else {
            ns.add(id); 
        }
        setExpandedVehicles(ns); 
    };

    // --- VISTAS DE CARGA Y LOGIN ---
    if (authLoading || loading) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-900 text-white font-black uppercase tracking-[0.2em] animate-pulse w-full">
                Cargando BND...
            </div>
        );
    }

    if (!user) {
        return (
            <div 
                className="flex h-[100dvh] items-center justify-center bg-slate-900 px-4 md:px-6 select-none w-full" 
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="glass-card p-8 md:p-12 w-full max-w-sm md:max-w-md bg-white/5 backdrop-blur-2xl border-white/10 text-center">
                    <img 
                        src="./icon.png" 
                        alt="BND Logo" 
                        className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-2xl shadow-2xl shadow-yellow-400/20 object-cover" 
                    />
                    <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter mb-2">
                        BND
                    </h1>
                    <p className="text-[9px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-8 md:mb-10">
                        Control de Activos
                    </p>
                    
                    {loginError && (
                        <p className="bg-red-500/20 text-red-400 text-[10px] md:text-xs font-bold p-3 rounded-xl mb-6 border border-red-500/30 uppercase">
                            {loginError}
                        </p>
                    )}
                    
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input 
                            type="email" 
                            required 
                            className="input-premium px-5 py-3 w-full rounded-xl bg-white/10 border-none text-white text-center text-sm md:text-base font-bold" 
                            placeholder="USUARIO" 
                            value={loginEmail} 
                            onChange={e => setLoginEmail(e.target.value)} 
                        />
                        <input 
                            type="password" 
                            required 
                            className="input-premium px-5 py-3 w-full rounded-xl bg-white/10 border-none text-white text-center text-sm md:text-base font-bold" 
                            placeholder="PASSWORD" 
                            value={loginPassword} 
                            onChange={e => setLoginPassword(e.target.value)} 
                        />
                        <button 
                            type="submit" 
                            className="btn-accent w-full px-5 py-3 rounded-xl text-sm font-black mt-4 uppercase shadow-lg"
                        >
                            Entrar
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- CONSTRUCCIÓN DEL MENÚ DINÁMICO ---
    const nav = [ 
        { id: 'dashboard', label: 'Alertas', icon: 'dashboard' } 
    ];
    
    if (role === 'admin') {
        nav.push({ id: 'companies', label: 'Directorio', icon: 'company' });
        nav.push({ id: 'calendar', label: 'Proyecciones', icon: 'calendar' });
        nav.push({ id: 'config', label: 'Admin', icon: 'settings' });
    } else {
        nav.push({ id: 'companies', label: 'Mi Flota', icon: 'company' });
        nav.push({ id: 'calendar', label: 'Mis Proyecciones', icon: 'calendar' });
    }

    // --- INTERFAZ PRINCIPAL ---
    return (
        <div 
            className="flex h-[100dvh] bg-slate-50 overflow-hidden select-none w-full" 
            style={{ 
                paddingTop: 'env(safe-area-inset-top)', 
                paddingBottom: 'env(safe-area-inset-bottom)', 
                paddingLeft: 'env(safe-area-inset-left)', 
                paddingRight: 'env(safe-area-inset-right)' 
            }}
        >
            
            {/* OVERLAY MOBILE ESTRICTO CON TAILWIND */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[190] lg:hidden" 
                    onClick={() => setSidebarOpen(false)} 
                />
            )}
            
            {/* SIDEBAR ADAPTABLE (PC/Mobile) */}
            <aside className={`fixed inset-y-0 left-0 z-[200] w-72 bg-white flex flex-col p-6 md:p-8 border-r border-slate-100 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center gap-4 mb-8">
                    <img 
                        src="./icon.png" 
                        alt="BND" 
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-md object-cover" 
                    />
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter">BND</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[150px] mt-0.5">{userName}</p>
                    </div>
                </div>
                
                <nav className="flex-1 space-y-2 overflow-y-auto">
                    {nav.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => { 
                                setActiveTab(item.id); 
                                if(role === 'admin') setSelectedCompanyId(null); 
                                setActiveVehicleId(null); 
                                setIsolatedVehicleId(null); 
                                setSidebarOpen(false); 
                            }} 
                            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs md:text-sm transition-all ${activeTab === item.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-300' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <Icon name={item.icon} size={18}/> 
                            {item.label}
                        </button>
                    ))}
                </nav>
                
                <div className="pt-4 border-t border-slate-100 space-y-3 mt-auto">
                    <button 
                        onClick={startScanner} 
                        className="btn-accent px-4 py-3 w-full rounded-xl text-xs md:text-sm font-black shadow-md flex items-center justify-center gap-2"
                    >
                        <Icon name="qr" size={16}/> ESCANEAR
                    </button>
                    <button 
                        onClick={handleLogout} 
                        className="w-full px-4 py-3 text-[10px] font-black uppercase text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* CONTENEDOR DE CONTENIDO PRINCIPAL */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* HEADER MOBILE */}
                <header className="lg:hidden h-16 sm:h-20 flex items-center justify-between px-5 bg-white/90 backdrop-blur-md border-b border-slate-100 shrink-0 z-50">
                    <button 
                        onClick={() => setSidebarOpen(true)} 
                        className="p-2 bg-slate-50 rounded-lg active:scale-95"
                    >
                        <Icon name="menu" size={24}/>
                    </button>
                    <span className="font-black italic tracking-tighter text-xl sm:text-2xl">BND</span>
                    <img 
                        src="./icon.png" 
                        alt="BND" 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-sm object-cover" 
                    />
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 space-y-6 md:space-y-8 pb-32">
                    
                    {/* VISTA: PANEL DE ALERTAS */}
                    {activeTab === 'dashboard' && (
                        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
                            <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight">Alertas</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {alerts.map((a, i) => (
                                    <div 
                                        key={i} 
                                        className={`glass-card p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 md:gap-5 border-l-[8px] md:border-l-[12px] ${a.type === 'BREAKDOWN' ? 'border-l-red-500' : 'border-l-yellow-400'}`}
                                    >
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'BREAKDOWN' ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-yellow-50 text-yellow-600'}`}>
                                            <Icon name={a.type === 'FUEL' ? 'fuel' : 'alert'} size={24}/>
                                        </div>
                                        <div className="flex-1 text-center md:text-left w-full">
                                            <h4 className="font-black uppercase text-base md:text-lg italic truncate">
                                                {a.nombre || 'COMBUSTIBLE CRÍTICO'}
                                            </h4>
                                            <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest truncate">
                                                {a.companyName}
                                            </p>
                                        </div>
                                        <div className="flex items-center w-full md:w-auto gap-3">
                                            {a.type === 'BREAKDOWN' ? (
                                                <div className="flex flex-col sm:flex-row bg-slate-50 p-2 rounded-xl w-full gap-2">
                                                    {['PENDIENTE', 'REVISION', 'REPARADO'].map(s => (
                                                        <button 
                                                            key={s} 
                                                            onClick={() => handleUpdateWorkflow(a.companyId, a.id, s)} 
                                                            className={`px-3 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase w-full transition-all ${a.workflowStatus === s ? 'bg-red-600 text-white shadow-md scale-105' : 'bg-white text-slate-500 border'}`}
                                                        >
                                                            {s.slice(0,4)}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => { 
                                                        setSelectedCompanyId(a.companyId); 
                                                        setActiveVehicleId(null); 
                                                        setActiveTab('companies'); 
                                                    }} 
                                                    className="btn-premium px-5 py-3 rounded-xl w-full md:w-auto text-[10px] md:text-xs font-black"
                                                >
                                                    VER FLOTA
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {alerts.length === 0 && (
                                    <div className="text-center p-10 bg-emerald-50 rounded-2xl border border-emerald-100">
                                        <p className="font-black text-emerald-600 uppercase italic">TODO EN ORDEN</p>
                                        <p className="text-xs text-emerald-500 font-bold mt-2">No hay alertas críticas en la flota.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VISTA: DIRECTORIO DE EMPRESAS (SÓLO ADMIN) */}
                    {activeTab === 'companies' && !activeCompany && role === 'admin' && (
                        <div className="max-w-6xl mx-auto animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Directorio</h2>
                                <button 
                                    onClick={() => { 
                                        setForm({
                                            nombre:'', 
                                            cuit:'', 
                                            responsable:'', 
                                            tankCapacity:1000, 
                                            criticalFuelPerc: 25
                                        }); 
                                        setModalType('company'); 
                                    }} 
                                    className="btn-accent px-5 py-3 rounded-xl w-full sm:w-auto text-xs font-black shadow-md"
                                >
                                    + NUEVO CLIENTE
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                                {companies.map(emp => (
                                    <div key={emp.id} className="glass-card p-5 md:p-6 relative group">
                                        <div className="flex justify-between items-start mb-6 md:mb-8">
                                            <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-yellow-400 shadow-xl">
                                                <Icon name="company" size={24}/>
                                            </div>
                                            <FuelTankCapsule capacity={emp.tankCapacity} current={emp.currentFuel} />
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-black uppercase italic truncate mb-1 pr-12 md:pr-16">
                                            {emp.nombre}
                                        </h3>
                                        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-6 md:mb-8">
                                            CUIT: {emp.cuit}
                                        </p>
                                        
                                        <div className="flex gap-2 w-full mt-4">
                                            <button 
                                                onClick={() => { 
                                                    setSelectedCompanyId(emp.id); 
                                                    setActiveVehicleId(null); 
                                                }} 
                                                className="btn-premium flex-1 px-4 py-3 rounded-xl text-sm md:text-base font-black uppercase shadow-md"
                                            >
                                                ABRIR FLOTA
                                            </button>
                                            
                                            <button 
                                                onClick={() => { 
                                                    setSelectedCompanyId(emp.id); 
                                                    setForm({
                                                        nombre: emp.nombre, 
                                                        cuit: emp.cuit, 
                                                        responsable: emp.responsable, 
                                                        tankCapacity: emp.tankCapacity, 
                                                        criticalFuelPerc: emp.criticalFuelPerc || 25
                                                    }); 
                                                    setModalType('edit_company'); 
                                                }} 
                                                className="px-4 py-3 bg-slate-100 hover:bg-yellow-400 rounded-xl transition-colors flex items-center justify-center shadow-sm"
                                            >
                                                <Icon name="settings" size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCompany(emp.id)} 
                                                className="px-4 py-3 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-colors flex items-center justify-center shadow-sm"
                                            >
                                                <Icon name="x" size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VISTA 1: LISTADO DE FLOTA DE LA EMPRESA */}
                    {activeTab === 'companies' && activeCompany && !activeVehicleId && (
                        <div className="max-w-5xl mx-auto animate-fade-in">
                            {role === 'admin' && (
                                <button 
                                    onClick={() => { setSelectedCompanyId(null); }} 
                                    className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-black uppercase mb-6 md:mb-8 text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    <Icon name="chevronLeft" size={16}/> VOLVER AL DIRECTORIO
                                </button>
                            )}
                            
                            <div className="glass-card p-6 md:p-8 bg-slate-900 text-white mb-6 md:mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-[12px] border-l-yellow-400">
                                <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-yellow-400/10 blur-[80px] md:blur-[100px] pointer-events-none" />
                                <div className="z-10">
                                    <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-2 leading-none">
                                        {activeCompany.nombre}
                                    </h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Flota de Maquinaria
                                    </p>
                                </div>
                                {role === 'admin' && (
                                    <button 
                                        onClick={() => { 
                                            setForm({
                                                nombre:'', marca:'', modelo:'', serie:'', patente:'', serviceInterval: 250, horometro: ''
                                            }); 
                                            setModalType('vehicle'); 
                                        }} 
                                        className="btn-accent px-5 py-3 rounded-xl text-xs font-black shadow-lg z-10 w-full md:w-auto"
                                    >
                                        + VINCULAR EQUIPO
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                                {(activeCompany.vehiculos || []).map(v => {
                                    const ciclo = (v.horometroTotal || 0) - (v.ultimoServiceHoras || 0);
                                    const perc = Math.max(0, 100 - (ciclo / (v.serviceInterval || 250) * 100));
                                    
                                    return (
                                        <div 
                                            key={v.id} 
                                            onClick={() => setActiveVehicleId(v.id)} 
                                            className="glass-card p-5 border-l-[6px] border-l-slate-300 cursor-pointer hover:border-l-yellow-400 transition-all hover:-translate-y-1 shadow-sm hover:shadow-xl group"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-yellow-50 transition-colors">
                                                    <Icon name="truck" size={18} className="text-slate-800"/>
                                                </div>
                                                <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${v.operativo ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600 animate-pulse'}`}>
                                                    {v.operativo ? 'ACTIVO' : 'ROTO'}
                                                </div>
                                            </div>
                                            <h4 className="font-black uppercase text-lg italic tracking-tight truncate">
                                                {v.nombre}
                                            </h4>
                                            <p className="font-black text-slate-900 text-sm mono mb-4">
                                                {(v.horometroTotal || 0).toLocaleString()} <span className="text-[9px] text-slate-400 uppercase">HS</span>
                                            </p>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-end px-1">
                                                    <span className="text-[8px] font-black uppercase text-slate-400">Ciclo ({v.serviceInterval}h)</span>
                                                    <span className={`text-[10px] font-black mono ${perc < 20 ? 'text-red-500' : 'text-slate-900'}`}>{perc.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-1000 ${perc < 20 ? 'bg-red-500' : 'bg-slate-900'}`} style={{width: `${perc}%`}} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* VISTA 2: PANEL AISLADO DE UN SOLO VEHÍCULO */}
                    {activeTab === 'companies' && activeCompany && activeVehicle && (
                        <div className="max-w-4xl mx-auto animate-fade-in">
                            <button 
                                onClick={() => {
                                    if(isolatedVehicleId) {
                                        // Si vino por QR en vez del directorio
                                        setSelectedCompanyId(null);
                                        setIsolatedVehicleId(null);
                                    } else {
                                        setActiveVehicleId(null); 
                                    }
                                }} 
                                className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-black uppercase mb-6 md:mb-8 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <Icon name="chevronLeft" size={16}/> VOLVER A LA FLOTA
                            </button>
                            
                            <div className="glass-card p-6 md:p-10 border-t-[12px] border-t-yellow-400 relative overflow-hidden shadow-2xl">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-100 pb-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 rounded-2xl flex items-center justify-center shadow-inner text-white">
                                            <Icon name="truck" size={32}/>
                                        </div>
                                        <div>
                                            <h4 className="font-black uppercase text-3xl md:text-4xl italic tracking-tighter">
                                                {activeVehicle.nombre}
                                            </h4>
                                            <p className="font-black text-slate-500 text-sm md:text-base uppercase tracking-widest mt-1">
                                                {activeCompany.nombre}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl text-center w-full md:w-auto border border-slate-100">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                            Horómetro
                                        </p>
                                        <p className="font-black text-slate-900 text-3xl md:text-4xl mono">
                                            {(activeVehicle.horometroTotal || 0).toLocaleString()} <span className="text-xs text-slate-400 uppercase">HS</span>
                                        </p>
                                    </div>
                                </div>

                                {/* BOTONERA DE ACCIONES PRINCIPAL */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                                    <button 
                                        onClick={() => setModalType('log')} 
                                        className="btn-premium px-4 py-4 rounded-2xl text-xs font-black w-full shadow-lg"
                                    >
                                        CARGAR DATOS
                                    </button>
                                    <button 
                                        onClick={() => setModalType('service')} 
                                        className="btn-accent px-4 py-4 rounded-2xl text-xs font-black w-full shadow-lg"
                                    >
                                        SERVICE
                                    </button>
                                    <button 
                                        onClick={() => handleToggleStatus(activeVehicle.id, activeVehicle.operativo)} 
                                        className={`px-4 py-4 rounded-2xl font-black text-xs uppercase shadow-lg transition-all w-full ${activeVehicle.operativo ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white' : 'bg-emerald-500 text-white'}`}
                                    >
                                        {activeVehicle.operativo ? 'REPORTAR ROTURA' : 'REVIVIR EQUIPO'}
                                    </button>
                                    <button 
                                        onClick={() => { 
                                            setForm({...form, horas: activeVehicle.horometroTotal, fecha: new Date().toISOString().split('T')[0]}); 
                                            setModalType('historical'); 
                                        }} 
                                        className="btn-premium bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-4 rounded-2xl text-xs font-black w-full shadow-sm"
                                    >
                                        HISTORIAL
                                    </button>
                                </div>

                                {/* BOTONERA SECUNDARIA Y ADMIN */}
                                <div className="flex flex-wrap gap-3 mb-8 bg-slate-50 p-4 rounded-2xl">
                                    <button 
                                        onClick={() => downloadPDF(activeCompany, activeVehicle)} 
                                        className="flex-1 px-4 py-3 bg-white hover:bg-slate-900 hover:text-white rounded-xl transition-all flex items-center justify-center border shadow-sm text-[10px] font-black uppercase gap-2"
                                    >
                                        <Icon name="download" size={14}/> EXPEDIENTE PDF
                                    </button>
                                    <button 
                                        onClick={() => { 
                                            setModalType('qr'); 
                                            setTimeout(() => generateQR(activeVehicle.id), 100); 
                                        }} 
                                        className="flex-1 px-4 py-3 bg-white hover:bg-yellow-400 rounded-xl transition-all flex items-center justify-center border shadow-sm text-[10px] font-black uppercase gap-2"
                                    >
                                        <Icon name="qr" size={14}/> ETIQUETA QR
                                    </button>
                                    
                                    {role === 'admin' && (
                                        <div className="flex flex-1 gap-2">
                                            <button 
                                                onClick={() => { 
                                                    setForm({
                                                        nombre: activeVehicle.nombre, 
                                                        marca: activeVehicle.marca, 
                                                        modelo: activeVehicle.modelo, 
                                                        serie: activeVehicle.serie, 
                                                        patente: activeVehicle.patente, 
                                                        serviceInterval: activeVehicle.serviceInterval
                                                    }); 
                                                    setModalType('edit_vehicle'); 
                                                }} 
                                                className="flex-1 px-4 py-3 bg-white hover:bg-yellow-400 rounded-xl transition-colors flex items-center justify-center shadow-sm border text-slate-400 hover:text-black gap-2 text-[10px] font-black uppercase"
                                            >
                                                <Icon name="settings" size={14}/> EDITAR
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteVehicle(activeVehicle.id)} 
                                                className="flex-1 px-4 py-3 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-colors flex items-center justify-center shadow-sm border border-red-100 gap-2 text-[10px] font-black uppercase"
                                            >
                                                <Icon name="x" size={14}/> ELIMINAR
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* AUDITORÍA (SIEMPRE VISIBLE EN EL PANEL AISLADO) */}
                                <div className="space-y-4">
                                    <h3 className="font-black uppercase text-xl italic tracking-tighter border-b pb-2">
                                        Auditoría Interna
                                    </h3>
                                    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                        <table className="w-full history-table min-w-[400px]">
                                            <thead>
                                                <tr>
                                                    <th>Fecha</th>
                                                    <th>Tipo</th>
                                                    <th>Lec.</th>
                                                    <th>Nota</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {([...(activeVehicle.eventos || [])].reverse().map((ev, idx) => ( 
                                                    <tr key={idx} className="hover:bg-white transition-colors">
                                                        <td className="font-bold opacity-50 italic text-xs">{ev.fecha.slice(0,5)}</td>
                                                        <td><span className="font-black text-[9px] uppercase border px-2 py-1 rounded bg-white">{ev.tipo.slice(0,4)}</span></td>
                                                        <td className="mono font-black text-sm">{ev.horas}</td>
                                                        <td className="text-slate-500 italic text-xs leading-tight max-w-[200px] truncate">
                                                            {ev.litros ? `-${ev.litros}L ` : ''}{ev.nota || ev.motivo || '-'}
                                                        </td>
                                                    </tr> 
                                                )))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VISTA: CONFIGURACIÓN Y ROLES (SOLO ADMIN) */}
                    {activeTab === 'config' && role === 'admin' && (
                        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
                            <div className="space-y-6">
                                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Configuración</h2>
                                <div className="glass-card p-6 md:p-8 space-y-6 bg-white shadow-xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Razón Social</label>
                                            <input 
                                                className="input-premium px-4 py-3 rounded-xl w-full font-black text-lg" 
                                                value={bndSettings.name} 
                                                onChange={e => setBndSettings({...bndSettings, name: e.target.value})} 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descripción</label>
                                            <input 
                                                className="input-premium px-4 py-3 rounded-xl w-full text-sm" 
                                                value={bndSettings.description} 
                                                onChange={e => setBndSettings({...bndSettings, description: e.target.value})} 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Dirección Física</label>
                                            <input 
                                                className="input-premium px-4 py-3 rounded-xl w-full text-sm" 
                                                value={bndSettings.address} 
                                                onChange={e => setBndSettings({...bndSettings, address: e.target.value})} 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Teléfono</label>
                                            <input 
                                                className="input-premium px-4 py-3 rounded-xl w-full text-sm" 
                                                value={bndSettings.phone} 
                                                onChange={e => setBndSettings({...bndSettings, phone: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={saveBndSettings} 
                                        className="btn-premium px-6 py-3 rounded-xl w-full text-sm font-black uppercase shadow-lg"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Usuarios</h2>
                                    <button 
                                        onClick={() => { 
                                            setNewUser({ email: '', password: '', nombre: '', role: 'operario', companyId: '' }); 
                                            setModalType('register_user'); 
                                        }} 
                                        className="btn-accent px-5 py-2.5 rounded-xl text-[10px] font-black shadow-md"
                                    >
                                        + NUEVO ACCESO
                                    </button>
                                </div>
                                <div className="glass-card overflow-x-auto shadow-xl">
                                    <table className="w-full history-table min-w-[500px]">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Email</th>
                                                <th>Rol / Empresa Asignada</th>
                                                <th>Gestión</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersList.map(u => (
                                                <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                                                    <td className="font-bold text-slate-900 text-xs truncate max-w-[150px]">
                                                        {u.nombre || '-'}
                                                    </td>
                                                    <td className="font-black text-slate-500 italic text-xs truncate max-w-[150px]">
                                                        {u.email}
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${u.role === 'admin' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : u.role === 'suspendido' ? 'border-red-500 bg-red-50 text-red-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                                {u.role}
                                                            </span>
                                                            {u.role === 'operario' && (
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase">
                                                                    {companies.find(c => c.id === u.companyId)?.nombre || 'Sin Empresa'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <button 
                                                            onClick={() => {
                                                                setEditingUserId(u.uid);
                                                                setNewUser({ 
                                                                    email: u.email, 
                                                                    nombre: u.nombre || '', 
                                                                    role: u.role, 
                                                                    companyId: u.companyId || '',
                                                                    password: '' 
                                                                });
                                                                setModalType('edit_user');
                                                            }}
                                                            className="text-[9px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            EDITAR
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VISTA 1: LISTADO DE PROYECCIONES */}
                    {activeTab === 'calendar' && !selectedCompanyId && (
                        <div className="max-w-6xl mx-auto animate-fade-in">
                            <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-8">
                                Proyecciones Globales
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                                {role === 'admin' ? (
                                    companies.map(emp => (
                                        <div 
                                            key={emp.id} 
                                            className="glass-card p-5 md:p-6 relative group cursor-pointer hover:border-l-[6px] hover:border-l-blue-500 transition-all hover:shadow-xl" 
                                            onClick={() => setSelectedCompanyId(emp.id)}
                                        >
                                            <div className="flex justify-between items-start mb-6 md:mb-8">
                                                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-blue-400 shadow-xl">
                                                    <Icon name="calendar" size={20}/>
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-black uppercase italic truncate mb-1 pr-12">{emp.nombre}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Ver Proyección</p>
                                        </div>
                                    ))
                                ) : (
                                    companies.filter(c => c.id === userCompanyId).map(emp => (
                                        <div 
                                            key={emp.id} 
                                            className="glass-card p-5 md:p-6 relative group cursor-pointer border-l-[6px] border-l-blue-500 transition-all shadow-xl" 
                                            onClick={() => setSelectedCompanyId(emp.id)}
                                        >
                                            <div className="flex justify-between items-start mb-6 md:mb-8">
                                                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-blue-400 shadow-xl">
                                                    <Icon name="calendar" size={20}/>
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-black uppercase italic truncate mb-1 pr-12">{emp.nombre}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Ver Mi Proyección</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* VISTA 2: RESUMEN DE PROYECCIONES POR EMPRESA */}
                    {activeTab === 'calendar' && selectedCompanyId && companyProjections && (
                        <div className="max-w-5xl mx-auto animate-fade-in">
                            {role === 'admin' && (
                                <button 
                                    onClick={() => setSelectedCompanyId(null)} 
                                    className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-black uppercase mb-6 md:mb-8 text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    <Icon name="chevronLeft" size={16}/> VOLVER
                                </button>
                            )}
                            
                            <div className="glass-card p-6 md:p-8 bg-slate-900 text-white mb-6 md:mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-[12px] border-l-blue-500">
                                <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-blue-400/10 blur-[80px] md:blur-[100px] pointer-events-none" />
                                <div className="z-10">
                                    <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-2 leading-none">
                                        {activeCompany.nombre}
                                    </h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Resumen de Proyecciones
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                {/* WIDGET COMBUSTIBLE */}
                                <div className={`glass-card p-8 lg:col-span-1 border-t-[8px] ${companyProjections.currentFuel <= companyProjections.criticalLiters ? 'border-t-red-500 animate-pulse bg-red-50' : 'border-t-yellow-400'}`}>
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-yellow-500 mb-6 border border-slate-100">
                                        <Icon name="fuel" size={32}/>
                                    </div>
                                    <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">
                                        Reserva Diésel
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                                        Nivel Crítico: {companyProjections.criticalLiters.toFixed(0)} L
                                    </p>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end border-b pb-2">
                                            <span className="text-xs font-black uppercase text-slate-500">Fecha Límite</span>
                                            <span className={`text-lg font-black italic ${companyProjections.currentFuel <= companyProjections.criticalLiters ? 'text-red-600' : 'text-slate-900'}`}>
                                                {companyProjections.fuelEstDate ? companyProjections.fuelEstDate.toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end border-b pb-2">
                                            <span className="text-xs font-black uppercase text-slate-500">Consumo Diario</span>
                                            <span className="text-lg font-black mono text-slate-900">
                                                {companyProjections.fuelAvg > 0 ? companyProjections.fuelAvg.toFixed(1) : 0} L
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black uppercase text-slate-500">Stock Actual</span>
                                            <span className="text-xl font-black mono text-slate-900">
                                                {companyProjections.currentFuel.toFixed(0)} L
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* LISTA DE SERVICES */}
                                <div className="glass-card p-8 lg:col-span-2">
                                    <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">Próximos Services</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Orden de Criticidad</p>
                                    
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                        {companyProjections.vProjs.map((p, i) => (
                                            <div 
                                                key={i} 
                                                className={`p-5 rounded-2xl border-l-[6px] shadow-sm flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center ${p.restHs <= 50 ? 'border-l-red-500 bg-red-50' : 'border-l-blue-500 bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.restHs <= 50 ? 'bg-white text-red-500' : 'bg-white text-blue-500'}`}>
                                                        <Icon name="truck" size={20}/>
                                                    </div>
                                                    <div>
                                                        <p className="font-black uppercase italic text-lg truncate">{p.nombre}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Promedio: {p.avgUsage.toFixed(1)} HS/DÍA</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white px-4 py-3 rounded-xl border border-slate-100 text-center w-full sm:w-auto">
                                                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Resta Ciclo</p>
                                                    <p className={`font-black mono text-lg leading-none ${p.restHs <= 50 ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {Math.max(0, p.restHs).toFixed(1)} H
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* --- MODALES DINÁMICOS FORMULARIOS --- */}
            {modalType && (
                <ModalComp 
                    title={modalType.replace(/_/g,' ')} 
                    onClose={() => { 
                        if(modalType !== 'force_password_change') setModalType(null); 
                    }} 
                    hideClose={modalType === 'force_password_change'}
                >
                    <div className="max-w-md mx-auto w-full">
                        
                        {modalType === 'register_user' && (
                            <form onSubmit={handleRegisterUser} className="space-y-4">
                                <input 
                                    type="text" 
                                    required 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    placeholder="NOMBRE Y APELLIDO" 
                                    onChange={e => setNewUser({...newUser, nombre: e.target.value})} 
                                />
                                <input 
                                    type="email" 
                                    required 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    placeholder="EMAIL DE ACCESO" 
                                    onChange={e => setNewUser({...newUser, email: e.target.value})} 
                                />
                                <input 
                                    type="text" 
                                    required 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    placeholder="PASSWORD TEMPORAL" 
                                    onChange={e => setNewUser({...newUser, password: e.target.value})} 
                                />
                                <select 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold bg-white appearance-none" 
                                    value={newUser.role} 
                                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                                >
                                    <option value="operario">Operario (Solo Carga)</option>
                                    <option value="admin">Administrador (Total)</option>
                                </select>
                                {newUser.role === 'operario' && (
                                    <select 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold bg-white appearance-none border-yellow-400" 
                                        value={newUser.companyId || ''} 
                                        onChange={e => setNewUser({...newUser, companyId: e.target.value})}
                                    >
                                        <option value="">Seleccione Empresa Asignada...</option>
                                        {companies.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                )}
                                <button type="submit" className="btn-accent w-full px-5 py-3 rounded-xl text-sm font-black uppercase mt-2 shadow-md">
                                    CREAR ACCESO
                                </button>
                            </form>
                        )}

                        {modalType === 'edit_user' && (
                            <div className="space-y-4">
                                <p className="text-xs font-black uppercase text-slate-400">Editando a: {newUser.email}</p>
                                <input 
                                    type="text" 
                                    required 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    placeholder="NOMBRE Y APELLIDO" 
                                    value={newUser.nombre} 
                                    onChange={e => setNewUser({...newUser, nombre: e.target.value})} 
                                />
                                <select 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold bg-white appearance-none" 
                                    value={newUser.role} 
                                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                                >
                                    <option value="operario">Operario (Solo Carga)</option>
                                    <option value="admin">Administrador (Total)</option>
                                    <option value="suspendido">Suspender Acceso</option>
                                </select>
                                {newUser.role === 'operario' && (
                                    <select 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold bg-white appearance-none border-yellow-400" 
                                        value={newUser.companyId || ''} 
                                        onChange={e => setNewUser({...newUser, companyId: e.target.value})}
                                    >
                                        <option value="">Seleccione Empresa Asignada...</option>
                                        {companies.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                )}
                                <button 
                                    onClick={handleUpdateUserSubmit} 
                                    className="btn-accent w-full px-5 py-3 rounded-xl text-sm font-black uppercase mt-2 shadow-md"
                                >
                                    GUARDAR CAMBIOS
                                </button>
                            </div>
                        )}

                        {modalType === 'force_password_change' && (
                            <div className="space-y-6 text-center">
                                <img src="./icon.png" alt="BND" className="w-20 h-20 mx-auto rounded-[1.5rem] shadow-xl object-cover" />
                                <h2 className="text-2xl font-black uppercase italic">Nueva Seguridad</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Actualiza tu contraseña temporal para activar la cuenta.</p>
                                {pwdError && <p className="text-red-500 font-bold text-xs">{pwdError}</p>}
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <input 
                                        type="password" 
                                        required 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-center text-lg tracking-widest font-black" 
                                        placeholder="NUEVA CLAVE" 
                                        value={newPassword} 
                                        onChange={e => setNewPassword(e.target.value)} 
                                    />
                                    <input 
                                        type="password" 
                                        required 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-center text-lg tracking-widest font-black" 
                                        placeholder="CONFIRMAR CLAVE" 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)} 
                                    />
                                    <button type="submit" className="btn-accent w-full px-5 py-4 rounded-xl text-sm font-black shadow-lg uppercase">
                                        ACTIVAR
                                    </button>
                                </form>
                            </div>
                        )}

                        {modalType === 'company' && (
                            <div className="space-y-4">
                                <input 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    placeholder="RAZÓN SOCIAL" 
                                    onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} 
                                />
                                <input 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    placeholder="CUIT" 
                                    onChange={e => setForm({...form, cuit: e.target.value})} 
                                />
                                <input 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    placeholder="RESPONSABLE" 
                                    onChange={e => setForm({...form, responsable: e.target.value})} 
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        type="number" 
                                        placeholder="CAPACIDAD TOTAL (L)" 
                                        onChange={e => setForm({...form, tankCapacity: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        type="number" 
                                        placeholder="% CRÍTICO ALERTA" 
                                        defaultValue="25" 
                                        onChange={e => setForm({...form, criticalFuelPerc: e.target.value})} 
                                    />
                                </div>
                                <button onClick={handleAddCompany} className="btn-accent w-full px-5 py-3 rounded-xl text-sm font-black mt-2 uppercase shadow-md">
                                    REGISTRAR
                                </button>
                            </div>
                        )}

                        {modalType === 'edit_company' && (
                            <div className="space-y-4">
                                <input 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    value={form.nombre} 
                                    onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} 
                                />
                                <input 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    value={form.cuit} 
                                    onChange={e => setForm({...form, cuit: e.target.value})} 
                                />
                                <input 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                    value={form.responsable} 
                                    onChange={e => setForm({...form, responsable: e.target.value})} 
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400">Capacidad Total</label>
                                        <input 
                                            className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                            type="number" 
                                            value={form.tankCapacity} 
                                            onChange={e => setForm({...form, tankCapacity: e.target.value})} 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400">% Crítico Alerta</label>
                                        <input 
                                            className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                            type="number" 
                                            value={form.criticalFuelPerc} 
                                            onChange={e => setForm({...form, criticalFuelPerc: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <button onClick={handleEditCompanySubmit} className="btn-premium w-full px-5 py-3 rounded-xl text-sm font-black mt-2 uppercase">
                                    Guardar Cambios
                                </button>
                            </div>
                        )}

                        {modalType === 'vehicle' && (
                            <div className="space-y-4">
                                <input 
                                    className="input-premium px-4 py-4 rounded-xl w-full text-lg font-black italic" 
                                    placeholder="BND-XX (INTERNO)" 
                                    onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} 
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        placeholder="MARCA" 
                                        onChange={e => setForm({...form, marca: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        placeholder="MODELO" 
                                        onChange={e => setForm({...form, modelo: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        placeholder="SERIE" 
                                        onChange={e => setForm({...form, serie: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        placeholder="PATENTE" 
                                        onChange={e => setForm({...form, patente: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        type="number" 
                                        placeholder="HS INICIAL" 
                                        onChange={e => setForm({...form, horometro: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        type="number" 
                                        placeholder="CICLO SERVICE" 
                                        defaultValue="250" 
                                        onChange={e => setForm({...form, serviceInterval: e.target.value})} 
                                    />
                                </div>
                                <button onClick={handleAddVehicle} className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black mt-2 uppercase shadow-md">
                                    Vincular Equipo
                                </button>
                            </div>
                        )}

                        {modalType === 'edit_vehicle' && (
                            <div className="space-y-4">
                                <input 
                                    className="input-premium px-4 py-4 rounded-xl w-full text-lg font-black italic" 
                                    value={form.nombre} 
                                    onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} 
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        value={form.marca} 
                                        onChange={e => setForm({...form, marca: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        value={form.modelo} 
                                        onChange={e => setForm({...form, modelo: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        value={form.serie} 
                                        onChange={e => setForm({...form, serie: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        value={form.patente} 
                                        onChange={e => setForm({...form, patente: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        type="number" 
                                        value={form.serviceInterval} 
                                        onChange={e => setForm({...form, serviceInterval: e.target.value})} 
                                    />
                                </div>
                                <button onClick={handleEditVehicleSubmit} className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black mt-2 uppercase shadow-md">
                                    Actualizar Datos
                                </button>
                            </div>
                        )}

                        {modalType === 'log' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horómetro Final</label>
                                        <input 
                                            type="number" 
                                            className="input-premium px-4 py-4 rounded-xl w-full text-2xl md:text-3xl text-center font-black" 
                                            onChange={e => setForm({...form, horas: e.target.value})} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga Diesel (L)</label>
                                        <input 
                                            type="number" 
                                            className="input-premium px-4 py-4 rounded-xl w-full text-2xl md:text-3xl text-center font-black" 
                                            onChange={e => setForm({...form, litros: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <textarea 
                                    className="input-premium px-5 py-4 rounded-xl w-full h-32 md:h-40 text-sm font-bold resize-none" 
                                    placeholder="NOTAS DE LA JORNADA..." 
                                    onChange={e => setForm({...form, nota: e.target.value.toUpperCase()})} 
                                />
                                <button onClick={handleDailyLog} className="btn-accent w-full px-5 py-4 rounded-xl text-base md:text-lg font-black uppercase shadow-lg">
                                    IMPACTAR PLANILLA
                                </button>
                            </div>
                        )}

                        {modalType === 'service' && (
                            <div className="space-y-6">
                                <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-center text-white border-t-8 border-t-yellow-400 shadow-xl">
                                    <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest mb-2 md:mb-3 italic">Certificación Service</p>
                                    <p className="text-4xl md:text-5xl font-black italic tracking-tighter">HS {activeVehicle?.horometroTotal?.toLocaleString()}</p>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] md:text-xs font-black uppercase text-slate-800 ml-2">Checklist de Insumos</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Aceite 15W40', 'Filtro Aceite', 'Filtro Aire', 'Filtro Comb.', 'Hidráulico', 'Refrigerante'].map(item => (
                                            <button 
                                                key={item} 
                                                onClick={() => setForm(p => ({ ...p, insumos: p.insumos.includes(item) ? p.insumos.filter(i => i !== item) : [...p.insumos, item] }))} 
                                                className={`px-4 py-2 md:px-5 md:py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase border transition-colors ${form.insumos.includes(item) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                            placeholder="Otro repuesto..." 
                                            value={form.insumoManual} 
                                            onChange={e => setForm({...form, insumoManual: e.target.value})} 
                                        />
                                        <button 
                                            onClick={() => { 
                                                if(form.insumoManual) setForm(p => ({ ...p, insumos: [...p.insumos, form.insumoManual.toUpperCase()], insumoManual: '' })); 
                                            }} 
                                            className="px-6 bg-slate-900 text-white rounded-xl font-black text-lg transition-all active:scale-95"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <textarea 
                                    className="input-premium px-4 py-3 rounded-xl w-full h-24 md:h-32 text-xs md:text-sm font-bold resize-none" 
                                    placeholder="RECOMENDACIONES TÉCNICAS..." 
                                    onChange={e => setForm({...form, nota: e.target.value.toUpperCase()})} 
                                />
                                <button onClick={handleServiceReset} className="btn-accent w-full px-5 py-4 rounded-xl text-sm md:text-base font-black uppercase shadow-lg">
                                    Cerrar Ciclo
                                </button>
                            </div>
                        )}

                        {modalType === 'downtime' && (
                            <div className="space-y-6 text-center px-4">
                                <div className="w-20 h-20 bg-red-100 rounded-[2rem] flex items-center justify-center mx-auto border-4 border-red-500 animate-pulse shadow-xl">
                                    <Icon name="alert" size={40} className="text-red-600"/>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black uppercase italic text-red-600 tracking-tighter">Rotura</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Notificación inmediata al panel.</p>
                                </div>
                                <textarea 
                                    className="input-premium px-5 py-4 rounded-xl w-full h-32 md:h-40 text-sm text-red-600 border-red-200 bg-red-50/50 font-bold resize-none" 
                                    placeholder="MOTIVO DE LA PARADA..." 
                                    onChange={e => setForm({...form, motivo: e.target.value.toUpperCase()})} 
                                />
                                <button onClick={handleConfirmDowntime} className="btn-premium w-full px-5 py-4 rounded-2xl bg-red-600 text-base md:text-lg font-black uppercase shadow-xl border-b-4 border-b-red-800 active:translate-y-2 transition-all">
                                    EMITIR PARADA
                                </button>
                            </div>
                        )}

                        {modalType === 'repair_finish' && (
                            <div className="space-y-6 text-center px-4">
                                <div className="w-20 h-20 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-200">
                                    <Icon name="check" size={40}/>
                                </div>
                                <h3 className="text-3xl font-black uppercase italic text-emerald-600 tracking-tighter">Equipo Reparado</h3>
                                <textarea 
                                    className="input-premium px-5 py-4 rounded-xl w-full h-32 md:h-40 text-sm font-bold resize-none" 
                                    placeholder="DETALLE DE REPARACIÓN..." 
                                    onChange={e => setForm({...form, nota: e.target.value.toUpperCase()})} 
                                />
                                <button onClick={handleRepairSubmit} className="btn-premium w-full px-5 py-4 rounded-2xl bg-emerald-600 text-base md:text-lg font-black uppercase shadow-xl">
                                    DAR DE ALTA UNIDAD
                                </button>
                            </div>
                        )}

                        {modalType === 'historical' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 border rounded-xl text-[10px] md:text-xs font-bold text-slate-400 leading-relaxed">
                                    Carga de registros históricos. Sincroniza el horómetro total del equipo.
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        type="date" 
                                        value={form.fecha} 
                                        onChange={e => setForm({...form, fecha: e.target.value})} 
                                    />
                                    <input 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                        type="number" 
                                        placeholder="HS Totales" 
                                        value={form.horas} 
                                        onChange={e => setForm({...form, horas: e.target.value})} 
                                    />
                                </div>
                                <button onClick={handleHistoricalData} className="btn-premium w-full px-5 py-3 rounded-xl text-xs font-black uppercase mt-2 shadow-md">
                                    Sincronizar Historial
                                </button>
                            </div>
                        )}

                        {modalType === 'qr' && (
                            <div className="space-y-6 text-center flex flex-col items-center pt-4">
                                <p className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">BND</p>
                                <div className="p-6 bg-white rounded-3xl shadow-xl border-4 border-slate-900" id={`qr-container-${activeVehicleId}`}></div>
                                <p className="text-lg font-black text-slate-800 uppercase tracking-widest">{activeVehicle?.nombre}</p>
                                <button onClick={handlePrintQR} className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black uppercase shadow-xl mt-4">
                                    IMPRIMIR ETIQUETA
                                </button>
                            </div>
                        )}

                    </div>
                </ModalComp>
            )}

            {/* SCANNER MODAL OVERLAY */}
            {scannerActive && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/98 backdrop-blur-md flex flex-col items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-[320px] md:max-w-[400px] aspect-square relative mb-10">
                        <div id="reader" className="w-full h-full rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border-[8px] md:border-[12px] border-yellow-400 shadow-2xl"></div>
                        <div className="absolute inset-0 pointer-events-none border-[30px] md:border-[40px] border-transparent after:absolute after:inset-6 md:after:inset-8 after:border-2 after:border-yellow-400/50 after:animate-pulse"></div>
                    </div>
                    <button 
                        onClick={() => { 
                            setScannerActive(false); 
                            if(scannerRef.current) scannerRef.current.stop(); 
                        }} 
                        className="px-12 py-5 md:px-16 md:py-6 bg-white text-slate-900 rounded-2xl md:rounded-3xl font-black text-sm md:text-lg shadow-xl active:scale-95 transition-transform tracking-widest"
                    >
                        CANCELAR
                    </button>
                </div>
            )}
        </div>
    );
};

window.App = App;
