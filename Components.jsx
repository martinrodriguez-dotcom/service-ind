const Icon = window.Icon;

// --- COMPONENTE MODAL PREMIUM (Actualizado con Bloqueo) ---
const ModalComp = ({ title, onClose, hideClose = false, children }) => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in leading-none">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50 leading-none">
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight uppercase leading-none italic">{title}</h3>
                {!hideClose && (
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 leading-none">
                        <Icon name="x" size={20} />
                    </button>
                )}
            </div>
            <div className="p-10 max-h-[85vh] overflow-y-auto leading-relaxed">
                {children}
            </div>
        </div>
    </div>
);

// --- COMPONENTE TANQUE DE COMBUSTIBLE VISUAL ---
const FuelTankCapsule = ({ capacity, current }) => {
    const perc = capacity > 0 ? Math.max(0, Math.min(100, (current / capacity) * 100)) : 0;
    let color = "#10b981"; if (perc <= 50) color = "#f59e0b"; if (perc <= 25) color = "#ef4444"; 
    return (
        <div className="flex flex-col items-center gap-1.5 leading-none">
            <div className="fuel-tank-container">
                <svg viewBox="0 0 140 80" className="w-full h-full">
                    <defs>
                        <linearGradient id="tankGradPremiumModular" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                            <stop offset="100%" stopColor={color} stopOpacity="1" />
                        </linearGradient>
                    </defs>
                    <rect x="10" y="10" width="120" height="60" rx="30" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                    <clipPath id="tankClipModular">
                        <rect x="10" y={70 - (perc * 0.6)} width="120" height={perc * 0.6} rx="2" />
                    </clipPath>
                    <rect x="10" y="10" width="120" height="60" rx="30" fill="url(#tankGradPremiumModular)" clipPath="url(#tankClipModular)" />
                    <text x="70" y="45" textAnchor="middle" className="font-bold text-[12px] mono" fill={perc < 45 ? "#64748b" : "white"}>
                        {perc.toFixed(0)}%
                    </text>
                </svg>
            </div>
            <span className="text-[9px] font-bold uppercase text-slate-400 italic tracking-widest leading-none">
                {Math.floor(current).toLocaleString()} L
            </span>
        </div>
    );
};

window.ModalComp = ModalComp;
window.FuelTankCapsule = FuelTankCapsule;
