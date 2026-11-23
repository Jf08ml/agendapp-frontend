/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import { IoAlertCircle } from "react-icons/io5";

import { RootState } from "../../../app/store";
import {
  getOrganizationById,
  updateOrganization,
  Organization,
} from "../../../services/organizationService";
import { uploadImage } from "../../../services/imageService";
import { updateOrganizationState } from "../../../features/organization/sliceOrganization";
import { zodResolver } from "../../../utils/zodResolver";

import { schema, FormValues } from "./schema";
import { normalizeOrg } from "./utils";

// Igual que antes del hook: el clon va como any al formulario (los tipos de
// Organization y del esquema del formulario no calzan campo a campo).
const cloneOf = (value: unknown): any =>
  structuredClone ? structuredClone(value as any) : JSON.parse(JSON.stringify(value));

/**
 * Carga, formulario y guardado de la configuración del negocio. Lo comparten
 * Ajustes (OrganizationInfo) y Clientes › Fidelidad, así que las dos pantallas
 * guardan exactamente igual: mismo esquema, mismo endpoint, misma normalización.
 */
export function useOrganizationSettings() {
  const dispatch = useDispatch();
  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);

  // loaders específicos de imágenes
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingPwaIcon, setUploadingPwaIcon] = useState(false);

  // bloquear salida con cambios — la ref se actualiza en cada render
  const isBlockingRef = useRef(false);

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {} as any,
    validateInputOnChange: true,
  });

  // isDirty se calcula en cada render (sin useMemo con [form] estable)
  const isDirty = form.isDirty();
  isBlockingRef.current = isDirty;

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        if (!organizationId) return;
        const response = await getOrganizationById(organizationId);
        if (response) {
          const normalized = normalizeOrg(response);
          const clone = cloneOf(normalized);
          setOrg(normalized);
          form.setValues(clone);
          // Pasar el clone explícitamente para evitar problemas de batching
          // entre setValues y resetDirty en React 18
          form.resetDirty(clone);
        }
      } catch (e) {
        console.error(e);
        showNotification({
          title: "Error",
          message: "No se pudo cargar la organización",
          color: "red",
          icon: <IoAlertCircle />,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchOrganization();

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (isBlockingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const onUpload = async (file: File | null, key: "logoUrl" | "faviconUrl" | "pwaIcon") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showNotification({ title: "Archivo inválido", message: "Debe ser una imagen", color: "red" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotification({ title: "Archivo muy grande", message: "Máximo 2MB", color: "red" });
      return;
    }

    key === "logoUrl" && setUploadingLogo(true);
    key === "faviconUrl" && setUploadingFavicon(true);
    key === "pwaIcon" && setUploadingPwaIcon(true);

    try {
      const url = await uploadImage(file);
      form.setFieldValue("branding", {
        ...form.values.branding,
        [key]: url,
        ...(key === "logoUrl" && {
          faviconUrl: form.values.branding?.faviconUrl ?? url,
          pwaIcon: form.values.branding?.pwaIcon ?? url,
        }),
      } as any);
      showNotification({ title: "Imagen actualizada", message: "Se subió correctamente", color: "green" });
    } catch (e) {
      console.error(e);
      showNotification({ title: "Error", message: "No se pudo subir la imagen", color: "red" });
    } finally {
      key === "logoUrl" && setUploadingLogo(false);
      key === "faviconUrl" && setUploadingFavicon(false);
      key === "pwaIcon" && setUploadingPwaIcon(false);
    }
  };

  const handleCancel = () => {
    if (!org) return;
    const clone = cloneOf(org);
    form.setValues(clone);
    form.resetDirty(clone);
  };

  const handleSave = async () => {
    if (!organizationId) return;

    // Validar usando Zod directamente para evitar problemas con zodResolver
    const validationResult = schema.safeParse(form.values);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      console.error("Errores de validación:", errors);
      showNotification({
        title: "Revisa los campos",
        message: (Object.values(errors.fieldErrors).flat()[0] as string) || "Hay errores de validación",
        color: "red",
      });
      return;
    }

    try {
      setSaving(true);
      const payload = validationResult.data as Organization;
      const updated = await updateOrganization(organizationId, payload);
      if (!updated) throw new Error("Actualización vacía");

      dispatch(updateOrganizationState(updated));

      // Normalización completa (igual que al cargar) para que los campos
      // anidados tengan sus defaults y no queden como undefined.
      const normalized = normalizeOrg(updated);
      const clone = cloneOf(normalized);
      setOrg(normalized);
      form.setValues(clone);
      form.resetDirty(clone);

      showNotification({ title: "Guardado", message: "Información actualizada correctamente", color: "green" });
    } catch (e) {
      console.error(e);
      showNotification({
        title: "Error",
        message: e instanceof Error && e.message ? e.message : "No se pudo guardar",
        color: "red",
        autoClose: 10000,
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    organizationId,
    org,
    loading,
    form,
    isDirty,
    saving,
    handleSave,
    handleCancel,
    onUpload,
    uploadingLogo,
    uploadingFavicon,
    uploadingPwaIcon,
  };
}
