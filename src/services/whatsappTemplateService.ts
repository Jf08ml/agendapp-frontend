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
  secondReminder: WhatsappTemplate;
  statusReservationPending: WhatsappTemplate;
  statusReservationApproved: WhatsappTemplate;
  statusReservationRejected: WhatsappTemplate;
  clientConfirmationAck: WhatsappTemplate;
  clientCancellationAck: WhatsappTemplate;
  clientNoShowAck: WhatsappTemplate;
  loyaltyServiceReward: WhatsappTemplate;
  loyaltyReferralReward: WhatsappTemplate;
  // 📚 Módulo de Clases (opcionales: el editor de clases las consume)
  classEnrollmentConfirmed?: WhatsappTemplate;
  classEnrollmentPending?: WhatsappTemplate;
  classEnrollmentCancelled?: WhatsappTemplate;
  classReminder?: WhatsappTemplate;
  // 🎂 Cumpleaños (siempre presente en la respuesta del backend)
  birthdayGreeting: WhatsappTemplate;
}

export interface TemplatesResponse {
  templates: WhatsappTemplates;
  // 🎂 Beneficio de cumpleaños configurado por la org (texto para {{beneficio}})
  birthdayBenefit?: string;
  defaultTemplates: {
    scheduleAppointment: string;
    scheduleAppointmentBatch: string;
    recurringAppointmentSeries: string;
    reminder: string;
    secondReminder: string;
    statusReservationPending: string;
    statusReservationApproved: string;
    statusReservationRejected: string;
    clientConfirmationAck: string;
    clientCancellationAck: string;
    clientNoShowAck: string;
    loyaltyServiceReward: string;
    loyaltyReferralReward: string;
    classEnrollmentConfirmed?: string;
    classEnrollmentPending?: string;
    classEnrollmentCancelled?: string;
    classReminder?: string;
    birthdayGreeting?: string;
  };
}

export interface WhatsappTemplateSettings {
  scheduleAppointment?: boolean;
  scheduleAppointmentBatch?: boolean;
  recurringAppointmentSeries?: boolean;
  reminder?: boolean;
  secondReminder?: boolean;
  statusReservationPending?: boolean;
  statusReservationApproved?: boolean;
  statusReservationRejected?: boolean;
  clientConfirmationAck?: boolean;
  clientCancellationAck?: boolean;
  clientNoShowAck?: boolean;
  loyaltyServiceReward?: boolean;
  loyaltyReferralReward?: boolean;
  // 📚 Módulo de Clases
  classEnrollmentConfirmed?: boolean;
  classEnrollmentPending?: boolean;
  classEnrollmentCancelled?: boolean;
  classReminder?: boolean;
  // 🎂 Cumpleaños
  birthdayGreeting?: boolean;
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

  /**
   * 🆕 Obtiene la configuración de envíos (qué mensajes enviar)
   */
  getTemplateSettings: async (
    organizationId: string
  ): Promise<WhatsappTemplateSettings> => {
    const response = await apiGeneral.get(
      `/whatsapp-templates/${organizationId}/settings`
    );
    return response.data.data;
  },

  /**
   * 🆕 Actualiza la configuración de envíos
   */
  updateTemplateSettings: async (
    organizationId: string,
    settings: WhatsappTemplateSettings
  ): Promise<WhatsappTemplateSettings> => {
    const response = await apiGeneral.put(
      `/whatsapp-templates/${organizationId}/settings`,
      { enabledTypes: settings }
    );
    return response.data.data;
  },

  /**
   * 🎂 Actualiza el beneficio de cumpleaños (texto inyectado en {{beneficio}})
   */
  updateBirthdayBenefit: async (
    organizationId: string,
    birthdayBenefit: string
  ): Promise<{ birthdayBenefit: string }> => {
    const response = await apiGeneral.put(
      `/whatsapp-templates/${organizationId}/birthday-benefit`,
      { birthdayBenefit }
    );
    return response.data.data;
  },
};

export default whatsappTemplateService;
