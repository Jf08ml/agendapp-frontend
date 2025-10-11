import type { Organization } from "../../../services/organizationService";

export const ensureBranding = (b?: Organization["branding"]) => b ?? {};
export const ensureDomains = (d?: string[]) => (Array.isArray(d) ? d : []);
