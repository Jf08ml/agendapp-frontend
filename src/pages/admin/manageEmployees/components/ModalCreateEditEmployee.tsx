import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Flex,
  MultiSelect,
  ActionIcon,
  Group,
  Image,
  Text,
  Loader,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IoEyeOff } from "react-icons/io5";
import { FaEye } from "react-icons/fa";
import { BiImageAdd, BiSolidXCircle } from "react-icons/bi";

import { ColorInput } from "@mantine/core"; // <--- Agrega esta importación

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
    color: "", // <--- Aseguramos el campo color
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
        color: employee.color || "", // <-- tomamos el color actual (si existe)
      });
    } else {
      resetForm();
    }
  }, [employee]);

  const handleSave = () => {
    if (isUploading) return;
    onSave(editingEmployee);
    handleClose();
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
    });
  };

  const canSave =
    editingEmployee.names.trim().length > 1 &&
    editingEmployee.position.trim().length > 0 &&
    editingEmployee.phoneNumber.trim().length > 5 &&
    editingEmployee.email.trim().length > 3;

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title={employee ? "Editar Empleado" : "Agregar Empleado"}
      size="md"
      centered
    >
      <Stack gap="xs">
        <TextInput
          label="Nombre completo"
          withAsterisk
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
          value={editingEmployee.phoneNumber}
          onChange={(e) =>
            setEditingEmployee({
              ...editingEmployee,
              phoneNumber: e.currentTarget.value,
            })
          }
        />

        <MultiSelect
          label="Servicios"
          withAsterisk
          placeholder="Selecciona los servicios"
          data={services.map((service) => ({
            value: service._id,
            label: service.name,
          }))}
          value={(editingEmployee.services || []).map((srv) => srv._id)}
          onChange={(selectedServiceIds) => {
            setEditingEmployee({
              ...editingEmployee,
              services: selectedServiceIds.map((id) => {
                const found = services.find((srv) => srv._id === id);
                return found!;
              }),
            });
          }}
          searchable
          clearable
        />

        <TextInput
          label="Correo electrónico"
          withAsterisk
          type="email"
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
              {showPassword ? <IoEyeOff size={16} /> : <FaEye size={16} />}
            </ActionIcon>
          }
        />

        {/* Selector de color (ColorInput) */}
        <ColorInput
          label="Color identificador"
          value={editingEmployee.color || ""}
          onChange={(newColor) => {
            setEditingEmployee({
              ...editingEmployee,
              color: newColor,
            });
          }}
          format="hex" // Podrías usar 'rgba', 'hsl', etc.
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

        <Text>Imagen de perfil</Text>
        <Dropzone
          onDrop={handleDrop}
          accept={IMAGE_MIME_TYPE}
          multiple={false}
          style={{
            border: "2px dashed #ced4da",
            borderRadius: "8px",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          <Group justify="center">
            {isUploading ? (
              <Loader size="lg" />
            ) : (
              <>
                <BiImageAdd size={50} color="#228be6" />
                <Text size="lg">
                  Arrastra una imagen aquí o haz clic para cargar
                </Text>
              </>
            )}
          </Group>
        </Dropzone>

        {editingEmployee.profileImage && (
          <div style={{ position: "relative" }}>
            <Image
              src={editingEmployee.profileImage}
              alt="Imagen de perfil"
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
              onClick={handleRemoveImage}
            >
              <BiSolidXCircle />
            </ActionIcon>
          </div>
        )}

        <Flex justify="end">
          <Button onClick={handleSave} disabled={isUploading || !canSave}>
            {employee ? "Guardar Cambios" : "Agregar Empleado"}
          </Button>
        </Flex>
      </Stack>
    </Modal>
  );
};

export default ModalCreateEditEmployee;
