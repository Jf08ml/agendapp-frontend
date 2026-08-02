import { PublicPackageItem } from "../services/collectionService";

// El botón "Ir a comprar" de un programa (clase) enruta al paquete que lo
// incluye si existe uno activo; si no, a la reserva directa de la clase.
export function findPackageForClass(
  classId: string,
  packages: PublicPackageItem[]
): string | null {
  for (const pkg of packages) {
    const included = pkg.classes?.some(
      (c) => (c.classId as unknown as { _id?: string } | undefined)?._id === classId
    );
    if (included) return pkg._id;
  }
  return null;
}

// Reservar la clase directamente (pago por sesión individual) — siempre
// disponible, tenga o no la clase un paquete asociado.
export function buildClassReserveLink(classId: string): string {
  return `/reservar-clase?classId=${classId}`;
}

// Comprar el paquete que incluye la clase — solo cuando existe uno activo.
export function buildPackageBuyLink(packageId: string): string {
  return `/comprar-paquete?packageId=${packageId}`;
}
