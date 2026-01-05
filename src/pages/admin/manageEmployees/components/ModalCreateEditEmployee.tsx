import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Flex,
  ActionIcon,
  Group,
  Image,
  Text,
  Loader,
  Grid,
  Checkbox,
  ScrollArea,
  Paper,
  Box,
  ColorInput,
  LoadingOverlay,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { useMediaQuery } from "@mantine/hooks";
import { IoEyeOff } from "react-icons/io5";
import { FaEye } from "react-icons/fa";
import { BiImageAdd, BiSolidXCircle } from "react-icons/bi";

import { uploadImage } from "../../../../services/imageService";
import { Employee } from "../../../../services/employeeService";
import { Service } from "../../../../services/serviceService";

interface ModalCreateEditEmployeeProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  services: Service[];
  onSave: (employee: Employee) => void;
}

const ModalCreateEditEmployee: React.FC<ModalCreateEditEmployeeProps> = ({
  isOpen,
  onClose,
  employee,
  services,
  onSave,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [editingEmployee, setEditingEmployee] = useState<Employee>({
    _id: "",
    names: "",
    position: "",
    phoneNumber: "",
    services: [],
    organizationId: "",
    email: "",
    password: "",
    role: {
      name: "",
      permissions: [],
    },
    customPermissions: [],
    isActive: true,
    profileImage: "",
    color: "",
    commissionPercentage: 0,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setEditingEmployee({
        _id: employee._id || "",
        names: employee.names || "",
        position: employee.position || "",
        phoneNumber: employee.phoneNumber || "",
        services: employee.services || [],
        email: employee.email || "",
        organizationId: employee.organizationId || "",
        password: employee.password || "",
        role: {
          name: employee.role?.name || "",
          permissions: employee.role?.permissions || [],
        },
        customPermissions: employee.customPermissions || [],
        isActive: employee.isActive ?? true,
        profileImage: employee.profileImage || "",
        color: employee.color || "",
        commissionPercentage: employee.commissionPercentage ?? 0,
      });
    } else {
      resetForm();
    }
  }, [employee]);

  const handleSave = async () => {
    if (isUploading || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(editingEmployee);
      // Only close on success
      handleClose();
    } catch (error) {
      // Keep modal open on error
      console.error("Error saving employee:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = async (files: File[]) => {
    setIsUploading(true);
    try {
      const imageUrl = await uploadImage(files[0]);
      setEditingEmployee({
        ...editingEmployee,
        profileImage: imageUrl as string,
      });
    } catch (error) {
      console.error("Error al cargar la imagen:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setEditingEmployee({ ...editingEmployee, profileImage: "" });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setEditingEmployee({
      _id: "",
      names: "",
      position: "",
      phoneNumber: "",
      services: [],
      email: "",
      organizationId: "",
      password: "",
      role: {
        name: "",
        permissions: [],
      },
      customPermissions: [],
      isActive: true,
      profileImage: "",
      color: "",
      commissionPercentage: 0,
    });
  };

  const canSave =
    editingEmployee.names.trim().length > 1 &&
    editingEmployee.position.trim().length > 0 &&
    editingEmployee.phoneNumber.trim().length > 5 &&
    editingEmployee.email.trim().length > 3;

  const handleServiceToggle = (serviceId: string) => {
    const isSelected = editingEmployee.services?.some(
      (srv) => srv._id === serviceId
    );

    if (isSelected) {
      setEditingEmployee({
        ...editingEmployee,
        services: editingEmployee.services?.filter(
          (srv) => srv._id !== serviceId
        ) || [],
      });
    } else {
      const service = services.find((srv) => srv._id === serviceId);
      if (service) {
        setEditingEmployee({
          ...editingEmployee,
          services: [...(editingEmployee.services || []), service],
        });
      }
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title={employee ? "Editar Empleado" : "Agregar Empleado"}
      size="xl"
      centered
    >
      <Box pos="relative">
        <LoadingOverlay
          visible={isSaving}
          overlayProps={{ blur: 2 }}
          loaderProps={{
            children: (
              <Stack align="center" gap="xs">
                <Loader size="lg" />
                <Text size="sm" c="dimmed">
                  Guardando empleado...
                </Text>
              </Stack>
            ),
          }}
        />

        <Grid>
          {/* Columna izquierda - Información básica */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              <TextInput
                label="Nombre completo"
                withAsterisk
                placeholder="Ej: Juan Pérez"
                value={editingEmployee.names}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    names: e.currentTarget.value,
                  })
                }
              />

              <TextInput
                label="Posición"
                withAsterisk
                placeholder="Ej: Barbero"
                value={editingEmployee.position}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    position: e.currentTarget.value,
                  })
                }
              />

              <TextInput
                label="Número de teléfono"
                withAsterisk
                placeholder="Ej: +56912345678"
                value={editingEmployee.phoneNumber}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    phoneNumber: e.currentTarget.value,
                  })
                }
              />

              <TextInput
                label="Correo electrónico"
                withAsterisk
                type="email"
                placeholder="correo@ejemplo.com"
                value={editingEmployee.email}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    email: e.currentTarget.value,
                  })
                }
              />

              <TextInput
                label="Contraseña"
                withAsterisk
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={editingEmployee.password}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    password: e.currentTarget.value,
                  })
                }
                rightSection={
                  <ActionIcon
                    variant="transparent"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <IoEyeOff size={16} />
                    ) : (
                      <FaEye size={16} />
                    )}
                  </ActionIcon>
                }
              />

              <ColorInput
                label="Color identificador"
                placeholder="Selecciona un color"
                value={editingEmployee.color || ""}
                onChange={(newColor) => {
                  setEditingEmployee({
                    ...editingEmployee,
                    color: newColor,
                  });
                }}
                format="hex"
                withPicker
                swatches={[
                  "#FFB6C1",
                  "#FFD700",
                  "#98FB98",
                  "#AFEEEE",
                  "#7B68EE",
                  "#FF69B4",
                  "#FFA07A",
                  "#E6E6FA",
                  "#FFFACD",
                  "#C0C0C0",
                ]}
                swatchesPerRow={5}
              />

              <TextInput
                label="% de Comisión"
                placeholder="Ej: 30"
                description="Porcentaje de comisión sobre ventas (0-100)"
                type="number"
                min={0}
                max={100}
                value={editingEmployee.commissionPercentage ?? 0}
                onChange={(e) => {
                  const value = parseFloat(e.currentTarget.value) || 0;
                  setEditingEmployee({
                    ...editingEmployee,
                    commissionPercentage: Math.min(100, Math.max(0, value)),
                  });
                }}
              />
            </Stack>
          </Grid.Col>

          {/* Columna derecha - Servicios e imagen */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              {/* Servicios */}
              <Box>
                <Text size="sm" fw={500} mb="xs">
                  Servicios <span style={{ color: "red" }}>*</span>
                </Text>
                <Paper withBorder p="md">
                  {services.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center">
                      No hay servicios disponibles
                    </Text>
                  ) : (
                    <ScrollArea.Autosize mah={isMobile ? 200 : 300}>
                      <Stack gap="xs">
                        {services.map((service) => (
                          <Checkbox
                            key={service._id}
                            label={service.name}
                            checked={editingEmployee.services?.some(
                              (srv) => srv._id === service._id
                            ) ?? false}
                            onChange={() => handleServiceToggle(service._id)}
                          />
                        ))}
                      </Stack>
                    </ScrollArea.Autosize>
                  )}
                </Paper>
              </Box>

              {/* Imagen de perfil */}
              <Box>
                <Text size="sm" fw={500} mb="xs">
                  Imagen de perfil
                </Text>
                <Dropzone
                  onDrop={handleDrop}
                  accept={IMAGE_MIME_TYPE}
                  multiple={false}
                  loading={isUploading}
                  style={{
                    border: "2px dashed #ced4da",
                    borderRadius: "8px",
                    cursor: isUploading ? "not-allowed" : "pointer",
                    minHeight: editingEmployee.profileImage ? "auto" : "120px",
                  }}
                >
                  <Group justify="center" p="md">
                    {isUploading ? (
                      <Stack align="center" gap="xs">
                        <Loader size="md" />
                        <Text size="sm" c="dimmed">
                          Subiendo imagen...
                        </Text>
                      </Stack>
                    ) : editingEmployee.profileImage ? (
                      <Box pos="relative">
                        <Image
                          src={editingEmployee.profileImage}
                          alt="Imagen de perfil"
                          width={100}
                          height={100}
                          radius="md"
                        />
                        <ActionIcon
                          style={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                          }}
                          variant="filled"
                          radius="xl"
                          size="sm"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage();
                          }}
                        >
                          <BiSolidXCircle />
                        </ActionIcon>
                      </Box>
                    ) : (
                      <Stack align="center" gap="xs">
                        <BiImageAdd size={40} color="#228be6" />
                        <Text size="sm" ta="center">
                          Arrastra una imagen o haz clic
                        </Text>
                      </Stack>
                    )}
                  </Group>
                </Dropzone>
              </Box>
            </Stack>
          </Grid.Col>
        </Grid>

        {/* Footer con botones */}
        <Flex justify="end" gap="sm" mt="xl">
          <Button variant="subtle" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUploading || !canSave || isSaving}
            loading={isSaving}
          >
            {employee ? "Guardar Cambios" : "Agregar Empleado"}
          </Button>
        </Flex>
      </Box>
    </Modal>
  );
};

export default ModalCreateEditEmployee;
