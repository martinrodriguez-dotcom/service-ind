/**
 * Forms.js - Componentes de Interfaz de Usuario
 * Registra los formularios en el objeto global window.GuantesForms
 */

const { useState } = React;
const { X, Plus, Truck, Building2, Clock, Hash, AlertTriangle, Save, User, Smartphone } = lucide;

window.GuantesForms = {
    // 1. Contenedor de Modal Estilizado
    Modal: ({ title, onClose, children, darkMode = true }) => (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Overlay con desenfoque */}
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
            
            {/* Ventana del Modal */}
            <div className={`relative w-full max-w-xl overflow-hidden rounded-[3rem] border-2 shadow-2xl transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
                <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-3xl font-black tracking-tighter uppercase italic">{title}</h3>
                    <button onClick={onClose} className="p-3 hover:bg-red-600 hover:text-white rounded-2xl transition-all">
                        <X size={24}/>
                    </button>
                </div>
                <div className="p-10">
                    {children}
                </div>
            </div>
        </div>
    ),

    // 2. Formulario para Nueva Empresa
    CompanyFormContent: ({ onSubmit }) => {
        const [form, setForm] = useState({ nombre: '', cuit: '', responsable: '' });

        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 ml-4">Razón Social</label>
                    <div className="relative">
                        <Building2 className="absolute left-5 top-5 text-slate-500" size={20}/>
                        <input className="w-full p-5 pl-14 rounded-2xl bg-slate-950 border border-slate-800 outline-none focus:border-orange-600 font-bold transition-all" 
                            placeholder="Ej: Constructora del Sur" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">CUIT</label>
                        <div className="relative">
                            <Hash className="absolute left-5 top-5 text-slate-500" size={18}/>
                            <input className="w-full p-5 pl-14 rounded-2xl bg-slate-950 border border-slate-800 outline-none focus:border-orange-600 font-bold" 
                                placeholder="30-..." value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">Responsable</label>
                        <div className="relative">
                            <User className="absolute left-5 top-5 text-slate-500" size={18}/>
                            <input className="w-full p-5 pl-14 rounded-2xl bg-slate-950 border border-slate-800 outline-none focus:border-orange-600 font-bold" 
                                placeholder="Nombre" value={form.responsable} onChange={e => setForm({...form, responsable: e.target.value})} />
                        </div>
                    </div>
                </div>

                <button onClick={() => onSubmit(form)} 
                    className="w-full p-6 bg-orange-600 hover:bg-orange-500 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-orange-900/40 transition-all flex items-center justify-center gap-3">
                    <Save size={20}/> Guardar Empresa
                </button>
            </div>
        );
    },

    // 3. Formulario para Nuevo Vehículo/Equipo
    VehicleFormContent: ({ onSubmit }) => {
        const [form, setForm] = useState({ nombre: '', horometroInicial: '' });

        return (
            <div className="space-y-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 ml-4">Identificación del Equipo</label>
                    <div className="relative">
                        <Truck className="absolute left-5 top-5 text-slate-500" size={20}/>
                        <input className="w-full p-5 pl-14 rounded-2xl bg-slate-950 border border-slate-800 outline-none focus:border-orange-600 font-bold" 
                            placeholder="Ej: Excavadora CAT 320 - Int 05" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">Horas Actuales de Máquina</label>
                    <div className="relative">
                        <Clock className="absolute left-5 top-5 text-slate-500" size={20}/>
                        <input className="w-full p-5 pl-14 rounded-2xl bg-slate-950 border border-slate-800 outline-none focus:border-orange-600 font-bold" type="number"
                            placeholder="0.00" value={form.horometroInicial} onChange={e => setForm({...form, horometroInicial: e.target.value})} />
                    </div>
                </div>

                <div className="p-6 bg-orange-600/10 rounded-[2rem] border border-orange-600/20 flex gap-4">
                    <AlertTriangle className="text-orange-600 shrink-0" size={24}/>
                    <p className="text-[11px] font-bold text-orange-200/60 leading-relaxed italic">
                        El sistema generará la primera alerta de service automáticamente al alcanzar las 250 horas adicionales desde este valor inicial.
                    </p>
                </div>

                <button onClick={() => onSubmit(form)} 
                    className="w-full p-6 bg-orange-600 hover:bg-orange-500 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-orange-900/40 transition-all">
                    Registrar Equipo en Flota
                </button>
            </div>
        );
    }
};
