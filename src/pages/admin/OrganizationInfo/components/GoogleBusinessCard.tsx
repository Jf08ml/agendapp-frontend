import { useMemo, useRef, useState } from "react";
import { Alert, Anchor, Box, Button, Group, List, Paper, Stack, Text, TextInput } from "@mantine/core";
import { Autocomplete } from "@react-google-maps/api";
import { showNotification } from "@mantine/notifications";
import { IconBrandGoogle, IconCopy, IconExternalLink, IconStar } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import SectionCard from "./SectionCard";
import type { FormValues } from "../schema";
import { getOrgUrl } from "../../../../utils/domainUtils";
import { googleMapsPlaceUrl, googleReviewUrl } from "../../../../utils/googleReviews";

/**
 * Tu perfil de Google: el dueño busca su negocio (Places Autocomplete,
 * establecimientos) y se guarda el Place ID en Organization.googleBusiness.
 * Con él se arma el enlace para dejar reseña que usa el WhatsApp «Pedido de
 * reseña en Google» (Mensajes de WhatsApp, apagado por defecto). Incluye la
 * guía para poner el enlace de reservas como botón en el perfil de Google.
 */
export default function GoogleBusinessCard({
  form,
  slug,
  domains,
}: {
  form: UseFormReturnType<FormValues>;
  slug?: string;
  domains: string[];
}) {
  const searchRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [searching, setSearching] = useState(false);
  const gb = form.values.googleBusiness;
  const placeId = gb?.placeId || null;
  const reviewUrl = googleReviewUrl(placeId);
  const mapsUrl = googleMapsPlaceUrl(placeId);

  const bookingUrl = useMemo(() => {
    const base = getOrgUrl({ slug, domains });
    return base ? `${base}/online-reservation` : null;
  }, [slug, domains]);

  const copy = async (text: string, okMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification({ color: "green", message: okMessage });
    } catch {
      showNotification({ color: "red", message: "No se pudo copiar" });
    }
  };

  const handlePlaceSelect = () => {
    const place = searchRef.current?.getPlace();
    if (!place?.place_id) {
      showNotification({ color: "yellow", message: "Elige tu negocio de la lista de sugerencias." });
      return;
    }
    form.setFieldValue("googleBusiness", {
      placeId: place.place_id,
      name: place.name || null,
      address: place.formatted_address || null,
    });
    setSearching(false);
  };

  const showSearch = !placeId || searching;

  return (
    <SectionCard
      title="Tu perfil de Google"
      description="Conecta tu ficha de Google para pedir reseñas a tus clientes y recibir reservas desde Google."
    >
      <Stack gap="md">
        {placeId && (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
              <Group gap="sm" align="flex-start" wrap="nowrap">
                <IconBrandGoogle size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                <Box>
                  <Text fw={600}>{gb?.name || "Negocio en Google"}</Text>
                  {gb?.address && (
                    <Text size="sm" c="dimmed">
                      {gb.address}
                    </Text>
                  )}
                </Box>
              </Group>
              <Group gap="xs">
                {mapsUrl && (
                  <Button
                    component="a"
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="xs"
                    variant="light"
                    leftSection={<IconExternalLink size={14} />}
                  >
                    Ver en Google
                  </Button>
                )}
                <Button size="xs" variant="subtle" onClick={() => setSearching(true)}>
                  Cambiar
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={() => form.setFieldValue("googleBusiness", { placeId: null, name: null, address: null })}
                >
                  Quitar
                </Button>
              </Group>
            </Group>
          </Paper>
        )}

        {showSearch && (
          <Box>
            <Text size="sm" fw={500} mb={4}>
              Busca tu negocio tal como aparece en Google
            </Text>
            <Autocomplete
              onLoad={(a) => (searchRef.current = a)}
              onPlaceChanged={handlePlaceSelect}
              options={{ types: ["establishment"], fields: ["place_id", "name", "formatted_address"] }}
            >
              <TextInput placeholder="Ej: Barbería El Estilo, Medellín" leftSection={<IconBrandGoogle size={16} />} />
            </Autocomplete>
            <Text size="xs" c="dimmed" mt={4}>
              Si no aparece, revisa que tu perfil de Google esté publicado y verificado.
              {placeId && (
                <>
                  {" "}
                  <Anchor component="button" type="button" size="xs" onClick={() => setSearching(false)}>
                    Cancelar
                  </Anchor>
                </>
              )}
            </Text>
          </Box>
        )}

        {reviewUrl && (
          <Paper withBorder p="md" radius="md">
            <Group gap="xs" mb={4}>
              <IconStar size={16} />
              <Text fw={600} size="sm">
                Enlace para que te dejen una reseña
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mb="xs">
              Compártelo con tus clientes, o activa el envío automático por WhatsApp después de cada cita en
              Mensajes de WhatsApp → «Reseñas en Google» (está apagado hasta que lo actives).
            </Text>
            <Group gap="xs" wrap="nowrap">
              <TextInput value={reviewUrl} readOnly style={{ flex: 1 }} size="xs" />
              <Button
                size="xs"
                variant="light"
                leftSection={<IconCopy size={14} />}
                onClick={() => copy(reviewUrl, "Enlace de reseña copiado")}
              >
                Copiar
              </Button>
            </Group>
          </Paper>
        )}

        {bookingUrl && (
          <Paper withBorder p="md" radius="md">
            <Text fw={600} size="sm" mb={4}>
              Botón «Reservar» en tu perfil de Google
            </Text>
            <Text size="xs" c="dimmed" mb="xs">
              Para que tus clientes reserven directo desde Google Maps y el buscador:
            </Text>
            <List size="xs" spacing={4} mb="sm">
              <List.Item>Busca tu negocio en Google estando conectado con la cuenta que lo administra.</List.Item>
              <List.Item>Toca «Editar perfil» y busca la opción de reservas o «Enlaces de citas».</List.Item>
              <List.Item>Pega este enlace y guarda:</List.Item>
            </List>
            <Group gap="xs" wrap="nowrap">
              <TextInput value={bookingUrl} readOnly style={{ flex: 1 }} size="xs" />
              <Button
                size="xs"
                variant="light"
                leftSection={<IconCopy size={14} />}
                onClick={() => copy(bookingUrl, "Enlace de reservas copiado")}
              >
                Copiar
              </Button>
            </Group>
          </Paper>
        )}

        {placeId && form.isDirty("googleBusiness") && (
          <Alert color="blue" variant="light">
            Recuerda guardar los cambios.
          </Alert>
        )}
      </Stack>
    </SectionCard>
  );
}
