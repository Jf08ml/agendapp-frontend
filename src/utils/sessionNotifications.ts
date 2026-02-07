/**
 * Gestión de notificaciones de sesión
 * Maneja eventos de expiración y renovación de sesión/token
 */

import React from "react";
import { notifications } from "@mantine/notifications";
import { FiClock, FiAlertCircle, FiRefreshCw } from "react-icons/fi";

// Información de expiración del token
export interface TokenExpiryInfo {
  expiresAt: string | null;
  timeRemaining: number | null; // ms
}

export const getTokenExpiryInfo = (): TokenExpiryInfo => {
  const expiresAtStr = localStorage.getItem("app_token_expires_at");
  if (!expiresAtStr) {
    return { expiresAt: null, timeRemaining: null };
  }

  const expiresAt = new Date(expiresAtStr).getTime();
  const now = Date.now();
  const timeRemaining = expiresAt - now;

  return {
    expiresAt: expiresAtStr,
    timeRemaining: timeRemaining > 0 ? timeRemaining : null,
  };
};

/**
 * Formatea tiempo en ms a un string legible
 * Ej: 3661000 => "1 hora 1 minuto"
 */
export const formatTimeRemaining = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} hora${hours > 1 ? "s" : ""} ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  }
  if (minutes > 0) {
    return `${minutes} minuto${minutes > 1 ? "s" : ""} ${seconds} segundo${seconds > 1 ? "s" : ""}`;
  }
  return `${seconds} segundo${seconds > 1 ? "s" : ""}`;
};

/**
 * Muestra una notificación de token expirando pronto
 */
export const showTokenExpiringNotification = (timeRemaining: number) => {
  notifications.show({
    id: "token-expiring-soon",
    title: "Sesión expirando pronto",
    message: `Tu sesión expirará en ${formatTimeRemaining(timeRemaining)}. La renovación es automática.`,
    color: "yellow",
    icon: React.createElement(FiClock, { size: 20 }),
    autoClose: 5000,
    withCloseButton: true,
  });
};

/**
 * Muestra una notificación de token renovado
 */
export const showTokenRefreshedNotification = () => {
  notifications.show({
    id: "token-refreshed",
    title: "Sesión renovada",
    message: "Tu sesión ha sido renovada automáticamente. Continúa trabajando sin interrupciones.",
    color: "green",
    icon: React.createElement(FiRefreshCw, { size: 20 }),
    autoClose: 3000,
    withCloseButton: true,
  });
};

/**
 * Muestra una notificación de sesión expirada
 */
export const showSessionExpiredNotification = () => {
  notifications.show({
    id: "session-expired",
    title: "Sesión expirada",
    message:
      "Tu sesión ha expirado. Serás redirigido al login. Por favor, inicia sesión nuevamente.",
    color: "red",
    icon: React.createElement(FiAlertCircle, { size: 20 }),
    autoClose: false,
    withCloseButton: true,
  });
};

/**
 * Muestra una notificación de membresía suspendida
 */
export const showMembershipSuspendedNotification = (message: string) => {
  notifications.show({
    id: "membership-suspended",
    title: "Membresía suspendida",
    message,
    color: "red",
    icon: React.createElement(FiAlertCircle, { size: 20 }),
    autoClose: false,
    withCloseButton: true,
  });
};

/**
 * Registra los listeners para los eventos de sesión
 */
export const registerSessionEventListeners = () => {
  // Escuchar evento de sesión expirada
  const handleSessionExpired = () => {
    showSessionExpiredNotification();
  };

  // Escuchar evento de membresía suspendida
  const handleMembershipSuspended = (event: Event) => {
    const customEvent = event as CustomEvent;
    showMembershipSuspendedNotification(
      customEvent.detail?.message || "Tu membresía ha sido suspendida"
    );
  };

  window.addEventListener("session-expired", handleSessionExpired);
  window.addEventListener("membership-suspended", handleMembershipSuspended);

  // Limpiar listeners
  return () => {
    window.removeEventListener("session-expired", handleSessionExpired);
    window.removeEventListener("membership-suspended", handleMembershipSuspended);
  };
};
