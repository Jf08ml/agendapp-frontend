import * as XLSX from 'xlsx';
import { Service } from '../../../../services/serviceService';

/**
 * Exporta servicios a un archivo Excel
 * Compatible con el sistema de bulk upload
 */
export const exportServicesToExcel = (services: Service[], organizationName: string = "Organización") => {
  // Preparar datos para Excel
  const data = services.map((service) => ({
    "ID": service._id, // ← ID para actualización
    "Nombre del Servicio": service.name,
    "Tipo": service.type,
    "Descripción": service.description || "",
    "Duración (minutos)": service.duration,
    "Precio": service.price,
    "Citas Simultáneas": service.maxConcurrentAppointments || 1,
    "Activo": service.isActive ? "Sí" : "No",
    "Imágenes (URLs)": service.images?.join("; ") || "",
  }));

  // Si no hay servicios, crear plantilla vacía con ejemplo
  if (data.length === 0) {
    data.push({
      "ID": "(dejar vacío para crear nuevo)",
      "Nombre del Servicio": "Ejemplo: Corte de cabello",
      "Tipo": "Ejemplo: Cortes",
      "Descripción": "Descripción del servicio",
      "Duración (minutos)": 30,
      "Precio": 25000,
      "Citas Simultáneas": 1,
      "Activo": "Sí",
      "Imágenes (URLs)": "",
    });
  }

  // Crear workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Ajustar ancho de columnas
  worksheet["!cols"] = [
    { wch: 24 },  // ID
    { wch: 25 },  // Nombre
    { wch: 15 },  // Tipo
    { wch: 30 },  // Descripción
    { wch: 18 },  // Duración
    { wch: 12 },  // Precio
    { wch: 16 },  // Citas Simultáneas
    { wch: 10 },  // Activo
    { wch: 40 },  // Imágenes
  ];

  // Estilos para la fila de encabezados
  const headerStyle = {
    font: { bold: true, color: "FFFFFF" },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  };

  // Aplicar estilos a encabezados
  for (let i = 0; i < 9; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!worksheet[cellRef]) continue;
    worksheet[cellRef].s = headerStyle;
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, "Servicios");

  // Descargar
  const filename = `servicios_${organizationName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Crea una plantilla vacía para nuevos servicios
 */
export const downloadEmptyTemplate = (organizationName: string = "Organización") => {
  exportServicesToExcel([], organizationName);
};

