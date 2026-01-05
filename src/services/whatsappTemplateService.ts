import { apiGeneral } from "./axiosConfig";

export interface WhatsappTemplate {
  content: string;
  isCustom: boolean;
  variables: string[];
}

export interface WhatsappTemplates {
  scheduleAppointment: WhatsappTemplate;
  scheduleAppointmentBatch: WhatsappTemplate;
  recurringAppointmentSeries: WhatsappTemplate;
  reminder: WhatsappTemplate;
  statusReservationApproved: WhatsappTemplate;
  statusReservationRejected: WhatsappTemplate;
}

export interface TemplatesResponse {
  templates: WhatsappTemplates;
  defaultTemplates: {
    scheduleAppointment: string;
    scheduleAppointmentBatch: string;
    recurringAppointmentSeries: string;
    reminder: string;
    statusReservationApproved: string;
    statusReservationRejected: string;
  };
}

const whatsappTemplateService = {
  /**
   * Obtiene todas las plantillas de WhatsApp de una organización
   */
  getTemplates: async (organizationId: string): Promise<TemplatesResponse> => {
    const response = await apiGeneral.get(
      `/whatsapp-templates/${organizationId}`
    );
    return response.data.data;
  },

  /**
   * Actualiza una plantilla específica
   */
  updateTemplate: async (
    organizationId: string,
    templateType: string,
    content: string
  ): Promise<WhatsappTemplate> => {
    const response = await apiGeneral.put(
      `/whatsapp-templates/${organizationId}/template`,
      {
        templateType,
        content,
      }
    );
    return response.data.data;
  },

  /**
   * Restaura una plantilla a su versión por defecto
   */
  resetTemplate: async (
    organizationId: string,
    templateType: string
  ): Promise<WhatsappTemplate> => {
    const response = await apiGeneral.post(
      `/whatsapp-templates/${organizationId}/reset`,
      {
        templateType,
      }
    );
    return response.data.data;
  },

  /**
   * Actualiza todas las plantillas
   */
  updateAllTemplates: async (
    organizationId: string,
    templates: Record<string, string>
  ): Promise<Record<string, string>> => {
    const response = await apiGeneral.put(
      `/whatsapp-templates/${organizationId}/all`,
      {
        templates,
      }
    );
    return response.data.data;
  },

  /**
   * Obtiene un preview de una plantilla con datos de ejemplo
   */
  previewTemplate: async (
    templateType: string,
    content: string
  ): Promise<string> => {
    const response = await apiGeneral.post(`/whatsapp-templates/preview`, {
      templateType,
      content,
    });
    return response.data.data.preview;
  },
};

export default whatsappTemplateService;
