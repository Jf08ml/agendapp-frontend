import { apiImage } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

interface UploadImageResponse {
  imageUrl: string;
}

interface ImageKitAuthParams {
  ok: boolean;
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}

interface ImageKitUploadResponse {
  url: string;
  fileId: string;
  name: string;
  fileType: string;
}

export type MediaType = "image" | "gif" | "video";

export interface UploadResult {
  url: string;
  fileId: string;
  fileType: MediaType;
  fileName: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB - límite de ImageKit Free

const ALLOWED_TYPES: Record<MediaType, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp"],
  gif: ["image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};

const ALL_ALLOWED_TYPES = Object.values(ALLOWED_TYPES).flat();

export const getMediaType = (mimeType: string): MediaType | null => {
  if (ALLOWED_TYPES.image.includes(mimeType)) return "image";
  if (ALLOWED_TYPES.gif.includes(mimeType)) return "gif";
  if (ALLOWED_TYPES.video.includes(mimeType)) return "video";
  return null;
};

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `El archivo excede el límite de 25MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  if (!ALL_ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Tipo de archivo no permitido. Usa JPG, PNG, WebP, GIF, MP4 o WebM",
    };
  }

  return { valid: true };
};

const getAuthParams = async (): Promise<ImageKitAuthParams> => {
  const response = await apiImage.get<ImageKitAuthParams>("/auth");
  return response.data;
};

export const uploadMediaDirect = async (
  file: File,
  folder?: string
): Promise<UploadResult | undefined> => {
  try {
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const authParams = await getAuthParams();
    const mediaType = getMediaType(file.type);

    if (!mediaType) {
      throw new Error("Tipo de archivo no soportado");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("folder", folder || import.meta.env.VITE_FOLDER_IMAGES || "/uploads");
    formData.append("publicKey", authParams.publicKey);
    formData.append("signature", authParams.signature);
    formData.append("expire", authParams.expire.toString());
    formData.append("token", authParams.token);

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al subir el archivo");
    }

    const data: ImageKitUploadResponse = await response.json();

    return {
      url: data.url,
      fileId: data.fileId,
      fileType: mediaType,
      fileName: data.name,
    };
  } catch (error) {
    if (error instanceof Error) {
      handleAxiosError(error, error.message);
    } else {
      handleAxiosError(error, "Error al subir el archivo");
    }
  }
};

// Mantener función legacy para compatibilidad
export const uploadImage = async (file: File): Promise<string | undefined> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);

    const folder = `${import.meta.env.VITE_FOLDER_IMAGES}`;

    const response = await apiImage.post<UploadImageResponse>(
      `/upload/${folder}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data.imageUrl;
  } catch (error) {
    handleAxiosError(error, "Error al subir la imagen");
  }
};
