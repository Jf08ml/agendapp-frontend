/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import {
  Modal,
  Button,
  Group,
  Text,
  FileButton,
  Stack,
  Alert,
  Progress,
  Table,
  ScrollArea,
  Badge,
  Box,
  Card,
  List,
  ThemeIcon,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  IconUpload,
  IconFileSpreadsheet,
  IconDownload,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconInfoCircle,
} from "@tabler/icons-react";
import * as XLSX from "xlsx";
import { bulkUploadServices } from "../../../../services/serviceService";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";

interface BulkUploadModalProps {
  opened: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface ServiceRow {
  _id?: string; // Para actualizar servicios existentes
  name: string;
  type?: string;
  description?: string;
  price: number;
  duration: number;
  hidePrice?: boolean;
  maxConcurrentAppointments?: number;
  isActive?: boolean; // Para parsear desde Excel
}

interface UploadResult {
  success: Array<{ 
    row: number; 
    name: string; 
    price: number; 
    duration: number;
    action?: string; // "CREADO" o "ACTUALIZADO"
  }>;
  errors: Array<{ row: number; name: string; error: string }>;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
  created?: number; // Nuevos servicios creados
  updated?: number; // Servicios actualizados
}

export default function BulkUploadModal({
  opened,
  onClose,
  onUploadComplete,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ServiceRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const resetRef = useRef<() => void>(null);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        // Mapear y validar datos
        const services: ServiceRow[] = jsonData.map((row: any) => ({
          _id: row.ID || row.id || row._id || undefined, // Leer ID de la primera columna
          name: row["Nombre del Servicio"] || row.Nombre || row.nombre || row.Name || row.name || "",
          type: row.Tipo || row.tipo || row.Type || row.type || "",
          description: row.Descripción || row.descripcion || row.Description || row.description || "",
          price: parseFloat(row.Precio || row.precio || row.Price || row.price || 0),
          duration: parseInt(row["Duración (minutos)"] || row.Duración || row.duracion || row.Duration || row.duration || 0),
          hidePrice: row["Ocultar Precio"] === "Sí" || row["Ocultar Precio"] === "Si" || row.hidePrice === true,
          maxConcurrentAppointments: parseInt(row["Citas Simultáneas"] || row["Citas Concurrentes"] || row.maxConcurrentAppointments || 1),
          isActive: row.Activo === "Sí" || row.Activo === "Si" || row.isActive === true,
        }));

        setParsedData(services);

        if (services.length === 0) {
          showNotification({
            title: "Archivo vacío",
            message: "El archivo no contiene datos válidos",
            color: "yellow",
          });
        }
      } catch (error) {
        showNotification({
          title: "Error al leer el archivo",
          message: "No se pudo procesar el archivo Excel",
          color: "red",
        });
        console.error(error);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (!organizationId) {
      showNotification({
        title: "Error",
        message: "No se pudo obtener el ID de la organización",
        color: "red",
      });
      return;
    }

    if (parsedData.length === 0) {
      showNotification({
        title: "Sin datos",
        message: "No hay datos para cargar",
        color: "yellow",
      });
      return;
    }

    setUploading(true);
    try {
      const result = await bulkUploadServices(parsedData, organizationId);
      setUploadResult(result);

      if (result.totalSuccess > 0) {
        const createdCount = result.created || 0;
        const updatedCount = result.updated || 0;
        let message = `Se procesaron ${result.totalSuccess} servicios exitosamente`;
        
        if (createdCount > 0 && updatedCount > 0) {
          message = `${createdCount} creados, ${updatedCount} actualizados`;
        } else if (createdCount > 0) {
          message = `Se crearon ${createdCount} servicios`;
        } else if (updatedCount > 0) {
          message = `Se actualizaron ${updatedCount} servicios`;
        }

        showNotification({
          title: "Carga completada",
          message: message,
          color: "green",
        });
        onUploadComplete();
      }

      if (result.totalErrors > 0) {
        showNotification({
          title: "Errores detectados",
          message: `${result.totalErrors} registros no pudieron ser procesados`,
          color: "orange",
        });
      }
    } catch (error) {
      showNotification({
        title: "Error en la carga",
        message: "Ocurrió un error al procesar los servicios",
        color: "red",
      });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        ID: "(dejar vacío para crear nuevo)",
        "Nombre del Servicio": "Corte de Cabello",
        Tipo: "Barbería",
        Descripción: "Corte de cabello clásico",
        "Duración (minutos)": 30,
        Precio: 15000,
        "Citas Simultáneas": 1,
        Activo: "Sí",
        "Imágenes (URLs)": "",
      },
      {
        ID: "(dejar vacío para crear nuevo)",
        "Nombre del Servicio": "Manicure",
        Tipo: "Belleza",
        Descripción: "Manicure completo con esmaltado",
        "Duración (minutos)": 45,
        Precio: 25000,
        "Citas Simultáneas": 2,
        Activo: "Sí",
        "Imágenes (URLs)": "",
      },
      {
        ID: "(dejar vacío para crear nuevo)",
        "Nombre del Servicio": "Consulta Médica",
        Tipo: "Salud",
        Descripción: "Consulta médica general",
        "Duración (minutos)": 20,
        Precio: 50000,
        "Citas Simultáneas": 1,
        Activo: "No",
        "Imágenes (URLs)": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    
    // Agregar nota informativa
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const noteRow = range.e.r + 2;
    
    worksheet[XLSX.utils.encode_cell({ r: noteRow, c: 0 })] = {
      v: "NOTA: Nombre, Precio y Duración son obligatorios. La duración se especifica en minutos. Deja el ID vacío para crear nuevos servicios, o copia el ID de servicios existentes para actualizarlos.",
      t: "s"
    };
    
    // Actualizar rango
    if (worksheet['!ref']) {
      const newRange = XLSX.utils.decode_range(worksheet['!ref']);
      newRange.e.r = noteRow;
      worksheet['!ref'] = XLSX.utils.encode_range(newRange);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Servicios");
    XLSX.writeFile(workbook, "plantilla_servicios.xlsx");
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setUploadResult(null);
    resetRef.current?.();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Carga Masiva de Servicios"
      size="xl"
      styles={{
        body: { maxHeight: "70vh", overflowY: "auto" },
      }}
    >
      <Stack gap="md">
        {/* Instrucciones y plantilla */}
        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          <Text size="sm" fw={500} mb="xs">
            Instrucciones para la carga:
          </Text>
          <List size="sm" spacing="xs">
            <List.Item>
              Descarga la plantilla de Excel y completa los datos de tus servicios
            </List.Item>
            <List.Item>
              <strong>Nombre</strong>, <strong>Precio</strong> y <strong>Duración</strong> son campos obligatorios
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="green" size={20} radius="xl" variant="light">
                  <IconInfoCircle size={14} />
                </ThemeIcon>
              }
            >
              La <strong>Duración</strong> se especifica en <strong>minutos</strong>
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="blue" size={20} radius="xl" variant="light">
                  <IconInfoCircle size={14} />
                </ThemeIcon>
              }
            >
              <strong>Para actualizar servicios existentes:</strong> Descarga los servicios actuales, copia el ID en la columna ID y haz los cambios deseados
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="purple" size={20} radius="xl" variant="light">
                  <IconInfoCircle size={14} />
                </ThemeIcon>
              }
            >
              <strong>Para crear nuevos servicios:</strong> Deja la columna ID vacía
            </List.Item>
            <List.Item>Tipo, Descripción e Imágenes son opcionales</List.Item>
          </List>
        </Alert>

        <Button
          leftSection={<IconDownload size={16} />}
          variant="light"
          onClick={handleDownloadTemplate}
          fullWidth
        >
          Descargar Plantilla Excel
        </Button>

        {/* Selector de archivo */}
        <Card withBorder p="md">
          <Stack gap="sm">
            <FileButton
              resetRef={resetRef}
              onChange={handleFileSelect}
              accept=".xlsx,.xls"
            >
              {(props) => (
                <Button
                  {...props}
                  leftSection={<IconFileSpreadsheet size={16} />}
                  variant="outline"
                  fullWidth
                >
                  {file ? file.name : "Seleccionar archivo Excel"}
                </Button>
              )}
            </FileButton>

            {parsedData.length > 0 && !uploadResult && (
              <Group justify="space-between">
                <Badge color="blue" size="lg">
                  {parsedData.length} registros detectados
                </Badge>
                <Button
                  onClick={handleUpload}
                  loading={uploading}
                  leftSection={<IconUpload size={16} />}
                  color="green"
                >
                  Cargar Servicios
                </Button>
              </Group>
            )}
          </Stack>
        </Card>

        {/* Barra de progreso */}
        {uploading && (
          <Box>
            <Text size="sm" mb="xs">
              Procesando servicios...
            </Text>
            <Progress value={100} animated />
          </Box>
        )}

        {/* Resultados */}
        {uploadResult && (
          <Card withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">
                  Resultados de la Carga
                </Text>
                <Group gap="xs">
                  <Badge color="green" size="lg" leftSection={<IconCheck size={12} />}>
                    {uploadResult.totalSuccess} Éxitos
                  </Badge>
                  <Badge color="red" size="lg" leftSection={<IconX size={12} />}>
                    {uploadResult.totalErrors} Errores
                  </Badge>
                </Group>
              </Group>

              {/* Resumen de creados/actualizados */}
              {(uploadResult.created !== undefined || uploadResult.updated !== undefined) && (
                <Group gap="sm" justify="center">
                  {(uploadResult.created || 0) > 0 && (
                    <Badge color="blue" size="md">
                      Creados: {uploadResult.created}
                    </Badge>
                  )}
                  {(uploadResult.updated || 0) > 0 && (
                    <Badge color="cyan" size="md">
                      Actualizados: {uploadResult.updated}
                    </Badge>
                  )}
                </Group>
              )}

              {uploadResult.success.length > 0 && (
                <Box>
                  <Text fw={500} size="sm" mb="xs" c="green">
                    Servicios procesados exitosamente:
                  </Text>
                  <ScrollArea h={200}>
                    <Table striped highlightOnHover size="sm">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Fila</Table.Th>
                          <Table.Th>Nombre</Table.Th>
                          <Table.Th>Acción</Table.Th>
                          <Table.Th>Precio</Table.Th>
                          <Table.Th>Duración</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {uploadResult.success.map((item, idx) => (
                          <Table.Tr key={idx}>
                            <Table.Td>{item.row}</Table.Td>
                            <Table.Td>{item.name}</Table.Td>
                            <Table.Td>
                              <Badge size="sm" color={item.action === 'CREADO' ? 'blue' : 'cyan'}>
                                {item.action || 'CREADO'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{item.price}</Table.Td>
                            <Table.Td>{item.duration} min</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Box>
              )}

              {uploadResult.errors.length > 0 && (
                <Box>
                  <Text fw={500} size="sm" mb="xs" c="red">
                    Errores detectados:
                  </Text>
                  <ScrollArea h={200}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Fila</Table.Th>
                          <Table.Th>Nombre</Table.Th>
                          <Table.Th>Error</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {uploadResult.errors.map((error, idx) => (
                          <Table.Tr key={idx}>
                            <Table.Td>{error.row}</Table.Td>
                            <Table.Td>{error.name}</Table.Td>
                            <Table.Td>
                              <Text size="xs" c="red">
                                {error.error}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Box>
              )}
            </Stack>
          </Card>
        )}

        {/* Botones de acción */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Cerrar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
