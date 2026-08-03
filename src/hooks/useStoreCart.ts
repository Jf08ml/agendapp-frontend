import { useEffect, useState } from "react";
import type { StoreCartItem } from "../services/storeService";

// Carrito de la tienda pública, persistido en localStorage por organización
// (clave por org para no mezclar carritos entre tenants en el mismo navegador).
// Sin esto, navegar de /tienda a /tienda/producto/:id y volver vaciaba el
// carrito, ya que antes vivía solo en estado local de PublicStorePage.
const keyFor = (organizationId: string) => `store_cart_${organizationId}`;

export function useStoreCart(organizationId?: string) {
  const [cart, setCart] = useState<StoreCartItem[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    try {
      const raw = localStorage.getItem(keyFor(organizationId));
      setCart(raw ? JSON.parse(raw) : []);
    } catch {
      setCart([]);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    try {
      localStorage.setItem(keyFor(organizationId), JSON.stringify(cart));
    } catch {
      // localStorage lleno/deshabilitado: el carrito sigue funcionando en memoria
    }
  }, [cart, organizationId]);

  return [cart, setCart] as const;
}
