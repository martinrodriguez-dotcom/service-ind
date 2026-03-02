// --- ACCESO A LIBRERÍAS ---
const { useState } = React;
const { X, Plus, Truck, Building2, Clock, Hash, AlertTriangle, Save } = lucide;

// --- COMPONENTES DE FORMULARIO ---
const Forms = {
    Modal: ({ title, onClose, children, darkMode }) => (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] shadow-2xl ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-2xl font-black">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X/></button>
                </div>
                <div className="p-8">{children}</div>
            </div>
        </div>
    ),

    CompanyFormContent: ({ onSubmit, darkMode }) => {
        const [form, setForm] = useState({ nombre: '', cuit: '', responsable: '' });
        return (
            <div className="space-y-6">
                <input className="w-full p-4 rounded-2xl bg-slate-800 border-none outline-none font-bold" 
                    placeholder="Nombre de la Empresa" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                <input className="w-full p-4 rounded-2xl bg-slate-800 border-none outline-none font-bold" 
                    placeholder="CUIT" value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} />
                <button onClick={() => onSubmit(form)} className="w-full p-5 bg-orange-600 rounded-2xl font-black uppercase shadow-lg">Registrar Empresa</button>
            </div>
        );
    },

    VehicleFormContent: ({ onSubmit, darkMode }) => {
        const [form, setForm] = useState({ nombre: '', horometroInicial: '' });
        return (
            <div className="space-y-6">
                <input className="w-full p-4 rounded-2xl bg-slate-800 border-none outline-none font-bold" 
                    placeholder="Modelo del Equipo (Ej: CAT 320)" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                <input className="w-full p-4 rounded-2xl bg-slate-800 border-none outline-none font-bold" type="number"
                    placeholder="Horómetro Inicial" value={form.horometroInicial} onChange={e => setForm({...form, horometroInicial: e.target.value})} />
                <button onClick={() => onSubmit(form)} className="w-full p-5 bg-orange-600 rounded-2xl font-black uppercase">Vincular Equipo</button>
            </div>
        );
    }
};

// --- REGISTRO GLOBAL ---
window.GuantesForms = Forms;
