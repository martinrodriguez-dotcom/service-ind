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

    // --- ESTADOS PARA GESTIÓN DE CONTRASEÑAS Y NUEVOS USUARIOS ---
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
        address: "-", 
        phone: "-", 
        email: "-", 
        web: "-"
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
                            
                            if (userData.requiresPasswordChange) {
                                setModalType('force_password_change');
                            }
                        } else {
                            await fb.setDoc(userDocRef, { 
                                email: u.email, 
                                role: 'operario', 
                                requiresPasswordChange: false 
                            });
                            setRole('operario');
                        }
                    } catch (e) { 
                        setRole('operario'); 
                    }

                    const configRef = fb.doc(db, "artifacts", APP_ID, "public", "data", "config", "bnd_info");
                    fb.getDoc(configRef).then(snap => { 
                        if(snap.exists()) {
                            setBndSettings(snap.data()); 
                        }
                    });

                    const q = fb.collection(db, "artifacts", APP_ID, "public", "data", "companies");
                    const unsub = fb.onSnapshot(q, (snapshot) => {
                        setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                        setLoading(false);
                        setAuthLoading(false);
                    });
                    
                    return () => unsub();
                    
                } else { 
                    setUser(null); 
                    setRole(null); 
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
            const usersRef = fb.collection(db, "artifacts", APP_ID, "public", "data", "users");
            const unsub = fb.onSnapshot(usersRef, (snap) => {
                setUsersList(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
            });
            return () => unsub();
        }
    }, [role]);

    // --- MANEJADORES DE AUTENTICACIÓN ---
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
        setIsolatedVehicleId(null); 
    };

    const handleRegisterUser = async (e) => {
        e.preventDefault();
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
                role: newUser.role, 
                email: newUser.email, 
                requiresPasswordChange: true
            });
            
            setModalType(null); 
            setNewUser({ email: '', password: '', role: 'operario' });
            alert("Usuario creado. Se le pedirá cambiar la contraseña en su primer ingreso.");
            
        } catch (err) { 
            alert(err.message); 
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

    const handleUpdateUserRole = async (uid, newRole) => {
        if(window.confirm(`¿Estás seguro de cambiar los permisos a ${newRole.toUpperCase()}?`)) {
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "users", uid), { 
                role: newRole 
            });
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
        
        companies.forEach(emp => {
            const fuelPerc = ((emp.currentFuel || 0) / (emp.tankCapacity || 1000)) * 100;
            if (fuelPerc <= 25) {
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
                    dateEst = new Date(); 
                    dateEst.setDate(dateEst.getDate() + Math.ceil(restHs / avg)); 
                }
                
                list.push({ 
                    ...veh, 
                    empresaNombre: emp.nombre, 
                    companyId: emp.id, 
                    estDate: dateEst, 
                    avgUsage: avg, 
                    restHs: restHs 
                });
            });
        });
        
        return list.sort((a,b) => (a.estDate || Infinity) - (b.estDate || Infinity));
    }, [companies]);

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
        const docRef = fb.doc(db, "artifacts", APP_ID, "public", "data", "config", "bnd_info");
        await fb.setDoc(docRef, bndSettings);
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
            tankCapacity: parseFloat(form.tankCapacity)
        });
        setModalType(null);
    };

    const handleDeleteVehicle = async (vId) => {
        if(confirm("¿Eliminar este equipo permanentemente de la flota?")) {
            const updatedVehicles = activeCompany.vehiculos.filter(v => v.id !== vId);
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
                vehiculos: updatedVehicles 
            });
        }
    };

    const handleEditVehicleSubmit = async () => {
        const updatedVehicles = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? {
            ...v, 
            nombre: form.nombre, 
            marca: form.marca, 
            modelo: form.modelo, 
            serie: form.serie, 
            patente: form.patente, 
            serviceInterval: parseFloat(form.serviceInterval)
        } : v);
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: updatedVehicles 
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
            currentFuel: parseFloat(form.tankCapacity) || 1000, 
            vehiculos: [] 
        });
        
        setModalType(null); 
        setForm({...form, nombre: '', cuit: '', responsable: ''});
    };

    const handleAddVehicle = async () => {
        const h = parseFloat(form.horometro) || 0;
        const newVehicle = { 
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
        };
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: fb.arrayUnion(newVehicle) 
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
            const updatedVehicles = activeCompany.vehiculos.map(v => v.id === vId ? { 
                ...v, 
                operativo: true, 
                workflowStatus: 'PENDIENTE', 
                eventos: [...(v.eventos || []), { 
                    id: Date.now(), 
                    tipo: 'ALTA', 
                    fecha: new Date().toLocaleDateString(), 
                    nota: 'Puesta en marcha manual' 
                }] 
            } : v);
            
            await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
                vehiculos: updatedVehicles 
            }); 
        }
    };

    const handleConfirmDowntime = async () => {
        const updatedVehicles = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { 
            ...v, 
            operativo: false, 
            workflowStatus: 'PENDIENTE', 
            eventos: [...(v.eventos || []), { 
                id: Date.now(), 
                tipo: 'BAJA', 
                fecha: new Date().toLocaleDateString(), 
                motivo: form.motivo 
            }] 
        } : v);
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: updatedVehicles 
        });
        
        setModalType(null); 
        setForm({...form, motivo: ''});
    };

    const handleUpdateWorkflow = async (cId, vId, ns) => {
        if(ns === 'REPARADO') { 
            setActiveVehicleId(vId); 
            setSelectedCompanyId(cId); 
            setIsolatedVehicleId(null); 
            setModalType('repair_finish'); 
            return; 
        }
        
        const companyToUpdate = companies.find(x => x.id === cId);
        const updatedVehicles = companyToUpdate.vehiculos.map(v => v.id === vId ? {
            ...v, 
            workflowStatus: ns
        } : v);
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", cId), { 
            vehiculos: updatedVehicles 
        });
    };

    const handleRepairSubmit = async () => {
        const companyToUpdate = companies.find(c => c.id === selectedCompanyId);
        const updatedVehicles = companyToUpdate.vehiculos.map(v => v.id === activeVehicleId ? { 
            ...v, 
            operativo: true, 
            workflowStatus: 'PENDIENTE', 
            eventos: [...(v.eventos || []), { 
                id: Date.now(), 
                tipo: 'REPARACION', 
                fecha: new Date().toLocaleDateString(), 
                nota: form.nota 
            }] 
        } : v);
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", selectedCompanyId), { 
            vehiculos: updatedVehicles 
        });
        
        setModalType(null); 
        setActiveTab('companies');
    };

    const handleHistoricalData = async () => {
        const h = parseFloat(form.horas); 
        if(isNaN(h)) return;
        
        const updatedVehicles = activeCompany.vehiculos.map(v => v.id === activeVehicleId ? { 
            ...v, 
            horometroTotal: Math.max(v.horometroTotal, h), 
            eventos: [...(v.eventos || []), { 
                id: Date.now(), 
                tipo: 'REGISTRO', 
                fecha: form.fecha, 
                horas: h, 
                nota: "Sincronización Histórica" 
            }] 
        } : v);
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: updatedVehicles 
        });
        
        setModalType(null);
    };

    const handleServiceReset = async () => {
        const updatedVehicles = activeCompany.vehiculos.map(x => x.id === activeVehicleId ? { 
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
        } : x);
        
        await fb.updateDoc(fb.doc(db, "artifacts", APP_ID, "public", "data", "companies", activeCompany.id), { 
            vehiculos: updatedVehicles 
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
                        setSelectedCompanyId(cid); 
                        setIsolatedVehicleId(vid); 
                        setActiveTab('companies'); 
                        setScannerActive(false); 
                        scannerRef.current.stop(); 
                    }
                }, 
                (err) => {
                    // Errores de lectura ignorados en silencio
                }
            ).catch(e => console.error("Error al iniciar cámara:", e));
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
            <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-black uppercase tracking-[0.2em] animate-pulse">
                Cargando BND...
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 px-4 md:px-6 select-none">
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
        { id: 'dashboard', label: 'Alertas', icon: 'dashboard' }, 
        { id: 'companies', label: 'Directorio', icon: 'company' }, 
        { id: 'calendar', label: 'Proyecciones', icon: 'calendar' } 
    ];
    
    if (role === 'admin') {
        nav.push({ id: 'config', label: 'Admin', icon: 'settings' });
    }

    // --- INTERFAZ PRINCIPAL (RENDERIZADO HTML/JSX) ---
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden select-none">
            
            {/* OVERLAY MOBILE */}
            <div 
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} 
                onClick={() => setSidebarOpen(false)} 
            />
            
            {/* SIDEBAR ADAPTABLE (PC/Mobile) */}
            <aside className={`sidebar-mobile lg:w-64 flex flex-col p-6 md:p-8 border-r border-slate-100 ${sidebarOpen ? 'open' : ''}`}>
                <div className="flex items-center gap-4 mb-10">
                    <img 
                        src="./icon.png" 
                        alt="BND" 
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-md object-cover" 
                    />
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter">BND</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
                    </div>
                </div>
                
                <nav className="flex-1 space-y-2">
                    {nav.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => { 
                                setActiveTab(item.id); 
                                setSelectedCompanyId(null); 
                                setIsolatedVehicleId(null); 
                                setSidebarOpen(false); 
                            }} 
                            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs md:text-sm transition-all ${activeTab === item.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-300' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <Icon name={item.icon} size={18}/> {item.label}
                        </button>
                    ))}
                </nav>
                
                <div className="pt-6 border-t border-slate-100 space-y-3">
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
                                        className={`glass-card p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 border-l-[8px] md:border-l-[12px] ${a.type === 'BREAKDOWN' ? 'border-l-red-500' : 'border-l-yellow-400'}`}
                                    >
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'BREAKDOWN' ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-yellow-50 text-yellow-600'}`}>
                                            <Icon name={a.type === 'FUEL' ? 'fuel' : 'alert'} size={24}/>
                                        </div>
                                        <div className="flex-1 text-center md:text-left w-full">
                                            <h4 className="font-black uppercase text-base md:text-lg italic truncate">
                                                {a.nombre || 'COMBUSTIBLE'}
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
                                                        setIsolatedVehicleId(null); 
                                                        setActiveTab('companies'); 
                                                    }} 
                                                    className="btn-premium px-5 py-3 rounded-xl w-full md:w-auto text-[10px] md:text-xs font-black"
                                                >
                                                    GESTIONAR
                                                </button>
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
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Directorio</h2>
                                {role === 'admin' && (
                                    <button 
                                        onClick={() => { 
                                            setForm({nombre:'', cuit:'', responsable:'', tankCapacity:1000}); 
                                            setModalType('company'); 
                                        }} 
                                        className="btn-accent px-5 py-3 rounded-xl w-full sm:w-auto text-xs font-black shadow-md"
                                    >
                                        + NUEVO CLIENTE
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                                {companies.map(emp => (
                                    <div key={emp.id} className="glass-card p-5 relative group">
                                        {role === 'admin' && (
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <button 
                                                    onClick={() => { 
                                                        setSelectedCompanyId(emp.id); 
                                                        setForm({
                                                            nombre: emp.nombre, 
                                                            cuit: emp.cuit, 
                                                            responsable: emp.responsable, 
                                                            tankCapacity: emp.tankCapacity
                                                        }); 
                                                        setModalType('edit_company'); 
                                                    }} 
                                                    className="p-2 bg-slate-100 hover:bg-yellow-400 rounded-lg transition-colors"
                                                >
                                                    <Icon name="settings" size={14}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCompany(emp.id)} 
                                                    className="p-2 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors"
                                                >
                                                    <Icon name="x" size={14}/>
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-yellow-400">
                                                <Icon name="company" size={20}/>
                                            </div>
                                            <FuelTankCapsule capacity={emp.tankCapacity} current={emp.currentFuel} />
                                        </div>
                                        <h3 className="text-xl font-black uppercase italic truncate mb-1 pr-12">{emp.nombre}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">CUIT: {emp.cuit}</p>
                                        <button 
                                            onClick={() => { 
                                                setSelectedCompanyId(emp.id); 
                                                setIsolatedVehicleId(null); 
                                            }} 
                                            className="btn-premium px-4 py-3 w-full rounded-xl text-sm font-black uppercase shadow-md"
                                        >
                                            ABRIR FLOTA
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VISTA: FLOTA DE LA EMPRESA SELECCIONADA */}
                    {activeCompany && (
                        <div className="max-w-5xl mx-auto animate-fade-in">
                            <button 
                                onClick={() => { 
                                    setSelectedCompanyId(null); 
                                    setIsolatedVehicleId(null); 
                                }} 
                                className="flex items-center gap-2 text-xs font-black uppercase mb-6 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <Icon name="chevronLeft" size={16}/> VOLVER
                            </button>
                            
                            <div className="glass-card p-6 md:p-8 bg-slate-900 text-white mb-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/10 blur-[80px] pointer-events-none" />
                                <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-3 leading-none">
                                    {activeCompany.nombre}
                                </h2>
                                <div className="flex flex-wrap gap-3">
                                    <div className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                        {activeCompany.cuit}
                                    </div>
                                    {role === 'admin' && !isolatedVehicleId && (
                                        <button 
                                            onClick={() => { 
                                                setForm({
                                                    nombre:'', marca:'', modelo:'', serie:'', patente:'', serviceInterval: 250, horometro: ''
                                                }); 
                                                setModalType('vehicle'); 
                                            }} 
                                            className="btn-accent px-4 py-2 rounded-lg text-[10px] font-black shadow-lg"
                                        >
                                            + VINCULAR EQUIPO
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* BANNER MODO AISLAMIENTO (Entrada por QR) */}
                            {isolatedVehicleId && (
                                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-yellow-50 p-4 rounded-2xl border border-yellow-200 gap-4">
                                    <span className="text-yellow-800 font-black text-xs uppercase flex items-center gap-2">
                                        <Icon name="qr" size={16}/> Equipo Filtrado por QR
                                    </span>
                                    <button 
                                        onClick={() => setIsolatedVehicleId(null)} 
                                        className="text-[10px] font-black uppercase text-slate-600 bg-white px-4 py-2 rounded-lg border shadow-sm w-full sm:w-auto"
                                    >
                                        VER TODA LA FLOTA
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {displayedVehicles.map(v => {
                                    const ciclo = (v.horometroTotal || 0) - (v.ultimoServiceHoras || 0);
                                    const perc = Math.max(0, 100 - (ciclo / (v.serviceInterval || 250) * 100));
                                    
                                    return (
                                        <div key={v.id} className="glass-card p-5 md:p-6 border-l-[8px] md:border-l-[12px] border-l-yellow-400 relative group">
                                            {role === 'admin' && (
                                                <div className="absolute top-3 right-3 md:top-4 md:right-4 flex gap-2">
                                                    <button 
                                                        onClick={() => { 
                                                            setActiveVehicleId(v.id); 
                                                            setForm({
                                                                nombre: v.nombre, marca: v.marca, modelo: v.modelo, serie: v.serie, patente: v.patente, serviceInterval: v.serviceInterval
                                                            }); 
                                                            setModalType('edit_vehicle'); 
                                                        }} 
                                                        className="p-2 bg-slate-50 hover:bg-yellow-400 rounded-lg transition-colors"
                                                    >
                                                        <Icon name="settings" size={12}/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteVehicle(v.id)} 
                                                        className="p-2 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors"
                                                    >
                                                        <Icon name="x" size={12}/>
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col sm:flex-row justify-between gap-5">
                                                <div className="flex-1 space-y-4 md:space-y-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                                                            <Icon name="truck" size={24} className="text-slate-800"/>
                                                        </div>
                                                        <div className="overflow-hidden w-full">
                                                            <h4 className="font-black uppercase text-lg md:text-xl italic tracking-tight truncate pr-10">
                                                                {v.nombre}
                                                            </h4>
                                                            <p className="font-black text-slate-900 text-base md:text-lg mono">
                                                                {(v.horometroTotal || 0).toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">HS</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-end px-1">
                                                            <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Ciclo ({v.serviceInterval}h)</span>
                                                            <span className={`text-xs font-black mono ${perc < 20 ? 'text-red-500' : 'text-slate-900'}`}>{perc.toFixed(0)}%</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full transition-all duration-1000 ${perc < 20 ? 'bg-red-500' : 'bg-slate-900'}`} style={{width: `${perc}%`}} />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 shrink-0 sm:w-32">
                                                    <button 
                                                        onClick={() => { setActiveVehicleId(v.id); setModalType('log'); }} 
                                                        className="btn-premium px-3 py-2 rounded-xl text-[10px] font-black w-full shadow-sm"
                                                    >
                                                        CARGAR
                                                    </button>
                                                    <button 
                                                        onClick={() => { setActiveVehicleId(v.id); setModalType('service'); }} 
                                                        className="btn-accent px-3 py-2 rounded-xl text-[10px] font-black w-full shadow-sm"
                                                    >
                                                        SERVICE
                                                    </button>
                                                    <button 
                                                        onClick={() => handleToggleStatus(v.id, v.operativo)} 
                                                        className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-sm transition-all w-full ${v.operativo ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white' : 'bg-emerald-500 text-white'}`}
                                                    >
                                                        {v.operativo ? 'ROTO' : 'REVIVIR'}
                                                    </button>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => downloadPDF(activeCompany, v)} 
                                                            className="flex-1 p-2 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl transition-all flex items-center justify-center border"
                                                        >
                                                            <Icon name="download" size={14}/>
                                                        </button>
                                                        <button 
                                                            onClick={() => { setActiveVehicleId(v.id); setModalType('qr'); setTimeout(() => generateQR(v.id), 100); }} 
                                                            className="flex-1 p-2 bg-slate-50 hover:bg-yellow-400 rounded-xl transition-all flex items-center justify-center border"
                                                        >
                                                            <Icon name="qr" size={14}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => toggleHistory(v.id)} 
                                                className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors border-t border-slate-100 mt-5 pt-3 w-full"
                                            >
                                                <Icon name="history" size={12}/> AUDITORÍA 
                                                <Icon name="chevronDown" size={12} className={`ml-auto transition-transform ${expandedVehicles.has(v.id) ? 'rotate-180' : ''}`}/>
                                            </button>
                                            
                                            {expandedVehicles.has(v.id) && (
                                                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                                                    <table className="w-full history-table min-w-[300px]">
                                                        <thead>
                                                            <tr>
                                                                <th>Fecha</th>
                                                                <th>Tipo</th>
                                                                <th>Lec.</th>
                                                                <th>Nota</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {[...(v.eventos || [])].reverse().map((ev, idx) => ( 
                                                                <tr key={idx} className="hover:bg-white">
                                                                    <td className="font-bold opacity-50 italic text-[10px]">{ev.fecha.slice(0,5)}</td>
                                                                    <td><span className="font-black text-[8px] uppercase border px-2 py-1 rounded bg-white shadow-sm">{ev.tipo.slice(0,4)}</span></td>
                                                                    <td className="mono font-black text-xs">{ev.horas}</td>
                                                                    <td className="text-slate-500 italic text-[10px] md:text-xs leading-tight">
                                                                        {ev.litros ? `-${ev.litros}L ` : ''}{ev.nota || ev.motivo || '-'}
                                                                    </td>
                                                                </tr> 
                                                            ))}
                                                        </tbody>
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
                        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
                            <div className="space-y-6">
                                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Config</h2>
                                <div className="glass-card p-6 md:p-8 space-y-6 bg-white shadow-xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Razón Social</label>
                                            <input className="input-premium px-4 py-3 rounded-xl w-full font-black text-lg" value={bndSettings.name} onChange={e => setBndSettings({...bndSettings, name: e.target.value})} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descripción</label>
                                            <input className="input-premium px-4 py-3 rounded-xl w-full text-sm" value={bndSettings.description} onChange={e => setBndSettings({...bndSettings, description: e.target.value})} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Dirección Física</label>
                                            <input className="input-premium px-4 py-3 rounded-xl w-full text-sm" value={bndSettings.address} onChange={e => setBndSettings({...bndSettings, address: e.target.value})} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Teléfono</label>
                                            <input className="input-premium px-4 py-3 rounded-xl w-full text-sm" value={bndSettings.phone} onChange={e => setBndSettings({...bndSettings, phone: e.target.value})} />
                                        </div>
                                    </div>
                                    <button onClick={saveBndSettings} className="btn-premium px-6 py-3 rounded-xl w-full text-sm font-black uppercase shadow-lg">Guardar Cambios</button>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Usuarios</h2>
                                    <button onClick={() => setModalType('register_user')} className="btn-accent px-5 py-2.5 rounded-xl text-[10px] font-black shadow-md">+ NUEVO</button>
                                </div>
                                <div className="glass-card overflow-x-auto shadow-xl">
                                    <table className="w-full history-table min-w-[400px]">
                                        <thead>
                                            <tr>
                                                <th>Email</th>
                                                <th>Nivel de Acceso</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersList.map(u => (
                                                <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                                                    <td className="font-black text-slate-700 italic text-xs">{u.email}</td>
                                                    <td>
                                                        <select 
                                                            value={u.role} 
                                                            onChange={(e) => handleUpdateUserRole(u.uid, e.target.value)} 
                                                            className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg border outline-none ${u.role === 'admin' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : u.role === 'suspendido' ? 'border-red-500 bg-red-50 text-red-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                                        >
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
                        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                            <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Proyecciones</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {projectionsData.map((p, i) => (
                                    <div key={i} className="glass-card p-6 flex flex-col gap-5 shadow-lg border-t-[6px] border-t-blue-500">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="w-12 h-12 bg-blue-50 rounded-xl text-blue-600 flex items-center justify-center shrink-0">
                                                <Icon name="truck" size={20}/>
                                            </div>
                                            <div className="overflow-hidden w-full">
                                                <p className="font-black uppercase italic text-lg md:text-xl truncate">{p.nombre}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{p.empresaNombre}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase text-slate-400">Próximo Service</span>
                                                <span className="text-sm md:text-base font-black italic text-blue-600">{p.estDate ? p.estDate.toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase text-slate-400">Uso Diario</span>
                                                <span className="text-sm md:text-base font-black mono">{p.avgUsage.toFixed(1)} H</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase text-slate-400">Resta Ciclo</span>
                                                <span className="text-sm md:text-base font-black mono">{Math.max(0, p.restHs).toFixed(1)} H</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* --- MODALES DINÁMICOS --- */}
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
                                <input type="email" required className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" placeholder="EMAIL" onChange={e => setNewUser({...newUser, email: e.target.value})} />
                                <input type="text" required className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" placeholder="PASSWORD TEMPORAL" onChange={e => setNewUser({...newUser, password: e.target.value})} />
                                <select className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold appearance-none bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                    <option value="operario">Operario (Solo Carga)</option>
                                    <option value="admin">Administrador (Total)</option>
                                </select>
                                <button type="submit" className="btn-accent w-full px-5 py-3 rounded-xl text-sm font-black uppercase shadow-md mt-2">CREAR ACCESO</button>
                            </form>
                        )}

                        {modalType === 'force_password_change' && (
                            <div className="space-y-6 text-center">
                                <img src="./icon.png" alt="BND" className="w-20 h-20 mx-auto rounded-[1.5rem] shadow-xl object-cover" />
                                <h2 className="text-3xl font-black uppercase italic">Seguridad BND</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed px-4">Actualiza tu contraseña temporal para activar la cuenta.</p>
                                {pwdError && <p className="text-red-500 font-bold text-xs">{pwdError}</p>}
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <input type="password" required className="input-premium px-4 py-3 rounded-xl w-full text-center text-lg tracking-widest font-black" placeholder="NUEVA CLAVE" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                    <input type="password" required className="input-premium px-4 py-3 rounded-xl w-full text-center text-lg tracking-widest font-black" placeholder="CONFIRMAR CLAVE" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                    <button type="submit" className="btn-accent w-full px-5 py-4 rounded-xl text-sm font-black uppercase shadow-lg">ACTIVAR CUENTA</button>
                                </form>
                            </div>
                        )}

                        {modalType === 'company' && (
                            <div className="space-y-4">
                                <input className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" placeholder="RAZÓN SOCIAL" onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} />
                                <input className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" placeholder="CUIT" onChange={e => setForm({...form, cuit: e.target.value})} />
                                <input className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" placeholder="RESPONSABLE" onChange={e => setForm({...form, responsable: e.target.value})} />
                                <input className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" type="number" placeholder="LITROS DEPÓSITO" onChange={e => setForm({...form, tankCapacity: e.target.value})} />
                                <button onClick={handleAddCompany} className="btn-accent w-full px-5 py-3 rounded-xl text-sm font-black uppercase mt-2">REGISTRAR</button>
                            </div>
                        )}

                        {modalType === 'edit_company' && (
                            <div className="space-y-4">
                                <input className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} />
                                <input className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} />
                                <input className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" value={form.responsable} onChange={e => setForm({...form, responsable: e.target.value})} />
                                <input className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" type="number" value={form.tankCapacity} onChange={e => setForm({...form, tankCapacity: e.target.value})} />
                                <button onClick={handleEditCompanySubmit} className="btn-premium w-full px-5 py-3 rounded-xl text-sm font-black uppercase mt-2">Guardar Cambios</button>
                            </div>
                        )}

                        {modalType === 'vehicle' && (
                            <div className="space-y-4">
                                <input className="input-premium px-4 py-4 rounded-xl w-full text-lg font-black italic" placeholder="BND-XX (INTERNO)" onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" placeholder="MARCA" onChange={e => setForm({...form, marca: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" placeholder="MODELO" onChange={e => setForm({...form, modelo: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" placeholder="SERIE" onChange={e => setForm({...form, serie: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" placeholder="PATENTE" onChange={e => setForm({...form, patente: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" type="number" placeholder="HS INICIAL" onChange={e => setForm({...form, horometro: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" type="number" placeholder="CICLO SERVICE" defaultValue="250" onChange={e => setForm({...form, serviceInterval: e.target.value})} />
                                </div>
                                <button onClick={handleAddVehicle} className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black uppercase mt-2">Vincular Equipo</button>
                            </div>
                        )}

                        {modalType === 'edit_vehicle' && (
                            <div className="space-y-4">
                                <input className="input-premium px-4 py-4 rounded-xl w-full text-lg font-black italic" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" value={form.serie} onChange={e => setForm({...form, serie: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" value={form.patente} onChange={e => setForm({...form, patente: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" type="number" value={form.serviceInterval} onChange={e => setForm({...form, serviceInterval: e.target.value})} />
                                </div>
                                <button onClick={handleEditVehicleSubmit} className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black uppercase mt-2">Actualizar</button>
                            </div>
                        )}

                        {modalType === 'log' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horómetro Final</label>
                                        <input type="number" className="input-premium px-4 py-4 rounded-xl w-full text-2xl md:text-3xl text-center font-black" onChange={e => setForm({...form, horas: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga Diesel (L)</label>
                                        <input type="number" className="input-premium px-4 py-4 rounded-xl w-full text-2xl md:text-3xl text-center font-black" onChange={e => setForm({...form, litros: e.target.value})} />
                                    </div>
                                </div>
                                <textarea className="input-premium px-5 py-4 rounded-xl w-full h-32 md:h-40 text-sm font-bold resize-none" placeholder="NOTAS DE LA JORNADA..." onChange={e => setForm({...form, nota: e.target.value.toUpperCase()})} />
                                <button onClick={handleDailyLog} className="btn-accent w-full px-5 py-4 rounded-xl text-base md:text-lg font-black uppercase shadow-lg">IMPACTAR PLANILLA</button>
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
                                        <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" placeholder="Otro repuesto..." value={form.insumoManual} onChange={e => setForm({...form, insumoManual: e.target.value})} />
                                        <button onClick={() => { if(form.insumoManual) setForm(p => ({ ...p, insumos: [...p.insumos, form.insumoManual.toUpperCase()], insumoManual: '' })); }} className="px-6 bg-slate-900 text-white rounded-xl font-black text-lg transition-all active:scale-95">+</button>
                                    </div>
                                </div>
                                <textarea className="input-premium px-4 py-3 rounded-xl w-full h-24 md:h-32 text-xs md:text-sm font-bold resize-none" placeholder="RECOMENDACIONES TÉCNICAS..." onChange={e => setForm({...form, nota: e.target.value.toUpperCase()})} />
                                <button onClick={handleServiceReset} className="btn-accent w-full px-5 py-4 rounded-xl text-sm md:text-base font-black uppercase shadow-lg">Cerrar Ciclo</button>
                            </div>
                        )}

                        {modalType === 'downtime' && (
                            <div className="space-y-6 text-center px-4">
                                <div className="w-20 h-20 bg-red-100 rounded-[2rem] flex items-center justify-center mx-auto border-4 border-red-500 animate-pulse shadow-xl"><Icon name="alert" size={40} className="text-red-600"/></div>
                                <div>
                                    <h3 className="text-3xl font-black uppercase italic text-red-600 tracking-tighter">Rotura</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Notificación inmediata al panel.</p>
                                </div>
                                <textarea className="input-premium px-5 py-4 rounded-xl w-full h-32 md:h-40 text-sm text-red-600 border-red-200 bg-red-50/50 font-bold resize-none" placeholder="MOTIVO DE LA PARADA..." onChange={e => setForm({...form, motivo: e.target.value.toUpperCase()})} />
                                <button onClick={handleConfirmDowntime} className="btn-premium w-full px-5 py-4 rounded-2xl bg-red-600 text-base md:text-lg font-black uppercase shadow-xl border-b-4 border-b-red-800">EMITIR PARADA</button>
                            </div>
                        )}

                        {modalType === 'repair_finish' && (
                            <div className="space-y-6 text-center px-4">
                                <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-200"><Icon name="check" size={40}/></div>
                                <h3 className="text-3xl font-black uppercase italic text-emerald-600 tracking-tighter">Equipo Reparado</h3>
                                <textarea className="input-premium px-5 py-4 rounded-xl w-full h-32 md:h-40 text-sm font-bold resize-none" placeholder="DETALLE DE REPARACIÓN..." onChange={e => setForm({...form, nota: e.target.value.toUpperCase()})} />
                                <button onClick={handleRepairSubmit} className="btn-premium w-full px-5 py-4 rounded-2xl bg-emerald-600 text-base md:text-lg font-black uppercase shadow-xl">DAR DE ALTA</button>
                            </div>
                        )}

                        {modalType === 'historical' && (
                            <div className="space-y-5">
                                <div className="p-4 bg-slate-50 border rounded-xl text-[10px] md:text-xs font-bold text-slate-400 leading-relaxed">Sincroniza el horómetro histórico del equipo. Útil para primera carga.</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} />
                                    <input className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" type="number" placeholder="HS Totales" value={form.horas} onChange={e => setForm({...form, horas: e.target.value})} />
                                </div>
                                <button onClick={handleHistoricalData} className="btn-premium w-full px-5 py-3 rounded-xl text-xs font-black uppercase mt-2">Sincronizar</button>
                            </div>
                        )}

                        {modalType === 'qr' && (
                            <div className="space-y-6 text-center flex flex-col items-center pt-4">
                                <p className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">BND</p>
                                <div className="p-6 bg-white rounded-3xl shadow-xl border-4 border-slate-900" id={`qr-container-${activeVehicleId}`}></div>
                                <p className="text-lg font-black text-slate-800 uppercase tracking-widest">{activeVehicle?.nombre}</p>
                                <button onClick={handlePrintQR} className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black uppercase shadow-xl mt-4">IMPRIMIR ETIQUETA</button>
                            </div>
                        )}

                        {modalType === 'details' && (
                            <div className="space-y-8 w-full max-w-2xl mx-auto">
                                <div className="bg-slate-900 p-8 md:p-10 rounded-[2rem] flex flex-col sm:flex-row justify-between items-center gap-6 border-l-[12px] border-l-yellow-400 shadow-2xl">
                                    <div className="text-center sm:text-left w-full">
                                        <p className="text-[10px] font-black text-yellow-400 uppercase mb-2 tracking-widest italic">Stock Depósito Central</p>
                                        <p className="text-4xl md:text-5xl font-black text-white mono">{(activeCompany.currentFuel || 0).toLocaleString()} <span className="text-base opacity-30">L</span></p>
                                    </div>
                                    {role === 'admin' && <button onClick={() => { if(confirm("¿Cargar depósito al 100%?")) refillTank(); }} className="btn-accent px-8 py-4 rounded-xl text-xs font-black w-full sm:w-auto shadow-lg shadow-yellow-400/20">CARGAR</button>}
                                </div>
                                <div className="space-y-3">
                                    <p className="text-[10px] md:text-xs font-black uppercase italic text-slate-400 ml-2 tracking-widest">Consumo Proyectado (Mensual)</p>
                                    <div className="glass-card p-4 md:p-6 bg-white w-full"><canvas ref={chartRef}></canvas></div>
                                </div>
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
