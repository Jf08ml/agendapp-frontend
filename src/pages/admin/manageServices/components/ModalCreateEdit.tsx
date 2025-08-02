import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Textarea,
  Chip,
  Button,
  Flex,
  Image,
  ActionIcon,
  Group,
  Text,
  Select,
  Autocomplete,
  Box,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { BiImageAdd, BiSolidXCircle } from "react-icons/bi";
import {
  FaSpa,
  FaPaintBrush,
  FaEye,
  FaSmile,
  FaQuestion,
} from "react-icons/fa";
import { FaScissors } from "react-icons/fa6";
import { Service } from "../../../../services/serviceService";

// Mapea el nombre del icono a su componente real
const iconMap = {
  FaSpa: <FaSpa style={{ color: "#DE739E" }} />,
  FaScissors: <FaScissors style={{ color: "#DE739E" }} />,
  FaPaintBrush: <FaPaintBrush style={{ color: "#DE739E" }} />,
  FaEye: <FaEye style={{ color: "#DE739E" }} />,
  FaSmile: <FaSmile style={{ color: "#DE739E" }} />,
  FaQuestion: <FaQuestion style={{ color: "#DE739E" }} />,
};

const iconOptions = [
  { value: "FaSpa", label: "Spa" },
  { value: "FaScissors", label: "Peluquería" },
  { value: "FaPaintBrush", label: "Uñas" },
  { value: "FaEye", label: "Cejas" },
  { value: "FaSmile", label: "Belleza" },
  { value: "FaQuestion", label: "Otro" },
];

interface ModalCreateEditProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  onSave: (service: Service) => void;
  allTypes: string[];
}

const ModalCreateEdit: React.FC<ModalCreateEditProps> = ({
  isOpen,
  onClose,
  service,
  onSave,
  allTypes,
}) => {
  const [editingService, setEditingService] = useState<Service>({
    _id: "",
    name: "",
    type: "",
    icon: "",
    description: "",
    price: 0,
    duration: 0,
    images: [],
  });
  const [imageFiles, setImageFiles] = useState<(File | string)[]>([]);

  useEffect(() => {
    if (service) {
      setEditingService(service);
      setImageFiles(service.images || []);
    } else {
      setEditingService({
        _id: "",
        name: "",
        type: "",
        icon: "",
        description: "",
        price: 0,
        duration: 0,
        images: [],
      });
      setImageFiles([]);
    }
  }, [service]);

  const handleDrop = (files: File[]) => {
    setImageFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const handleRemoveImage = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);
  };

  const handleSave = () => {
    onSave({ ...editingService, images: imageFiles as string[] });
    onClose();
  };


  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={service ? "Editar Servicio" : "Agregar Servicio"}
      size="md"
      centered
    >
      <Stack gap="xs">
        <TextInput
          label="Nombre del servicio"
          value={editingService.name}
          onChange={(e) =>
            setEditingService({
              ...editingService,
              name: e.currentTarget.value,
            })
          }
          required
        />
        <Autocomplete
          label="Tipo de servicio"
          value={editingService.type}
          onChange={(type) =>
            setEditingService({ ...editingService, type })
          }
          data={allTypes}
          placeholder="Ejemplo: Uñas, Spa, Cejas..."
          limit={10}
          required
        />
        <Box>
          <Text size="sm" fw={500} mb={4}>
            Ícono
          </Text>
          <Group gap={8} align="center">
            {/* Preview del ícono grande */}
            <Box style={{ fontSize: 28, minWidth: 36, minHeight: 36 }}>
              {editingService.icon
                ? iconMap[editingService.icon as keyof typeof iconMap]
                : <FaQuestion style={{ color: "#bbb" }} />}
            </Box>
            <Select
              data={iconOptions}
              value={editingService.icon || ""}
              onChange={(icon) =>
                setEditingService({ ...editingService, icon: icon as string })
              }
              placeholder="Selecciona un ícono"
              searchable
              clearable
              style={{ flex: 1 }}
            />
          </Group>
        </Box>
        <NumberInput
          label="Precio"
          prefix="$ "
          thousandSeparator=","
          value={editingService.price}
          onChange={(value) =>
            setEditingService({
              ...editingService,
              price: typeof value === "number" ? value : 0,
            })
          }
          required
        />
        <div>
          <NumberInput
            label="Duración (minutos)"
            value={editingService.duration}
            onChange={(value) =>
              setEditingService({
                ...editingService,
                duration: typeof value === "number" ? value : 0,
              })
            }
            required
            min={1}
          />
          <Flex justify="center" mt={4}>
            <Chip.Group>
              {[15, 30, 60, 90].map((duration) => (
                <Chip
                  key={duration}
                  size="xs"
                  checked={editingService.duration === duration}
                  onChange={() =>
                    setEditingService({ ...editingService, duration })
                  }
                >
                  {duration} minutos
                </Chip>
              ))}
            </Chip.Group>
          </Flex>
        </div>
        <Textarea
          label="Descripción"
          value={editingService.description}
          onChange={(e) =>
            setEditingService({
              ...editingService,
              description: e.currentTarget.value,
            })
          }
          minRows={2}
        />
        <Dropzone
          onDrop={handleDrop}
          accept={IMAGE_MIME_TYPE}
          multiple
          style={{
            border: "2px dashed #ced4da",
            borderRadius: "8px",
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.3s",
          }}
          onDragEnter={(e) => (e.currentTarget.style.borderColor = "#228be6")}
          onDragLeave={(e) => (e.currentTarget.style.borderColor = "#ced4da")}
        >
          <Group justify="center">
            <BiImageAdd size={50} color="#228be6" />
            <div>
              <Text size="lg" inline>
                Arrastra las imágenes aquí o haz clic para cargar
              </Text>
              <Text size="sm" color="dimmed" inline mt={7}>
                Solo imágenes (jpeg, png, etc.)
              </Text>
            </div>
          </Group>
        </Dropzone>
        <div>
          {imageFiles.length > 0 && (
            <Flex wrap="wrap" gap="sm" mt={4}>
              {imageFiles.map((file, index) => (
                <div key={index} style={{ position: "relative" }}>
                  <Image
                    src={
                      typeof file === "string"
                        ? file
                        : URL.createObjectURL(file)
                    }
                    alt={`Imagen ${index + 1}`}
                    width={80}
                    height={80}
                    radius="sm"
                  />
                  <ActionIcon
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                    }}
                    variant="white"
                    radius="lg"
                    size="sm"
                    color="red"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <BiSolidXCircle />
                  </ActionIcon>
                </div>
              ))}
            </Flex>
          )}
        </div>
        <Button onClick={handleSave} fullWidth>
          {service ? "Guardar Cambios" : "Agregar Servicio"}
        </Button>
      </Stack>
    </Modal>
  );
};

export default ModalCreateEdit;
