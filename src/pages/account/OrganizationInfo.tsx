/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/admin/OrganizationInfo.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import {
  Text,
  Title,
  TextInput,
  Button,
  Container,
  Divider,
  Group,
  Badge,
  rem,
  Tabs,
  NumberInput,
  FileInput,
  ColorInput,
  Card,
  SimpleGrid,
  Box,
  Anchor,
  Alert,
  Loader,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  getOrganizationById,
  updateOrganization,
  Organization,
} from "../../services/organizationService";
import { uploadImage } from "../../services/imageService";
import { updateOrganizationState } from "../../features/organization/sliceOrganization";
import { showNotification } from "@mantine/notifications";
import { IoAlertCircle } from "react-icons/io5";
import { GrOrganization } from "react-icons/gr";
import { RiGlobalLine } from "react-icons/ri";
import { BiLocationPlus } from "react-icons/bi";
import { MdBrandingWatermark } from "react-icons/md";
import CustomLoader from "../../components/customLoader/CustomLoader";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";

const mapContainerStyle = { width: "100%", height: "380px" };
const defaultCenter = { lat: 6.2442, lng: -75.5812 };

// ====== Validación ======
const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  openingHours: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  facebookUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  whatsappUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  tiktokUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  address: z.string().optional(),
  location: z
    .object({ lat: z.number(), lng: z.number() })
    .nullable()
    .optional(),
  referredCount: z.number().min(0).optional(),
  referredReward: z.string().optional(),
  serviceCount: z.number().min(0).optional(),
  serviceReward: z.string().optional(),
  branding: z
    .object({
      logoUrl: z.string().url().optional(),
      faviconUrl: z.string().url().optional(),
      pwaIcon: z.string().url().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      themeColor: z.string().optional(),
      footerTextColor: z.string().optional(),
      pwaName: z.string().optional(),
      pwaShortName: z.string().optional(),
      pwaDescription: z.string().optional(),
    })
    .optional(),
});

function sectionCard(
  title: string,
  description?: string,
  children?: React.ReactNode
) {
  return (
    <Card withBorder radius="lg" p="md" mb="lg">
      <Group justify="space-between" align="center" mb="xs">
        <Title order={4}>{title}</Title>
      </Group>
      {description && (
        <Text c="dimmed" size="sm" mb="md">
          {description}
        </Text>
      )}
      {children}
    </Card>
  );
}

export default function OrganizationInfo() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [searchBox, setSearchBox] =
    useState<google.maps.places.Autocomplete | null>(null);
  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const [org, setOrg] = useState<Organization | null>(null);

  // loaders específicos
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingPwaIcon, setUploadingPwaIcon] = useState(false);
  const [saving, setSaving] = useState(false);

  // bloquear salida con cambios
  const isBlockingRef = useRef(false);

  const ensureBranding = (b?: Organization["branding"]) => b ?? {};
  const ensureDomains = (d?: string[]) => (Array.isArray(d) ? d : []);

  const form = useForm<z.infer<typeof schema>>({
    validate: zodResolver(schema),
    initialValues: {} as any,
    validateInputOnChange: true,
  });

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        if (!organizationId) return;
        const response = await getOrganizationById(organizationId);
        if (response) {
          const normalized: Organization = {
            ...response,
            branding: ensureBranding(response.branding),
            domains: ensureDomains(response.domains),
          };
          setOrg(normalized);
          form.setValues(normalized as any);
          form.resetDirty();
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

    // confirmación si hay cambios y se intenta salir/refrescar
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

  // Track dirty
  const isDirty = useMemo(() => form.isDirty(), [form]);
  useEffect(() => {
    isBlockingRef.current = isEditing && isDirty;
  }, [isEditing, isDirty]);

  const handlePlaceSelect = () => {
    if (!searchBox) return;
    const place = searchBox.getPlace();
    if (place?.geometry?.location) {
      const loc = place.geometry.location;
      form.setValues({
        ...form.values,
        location: { lat: loc.lat(), lng: loc.lng() },
        address: place.formatted_address || form.values.address || "",
      });
    }
  };

  const handleCancel = () => {
    // vuelve a los valores originales
    form.setValues((org || {}) as any);
    form.resetDirty();
    setIsEditing(false);
  };

  // helper de upload con loaders por campo
  const onUpload = async (
    file: File | null,
    key: "logoUrl" | "faviconUrl" | "pwaIcon"
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showNotification({
        title: "Archivo inválido",
        message: "Debe ser una imagen",
        color: "red",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotification({
        title: "Archivo muy grande",
        message: "Máximo 2MB",
        color: "red",
      });
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

      showNotification({
        title: "Imagen actualizada",
        message: "Se subió correctamente ✅",
        color: "green",
      });
    } catch (e) {
      console.error(e);

      showNotification({
        title: "Error",
        message: "No se pudo subir la imagen",
        color: "red",
      });
    } finally {
      key === "logoUrl" && setUploadingLogo(false);
      key === "faviconUrl" && setUploadingFavicon(false);
      key === "pwaIcon" && setUploadingPwaIcon(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;
    const res = form.validate();
    if (res.hasErrors) {
      showNotification({
        title: "Revisa los campos",
        message: "Hay errores de validación",
        color: "red",
      });
      return;
    }
    try {
      setSaving(true);
      const payload = form.values as any as Organization;
      const updated = await updateOrganization(organizationId, payload);
      if (!updated) throw new Error("Actualización vacía");

      dispatch(updateOrganizationState(updated));
      const normalized: Organization = {
        ...updated,
        branding: ensureBranding(updated.branding),
        domains: ensureDomains(updated.domains),
      };
      setOrg(normalized);
      form.setValues(normalized as any);
      form.resetDirty();
      setIsEditing(false);

      showNotification({
        title: "Guardado",
        message: "Información actualizada correctamente",
        color: "green",
      });
    } catch (e) {
      console.error(e);

      showNotification({
        title: "Error",
        message: "No se pudo guardar",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !org)
    return <CustomLoader loadingText="Cargando organización..." />;

  return (
    <Container size="md" py="md">
      {/* Encabezado */}
      <Group justify="space-between" align="center" mb="xs">
        <Group gap="sm">
          <Title order={2}>Información de la organización</Title>
          <Badge color={org.isActive ? "green" : "red"}>
            {org.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </Group>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Editar</Button>
        ) : (
          <Group gap="xs">
            <Button color="green" onClick={handleSave} loading={saving}>
              Guardar cambios
            </Button>
            <Button
              variant="light"
              color="gray"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancelar
            </Button>
          </Group>
        )}
      </Group>

      <Divider my="sm" />

      <Tabs defaultValue="contact" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab
            value="contact"
            leftSection={
              <GrOrganization style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Nombre y contacto
          </Tabs.Tab>
          <Tabs.Tab
            value="openingsHours"
            leftSection={
              <GrOrganization style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Horario de atención
          </Tabs.Tab>
          <Tabs.Tab
            value="socialMedia"
            leftSection={
              <RiGlobalLine style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Redes sociales
          </Tabs.Tab>
          <Tabs.Tab
            value="location"
            leftSection={
              <BiLocationPlus style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Ubicación
          </Tabs.Tab>
          <Tabs.Tab
            value="fidelity"
            leftSection={
              <GrOrganization style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Fidelidad
          </Tabs.Tab>
          <Tabs.Tab
            value="branding"
            leftSection={
              <MdBrandingWatermark
                style={{ width: rem(12), height: rem(12) }}
              />
            }
          >
            Branding
          </Tabs.Tab>
        </Tabs.List>

        {/* CONTACTO */}
        <Tabs.Panel value="contact" pt="md">
          {sectionCard(
            "Nombre y contacto",
            "Estos datos se usan en tu encabezado, recibos y comunicaciones.",
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="Nombre"
                {...form.getInputProps("name")}
                disabled={!isEditing}
              />
              <TextInput
                label="Correo electrónico"
                {...form.getInputProps("email")}
                disabled={!isEditing}
              />
              <TextInput
                label="Teléfono"
                {...form.getInputProps("phoneNumber")}
                disabled={!isEditing}
              />
              <TextInput
                label="Dominios"
                value={(org.domains || []).join(", ")}
                disabled
              />
            </SimpleGrid>
          )}
        </Tabs.Panel>

        {/* HORARIO */}
        <Tabs.Panel value="openingsHours" pt="md">
          {sectionCard(
            "Horario de atención",
            "Horario base visible para tus clientes en la web.",
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TimeInput
                label="Apertura"
                {...form.getInputProps("openingHours.start")}
                disabled={!isEditing}
              />
              <TimeInput
                label="Cierre"
                {...form.getInputProps("openingHours.end")}
                disabled={!isEditing}
              />
            </SimpleGrid>
          )}
        </Tabs.Panel>

        {/* REDES */}
        <Tabs.Panel value="socialMedia" pt="md">
          {sectionCard(
            "Redes sociales",
            "Enlaces que se mostrarán en el header y footer.",
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="Facebook"
                {...form.getInputProps("facebookUrl")}
                disabled={!isEditing}
              />
              <TextInput
                label="Instagram"
                {...form.getInputProps("instagramUrl")}
                disabled={!isEditing}
              />
              <TextInput
                label="WhatsApp"
                {...form.getInputProps("whatsappUrl")}
                disabled={!isEditing}
              />
              <TextInput
                label="TikTok"
                {...form.getInputProps("tiktokUrl")}
                disabled={!isEditing}
              />
            </SimpleGrid>
          )}
        </Tabs.Panel>

        {/* UBICACIÓN */}
        <Tabs.Panel value="location" pt="md">
          {sectionCard(
            "Ubicación",
            "Busca y ajusta manualmente la ubicación en el mapa.",
            <>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
                <TextInput
                  label="Dirección"
                  {...form.getInputProps("address")}
                  disabled={!isEditing}
                  placeholder="Calle 123 #45-67"
                />
                <Box>
                  <Text size="sm" fw={500} mb={4}>
                    Buscar dirección
                  </Text>
                  <Autocomplete
                    onLoad={setSearchBox}
                    onPlaceChanged={handlePlaceSelect}
                  >
                    <TextInput
                      placeholder="Ingresa una dirección"
                      disabled={!isEditing}
                    />
                  </Autocomplete>
                </Box>
              </SimpleGrid>

              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={
                  form.values.location
                    ? {
                        lat: form.values.location.lat,
                        lng: form.values.location.lng,
                      }
                    : defaultCenter
                }
                zoom={13}
                onClick={(e) => {
                  if (!isEditing) return;
                  const lat = e.latLng?.lat();
                  const lng = e.latLng?.lng();
                  if (lat && lng) form.setFieldValue("location", { lat, lng });
                }}
              >
                {form.values.location && (
                  <Marker
                    position={form.values.location}
                    draggable={isEditing}
                    onDragEnd={(e) => {
                      const lat = e.latLng?.lat();
                      const lng = e.latLng?.lng();
                      if (lat && lng)
                        form.setFieldValue("location", { lat, lng });
                    }}
                  />
                )}
              </GoogleMap>

              {form.values.location && (
                <Alert
                  mt="sm"
                  icon={<IoAlertCircle />}
                  color="gray"
                  variant="light"
                >
                  Lat: {form.values.location.lat} — Lng:{" "}
                  {form.values.location.lng}
                </Alert>
              )}
            </>
          )}
        </Tabs.Panel>

        {/* FIDELIDAD */}
        <Tabs.Panel value="fidelity" pt="md">
          {sectionCard(
            "Programa de fidelidad",
            "Configura metas y recompensas para referidos y servicios.",
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label="N.º de referidos"
                {...form.getInputProps("referredCount")}
                disabled={!isEditing}
                min={0}
              />
              <TextInput
                label="Premio por referidos"
                {...form.getInputProps("referredReward")}
                disabled={!isEditing}
              />
              <NumberInput
                label="N.º de servicios"
                {...form.getInputProps("serviceCount")}
                disabled={!isEditing}
                min={0}
              />
              <TextInput
                label="Premio por servicios"
                {...form.getInputProps("serviceReward")}
                disabled={!isEditing}
              />
            </SimpleGrid>
          )}
        </Tabs.Panel>

        {/* BRANDING */}
        <Tabs.Panel value="branding" pt="md">
          {sectionCard(
            "Branding",
            "Controla identidad visual y datos de la PWA.",
            <>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
                {/* LOGO */}
                <Box>
                  <Text fw={600} mb={6}>
                    Logo
                  </Text>
                  <Group gap="md" align="center">
                    <Box
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        border: "1px solid #eee",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {uploadingLogo ? (
                        <Loader size="sm" />
                      ) : form.values.branding?.logoUrl ? (
                        <img
                          src={form.values.branding.logoUrl}
                          alt="Logo"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            borderRadius: 8,
                          }}
                        />
                      ) : (
                        <Text size="xs" c="dimmed">
                          Sin logo
                        </Text>
                      )}
                    </Box>

                    <FileInput
                      mt="xs"
                      accept="image/*"
                      disabled={!isEditing || uploadingLogo}
                      placeholder={
                        uploadingLogo ? "Cargando..." : "Cambiar logo"
                      }
                      onChange={(f) => onUpload(f as File, "logoUrl")}
                      description="Sugerido: 256×256 PNG, fondo blanco o transparente."
                    />
                  </Group>
                </Box>

                {/* FAVICON */}
                <Box>
                  <Text fw={600} mb={6}>
                    Favicon
                  </Text>
                  <Group gap="md" align="center">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        border: "1px solid #eee",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {uploadingFavicon ? (
                        <Loader size="xs" />
                      ) : form.values.branding?.faviconUrl ? (
                        <img
                          src={form.values.branding.faviconUrl}
                          alt="Favicon"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            borderRadius: 6,
                          }}
                        />
                      ) : (
                        <Text size="xs" c="dimmed">
                          32×32
                        </Text>
                      )}
                    </Box>

                    <FileInput
                      mt="xs"
                      accept="image/*"
                      disabled={!isEditing || uploadingFavicon}
                      placeholder={
                        uploadingFavicon ? "Cargando..." : "Cambiar favicon"
                      }
                      onChange={(f) => onUpload(f as File, "faviconUrl")}
                      description="Recomendado: 32×32 PNG."
                    />
                  </Group>
                </Box>

                {/* PWA ICON */}
                <Box>
                  <Text fw={600} mb={6}>
                    Icono PWA
                  </Text>
                  <Group gap="md" align="center">
                    <Box
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        border: "1px solid #eee",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {uploadingPwaIcon ? (
                        <Loader size="sm" />
                      ) : (
                        form.values.branding?.pwaIcon && (
                          <img
                            src={form.values.branding?.pwaIcon}
                            alt="PWA Icon"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              borderRadius: 12,
                            }}
                          />
                        )
                      )}
                    </Box>

                    <FileInput
                      mt="xs"
                      accept="image/*"
                      disabled={!isEditing || uploadingPwaIcon}
                      placeholder={
                        uploadingPwaIcon ? "Cargando..." : "Cambiar icono"
                      }
                      onChange={(f) => onUpload(f as File, "pwaIcon")}
                      description="PNG 192×192 o 512×512. Ideal una versión maskable."
                    />
                  </Group>
                </Box>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <ColorInput
                  label="Color primario"
                  {...form.getInputProps("branding.primaryColor")}
                  disabled={!isEditing}
                />
                <ColorInput
                  label="Color secundario"
                  {...form.getInputProps("branding.secondaryColor")}
                  disabled={!isEditing}
                />
                <ColorInput
                  label="Theme color (navegador)"
                  {...form.getInputProps("branding.themeColor")}
                  disabled={!isEditing}
                />
                <ColorInput
                  label="Texto del footer"
                  {...form.getInputProps("branding.footerTextColor")}
                  disabled={!isEditing}
                />
              </SimpleGrid>

              <Divider my="md" />

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Nombre de la app (PWA)"
                  {...form.getInputProps("branding.pwaName")}
                  disabled={!isEditing}
                />
                <TextInput
                  label="Nombre corto (Short name)"
                  {...form.getInputProps("branding.pwaShortName")}
                  disabled={!isEditing}
                />
                <TextInput
                  label="Descripción (PWA)"
                  {...form.getInputProps("branding.pwaDescription")}
                  disabled={!isEditing}
                />
              </SimpleGrid>

              <Alert mt="md" color="gray" variant="light">
                Para iOS agrega también <code>apple-touch-icon</code> en tu
                HTML.{" "}
                <Anchor
                  href="https://web.dev/articles/apple-touch-icon?hl=es"
                  target="_blank"
                >
                  Ver guía
                </Anchor>
              </Alert>
            </>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Action bar fija cuando estás editando */}
      {isEditing && (
        <Card
          withBorder
          radius="lg"
          shadow="sm"
          style={{
            position: "sticky",
            bottom: 8,
            zIndex: 5,
            marginTop: rem(16),
            backdropFilter: "blur(6px)",
          }}
        >
          <Group justify="space-between">
            <Text size="sm" c={isDirty ? "yellow.7" : "dimmed"}>
              {isDirty ? "Tienes cambios sin guardar" : "Sin cambios"}
            </Text>
            <Group>
              <Button
                variant="light"
                color="gray"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button color="green" onClick={handleSave} loading={saving}>
                Guardar cambios
              </Button>
            </Group>
          </Group>
        </Card>
      )}
    </Container>
  );
}
