// Recorta una imagen a partir del área seleccionada en el cropper (en px,
// coordenadas de la imagen original) y devuelve el resultado como Blob.
// Patrón estándar de canvas para usar junto con react-easy-crop.

export interface PixelCropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    // Necesario para no "mancharse" el canvas si la imagen viene de otro origen
    image.crossOrigin = "anonymous";
    image.src = src;
  });

export async function getCroppedImageBlob(
  imageSrc: string,
  cropAreaPixels: PixelCropArea,
  fileType = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropAreaPixels.width);
  canvas.height = Math.round(cropAreaPixels.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto del canvas");

  ctx.drawImage(
    image,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    cropAreaPixels.width,
    cropAreaPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar la imagen recortada"));
          return;
        }
        resolve(blob);
      },
      fileType,
      quality
    );
  });
}

// Envuelve el Blob recortado en un File, preservando nombre y tipo del
// original para que el resto del flujo de subida no note la diferencia.
export function blobToFile(blob: Blob, originalFile: File): File {
  return new File([blob], originalFile.name, {
    type: originalFile.type || blob.type,
    lastModified: Date.now(),
  });
}
