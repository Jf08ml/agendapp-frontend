import type { ZodSchema } from "zod";

/**
 * zodResolver compatible con Zod v4 para @mantine/form v8.
 * El paquete mantine-form-zod-resolver@1.x fue construido para Zod v3
 * y usa `parsed.error.errors`, que fue reemplazado por `parsed.error.issues` en Zod v4.
 */
export function zodResolver<T>(schema: ZodSchema<T>) {
  return (values: T): Record<string, string> => {
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      return {};
    }
    // Zod v4 usa .issues; Zod v3 usaba .errors (alias de .issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issues = (parsed.error as any).issues ?? (parsed.error as any).errors ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return issues.reduce((acc: Record<string, string>, issue: any) => {
      const path = issue.path.join(".");
      if (path && !acc[path]) {
        acc[path] = issue.message;
      }
      return acc;
    }, {});
  };
}
