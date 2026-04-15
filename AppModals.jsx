const { React } = window;
const { Icon, ModalComp } = window;

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
    refillTank, 
    chartRef
}) => {
    
    if (!modalType) return null;

    return (
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
                            <p className="text-[9px] md:text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-2 md:mb-3 italic">Certificación Service</p>
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
                        <div className="p-6 md:p-8 bg-white rounded-3xl md:rounded-[2rem] shadow-xl border-[6px] border-slate-900" id={`qr-container-${activeVehicleId}`}></div>
                        <p className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-widest">{activeVehicle?.nombre}</p>
                        <button onClick={handlePrintQR} className="btn-premium w-full px-5 py-4 rounded-xl text-sm font-black uppercase shadow-xl mt-4">
                            IMPRIMIR ETIQUETA
                        </button>
                    </div>
                )}

                {modalType === 'details' && (
                    <div className="space-y-8 w-full max-w-2xl mx-auto">
                        <div className="bg-slate-900 p-8 md:p-10 rounded-[2rem] flex flex-col sm:flex-row justify-between items-center gap-6 border-l-[12px] border-l-yellow-400 shadow-2xl">
                            <div className="text-center sm:text-left w-full">
                                <p className="text-[10px] font-black text-yellow-400 uppercase mb-2 tracking-widest italic">Stock Depósito Central</p>
                                <p className="text-4xl md:text-5xl font-black text-white mono">
                                    {(activeCompany?.currentFuel || 0).toLocaleString()} <span className="text-base opacity-30">L</span>
                                </p>
                            </div>
                            {role === 'admin' && (
                                <button 
                                    onClick={() => { if(confirm("¿Cargar depósito al 100%?")) refillTank(); }} 
                                    className="btn-accent px-8 py-4 rounded-xl text-xs font-black w-full sm:w-auto shadow-lg shadow-yellow-400/20"
                                >
                                    CARGAR
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            <p className="text-[10px] md:text-xs font-black uppercase italic text-slate-400 ml-2 tracking-widest">Consumo Proyectado (Mensual)</p>
                            <div className="glass-card p-4 md:p-6 bg-white w-full">
                                <canvas ref={chartRef}></canvas>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ModalComp>
    );
};

window.AppModals = AppModals;
