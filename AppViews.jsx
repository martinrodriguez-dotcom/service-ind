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
const DashboardView = ({ alerts, handleUpdateWorkflow, setSelectedCompanyId, setIsolatedVehicleId, setActiveVehicleId, setActiveTab }) => (
  <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
    <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight">Alertas</h2>
    <div className="grid grid-cols-1 gap-4">
      {alerts.map((a, i) => (
        <div key={i} className={`glass-card p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 md:gap-5 border-l-[8px] md:border-l-[12px] ${a.type === 'BREAKDOWN' ? 'border-l-red-500' : 'border-l-yellow-400'}`}>
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'BREAKDOWN' ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-yellow-50 text-yellow-600'}`}>
            <Icon name={a.type === 'FUEL' ? 'fuel' : 'alert'} size={24}/>
          </div>
          <div className="flex-1 text-center md:text-left w-full">
            <h4 className="font-black uppercase text-base md:text-lg italic truncate">{a.nombre || 'COMBUSTIBLE CRÍTICO'}</h4>
            <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest truncate">{a.companyName}</p>
          </div>
          <div className="flex items-center w-full md:w-auto gap-3">
            {a.type === 'BREAKDOWN' ? (
              <div className="flex flex-col sm:flex-row bg-slate-50 p-2 rounded-xl w-full gap-2">
                {['PENDIENTE', 'REVISION', 'REPARADO'].map(s => (
                  <button key={s} onClick={() => handleUpdateWorkflow(a.companyId, a.id, s)} className={`px-3 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase w-full transition-all ${a.workflowStatus === s ? 'bg-red-600 text-white shadow-md scale-105' : 'bg-white text-slate-500 border'}`}>{s.slice(0,4)}</button>
                ))}
              </div>
            ) : (
              <button onClick={() => { setSelectedCompanyId(a.companyId); setActiveVehicleId(null); setActiveTab('companies'); }} className="btn-premium px-5 py-3 rounded-xl w-full md:w-auto text-[10px] md:text-xs font-black">VER FLOTA</button>
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
);

// --- 2. VISTA: DIRECTORIO DE EMPRESAS ---
const CompaniesView = ({ companies, role, setForm, setModalType, setSelectedCompanyId, setActiveVehicleId, handleDeleteCompany }) => (
  <div className="max-w-6xl mx-auto animate-fade-in">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Directorio</h2>
      {role === 'admin' && (
        <button onClick={() => { setForm(prev => ({...prev, nombre:'', cuit:'', responsable:'', tankCapacity:1000, criticalFuelPerc: 25})); setModalType('company'); }} className="btn-accent px-5 py-3 rounded-xl w-full sm:w-auto text-xs font-black shadow-md">+ NUEVO CLIENTE</button>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
      {companies.map(emp => (
        <div key={emp.id} className="glass-card p-5 md:p-6 relative group">
          <div className="flex justify-between items-start mb-6 md:mb-8">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-yellow-400 shadow-xl"><Icon name="company" size={24}/></div>
            <FuelTankCapsule capacity={emp.tankCapacity} current={emp.currentFuel} />
          </div>
          <h3 className="text-xl md:text-2xl font-black uppercase italic truncate mb-1 pr-12 md:pr-16">{emp.nombre}</h3>
          <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-6 md:mb-8">CUIT: {emp.cuit}</p>
          <div className="flex gap-2 w-full mt-4">
            <button onClick={() => { setSelectedCompanyId(emp.id); setActiveVehicleId(null); }} className="btn-premium flex-1 px-4 py-3 rounded-xl text-sm md:text-base font-black uppercase shadow-md">ABRIR FLOTA</button>
            {role === 'admin' && (
              <>
                <button onClick={() => { setSelectedCompanyId(emp.id); setForm(prev => ({...prev, nombre: emp.nombre, cuit: emp.cuit, responsable: emp.responsable, tankCapacity: emp.tankCapacity, criticalFuelPerc: emp.criticalFuelPerc || 25})); setModalType('edit_company'); }} className="px-4 py-3 bg-slate-100 hover:bg-yellow-400 rounded-xl transition-colors flex items-center justify-center shadow-sm"><Icon name="settings" size={16}/></button>
                <button onClick={() => handleDeleteCompany(emp.id)} className="px-4 py-3 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-colors flex items-center justify-center shadow-sm"><Icon name="x" size={16}/></button>
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
  role, activeCompany, activeVehicleId, isolatedVehicleId, displayedVehicles, expandedVehicles, 
  setSelectedCompanyId, setIsolatedVehicleId, setActiveVehicleId, setForm, setModalType, 
  handleDeleteVehicle, handleToggleStatus, downloadPDF, generateQR, toggleHistory 
}) => {
  const activeVehicle = activeCompany?.vehiculos?.find(v => v.id === activeVehicleId);

  // Si no hay un vehículo seleccionado, mostramos la lista de la flota
  if (!activeVehicleId) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        {role === 'admin' && <button onClick={() => setSelectedCompanyId(null)} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-black uppercase mb-6 md:mb-8 text-slate-400 hover:text-slate-900 transition-colors"><Icon name="chevronLeft" size={16}/> VOLVER AL DIRECTORIO</button>}
        <div className="glass-card p-6 md:p-8 bg-slate-900 text-white mb-6 md:mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-[12px] border-l-yellow-400">
          <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-yellow-400/10 blur-[80px] md:blur-[100px] pointer-events-none" />
          <div className="z-10"><h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-2 leading-none">{activeCompany.nombre}</h2><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Flota de Maquinaria</p></div>
          {role === 'admin' && <button onClick={() => { setForm(prev => ({...prev, nombre:'', marca:'', modelo:'', serie:'', patente:'', serviceInterval: 250, horometro: ''})); setModalType('vehicle'); }} className="btn-accent px-5 py-3 rounded-xl text-xs font-black shadow-lg z-10 w-full md:w-auto">+ VINCULAR EQUIPO</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {(activeCompany.vehiculos || []).map((v, index) => {
            const perc = Math.max(0, 100 - (((v.horometroTotal || 0) - (v.ultimoServiceHoras || 0)) / (v.serviceInterval || 250) * 100));
            // Badge visual con fallback a index si es un vehículo viejo
            const vehNumber = v.numeroInterno || (index + 1);

            return (
              <div key={v.id} onClick={() => setActiveVehicleId(v.id)} className="glass-card p-5 border-l-[6px] border-l-slate-300 cursor-pointer hover:border-l-yellow-400 transition-all hover:-translate-y-1 shadow-sm hover:shadow-xl group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-yellow-50 transition-colors relative">
                        <Icon name="truck" size={18} className="text-slate-800"/>
                        {/* INSIGNIA NUMÉRICA */}
                        <span className="absolute -top-2 -right-2 bg-slate-900 text-yellow-400 text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm">#{vehNumber}</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${v.operativo ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600 animate-pulse'}`}>{v.operativo ? 'ACTIVO' : 'ROTO'}</div>
                </div>
                <h4 className="font-black uppercase text-lg italic tracking-tight truncate">{v.nombre}</h4><p className="font-black text-slate-900 text-sm mono mb-4">{(v.horometroTotal || 0).toLocaleString()} <span className="text-[9px] text-slate-400 uppercase">HS</span></p>
                <div className="space-y-1.5 mt-auto">
                    <div className="flex justify-between items-end px-1"><span className="text-[8px] font-black uppercase text-slate-400">Ciclo ({v.serviceInterval}h)</span><span className={`text-[10px] font-black mono ${perc < 20 ? 'text-red-500' : 'text-slate-900'}`}>{perc.toFixed(0)}%</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${perc < 20 ? 'bg-red-500' : 'bg-slate-900'}`} style={{width: `${perc}%`}} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Panel Aislado de un Vehículo
  const vehNumber = activeVehicle.numeroInterno || ((activeCompany.vehiculos || []).findIndex(v => v.id === activeVehicle.id) + 1);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => { if(isolatedVehicleId) { setSelectedCompanyId(null); setIsolatedVehicleId(null); } else { setActiveVehicleId(null); } }} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-black uppercase mb-6 md:mb-8 text-slate-400 hover:text-slate-900 transition-colors"><Icon name="chevronLeft" size={16}/> VOLVER A LA FLOTA</button>
      <div className="glass-card p-6 md:p-10 border-t-[12px] border-t-yellow-400 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-100 pb-8">
          <div className="flex items-center gap-5">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 rounded-2xl flex items-center justify-center shadow-inner text-white relative">
                  <Icon name="truck" size={32}/>
                  {/* INSIGNIA NUMÉRICA MODAL */}
                  <span className="absolute -top-3 -right-3 bg-yellow-400 text-slate-900 text-xs md:text-sm font-black px-2 py-1 rounded-lg shadow-md">#{vehNumber}</span>
              </div>
              <div>
                  <h4 className="font-black uppercase text-3xl md:text-4xl italic tracking-tighter">{activeVehicle.nombre}</h4>
                  <p className="font-black text-slate-500 text-sm md:text-base uppercase tracking-widest mt-1">{activeCompany.nombre}</p>
              </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl text-center w-full md:w-auto border border-slate-100"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Horómetro</p><p className="font-black text-slate-900 text-3xl md:text-4xl mono">{(activeVehicle.horometroTotal || 0).toLocaleString()} <span className="text-xs text-slate-400 uppercase">HS</span></p></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <button onClick={() => setModalType('log')} className="btn-premium px-4 py-4 rounded-2xl text-xs font-black w-full shadow-lg">CARGAR DATOS</button>
          <button onClick={() => setModalType('service')} className="btn-accent px-4 py-4 rounded-2xl text-xs font-black w-full shadow-lg">SERVICE</button>
          
          {/* BOTON EVENTO RENOMBRADO */}
          <button onClick={() => handleToggleStatus(activeVehicle.id, activeVehicle.operativo)} className={`px-4 py-4 rounded-2xl font-black text-xs uppercase shadow-lg transition-all w-full ${activeVehicle.operativo ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white' : 'bg-emerald-500 text-white'}`}>
              {activeVehicle.operativo ? 'EVENTO' : 'REVIVIR EQUIPO'}
          </button>
          
          <button onClick={() => { setForm(prev => ({...prev, horas: activeVehicle.horometroTotal, fecha: new Date().toISOString().split('T')[0]})); setModalType('historical'); }} className="btn-premium bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-4 rounded-2xl text-xs font-black w-full shadow-sm">HISTORIAL</button>
        </div>
        <div className="flex flex-wrap gap-3 mb-8 bg-slate-50 p-4 rounded-2xl">
          <button onClick={() => downloadPDF(activeCompany, activeVehicle)} className="flex-1 px-4 py-3 bg-white hover:bg-slate-900 hover:text-white rounded-xl transition-all flex items-center justify-center border shadow-sm text-[10px] font-black uppercase gap-2"><Icon name="download" size={14}/> EXPEDIENTE PDF</button>
          <button onClick={() => { setModalType('qr'); setTimeout(() => generateQR(activeVehicle.id), 100); }} className="flex-1 px-4 py-3 bg-white hover:bg-yellow-400 rounded-xl transition-all flex items-center justify-center border shadow-sm text-[10px] font-black uppercase gap-2"><Icon name="qr" size={14}/> ETIQUETA QR</button>
          {role === 'admin' && (
            <div className="flex flex-1 gap-2">
              <button onClick={() => { setForm(prev => ({...prev, nombre: activeVehicle.nombre, marca: activeVehicle.marca, modelo: activeVehicle.modelo, serie: activeVehicle.serie, patente: activeVehicle.patente, serviceInterval: activeVehicle.serviceInterval})); setModalType('edit_vehicle'); }} className="flex-1 px-4 py-3 bg-white hover:bg-yellow-400 rounded-xl transition-colors flex items-center justify-center shadow-sm border text-slate-400 hover:text-black gap-2 text-[10px] font-black uppercase"><Icon name="settings" size={14}/> EDITAR</button>
              <button onClick={() => handleDeleteVehicle(activeVehicle.id)} className="flex-1 px-4 py-3 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-colors flex items-center justify-center shadow-sm border border-red-100 gap-2 text-[10px] font-black uppercase"><Icon name="x" size={14}/> ELIMINAR</button>
            </div>
          )}
        </div>
        <div className="space-y-4"><h3 className="font-black uppercase text-xl italic tracking-tighter border-b pb-2">Auditoría Interna</h3><div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <table className="w-full history-table min-w-[400px]">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Lec.</th><th>Nota</th></tr></thead>
            <tbody>
              {([...(activeVehicle.eventos || [])].reverse().map((ev, idx) => ( 
                <tr key={idx} className="hover:bg-white transition-colors"><td className="font-bold opacity-50 italic text-xs">{ev.fecha.slice(0,5)}</td><td><span className="font-black text-[9px] uppercase border px-2 py-1 rounded bg-white">{ev.tipo.slice(0,4)}</span></td><td className="mono font-black text-sm">{ev.horas}</td><td className="text-slate-500 italic text-xs leading-tight max-w-[200px] truncate">{ev.litros ? `-${ev.litros}L ` : ''}{ev.nota || ev.motivo || '-'}</td></tr> 
              )))}
            </tbody>
          </table>
        </div></div>
      </div>
    </div>
  );
};

// --- 4. VISTA: CONFIGURACIÓN ADMIN ---
const ConfigView = ({ bndSettings, setBndSettings, saveBndSettings, usersList, companies, handleUpdateUserRole, setNewUser, setModalType, setEditingUserId }) => (
  <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
    <div className="space-y-6">
      <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Configuración</h2>
      <div className="glass-card p-6 md:p-8 space-y-6 bg-white shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Razón Social</label><input className="input-premium px-4 py-3 rounded-xl w-full font-black text-lg" value={bndSettings.name} onChange={e => setBndSettings({...bndSettings, name: e.target.value})} /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descripción</label><input className="input-premium px-4 py-3 rounded-xl w-full text-sm" value={bndSettings.description} onChange={e => setBndSettings({...bndSettings, description: e.target.value})} /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Dirección Física</label><input className="input-premium px-4 py-3 rounded-xl w-full text-sm" value={bndSettings.address} onChange={e => setBndSettings({...bndSettings, address: e.target.value})} /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Teléfono</label><input className="input-premium px-4 py-3 rounded-xl w-full text-sm" value={bndSettings.phone} onChange={e => setBndSettings({...bndSettings, phone: e.target.value})} /></div>
        </div>
        <button onClick={saveBndSettings} className="btn-premium px-6 py-3 rounded-xl w-full text-sm font-black uppercase shadow-lg">Guardar Cambios</button>
      </div>
    </div>
    <div className="space-y-4">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Usuarios</h2>
        <button onClick={() => { setNewUser({ email: '', password: '', nombre: '', role: 'operario', companyId: '' }); setModalType('register_user'); }} className="btn-accent px-5 py-2.5 rounded-xl text-[10px] font-black shadow-md">+ NUEVO ACCESO</button>
      </div>
      <div className="glass-card overflow-x-auto shadow-xl">
        <table className="w-full history-table min-w-[500px]">
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol / Empresa Asignada</th><th>Gestión</th></tr></thead>
          <tbody>
            {usersList.map(u => (
              <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                <td className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{u.nombre || '-'}</td>
                <td className="font-black text-slate-500 italic text-xs truncate max-w-[150px]">{u.email}</td>
                <td><div className="flex flex-col gap-1 items-start"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${u.role === 'admin' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : u.role === 'suspendido' ? 'border-red-500 bg-red-50 text-red-600' : 'bg-white text-slate-600 border-slate-200'}`}>{u.role}</span>{u.role === 'operario' && (<span className="text-[8px] font-bold text-slate-400 uppercase">{companies.find(c => c.id === u.companyId)?.nombre || 'Sin Empresa'}</span>)}</div></td>
                <td><button onClick={() => { setEditingUserId(u.uid); setNewUser({ email: u.email, nombre: u.nombre || '', role: u.role, companyId: u.companyId || '', password: '' }); setModalType('edit_user'); }} className="text-[9px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors">EDITAR</button></td>
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
        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-8">Proyecciones Globales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {(role === 'admin' ? companies : companies.filter(c => c.id === userCompanyId)).map(emp => (
            <div key={emp.id} className="glass-card p-5 md:p-6 relative group cursor-pointer hover:border-l-[6px] hover:border-l-blue-500 transition-all hover:shadow-xl" onClick={() => setSelectedCompanyId(emp.id)}>
              <div className="flex justify-between items-start mb-6 md:mb-8"><div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-blue-400 shadow-xl"><Icon name="calendar" size={20}/></div></div>
              <h3 className="text-xl font-black uppercase italic truncate mb-1 pr-12">{emp.nombre}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Ver Proyección</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const comp = companies.find(c => c.id === selectedCompanyId);
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {role === 'admin' && <button onClick={() => setSelectedCompanyId(null)} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-black uppercase mb-6 md:mb-8 text-slate-400 hover:text-slate-900 transition-colors"><Icon name="chevronLeft" size={16}/> VOLVER</button>}
      <div className="glass-card p-6 md:p-8 bg-slate-900 text-white mb-6 md:mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-[12px] border-l-blue-500">
        <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-blue-400/10 blur-[80px] md:blur-[100px] pointer-events-none" />
        <div className="z-10"><h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-2 leading-none">{comp?.nombre}</h2><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumen de Proyecciones</p></div>
      </div>
      {companyProjections && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className={`glass-card p-8 lg:col-span-1 border-t-[8px] ${companyProjections.currentFuel <= companyProjections.criticalLiters ? 'border-t-red-500 animate-pulse bg-red-50' : 'border-t-yellow-400'}`}>
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-yellow-500 mb-6 border border-slate-100"><Icon name="fuel" size={32}/></div>
            <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">Reserva Diésel</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Nivel Crítico: {companyProjections.criticalLiters.toFixed(0)} L</p>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b pb-2"><span className="text-xs font-black uppercase text-slate-500">Fecha Límite</span><span className={`text-lg font-black italic ${companyProjections.currentFuel <= companyProjections.criticalLiters ? 'text-red-600' : 'text-slate-900'}`}>{companyProjections.fuelEstDate ? companyProjections.fuelEstDate.toLocaleDateString() : 'N/A'}</span></div>
              <div className="flex justify-between items-end border-b pb-2"><span className="text-xs font-black uppercase text-slate-500">Consumo Diario</span><span className="text-lg font-black mono text-slate-900">{companyProjections.fuelAvg > 0 ? companyProjections.fuelAvg.toFixed(1) : 0} L</span></div>
              <div className="flex justify-between items-end"><span className="text-xs font-black uppercase text-slate-500">Stock Actual</span><span className="text-xl font-black mono text-slate-900">{companyProjections.currentFuel.toFixed(0)} L</span></div>
            </div>
          </div>
          <div className="glass-card p-8 lg:col-span-2">
            <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">Próximos Services</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Orden de Criticidad</p>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {companyProjections.vProjs.map((p, i) => (
                <div key={i} className={`p-5 rounded-2xl border-l-[6px] shadow-sm flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center ${p.restHs <= 50 ? 'border-l-red-500 bg-red-50' : 'border-l-blue-500 bg-slate-50'}`}>
                  <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.restHs <= 50 ? 'bg-white text-red-500' : 'bg-white text-blue-500'}`}><Icon name="truck" size={20}/></div><div><p className="font-black uppercase italic text-lg truncate">{p.nombre}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Promedio: {p.avgUsage.toFixed(1)} HS/DÍA</p></div></div>
                  <div className="bg-white px-4 py-3 rounded-xl border border-slate-100 text-center w-full sm:w-auto"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Resta Ciclo</p><p className={`font-black mono text-lg leading-none ${p.restHs <= 50 ? 'text-red-600' : 'text-slate-900'}`}>{Math.max(0, p.restHs).toFixed(1)} H</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 6. VISTA: INTELIGENCIA DIRECTIVA ---
const MetricsView = ({ intelligenceData, chartGastosData, chartSeveridadData, expandedInfo, toggleInfo }) => (
  <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
    <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Business Intelligence</h2>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-6 md:p-8 flex flex-col h-full border-t-[6px] border-t-blue-500">
        <div className="flex justify-between items-start mb-4"><h3 className="text-xl font-black uppercase italic tracking-tight">Consumo vs Horas (L/H)</h3><button onClick={() => toggleInfo('lh')} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs hover:bg-blue-100 hover:text-blue-600 transition-colors">i</button></div>
        {expandedInfo['lh'] && <p className="text-[10px] font-bold text-blue-600 bg-blue-50 p-3 rounded-xl mb-4 leading-relaxed">Mide litros consumidos por hora trabajada. Picos altos advierten fallas de inyección o posible robo de combustible (ordeñe).</p>}
        <div className="space-y-3 mt-auto">
          {intelligenceData.topConsumidores.map((v, i) => (
            <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div><p className="font-black text-sm uppercase">{v.nombre}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{v.companyName}</p></div>
              <span className={`font-black mono text-base ${v.lPh > 10 ? 'text-red-500' : 'text-slate-900'}`}>{v.lPh} L/H</span>
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card p-6 md:p-8 flex flex-col h-full border-t-[6px] border-t-yellow-400">
        <div className="flex justify-between items-start mb-4"><h3 className="text-xl font-black uppercase italic tracking-tight">Gastos Operativos</h3><button onClick={() => toggleInfo('gastos')} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs hover:bg-yellow-100 hover:text-yellow-600 transition-colors">i</button></div>
        {expandedInfo['gastos'] && <p className="text-[10px] font-bold text-yellow-700 bg-yellow-50 p-3 rounded-xl mb-4 leading-relaxed">Compara la frecuencia de Cargas, Services y Reparaciones. Si la porción roja domina, el mantenimiento preventivo está fallando.</p>}
        <div className="w-full max-w-[250px] mx-auto mt-auto"><ChartWidget type="pie" data={chartGastosData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} /></div>
      </div>
      <div className="glass-card p-6 md:p-8 flex flex-col h-full border-t-[6px] border-t-red-500">
        <div className="flex justify-between items-start mb-4"><h3 className="text-xl font-black uppercase italic tracking-tight">Severidad por Cliente</h3><button onClick={() => toggleInfo('roturas')} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs hover:bg-red-100 hover:text-red-600 transition-colors">i</button></div>
        {expandedInfo['roturas'] && <p className="text-[10px] font-bold text-red-600 bg-red-50 p-3 rounded-xl mb-4 leading-relaxed">Cantidad histórica de roturas reportadas por empresa. Clientes con picos altos son candidatos a un aumento de tarifa por riesgo operativo.</p>}
        <div className="w-full mt-auto"><ChartWidget type="bar" data={chartSeveridadData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} /></div>
      </div>
      <div className="glass-card p-6 md:p-8 flex flex-col h-full border-t-[6px] border-t-emerald-500">
        <div className="flex justify-between items-start mb-4"><h3 className="text-xl font-black uppercase italic tracking-tight">Tasa de Uso (OEE)</h3><button onClick={() => toggleInfo('oee')} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs hover:bg-emerald-100 hover:text-emerald-600 transition-colors">i</button></div>
        {expandedInfo['oee'] && <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl mb-4 leading-relaxed">Promedio de horas trabajadas por día. Equipos con menos de 2H/Día son capital inmovilizado; conviene moverlos de obra o venderlos.</p>}
        <div className="space-y-3 mt-auto">
          {intelligenceData.topUso.map((v, i) => (
            <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div><p className="font-black text-sm uppercase">{v.nombre}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{v.companyName}</p></div>
              <span className="font-black mono text-base text-emerald-600">{v.avgDiario} HS/DÍA</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// EXPORTAMOS LAS VISTAS GLOBALES
window.AppViews = { DashboardView, CompaniesView, CompanyDetailView, ConfigView, CalendarView, MetricsView };
