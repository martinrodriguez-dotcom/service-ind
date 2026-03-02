/**
 * Lógica de Negocio para Mantenimiento Industrial
 * Maneja cálculos de vida útil, alertas y proyecciones.
 */

export const SERVICE_INTERVAL_DEFAULT = 250; 
export const ALERT_THRESHOLD_PERCENT = 10; 

// Calcula el estado de alertas de toda la flota
export const calculateAlerts = (companies) => {
  let list = [];
  
  companies.forEach(emp => {
    if (!emp.vehiculos) return;

    emp.vehiculos.forEach(veh => {
      const hsConsumidas = veh.horometroTotal - veh.ultimoServiceHoras;
      const hsRestantes = Math.max(0, SERVICE_INTERVAL_DEFAULT - hsConsumidas);
      const progressPercent = (hsRestantes / SERVICE_INTERVAL_DEFAULT) * 100;
      
      // Lógica de proyección de fecha estimada
      const regs = (veh.eventos || [])
        .filter(e => e.tipo === 'REGISTRO')
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        
      let diasRestantesStr = "---";
      
      if (regs.length >= 2) {
        const first = regs[0];
        const last = regs[regs.length - 1];
        const diffHs = last.horas - first.horas;
        const diffDays = Math.max(1, (new Date(last.fecha) - new Date(first.fecha)) / (1000 * 60 * 60 * 24));
        const avgHsPerDay = diffHs / diffDays;

        if (avgHsPerDay > 0 && hsRestantes > 0) {
          const estDate = new Date();
          estDate.setDate(estDate.getDate() + Math.ceil(hsRestantes / avgHsPerDay));
          diasRestantesStr = estDate.toLocaleDateString();
        }
      }

      // Si el porcentaje es crítico o el equipo está parado por avería, disparamos alerta
      if (progressPercent <= ALERT_THRESHOLD_PERCENT || !veh.operativo) {
        list.push({ 
          empresaId: emp.id,
          empresaNombre: emp.nombre, 
          vehiculoId: veh.id,
          vehiculoNombre: veh.nombre, 
          progress: progressPercent,
          estDate: diasRestantesStr,
          operativo: veh.operativo,
          motivo: veh.motivoBaja,
          hsRestantes: hsRestantes
        });
      }
    });
  });
  
  return list;
};

// Helper para colores de UI según criticidad
export const getVidaUtilColor = (p) => {
  if (p >= 85) return 'bg-emerald-500 shadow-emerald-500/20';
  if (p >= 50) return 'bg-orange-500 shadow-orange-500/20';
  return 'bg-red-600 shadow-red-500/20';
};
