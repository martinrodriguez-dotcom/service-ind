/**
 * App.js
 */
const { useState, useMemo, useEffect } = React;
const { 
  LayoutDashboard, Building2, Plus, AlertTriangle, Truck, 
  CheckCircle2, Wrench, Activity, ChevronLeft, Clock, Hash 
} = lucide;

const App = () => {
    const [companies, setCompanies] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedCompany, setSelectedCompany] = useState(null);

    useEffect(() => {
        if (window.firestoreService) {
            const unsubscribe = window.firestoreService.subscribeToCompanies((data) => {
                setCompanies(data);
            });
            return () => unsubscribe();
        }
    }, []);

    const alerts = useMemo(() => {
        let all = [];
        companies.forEach(c => {
            (c.vehiculos || []).forEach(v => {
                const hsRestantes = 250 - (v.horometroTotal - v.ultimoServiceHoras);
                if (hsRestantes < 50) {
                    all.push({ ...v, empresaNombre: c.nombre, hsRestantes });
                }
            });
        });
        return all;
    }, [companies]);

    return (
        <div className="flex min-h-screen bg-slate-950 text-white">
            <aside className="w-64 border-r border-slate-900 p-6 flex flex-col gap-6">
                <div className="flex items-center gap-3 text-orange-600">
                    <Wrench size={30} />
                    <span className="text-white font-black text-xl uppercase">ServicePro</span>
                </div>
                <nav className="space-y-2">
                    <button onClick={() => {setActiveTab('dashboard'); setSelectedCompany(null);}} 
                        className={`w-full p-4 rounded-xl flex items-center gap-3 font-bold ${activeTab === 'dashboard' ? 'bg-orange-600' : 'text-slate-500'}`}>
                        <LayoutDashboard size={20}/> Dashboard
                    </button>
                    <button onClick={() => {setActiveTab('companies'); setSelectedCompany(null);}} 
                        className={`w-full p-4 rounded-xl flex items-center gap-3 font-bold ${activeTab === 'companies' ? 'bg-orange-600' : 'text-slate-500'}`}>
                        <Building2 size={20}/> Empresas
                    </button>
                </nav>
            </aside>

            <main className="flex-1 p-10 overflow-y-auto">
                {activeTab === 'dashboard' && (
                    <div className="max-w-4xl mx-auto space-y-8">
                        <h2 className="text-5xl font-black">Alertas</h2>
                        <div className="grid gap-4">
                            {alerts.map((a, i) => (
                                <div key={i} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center">
                                    <div>
                                        <p className="text-2xl font-black">{a.nombre}</p>
                                        <p className="text-slate-500 font-bold uppercase text-xs">{a.empresaNombre}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-orange-500">{a.hsRestantes.toFixed(0)} HS</p>
                                    </div>
                                </div>
                            ))}
                            {alerts.length === 0 && <p className="text-slate-600 italic">No hay alertas críticas.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'companies' && !selectedCompany && (
                    <div className="max-w-4xl mx-auto space-y-8">
                        <h2 className="text-5xl font-black">Directorio</h2>
                        <div className="grid grid-cols-2 gap-6">
                            {companies.map(emp => (
                                <button key={emp.id} onClick={() => setSelectedCompany(emp)} 
                                    className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-left hover:border-orange-600 transition-all">
                                    <h3 className="text-3xl font-black mb-2">{emp.nombre}</h3>
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Equipos: {emp.vehiculos?.length || 0}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// ASIGNACIÓN GLOBAL EXPLÍCITA
window.App = App;
