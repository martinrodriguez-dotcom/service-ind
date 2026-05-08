const { React } = window;
const { Icon, ModalComp } = window;
const { useState } = React;

const AppModals = ({
    modalType, 
    setModalType, 
    role, 
    companies, 
    activeCompany, 
    activeVehicle, 
    activeVehicleId, 
    form, 
    setForm, 
    newUser, 
    setNewUser, 
    newPassword, 
    setNewPassword, 
    confirmPassword, 
    setConfirmPassword, 
    pwdError, 
    handleRegisterUser, 
    handleUpdateUserSubmit, 
    handleChangePassword, 
    handleAddCompany, 
    handleEditCompanySubmit, 
    handleAddVehicle, 
    handleEditVehicleSubmit, 
    handleDailyLog, 
    handleServiceReset, 
    handleConfirmDowntime, 
    handleRepairSubmit, 
    handleHistoricalData, 
    handlePrintQR,
    activeEvent,             
    setActiveEvent,          
    handleEditEventSubmit,   
    activeCategoryEvents,    // NUEVO PROPS MÉTRICAS
    activeCategoryName,      // NUEVO PROPS MÉTRICAS
    exportEventsToCSV        // NUEVO PROPS MÉTRICAS
}) => {
    
    // Estado local para controlar la vista de "Ver más" en el listado de la torta
    const [showAllEvents, setShowAllEvents] = useState(false);

    if (!modalType) return null;
    
    const isTank = activeVehicleId === 'TANK';

    return (
        <ModalComp 
            title={modalType.replace(/_/g,' ')} 
            onClose={() => { 
                if(modalType !== 'force_password_change') {
                    setModalType(null); 
                    if (setActiveEvent) setActiveEvent(null);
                    setShowAllEvents(false); // Reseteamos la vista al cerrar
                }
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
                            <option value="gerente">Gerente (Solo Lectura/Métricas)</option>
                            <option value="admin">Administrador (Total)</option>
                        </select>
                        
                        {['operario', 'gerente'].includes(newUser.role) && (
                            <select 
                                className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold bg-white appearance-none border-yellow-400" 
                                value={newUser.companyId || ''} 
                                onChange={e => setNewUser({...newUser, companyId: e.target.value})}
                            >
                                <option value="">Seleccione Empresa Asignada...</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
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
                            <option value="gerente">Gerente (Solo Lectura/Métricas)</option>
                            <option value="admin">Administrador (Total)</option>
                            <option value="suspendido">Suspender Acceso</option>
                        </select>
                        
                        {['operario', 'gerente'].includes(newUser.role) && (
                            <select 
                                className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold bg-white appearance-none border-yellow-400" 
                                value={newUser.companyId || ''} 
                                onChange={e => setNewUser({...newUser, companyId: e.target.value})}
                            >
                                <option value="">Seleccione Empresa Asignada...</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                            Actualiza tu contraseña temporal para activar la cuenta.
                        </p>
                        
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
                            onChange={e => setForm(prev => ({...prev, nombre: e.target.value.toUpperCase()}))} 
                        />
                        <input 
                            className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                            placeholder="CUIT" 
                            onChange={e => setForm(prev => ({...prev, cuit: e.target.value}))} 
                        />
                        <input 
                            className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                            placeholder="RESPONSABLE" 
                            onChange={e => setForm(prev => ({...prev, responsable: e.target.value}))} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                type="number" 
                                placeholder="CAPACIDAD TANQUE (L)" 
                                onChange={e => setForm(prev => ({...prev, tankCapacity: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                type="number" 
                                placeholder="% CRÍTICO ALERTA" 
                                defaultValue="25" 
                                onChange={e => setForm(prev => ({...prev, criticalFuelPerc: e.target.value}))} 
                            />
                        </div>
                        <button onClick={handleAddCompany} className="btn-accent w-full px-5 py-3 rounded-xl text-sm font-black mt-2 uppercase shadow-md">
                            REGISTRAR CLIENTE
                        </button>
                    </div>
                )}

                {modalType === 'edit_company' && (
                    <div className="space-y-4">
                        <input 
                            className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                            value={form.nombre} 
                            onChange={e => setForm(prev => ({...prev, nombre: e.target.value.toUpperCase()}))} 
                        />
                        <input 
                            className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                            value={form.cuit} 
                            onChange={e => setForm(prev => ({...prev, cuit: e.target.value}))} 
                        />
                        <input 
                            className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                            value={form.responsable} 
                            onChange={e => setForm(prev => ({...prev, responsable: e.target.value}))} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400">Capacidad Total</label>
                                <input 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                    type="number" 
                                    value={form.tankCapacity} 
                                    onChange={e => setForm(prev => ({...prev, tankCapacity: e.target.value}))} 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400">% Crítico Alerta</label>
                                <input 
                                    className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                    type="number" 
                                    value={form.criticalFuelPerc} 
                                    onChange={e => setForm(prev => ({...prev, criticalFuelPerc: e.target.value}))} 
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
                            onChange={e => setForm(prev => ({...prev, nombre: e.target.value.toUpperCase()}))} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                placeholder="MARCA" 
                                onChange={e => setForm(prev => ({...prev, marca: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                placeholder="MODELO" 
                                onChange={e => setForm(prev => ({...prev, modelo: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                placeholder="SERIE" 
                                onChange={e => setForm(prev => ({...prev, serie: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                placeholder="PATENTE" 
                                onChange={e => setForm(prev => ({...prev, patente: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                type="number" 
                                placeholder="HS INICIAL" 
                                onChange={e => setForm(prev => ({...prev, horometro: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                type="number" 
                                placeholder="CICLO SERVICE" 
                                defaultValue="250" 
                                onChange={e => setForm(prev => ({...prev, serviceInterval: e.target.value}))} 
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
                            onChange={e => setForm(prev => ({...prev, nombre: e.target.value.toUpperCase()}))} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                value={form.marca} 
                                onChange={e => setForm(prev => ({...prev, marca: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                value={form.modelo} 
                                onChange={e => setForm(prev => ({...prev, modelo: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                value={form.serie} 
                                onChange={e => setForm(prev => ({...prev, serie: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                value={form.patente} 
                                onChange={e => setForm(prev => ({...prev, patente: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                type="number" 
                                value={form.serviceInterval} 
                                onChange={e => setForm(prev => ({...prev, serviceInterval: e.target.value}))} 
                            />
                        </div>
                        <button onClick={handleEditVehicleSubmit} className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black mt-2 uppercase shadow-md">
                            Actualizar Datos
                        </button>
                    </div>
                )}

                {modalType === 'log' && (
                    <div className="space-y-6">
                        <div className={`grid ${isTank ? 'grid-cols-1' : 'grid-cols-2'} gap-4 text-center`}>
                            {!isTank && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Horómetro Final
                                    </label>
                                    <input 
                                        type="number" 
                                        className="input-premium px-4 py-4 rounded-xl w-full text-2xl md:text-3xl text-center font-black" 
                                        onChange={e => setForm(prev => ({...prev, horas: e.target.value}))} 
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {isTank ? 'Litros a Ingresar' : 'Carga Diesel (L)'}
                                </label>
                                <input 
                                    type="number" 
                                    className="input-premium px-4 py-4 rounded-xl w-full text-2xl md:text-3xl text-center font-black" 
                                    onChange={e => setForm(prev => ({...prev, litros: e.target.value}))} 
                                />
                            </div>
                        </div>
                        <textarea 
                            className="input-premium px-5 py-4 rounded-xl w-full h-32 md:h-40 text-sm font-bold resize-none" 
                            placeholder={isTank ? "REMITO DEL PROVEEDOR..." : "NOTAS DE LA JORNADA..."} 
                            onChange={e => setForm(prev => ({...prev, nota: e.target.value.toUpperCase()}))} 
                        />
                        <button onClick={handleDailyLog} className="btn-accent w-full px-5 py-4 rounded-xl text-base md:text-lg font-black uppercase shadow-lg">
                            {isTank ? 'REGISTRAR INGRESO' : 'IMPACTAR PLANILLA'}
                        </button>
                    </div>
                )}

                {modalType === 'service' && !isTank && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-center text-white border-t-8 border-t-yellow-400 shadow-xl">
                            <p className="text-[9px] md:text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-2 md:mb-3 italic">
                                Certificación Service
                            </p>
                            <p className="text-4xl md:text-5xl font-black italic tracking-tighter">
                                HS {activeVehicle?.horometroTotal?.toLocaleString()}
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            <label className="text-[10px] md:text-xs font-black uppercase text-slate-800 ml-2">
                                Checklist de Insumos
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['Aceite 15W40', 'Filtro Aceite', 'Filtro Aire', 'Filtro Comb.', 'Hidráulico', 'Refrigerante'].map(item => (
                                    <button 
                                        key={item} 
                                        onClick={() => setForm(p => ({ 
                                            ...p, 
                                            insumos: p.insumos.includes(item) 
                                                ? p.insumos.filter(i => i !== item) 
                                                : [...p.insumos, item] 
                                        }))} 
                                        className={`px-4 py-2 md:px-5 md:py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase border transition-colors ${
                                            form.insumos.includes(item) 
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                                : 'bg-white text-slate-400 border-slate-200'
                                        }`}
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
                                    onChange={e => setForm(prev => ({...prev, insumoManual: e.target.value}))} 
                                />
                                <button 
                                    onClick={() => { 
                                        if(form.insumoManual) {
                                            setForm(p => ({ 
                                                ...p, 
                                                insumos: [...p.insumos, form.insumoManual.toUpperCase()], 
                                                insumoManual: '' 
                                            })); 
                                        }
                                    }} 
                                    className="px-6 bg-slate-900 text-white rounded-xl font-black text-lg transition-all active:scale-95"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                                    Valor de Factura ($)
                                </label>
                                <input 
                                    type="number" 
                                    className="input-premium px-4 py-3 w-full font-black text-lg text-emerald-600" 
                                    placeholder="0.00" 
                                    onChange={e => setForm(prev => ({...prev, costo: e.target.value}))} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                                    Adjuntar Comprobante
                                </label>
                                <label className="cursor-pointer flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-100 transition-colors">
                                    <Icon name="download" size={16} className={form.adjunto ? "text-emerald-500" : "text-slate-400"}/>
                                    <span className={`text-[10px] font-bold uppercase ${form.adjunto ? "text-emerald-600" : "text-slate-500"}`}>
                                        {form.adjunto ? "ARCHIVO LISTO" : "FOTO / PDF"}
                                    </span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*,application/pdf" 
                                        onChange={e => setForm(prev => ({...prev, adjunto: e.target.files[0]}))} 
                                    />
                                </label>
                            </div>
                        </div>

                        <textarea 
                            className="input-premium px-4 py-3 rounded-xl w-full h-24 md:h-32 text-xs md:text-sm font-bold resize-none" 
                            placeholder="RECOMENDACIONES TÉCNICAS..." 
                            onChange={e => setForm(prev => ({...prev, nota: e.target.value.toUpperCase()}))} 
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
                            <h3 className="text-3xl font-black uppercase italic text-red-600 tracking-tighter">Reportar Evento</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Notificación inmediata al panel.</p>
                        </div>
                        <textarea 
                            className="input-premium px-5 py-4 rounded-xl w-full h-32 md:h-40 text-sm text-red-600 border-red-200 bg-red-50/50 font-bold resize-none" 
                            placeholder="DETALLE O MOTIVO DEL EVENTO..." 
                            onChange={e => setForm(prev => ({...prev, motivo: e.target.value.toUpperCase()}))} 
                        />
                        <button onClick={handleConfirmDowntime} className="btn-premium w-full px-5 py-4 rounded-2xl bg-red-600 text-base md:text-lg font-black uppercase shadow-xl border-b-4 border-b-red-800 active:translate-y-2 transition-all">
                            EMITIR REPORTE
                        </button>
                    </div>
                )}

                {modalType === 'repair_finish' && (
                    <div className="space-y-6 text-center px-4">
                        <div className="w-20 h-20 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-200">
                            <Icon name="check" size={40}/>
                        </div>
                        <h3 className="text-3xl font-black uppercase italic text-emerald-600 tracking-tighter">Evento Resuelto</h3>
                        <textarea 
                            className="input-premium px-5 py-4 rounded-xl w-full h-32 md:h-40 text-sm font-bold resize-none" 
                            placeholder="DETALLE DE LA RESOLUCIÓN..." 
                            onChange={e => setForm(prev => ({...prev, nota: e.target.value.toUpperCase()}))} 
                        />
                        <button onClick={handleRepairSubmit} className="btn-premium w-full px-5 py-4 rounded-2xl bg-emerald-600 text-base md:text-lg font-black uppercase shadow-xl">
                            DAR DE ALTA UNIDAD
                        </button>
                    </div>
                )}

                {modalType === 'historical' && !isTank && (
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 border rounded-xl text-[10px] md:text-xs font-bold text-slate-400 leading-relaxed">
                            Carga de registros históricos. Sincroniza el horómetro total del equipo.
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                type="date" 
                                value={form.fecha} 
                                onChange={e => setForm(prev => ({...prev, fecha: e.target.value}))} 
                            />
                            <input 
                                className="input-premium px-4 py-3 rounded-xl w-full text-xs font-bold" 
                                type="number" 
                                placeholder="HS Totales" 
                                value={form.horas} 
                                onChange={e => setForm(prev => ({...prev, horas: e.target.value}))} 
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
                        <div className="p-6 md:p-8 bg-white rounded-3xl md:rounded-[2rem] shadow-xl border-[6px] border-slate-900" id={`qr-container-${activeVehicleId}`}></div>
                        <p className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-widest">{activeVehicle?.nombre}</p>
                        <button onClick={handlePrintQR} className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black uppercase shadow-xl mt-4">
                            IMPRIMIR ETIQUETA
                        </button>
                    </div>
                )}

                {/* --- MODAL DE VISUALIZACIÓN / EDICIÓN DE EVENTOS DE AUDITORÍA --- */}
                {modalType === 'event_detail' && activeEvent && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 p-6 rounded-3xl text-center text-white shadow-xl border-t-8 border-t-blue-500">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                                Detalle de Registro
                            </p>
                            <h3 className="text-3xl font-black uppercase tracking-tighter">
                                {activeEvent.tipo}
                            </h3>
                            <div className="flex justify-center gap-4 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span><Icon name="calendar" size={12} className="inline mr-1"/> {activeEvent.fecha}</span>
                                <span><Icon name="user" size={12} className="inline mr-1"/> {activeEvent.usuario || 'SISTEMA'}</span>
                            </div>
                        </div>

                        {role === 'admin' ? (
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-center">
                                    Modo Edición (Administrador)
                                </p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Lectura (HS / L)</label>
                                        <input 
                                            type="number" 
                                            className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                            value={form.horas || ''} 
                                            onChange={e => setForm(prev => ({...prev, horas: e.target.value}))} 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Carga Diésel (L)</label>
                                        <input 
                                            type="number" 
                                            className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold" 
                                            value={form.litros || ''} 
                                            onChange={e => setForm(prev => ({...prev, litros: e.target.value}))} 
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Costo Factura ($)</label>
                                    <input 
                                        type="number" 
                                        className="input-premium px-4 py-3 rounded-xl w-full text-sm font-bold text-emerald-600" 
                                        value={form.costo || ''} 
                                        onChange={e => setForm(prev => ({...prev, costo: e.target.value}))} 
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nota / Detalle</label>
                                    <textarea 
                                        className="input-premium px-4 py-3 rounded-xl w-full h-24 text-sm font-bold resize-none" 
                                        value={form.nota || form.motivo || ''} 
                                        onChange={e => setForm(prev => ({
                                            ...prev, 
                                            nota: e.target.value.toUpperCase(), 
                                            motivo: e.target.value.toUpperCase()
                                        }))} 
                                    />
                                </div>

                                <button onClick={handleEditEventSubmit} className="btn-accent w-full px-5 py-4 rounded-xl text-sm font-black uppercase shadow-lg">
                                    ACTUALIZAR REGISTRO
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                            {isTank ? 'Stock' : 'Horómetro'}
                                        </p>
                                        <p className="font-black text-slate-800 text-lg mono">
                                            {activeEvent.horas || '-'} {isTank ? 'L' : 'HS'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                            Movimiento
                                        </p>
                                        <p className="font-black text-slate-800 text-lg mono">
                                            {activeEvent.litros ? `${activeEvent.litros} L` : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                        Costo Financiero
                                    </p>
                                    <p className="font-black text-emerald-600 text-lg mono">
                                        {activeEvent.costo ? `$${parseFloat(activeEvent.costo).toLocaleString()}` : '-'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                        Detalle del Registro
                                    </p>
                                    <p className="font-bold text-slate-700 text-sm leading-relaxed">
                                        {activeEvent.nota || activeEvent.motivo || '-'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeEvent.adjunto && activeEvent.adjunto.data && (
                            <div className="pt-4 border-t border-slate-100">
                                <a 
                                    href={activeEvent.adjunto.data} 
                                    download={activeEvent.adjunto.name || 'Comprobante_BND'} 
                                    className="flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-600 px-5 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 transition-colors shadow-sm"
                                >
                                    <Icon name="download" size={16}/> DESCARGAR COMPROBANTE
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* --- NUEVO: MODAL DE DESGLOSE DE EVENTOS DE MÉTRICAS (GRÁFICO DE TORTA) --- */}
                {modalType === 'category_events' && activeCategoryEvents && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 p-6 rounded-3xl text-center text-white shadow-xl border-t-8 border-t-yellow-400">
                            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">
                                Desglose de Categoría
                            </p>
                            <h3 className="text-3xl font-black uppercase tracking-tighter">
                                {activeCategoryName}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">
                                {activeCategoryEvents.length} registros en total
                            </p>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {(showAllEvents ? activeCategoryEvents : activeCategoryEvents.slice(0, 5)).map((ev, idx) => (
                                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-black text-xs uppercase text-slate-800">{ev.vehiculoNombre}</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{ev.companyNombre}</p>
                                        </div>
                                        <span className="font-bold text-slate-400 text-xs">{ev.fecha}</span>
                                    </div>
                                    <div className="flex justify-between items-end mt-1">
                                        <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                                            {ev.nota || ev.motivo || '-'}
                                        </span>
                                        <span className={`font-black text-sm ${ev.costo ? 'text-emerald-600' : 'text-slate-800'}`}>
                                            {ev.costo ? `$${parseFloat(ev.costo).toLocaleString()}` : (ev.litros ? `${ev.litros} L` : `${ev.horas || 0} HS`)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!showAllEvents && activeCategoryEvents.length > 5 && (
                            <button 
                                onClick={() => setShowAllEvents(true)}
                                className="w-full py-3 bg-white text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm"
                            >
                                Ver los {activeCategoryEvents.length - 5} restantes...
                            </button>
                        )}

                        <button 
                            onClick={() => exportEventsToCSV(activeCategoryEvents, activeCategoryName)}
                            className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black uppercase shadow-lg flex items-center justify-center gap-3"
                        >
                            <Icon name="download" size={16}/> EXPORTAR A EXCEL
                        </button>
                    </div>
                )}

            </div>
        </ModalComp>
    );
};

window.AppModals = AppModals;
