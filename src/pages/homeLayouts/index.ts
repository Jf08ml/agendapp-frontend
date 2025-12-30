// Re-exportar todos los layouts
export { ModernLayout } from "./ModernLayout";
export { MinimalLayout } from "./MinimalLayout";
export { CardsLayout } from "./CardsLayout";
export { LandingLayout } from "./LandingLayout";

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
