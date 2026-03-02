/**
 * GENERADOR DE EXPEDIENTES TÉCNICOS EN PDF
 * Utiliza jsPDF y AutoTable para reportes industriales.
 */

import { SERVICE_INTERVAL_DEFAULT } from './maintenanceLogic';

export const downloadVehiclePDF = (company, vehicle) => {
  if (!window.jspdf) {
    console.error("Librería jsPDF no cargada");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Cálculos para el reporte
  const hsConsumidas = vehicle.horometroTotal - vehicle.ultimoServiceHoras;
  const hsRestantes = Math.max(0, SERVICE_INTERVAL_DEFAULT - hsConsumidas);
  const progress = (hsRestantes / SERVICE_INTERVAL_DEFAULT) * 100;

  // --- CABECERA ESTILO INDUSTRIAL ---
  doc.setFillColor(33, 37, 41);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("EXPEDIENTE TÉCNICO INDUSTRIAL", 15, 20);
  doc.setFontSize(10);
  doc.text(`ServicePro EAM - Generado el: ${new Date().toLocaleDateString()}`, 15, 30);

  // --- DATOS DEL ACTIVO ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("Datos del Activo", 15, 55);
  doc.line(15, 57, 195, 57);

  doc.setFontSize(10);
  doc.text(`Empresa: ${company.nombre}`, 15, 65);
  doc.text(`CUIT: ${company.cuit}`, 15, 71);
  doc.text(`Vehículo: ${vehicle.nombre}`, 110, 65);
  doc.text(`ID Interno: #${vehicle.id}`, 110, 71);

  doc.setFontSize(12);
  doc.text(`Estado Operativo: ${progress.toFixed(1)}% de vida útil restante`, 15, 95);

  // --- TABLA DE EVENTOS (HISTORIAL) ---
  const tableData = [...vehicle.eventos].reverse().map(ev => [
    ev.fecha,
    ev.tipo,
    ev.horas || '--',
    ev.tipo === 'SERVICE' ? `$${ev.costo?.toLocaleString()}` : ev.tipo === 'REGISTRO' ? `${ev.litros} L` : '--',
    ev.tipo === 'SERVICE' ? ev.insumos.join(', ') : ev.motivo || ev.nota || '--'
  ]);

  doc.autoTable({
    startY: 110,
    head: [['Fecha', 'Tipo', 'Horas', 'Costo/Carga', 'Detalles']],
    body: tableData,
    headStyles: { fillColor: [33, 37, 41] },
    styles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // --- PIE DE PÁGINA ---
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount} - Documento Oficial ServicePro`, 15, 285);
  }

  doc.save(`Ficha_${vehicle.nombre.replace(/\s+/g, '_')}.pdf`);
};
