// Re-exportar todos los layouts. Minimal, Cards y Modern muestran hoy la misma
// plantilla Esencial (rediseño); se conservan los nombres para no cambiar qué
// ve cada negocio según su `homeLayout`.
export { EssentialLayout as ModernLayout } from "./EssentialLayout";
export { EssentialLayout as MinimalLayout } from "./EssentialLayout";
export { EssentialLayout as CardsLayout } from "./EssentialLayout";
export { LandingLayout } from "./LandingLayout";
export { AcademyLandingLayout } from "./AcademyLandingLayout";

// Tipos compartidos
export interface Feature {
  title: string;
  icon: React.ReactNode;
  link: string;
  show?: boolean;
}

export interface HomeLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
}
