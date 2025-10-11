import { apiGeneral, apiOrganization } from "./axiosConfig";
import { AxiosResponse } from "axios";
export interface Role {
  name: string;
  permissions: string[];
}

export type ReservationPolicy = "manual" | "auto_if_available";

export interface OpeningHours {
  start?: string;
  end?: string;
  businessDays?: number[]; // 0..6
  breaks?: { day: number; start: string; end: string; note?: string }[];
}

export interface Branding {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  themeColor?: string;
  pwaName?: string;
  pwaShortName?: string;
  pwaDescription?: string;
  pwaIcon?: string;
  footerTextColor?: string;
  manifest?: object;
}

export interface Organization {
  _id?: string;
  name: string;
  email: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  password?: string;
  phoneNumber: string;
  facebookUrl?: string;
  instagramUrl?: string;
  whatsappUrl?: string;
  tiktokUrl?: string;
  role: Role | string;
  isActive?: boolean;
  referredCount?: number;
  referredReward?: string;
  serviceCount?: number;
  serviceReward?: string;
  openingHours?: OpeningHours;
  clientIdWhatsapp?: string | null;
  branding?: Branding;
  domains?: string[];
  reservationPolicy?: ReservationPolicy;
}

// Crear una nueva organización
export const createOrganization = async (
  organizationData: Organization
): Promise<Organization | null> => {
  try {
    const response: AxiosResponse<{ data: Organization }> =
      await apiOrganization.post("/", organizationData);
    return response.data.data;
  } catch (error) {
    console.error("Error al crear la organización:", error);
    return null;
  }
};

// Obtener todas las organizaciones
export const getOrganizations = async (): Promise<Organization[] | null> => {
  try {
    const response: AxiosResponse<{ data: Organization[] }> =
      await apiOrganization.get("/");
    return response.data.data;
  } catch (error) {
    console.error("Error al obtener las organizaciones:", error);
    return null;
  }
};

// Obtener una organización por ID
export const getOrganizationById = async (
  organizationId: string
): Promise<Organization | null> => {
  try {
    const response: AxiosResponse<{ data: Organization }> =
      await apiOrganization.get(`/${organizationId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error al obtener la organización:", error);
    return null;
  }
};

// Actualizar una organización
export const updateOrganization = async (
  organizationId: string,
  updatedData: Partial<Organization>
): Promise<Organization | null> => {
  try {
    const response: AxiosResponse<{ data: Organization }> =
      await apiOrganization.put(`/${organizationId}`, updatedData);
    return response.data.data;
  } catch (error) {
    console.error("Error al actualizar la organización:", error);
    return null;
  }
};

// Eliminar una organización
export const deleteOrganization = async (
  organizationId: string
): Promise<void> => {
  try {
    await apiOrganization.delete(`/${organizationId}`);
  } catch (error) {
    console.error("Error al eliminar la organización:", error);
  }
};

// Obtener organización según el dominio actual (branding automático)
export const getOrganizationConfig = async (): Promise<Organization | null> => {
  try {
    const response: AxiosResponse<Organization> = await apiGeneral.get(
      "/organization-config"
    );
    return response.data;
  } catch (error) {
    console.error("Error al obtener la organización por dominio:", error);
    return null;
  }
};
