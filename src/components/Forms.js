// --- ACCESO A LIBRERÍAS GLOBALES ---
const { useState } = React;
const { X, DollarSign, Fuel, Wrench, CheckCircle2, AlertCircle, QrCode, Info, Truck, Clock, User, Hash } = lucide;

// --- COMPONENTES BASE DE ESTILO "GUANTES UI" ---

export const Modal = ({ title, onClose, children, darkMode }) => (
  <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative w-full max-w-2xl max-h-[92vh] overflow-y-auto sm:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 duration-300 ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      <div className={`p-6 border-b sticky top-0 z-10 flex justify-between items-center ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100'}`}>
        <h3 className="text-2xl font-black tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:rotate-90 transition-transform"><X size={24}/></button>
      </div>
      <div className="p-6 sm:p-10">{children}</div>
    </div>
  </div>
);

export const GuantesInput = ({ darkMode, ...props }) => (
  <input {...props} className={`w-full p-5 sm:p-4 rounded-2xl border-2 transition-all font-bold text-lg outline-none ${darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-orange-500' : 'bg-white border-slate-100 focus:border-orange-600 text-slate-900'}`} />
);

export const GuantesButton = ({ children, onClick, variant = "primary", disabled = false, type = "button", darkMode }) => {
  const styles = {
    primary: "bg-orange-600 text-white shadow-lg shadow-orange-900/20 hover:bg-orange-700",
    secondary: darkMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-slate-900 text-white hover:bg-slate-800",
    outline: darkMode ? "border-2 border-slate-700 text-slate-300" : "border-2 border-slate-200 text-slate-600 hover:border-orange-500",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20"
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${styles[variant]} p-5 sm:p-4 rounded-3xl font-black text-lg active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 w-full`}>
      {children}
    </button>
  );
};

// --- FORMULARIOS ESPECÍFICOS ---

export const ServiceFormContent = ({ onSubmit, darkMode }) => {
  const [form, setForm] = useState({ tecnico: '', costo: '', selectedItems: [] });
  const items = ['Filtro Aceite', 'Filtro Aire', 'Filtro Combustible', 'Aceite Motor', 'Engrase Total', 'Hidráulico'];
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Operario Responsable</label>
        <GuantesInput darkMode={darkMode} value={form.tecnico} onChange={e => setForm({...form, tecnico: e.target.value})} placeholder="Nombre del Mecánico" />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Costo Total (AR$)</label>
        <div className="relative">
           <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600" size={24}/>
           <GuantesInput darkMode={darkMode} type="number" value={form.costo} onChange={e => setForm({...form, costo: e.target.value})} placeholder="0.00" style={{paddingLeft: '3.5rem'}} />
        </div>
      </div>
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Insumos Reemplazados</label>
        <div className="grid grid-cols-2 gap-3">
          {items.map(item => (
            <button key={item} onClick={() => setForm(f => ({...f, selectedItems: f.selectedItems.includes(item) ? f.selectedItems.filter(i => i !== item) : [...f.selectedItems, item]}))} className={`p-6 rounded-3xl border-2 font-black text-xs uppercase tracking-tight transition-all ${form.selectedItems.includes(item) ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <GuantesButton darkMode={darkMode} disabled={!form.tecnico} onClick={() => onSubmit({ tecnico: form.tecnico, insumos: form.selectedItems, costo: form.costo })}>CERTIFICAR SERVICE</GuantesButton>
    </div>
  );
};

export const DowntimeFormContent = ({ onSubmit, darkMode }) => {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Describa la anomalía técnica</label>
        <textarea required value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Pérdida de presión en bomba hidráulica..." className={`w-full p-8 rounded-[2rem] border-2 font-black text-lg outline-none transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-red-600' : 'bg-slate-50 border-slate-100 focus:border-red-600'}`} rows="5" />
      </div>
      <GuantesButton darkMode={darkMode} variant="danger" disabled={!motivo} onClick={() => onSubmit(motivo)}>INFORMAR PARADA TÉCNICA</GuantesButton>
    </div>
  );
};

export const LogFormContent = ({ onSubmit, darkMode }) => {
  const [horas, setHoras] = useState('');
  const [litros, setLitros] = useState('');
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Horómetro Actual</label>
        <GuantesInput darkMode={darkMode} type="number" value={horas} onChange={e => setHoras(e.target.value)} placeholder="0000.0" style={{textAlign: 'center', fontSize: '2.5rem', height: '100px'}} />
      </div>
      <div className="space-y-2 text-center">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Combustible (Litros)</label>
        <GuantesInput darkMode={darkMode} type="number" value={litros} onChange={e => setLitros(e.target.value)} placeholder="0" style={{textAlign: 'center', fontSize: '2.5rem', height: '100px'}} />
      </div>
      <GuantesButton darkMode={darkMode} disabled={!horas || !litros} onClick={() => onSubmit({ horas, litros })}>GUARDAR DATOS DIARIOS</GuantesButton>
    </div>
  );
};

export const CompanyFormContent = ({ onSubmit, darkMode }) => {
  const [form, setForm] = useState({ nombre: '', cuit: '', mail: '', tel: '', responsable: '', observaciones: '' });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre / Razón Social</label><GuantesInput darkMode={darkMode} value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Techint S.A." /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">CUIT</label><GuantesInput darkMode={darkMode} value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} placeholder="30123456789" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Mail</label><GuantesInput darkMode={darkMode} type="email" value={form.mail} onChange={e => setForm({...form, mail: e.target.value})} placeholder="admin@empresa.com" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">WhatsApp</label><GuantesInput darkMode={darkMode} value={form.tel} onChange={e => setForm({...form, tel: e.target.value})} placeholder="+54 9..." /></div>
      </div>
      <GuantesButton darkMode={darkMode} disabled={!form.nombre || !form.cuit} onClick={() => onSubmit(form)}>REGISTRAR EMPRESA</GuantesButton>
    </div>
  );
};

export const VehicleFormContent = ({ onSubmit, darkMode }) => {
  const [form, setForm] = useState({ nombre: '', horometroInicial: '' });
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Modelo del Activo</label>
        <GuantesInput darkMode={darkMode} value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: CAT 320 GC" style={{textAlign: 'center'}} />
      </div>
      <div className="space-y-2 text-center">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Horas de Inicio</label>
        <GuantesInput darkMode={darkMode} type="number" value={form.horometroInicial} onChange={e => setForm({...form, horometroInicial: e.target.value})} placeholder="0" style={{textAlign: 'center', fontSize: '2.5rem', height: '100px'}} />
      </div>
      <GuantesButton darkMode={darkMode} disabled={!form.nombre || !form.horometroInicial} onClick={() => onSubmit(form)}>VINCULAR EQUIPO</GuantesButton>
    </div>
  );
};
