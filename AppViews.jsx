const { useState, useEffect, useRef } = React;
const { Icon, FuelTankCapsule } = window;

// --- WIDGET PARA GRÁFICOS DE INTELIGENCIA ---
const ChartWidget = ({ type, data, options }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) chartInstance.current.destroy();
            chartInstance.current = new window.Chart(chartRef.current, { type, data, options });
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [type, data, options]);

    return <canvas ref={chartRef}></canvas>;
};

// --- 1. VISTA: PANEL DE ALERTAS ---
const DashboardView = ({ alerts, role, handleUpdateWorkflow, setSelectedCompanyId, setIsolatedVehicleId, setActiveVehicleId, setActiveTab }) => (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800">Alertas Activas</h2>
        <div className="grid grid-cols-1 gap-5">
            {alerts.map((a, i) => (
                <div key={i} className={`glass-card p-5 md:p-6 flex flex-col md:flex-row items-center gap-5 border-l-[8px] md:border-l-[12px] ${a.type === 'BREAKDOWN' ? 'border-l-red-500' : 'border-l-yellow-400'}`}>
                    <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center shrink-0 shadow-inner ${a.type === 'BREAKDOWN' ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-yellow-50 text-yellow-600'}`}>
                        <Icon name={a.type === 'FUEL' ? 'fuel' : 'alert'} size={26}/>
                    </div>
                    <div className="flex-1 text-center md:text-left w-full">
                        <h4 className="font-black text-lg text-slate-800 truncate">{a.nombre || 'COMBUSTIBLE CRÍTICO'}</h4>
                        <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest truncate mt-1">{a.companyName}</p>
                    </div>
                    <div className="flex items-center w-full md:w-auto gap-3">
                        {a.type === 'BREAKDOWN' ? (
                            role !== 'gerente' ? (
                                <div className="flex flex-col sm:flex-row bg-slate-100/50 p-1.5 rounded-xl w-full gap-2 border border-slate-200/50">
                                    {['PENDIENTE', 'REVISION', 'REPARADO'].map(s => (
                                        <button 
                                            key={s} 
                                            onClick={() => handleUpdateWorkflow(a.companyId, a.id, s)} 
                                            className={`px-4 py-2.5 rounded-[0.85rem] text-[10px] font-black uppercase w-full transition-all ${a.workflowStatus === s ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-[1.02]' : 'bg-transparent text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl text-center w-full">
                                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Estado: {a.workflowStatus}</span>
                                </div>
                            )
                        ) : (
                            <button 
                                onClick={() => { setSelectedCompanyId(a.companyId); setActiveVehicleId(null); setActiveTab('companies'); }} 
                                className="btn-premium px-6 py-3.5 rounded-xl w-full md:w-auto text-xs font-black tracking-widest"
                            >
                                VER FLOTA
                            </button>
                        )}
                    </div>
                </div>
            ))}
            {alerts.length === 0 && (
                <div className="text-center p-12 bg-white/40 backdrop-blur-md rounded-[2rem] border border-emerald-100 shadow-xl shadow-emerald-900/5">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                        <Icon name="check" size={32}/>
                    </div>
                    <p className="font-black text-xl text-emerald-700 tracking-tight">Todo el sistema en orden</p>
                    <p className="text-sm text-slate-500 font-medium mt-2">No hay alertas críticas en la flota en este momento.</p>
                </div>
            )}
        </div>
    </div>
);

// --- 2. VISTA: DIRECTORIO DE EMPRESAS ---
const CompaniesView = ({ companies, role, setForm, setModalType, setSelectedCompanyId, setActiveVehicleId, handleDeleteCompany }) => (
    <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">Directorio de Clientes</h2>
            {role === 'admin' && (
                <button 
                    onClick={() => { setForm(prev => ({...prev, nombre:'', cuit:'', responsable:'', tankCapacity:1000, criticalFuelPerc: 25})); setModalType('company'); }} 
                    className="btn-accent px-6 py-3.5 rounded-xl w-full sm:w-auto text-xs font-black tracking-widest"
                >
                    + NUEVO CLIENTE
                </button>
            )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map(emp => (
                <div key={emp.id} className="glass-card p-6 md:p-8 relative group flex flex-col h-full">
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-yellow-400 shadow-xl shadow-slate-900/20">
                            <Icon name="company" size={26}/>
                        </div>
                        {/* EL TANQUE ES UN BOTÓN DIRECTO DESDE EL DIRECTORIO */}
                        <div 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedCompanyId(emp.id); 
                                setActiveVehicleId('TANK'); 
                            }} 
                            className="cursor-pointer hover:scale-110 transition-transform origin-right drop-shadow-md"
                            title="Gestionar Tanque Central"
                        >
                            <FuelTankCapsule capacity={emp.tankCapacity} current={emp.currentFuel} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-800 truncate pr-16 mb-2">{emp.nombre}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">CUIT: {emp.cuit}</p>
                    
                    <div className="flex gap-3 w-full mt-auto">
                        <button 
                            onClick={() => { setSelectedCompanyId(emp.id); setActiveVehicleId(null); }} 
                            className="btn-premium flex-1 px-5 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider"
                        >
                            Flota
                        </button>
                        {role === 'admin' && (
                            <>
                                <button 
                                    onClick={() => { setSelectedCompanyId(emp.id); setForm(prev => ({...prev, nombre: emp.nombre, cuit: emp.cuit, responsable: emp.responsable, tankCapacity: emp.tankCapacity, criticalFuelPerc: emp.criticalFuelPerc || 25})); setModalType('edit_company'); }} 
                                    className="px-4 py-3.5 bg-slate-100/50 hover:bg-yellow-400 rounded-xl transition-colors flex items-center justify-center border border-slate-200/50"
                                >
                                    <Icon name="settings" size={18}/>
                                </button>
                                <button 
                                    onClick={() => handleDeleteCompany(emp.id)} 
                                    className="px-4 py-3.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-colors flex items-center justify-center border border-red-100"
                                >
                                    <Icon name="x" size={18}/>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// --- 3. VISTA: FLOTA DE UNA EMPRESA / PANEL AISLADO DE VEHÍCULO ---
const CompanyDetailView = ({ 
    role, activeCompany, activeVehicle, activeVehicleId, isolatedVehicleId, displayedVehicles, expandedVehicles, 
    setSelectedCompanyId, setIsolatedVehicleId, setActiveVehicleId, setForm, setModalType, 
    handleDeleteVehicle, handleToggleStatus, downloadPDF, generateQR, toggleHistory 
}) => {
    
    // VISTA DE LISTADO DE FLOTA
    if (!activeVehicleId) {
        return (
            <div className="max-w-6xl mx-auto animate-fade-in">
                {role === 'admin' && (
                    <button 
                        onClick={() => setSelectedCompanyId(null)} 
                        className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase mb-8 text-slate-400 hover:text-slate-900 transition-colors tracking-widest"
                    >
                        <Icon name="chevronLeft" size={16}/> Volver al Directorio
                    </button>
                )}
                
                <div className="glass-card p-8 md:p-10 bg-gradient-to-br from-slate-900 to-slate-800 text-white mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl shadow-slate-900/20 border-none">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-400/20 blur-[80px] rounded-full pointer-events-none" />
                    <div className="z-10">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-2">Flota de Maquinaria</p>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none text-white">{activeCompany.nombre}</h2>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 z-10 w-full md:w-auto">
                        <div 
                            onClick={() => setActiveVehicleId('TANK')} 
                            className="cursor-pointer hover:scale-105 transition-transform bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-sm shadow-xl flex flex-col items-center"
                        >
                            <span className="text-[8px] font-black uppercase text-yellow-400 tracking-widest mb-1">Ver Tanque</span>
                            <FuelTankCapsule capacity={activeCompany.tankCapacity} current={activeCompany.currentFuel} />
                        </div>
                        {role === 'admin' && (
                            <button 
                                onClick={() => { setForm(prev => ({...prev, nombre:'', marca:'', modelo:'', serie:'', patente:'', serviceInterval: 250, horometro: ''})); setModalType('vehicle'); }} 
                                className="btn-accent px-6 py-4 rounded-xl text-xs font-black tracking-widest shadow-xl shadow-yellow-400/20 w-full md:w-auto"
                            >
                                + VINCULAR EQUIPO
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(activeCompany.vehiculos || []).map((v, index) => {
                        const perc = Math.max(0, 100 - (((v.horometroTotal || 0) - (v.ultimoServiceHoras || 0)) / (v.serviceInterval || 250) * 100));
                        const vehNumber = v.numeroInterno || (index + 1);

                        return (
                            <div 
                                key={v.id} 
                                onClick={() => setActiveVehicleId(v.id)} 
                                className="glass-card p-6 cursor-pointer hover:border-yellow-400 transition-all group flex flex-col h-full"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-slate-900 rounded-[1rem] flex items-center justify-center shadow-md">
                                        <span className="text-yellow-400 font-black text-lg">#{vehNumber}</span>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${v.operativo ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100 animate-pulse'}`}>
                                        {v.operativo ? 'OPERATIVO' : 'ROTO'}
                                    </div>
                                </div>
                                <h4 className="font-black text-xl tracking-tight text-slate-800 truncate mb-1">{v.nombre}</h4>
                                <p className="font-bold text-slate-500 text-sm mono mb-6">{(v.horometroTotal || 0).toLocaleString()} <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">Horas</span></p>
                                
                                <div className="space-y-2 mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Vida Útil ({v.serviceInterval}h)</span>
                                        <span className={`text-[11px] font-black mono ${perc < 20 ? 'text-red-500' : 'text-slate-800'}`}>{perc.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                                        <div className={`h-full transition-all duration-1000 ${perc < 20 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-800'}`} style={{width: `${perc}%`}} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // PANEL AISLADO DE VEHÍCULO O TANQUE
    const isTank = activeVehicleId === 'TANK';
    const vehNumber = isTank ? 'TANQUE' : (activeVehicle.numeroInterno || ((activeCompany.vehiculos || []).findIndex(v => v.id === activeVehicle.id) + 1));

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-10">
            <button 
                onClick={() => { if(isolatedVehicleId) { setSelectedCompanyId(null); setIsolatedVehicleId(null); } else { setActiveVehicleId(null); } }} 
                className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase mb-8 text-slate-400 hover:text-slate-900 transition-colors tracking-widest"
            >
                <Icon name="chevronLeft" size={16}/> Volver a la Flota
            </button>
            
            <div className={`glass-card p-8 md:p-12 relative overflow-hidden shadow-2xl ${isTank ? 'border-t-[12px] border-t-emerald-500' : 'border-t-[12px] border-t-yellow-400'}`}>
                <div className={`absolute top-0 right-8 text-slate-900 px-4 py-2 rounded-b-xl font-black text-sm shadow-md tracking-widest ${isTank ? 'bg-emerald-400' : 'bg-yellow-400'}`}>
                    {isTank ? 'CENTRAL' : `MAQ #${vehNumber}`}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10 border-b border-slate-100 pb-10 mt-4">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-slate-900/20 text-yellow-400">
                            {isTank ? <Icon name="fuel" size={36} className="text-emerald-400"/> : <span className="font-black text-3xl md:text-4xl">#{vehNumber}</span>}
                        </div>
                        <div>
                            <h4 className="font-black text-4xl md:text-5xl tracking-tighter text-slate-800">{activeVehicle.nombre}</h4>
                            <p className="font-bold text-slate-400 text-sm md:text-base uppercase tracking-widest mt-2">{activeCompany.nombre}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-[1.5rem] text-center w-full md:w-auto border border-slate-200/60 shadow-inner">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{isTank ? 'Stock Actual' : 'Horómetro Actual'}</p>
                        <p className="font-black text-slate-800 text-4xl mono">{(activeVehicle.horometroTotal || 0).toLocaleString()} <span className="text-sm text-slate-400 uppercase tracking-widest">{isTank ? 'L' : 'HS'}</span></p>
                    </div>
                </div>

                {/* BLOQUEO PARA GERENTE: El gerente no ve botones de carga ni eventos */}
                {role !== 'gerente' && (
                    <div className={`grid gap-4 mb-10 ${isTank ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                        <button onClick={() => setModalType('log')} className="btn-premium px-4 py-5 rounded-2xl text-xs font-black tracking-widest w-full">
                            {isTank ? 'INGRESAR DIÉSEL' : 'CARGAR DATOS'}
                        </button>
                        {!isTank && (
                            <button onClick={() => setModalType('service')} className="btn-accent px-4 py-5 rounded-2xl text-xs font-black tracking-widest w-full">
                                SERVICE
                            </button>
                        )}
                        <button 
                            onClick={() => handleToggleStatus(activeVehicle.id, activeVehicle.operativo)} 
                            className={`px-4 py-5 rounded-2xl font-black text-xs tracking-widest uppercase transition-all w-full shadow-md ${activeVehicle.operativo ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white' : 'bg-emerald-500 text-white shadow-emerald-500/30'}`}
                        >
                            {activeVehicle.operativo ? 'EVENTO' : 'REVIVIR'}
                        </button>
                        {!isTank && (
                            <button 
                                onClick={() => { setForm(prev => ({...prev, horas: activeVehicle.horometroTotal, fecha: new Date().toISOString().split('T')[0]})); setModalType('historical'); }} 
                                className="bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 px-4 py-5 rounded-2xl text-xs font-black tracking-widest w-full transition-colors border border-slate-200/50"
                            >
                                HISTORIAL
                            </button>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-4 mb-10 bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100">
                    {!isTank && (
                        <button 
                            onClick={() => downloadPDF(activeCompany, activeVehicle)} 
                            className="flex-1 px-5 py-4 bg-white hover:bg-slate-900 hover:text-white rounded-xl transition-all flex items-center justify-center border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest gap-3"
                        >
                            <Icon name="download" size={16}/> Expediente PDF
                        </button>
                    )}
                    <button 
                        onClick={() => { setModalType('qr'); setTimeout(() => generateQR(activeVehicle.id), 100); }} 
                        className="flex-1 px-5 py-4 bg-white hover:bg-yellow-400 rounded-xl transition-all flex items-center justify-center border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest gap-3"
                    >
                        <Icon name="qr" size={16}/> Etiqueta QR
                    </button>
                    
                    {role === 'admin' && !isTank && (
                        <div className="flex flex-1 gap-3">
                            <button 
                                onClick={() => { setForm(prev => ({...prev, nombre: activeVehicle.nombre, marca: activeVehicle.marca, modelo: activeVehicle.modelo, serie: activeVehicle.serie, patente: activeVehicle.patente, serviceInterval: activeVehicle.serviceInterval})); setModalType('edit_vehicle'); }} 
                                className="flex-1 px-5 py-4 bg-white hover:bg-yellow-400 rounded-xl transition-colors flex items-center justify-center shadow-sm border border-slate-200 text-slate-500 hover:text-black gap-2 text-[10px] font-black uppercase tracking-widest"
                            >
                                <Icon name="settings" size={16}/> Editar
                            </button>
                            <button 
                                onClick={() => handleDeleteVehicle(activeVehicle.id)} 
                                className="flex-1 px-5 py-4 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-colors flex items-center justify-center shadow-sm border border-red-100 gap-2 text-[10px] font-black uppercase tracking-widest"
                            >
                                <Icon name="x" size={16}/> Eliminar
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <h3 className="font-black text-2xl tracking-tight text-slate-800">Auditoría Interna</h3>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white shadow-sm">
                        <table className="w-full history-table min-w-[500px]">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo de Evento</th>
                                    <th>{isTank ? 'Litros' : 'Lectura'}</th>
                                    <th>Nota del Operario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {([...(activeVehicle.eventos || [])].reverse().map((ev, idx) => ( 
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="font-bold text-slate-400 text-xs">{ev.fecha.slice(0,5)}</td>
                                        <td>
                                            <span className="font-black text-[9px] uppercase tracking-widest border border-slate-200 px-2.5 py-1.5 rounded-lg bg-white text-slate-600 shadow-sm">
                                                {ev.tipo.slice(0,8)}
                                            </span>
                                        </td>
                                        <td className={`mono font-black text-sm ${isTank ? (ev.tipo === 'DESCARGA' ? 'text-red-500' : 'text-emerald-500') : 'text-slate-800'}`}>
                                            {isTank ? `${ev.litros} L` : ev.horas}
                                        </td>
                                        <td className="text-slate-500 font-medium text-xs leading-relaxed max-w-[250px] truncate">
                                            {!isTank && ev.litros ? <span className="font-bold text-red-500 mr-2">-{ev.litros}L</span> : ''}
                                            {ev.nota || ev.motivo || '-'}
                                        </td>
                                    </tr> 
                                )))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 4. VISTA: CONFIGURACIÓN ADMIN ---
const ConfigView = ({ bndSettings, setBndSettings, saveBndSettings, usersList, companies, handleUpdateUserRole, setNewUser, setModalType, setEditingUserId }) => (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">
        <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">Configuración Global</h2>
            <div className="glass-card p-8 md:p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Razón Social</label>
                        <input className="input-premium px-5 py-4 w-full font-black text-lg text-slate-800" value={bndSettings.name} onChange={e => setBndSettings({...bndSettings, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Descripción</label>
                        <input className="input-premium px-5 py-4 w-full text-sm font-medium text-slate-600" value={bndSettings.description} onChange={e => setBndSettings({...bndSettings, description: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Dirección Física</label>
                        <input className="input-premium px-5 py-4 w-full text-sm font-medium text-slate-600" value={bndSettings.address} onChange={e => setBndSettings({...bndSettings, address: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Teléfono de Contacto</label>
                        <input className="input-premium px-5 py-4 w-full text-sm font-medium text-slate-600" value={bndSettings.phone} onChange={e => setBndSettings({...bndSettings, phone: e.target.value})} />
                    </div>
                </div>
                <button onClick={saveBndSettings} className="btn-premium px-8 py-4 rounded-xl text-sm font-black tracking-widest w-full md:w-auto">GUARDAR CAMBIOS</button>
            </div>
        </div>
        
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-black tracking-tight text-slate-800">Control de Accesos</h2>
                <button onClick={() => { setNewUser({ email: '', password: '', nombre: '', role: 'operario', companyId: '' }); setModalType('register_user'); }} className="btn-accent px-6 py-3.5 rounded-xl text-xs font-black tracking-widest w-full sm:w-auto">+ NUEVO USUARIO</button>
            </div>
            <div className="glass-card overflow-x-auto shadow-sm">
                <table className="w-full history-table min-w-[600px]">
                    <thead className="bg-slate-50">
                        <tr><th>Nombre y Apellido</th><th>Email</th><th>Rol / Flota Asignada</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                        {usersList.map(u => (
                            <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                                <td className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{u.nombre || '-'}</td>
                                <td className="font-medium text-slate-500 text-sm truncate max-w-[200px]">{u.email}</td>
                                <td>
                                    <div className="flex flex-col gap-1.5 items-start">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${u.role === 'admin' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : u.role === 'gerente' ? 'border-blue-400 bg-blue-50 text-blue-700' : u.role === 'suspendido' ? 'border-red-500 bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {u.role}
                                        </span>
                                        {['operario', 'gerente'].includes(u.role) && (
                                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">
                                                {companies.find(c => c.id === u.companyId)?.nombre || 'Sin Empresa Asignada'}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <button 
                                        onClick={() => { setEditingUserId(u.uid); setNewUser({ email: u.email, nombre: u.nombre || '', role: u.role, companyId: u.companyId || '', password: '' }); setModalType('edit_user'); }} 
                                        className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 hover:border-yellow-400 hover:text-yellow-600 text-slate-600 px-4 py-2 rounded-lg transition-colors shadow-sm"
                                    >
                                        EDITAR PERFIL
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

// --- 5. VISTA: PROYECCIONES ---
const CalendarView = ({ role, userCompanyId, companies, selectedCompanyId, setSelectedCompanyId, companyProjections }) => {
    if (!selectedCompanyId) {
        return (
            <div className="max-w-6xl mx-auto animate-fade-in">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-8">Centro de Proyecciones</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(role === 'admin' ? companies : companies.filter(c => c.id === userCompanyId)).map(emp => (
                        <div 
                            key={emp.id} 
                            className="glass-card p-6 md:p-8 relative group cursor-pointer hover:border-blue-400 transition-all hover:-translate-y-1" 
                            onClick={() => setSelectedCompanyId(emp.id)}
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-blue-400 shadow-xl shadow-slate-900/20 group-hover:scale-110 transition-transform">
                                    <Icon name="calendar" size={26}/>
                                </div>
                            </div>
                            <h3 className="text-2xl font-black tracking-tight text-slate-800 truncate mb-2 pr-12">{emp.nombre}</h3>
                            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">Analizar Datos <Icon name="chevronRight" size={14}/></p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const comp = companies.find(c => c.id === selectedCompanyId);
    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            {role === 'admin' && (
                <button onClick={() => setSelectedCompanyId(null)} className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase mb-8 text-slate-400 hover:text-slate-900 transition-colors tracking-widest">
                    <Icon name="chevronLeft" size={16}/> Volver al Resumen
                </button>
            )}
            
            <div className="glass-card p-8 md:p-10 bg-gradient-to-br from-blue-900 to-slate-900 text-white mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl shadow-blue-900/20 border-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 blur-[100px] rounded-full pointer-events-none" />
                <div className="z-10">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Panel de Control Inteligente</p>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none text-white">{comp?.nombre}</h2>
                </div>
            </div>
            
            {companyProjections && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    <div className={`glass-card p-8 lg:col-span-1 flex flex-col h-full border-t-[8px] ${companyProjections.currentFuel <= companyProjections.criticalLiters ? 'border-t-red-500 bg-red-50/50 shadow-red-500/10' : 'border-t-yellow-400 shadow-sm'}`}>
                        <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-inner mb-8 ${companyProjections.currentFuel <= companyProjections.criticalLiters ? 'bg-white text-red-500 border border-red-100 animate-pulse' : 'bg-slate-50 text-yellow-500 border border-slate-100'}`}>
                            <Icon name="fuel" size={32}/>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight text-slate-800 mb-2">Reserva Diésel</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Nivel Crítico: {companyProjections.criticalLiters.toFixed(0)}L</p>
                        
                        <div className="space-y-5 mt-auto">
                            <div className="flex justify-between items-end border-b border-slate-200/60 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha Límite</span>
                                <span className={`text-xl font-black ${companyProjections.currentFuel <= companyProjections.criticalLiters ? 'text-red-600' : 'text-slate-800'}`}>
                                    {companyProjections.fuelEstDate ? companyProjections.fuelEstDate.toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between items-end border-b border-slate-200/60 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consumo Medio</span>
                                <span className="text-xl font-black mono text-slate-700">{companyProjections.fuelAvg > 0 ? companyProjections.fuelAvg.toFixed(1) : 0} L/DÍA</span>
                            </div>
                            <div className="flex justify-between items-end bg-white p-4 rounded-xl border border-slate-100 shadow-sm mt-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stock Actual</span>
                                <span className="text-2xl font-black mono text-slate-900">{companyProjections.currentFuel.toFixed(0)} L</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-8 lg:col-span-2 flex flex-col h-full shadow-sm">
                        <h3 className="text-2xl font-black tracking-tight text-slate-800 mb-2">Próximos Services</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Ordenados por Urgencia</p>
                        
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-3">
                            {companyProjections.vProjs.map((p, i) => {
                                const vehNumber = p.numeroInterno || (i + 1);
                                return (
                                <div key={i} className={`p-6 rounded-[1.5rem] border-l-[8px] shadow-sm flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center transition-transform hover:-translate-y-0.5 ${p.restHs <= 50 ? 'border-l-red-500 bg-red-50/80 border border-red-100/50' : 'border-l-blue-500 bg-slate-50/80 border border-slate-100/50'}`}>
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${p.restHs <= 50 ? 'bg-white text-red-500' : 'bg-white text-blue-500'}`}>
                                            <span className="font-black text-xl">#{vehNumber}</span>
                                        </div>
                                        <div>
                                            <p className="font-black text-xl tracking-tight text-slate-800 truncate">{p.nombre}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Uso: {p.avgUsage.toFixed(1)} HS/DÍA</p>
                                        </div>
                                    </div>
                                    <div className="bg-white px-5 py-4 rounded-xl border border-slate-200/60 text-center w-full sm:w-auto shadow-sm">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Resta Ciclo</p>
                                        <p className={`font-black mono text-2xl leading-none ${p.restHs <= 50 ? 'text-red-600' : 'text-slate-800'}`}>
                                            {Math.max(0, p.restHs).toFixed(1)} <span className="text-xs">H</span>
                                        </p>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 6. VISTA: INTELIGENCIA DIRECTIVA ---
const MetricsView = ({ intelligenceData, chartGastosData, chartSeveridadData, expandedInfo, toggleInfo }) => (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-10">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">Business Intelligence</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* REPORTE 1: EFICIENCIA L/H */}
            <div className="glass-card p-8 flex flex-col h-full border-t-[8px] border-t-blue-500 shadow-lg shadow-blue-500/5">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-black tracking-tight text-slate-800">Consumo vs Horas (L/H)</h3>
                    <button onClick={() => toggleInfo('lh')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm hover:bg-blue-500 hover:text-white transition-colors shadow-sm">i</button>
                </div>
                {expandedInfo['lh'] && <p className="text-xs font-bold text-blue-800 bg-blue-50 p-4 rounded-xl mb-6 leading-relaxed border border-blue-100">Mide litros consumidos por hora trabajada. Picos altos advierten fallas de inyección o posible robo de combustible (ordeñe).</p>}
                
                <div className="space-y-3 mt-auto">
                    {intelligenceData.topConsumidores.map((v, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200/60 hover:border-blue-300 transition-colors">
                            <div><p className="font-black text-sm md:text-base text-slate-800">{v.nombre}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.companyName}</p></div>
                            <span className={`font-black mono text-lg md:text-xl bg-white px-3 py-1.5 rounded-lg border shadow-sm ${v.lPh > 10 ? 'text-red-600 border-red-200' : 'text-slate-800 border-slate-200'}`}>{v.lPh} <span className="text-[10px] text-slate-400">L/H</span></span>
                        </div>
                    ))}
                </div>
            </div>

            {/* REPORTE 2: DISTRIBUCIÓN DE GASTOS OPERATIVOS */}
            <div className="glass-card p-8 flex flex-col h-full border-t-[8px] border-t-yellow-400 shadow-lg shadow-yellow-400/5">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-black tracking-tight text-slate-800">Gastos Operativos</h3>
                    <button onClick={() => toggleInfo('gastos')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm hover:bg-yellow-400 hover:text-slate-900 transition-colors shadow-sm">i</button>
                </div>
                {expandedInfo['gastos'] && <p className="text-xs font-bold text-yellow-800 bg-yellow-50 p-4 rounded-xl mb-6 leading-relaxed border border-yellow-200">Compara la frecuencia de Cargas, Services y Eventos de Reparación. Si la porción roja domina, el mantenimiento preventivo está fallando gravemente.</p>}
                
                <div className="w-full max-w-[280px] mx-auto mt-auto py-6">
                    <ChartWidget type="pie" data={chartGastosData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Plus Jakarta Sans', weight: 'bold' } } } } }} />
                </div>
            </div>

            {/* REPORTE 3: RANKING DE ROTURAS POR CLIENTE */}
            <div className="glass-card p-8 flex flex-col h-full border-t-[8px] border-t-red-500 shadow-lg shadow-red-500/5">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-black tracking-tight text-slate-800">Severidad por Cliente</h3>
                    <button onClick={() => toggleInfo('roturas')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm hover:bg-red-500 hover:text-white transition-colors shadow-sm">i</button>
                </div>
                {expandedInfo['roturas'] && <p className="text-xs font-bold text-red-800 bg-red-50 p-4 rounded-xl mb-6 leading-relaxed border border-red-200">Cantidad histórica de eventos de reparación reportados por empresa. Útil para justificar aumentos de tarifa por riesgo operativo en terrenos difíciles.</p>}
                
                <div className="w-full mt-auto pt-6">
                    <ChartWidget type="bar" data={chartSeveridadData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'JetBrains Mono' } } }, x: { ticks: { font: { family: 'Plus Jakarta Sans', weight: 'bold' } } } } }} />
                </div>
            </div>

            {/* REPORTE 4: UTILIZACIÓN OEE */}
            <div className="glass-card p-8 flex flex-col h-full border-t-[8px] border-t-emerald-500 shadow-lg shadow-emerald-500/5">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-black tracking-tight text-slate-800">Tasa de Uso (OEE)</h3>
                    <button onClick={() => toggleInfo('oee')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm hover:bg-emerald-500 hover:text-white transition-colors shadow-sm">i</button>
                </div>
                {expandedInfo['oee'] && <p className="text-xs font-bold text-emerald-800 bg-emerald-50 p-4 rounded-xl mb-6 leading-relaxed border border-emerald-200">Promedio de horas trabajadas por día. Equipos en verde son altamente rentables. Equipos con bajo uso son capital inmovilizado y conviene reasignarlos.</p>}
                
                <div className="space-y-3 mt-auto">
                    {intelligenceData.topUso.map((v, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200/60 hover:border-emerald-300 transition-colors">
                            <div><p className="font-black text-sm md:text-base text-slate-800">{v.nombre}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.companyName}</p></div>
                            <span className="font-black mono text-lg md:text-xl bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-emerald-600">{v.avgDiario} <span className="text-[10px] text-slate-400">HS/DÍA</span></span>
                        </div>
                    ))}
                </div>
            </div>
            
        </div>
    </div>
);

window.AppViews = { DashboardView, CompaniesView, CompanyDetailView, ConfigView, CalendarView, MetricsView };
