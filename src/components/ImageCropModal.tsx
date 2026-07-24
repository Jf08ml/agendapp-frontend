import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Stack, Group, Button, Text, Slider, Box } from "@mantine/core";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedImageBlob, blobToFile, PixelCropArea } from "../utils/cropImage";

interface ImageCropModalProps {
  /** Archivo a recortar. El modal está abierto mientras no sea null. */
  file: File | null;
  /** Proporción del recorte (ancho / alto). Por defecto 4:3, la misma que
   * usan las tarjetas de servicio en landing, catálogo y detalle. */
  aspect?: number;
  /** Cuántas imágenes quedan pendientes después de esta (para mostrar progreso). */
  remaining?: number;
  onConfirm: (croppedFile: File) => void;
  onSkip: (originalFile: File) => void;
  onCancel: () => void;
}

export default function ImageCropModal({
  file,
  aspect = 4 / 3,
  remaining,
  onConfirm,
  onSkip,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCropArea | null>(null);
  const [applying, setApplying] = useState(false);

  const imageSrc = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  // Libera el object URL anterior cada vez que cambia la imagen (o al cerrar).
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  // Reinicia posición/zoom al pasar a la siguiente imagen de la cola.
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [file]);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleApply = async () => {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    setApplying(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, file.type || "image/jpeg");
      onConfirm(blobToFile(blob, file));
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      opened={!!file}
      onClose={onCancel}
      title="Ajusta tu imagen"
      size="lg"
      centered
      radius="md"
      closeOnClickOutside={false}
      transitionProps={{ transition: "fade" }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Arrastra la imagen para moverla y usa el control para acercar o alejar. Así se verá recortada en tu página de reservas.
          {typeof remaining === "number" && remaining > 0 ? ` (quedan ${remaining} más)` : null}
        </Text>

        <Box
          style={{
            position: "relative",
            width: "100%",
            height: 360,
            background: "#1a1a1a",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </Box>

        <Group gap="sm" wrap="nowrap" align="center">
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            Zoom
          </Text>
          <Slider
            value={zoom}
            onChange={setZoom}
            min={1}
            max={3}
            step={0.05}
            style={{ flex: 1 }}
            label={(v) => `${v.toFixed(1)}x`}
          />
        </Group>

        <Group justify="space-between">
          <Button variant="subtle" color="gray" size="sm" onClick={onCancel}>
            Quitar esta imagen
          </Button>
          <Group gap="sm">
            <Button variant="default" size="sm" onClick={() => file && onSkip(file)}>
              Usar sin recortar
            </Button>
            <Button size="sm" onClick={handleApply} loading={applying} disabled={!croppedAreaPixels}>
              Aplicar recorte
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
