// Detalle de producto (rediseño, TiendaPublica): fotos, precio, descripción,
// "Modo de uso" y la barra "Agregar al pedido" (fija abajo en móvil).
import { useEffect, useState } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { Button, Skeleton } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { useMediaQuery } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { IconArrowLeft, IconClipboardCheck, IconMinus, IconPhoto, IconPlus, IconShare, IconShoppingCart } from "@tabler/icons-react";
import { RootState } from "../../app/store";
import { getProductDetail, StoreProduct } from "../../services/storeService";
import { useStoreCart } from "../../hooks/useStoreCart";
import { formatCurrency } from "../../utils/formatCurrency";
import { storeImageSrc } from "../../utils/storeImage";

const STYLES = `
  .pd-layout { display: grid; gap: 24px; }
  @media (min-width: 48em) { .pd-layout { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px; align-items: start; } }
  .pd-photo { aspect-ratio: 1; border-radius: 16px; overflow: hidden; }
  .pd-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pd-stepper { display: inline-flex; align-items: center; border: 1px solid var(--line-control); border-radius: 999px; height: 36px; }
  .pd-stepper button { width: 36px; height: 34px; border: 0; background: none; color: var(--ink); display: grid; place-items: center; cursor: pointer; border-radius: 999px; }
  .pd-stepper button:hover { background: var(--surface-hover); }
  .pd-stepper span { min-width: 28px; text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }
  .pd-bar-mobile { position: fixed; left: 0; right: 0; bottom: 0; z-index: 150; background: var(--surface-raised); border-top: 1px solid var(--line); padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); }
`;

export default function PublicProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  // De dónde vino el visitante — siempre la tienda, salvo enlace directo/compartido.
  const backTo = (location.state as { backTo?: string } | null)?.backTo || "/tienda";
  const isMobile = useMediaQuery("(max-width: 48em)");
  const organization = useSelector((s: RootState) => s.organization.organization);

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useStoreCart(organization?._id);

  useEffect(() => {
    if (!id || !organization?._id) return;
    let alive = true;
    setLoading(true);
    setNotFound(false);
    getProductDetail(id, organization._id).then((data) => {
      if (!alive) return;
      if (data) {
        setProduct(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id, organization?._id]);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — ${organization?.name || ""}`;
    }
    return () => {
      document.title = organization?.name || "AgenditApp";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: product?.name,
      text: product ? `${product.name} — ${organization?.name || ""}` : undefined,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // El usuario canceló el share sheet — no es un error real
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showNotification({
        title: "Enlace copiado",
        message: "Ya puedes compartirlo por WhatsApp o donde prefieras.",
        icon: <IconClipboardCheck size={16} />,
      });
    } catch {
      showNotification({
        title: "No se pudo copiar el enlace",
        message: "Copia la dirección desde la barra del navegador.",
        color: "red",
      });
    }
  };

  const page = { maxWidth: 1040, margin: "0 auto", padding: isMobile ? "16px 16px 112px" : "24px 24px 64px" } as const;

  if (loading || !organization) {
    return (
      <div style={page}>
        <div className="pd-layout">
          <style>{STYLES}</style>
          <Skeleton radius={16} style={{ aspectRatio: "1", height: "auto" }} />
          <div>
            <Skeleton height={14} width="30%" mb={12} />
            <Skeleton height={28} width="80%" mb={12} />
            <Skeleton height={22} width="40%" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div style={{ ...page, maxWidth: 480, paddingTop: 48 }}>
        <div className="ag-card" style={{ padding: "40px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <b style={{ fontSize: 15 }}>No encontramos este producto</b>
          <div className="ag-muted" style={{ fontSize: 14 }}>Puede que ya no esté disponible. Mira el resto del catálogo de {organization.name}.</div>
          <Button variant="default" mt={8} component={Link} to="/tienda">
            Ver toda la tienda
          </Button>
        </div>
      </div>
    );
  }

  const currency = organization.currency || "COP";
  const images = [product.imageUrl, ...(product.images || [])].filter((img): img is string => !!img);
  const qty = cart.find((i) => i.product._id === product._id)?.quantity ?? 0;
  const soldOut = !!product.outOfStock;

  const addToCart = () => {
    showNotification({
      message: "Producto agregado a tu pedido.",
      icon: <IconShoppingCart size={16} />,
      autoClose: 2000,
      withBorder: true,
    });
    setCart((prev) => {
      const existing = prev.find((i) => i.product._id === product._id);
      if (existing) {
        return prev.map((i) => (i.product._id === product._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (delta: number) => {
    setCart((prev) =>
      prev.map((i) => (i.product._id === product._id ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0)
    );
  };

  const addBar = soldOut ? (
    <Button fullWidth size="md" disabled>
      Agotado
    </Button>
  ) : qty === 0 ? (
    <Button fullWidth size="md" onClick={addToCart}>
      Agregar al pedido · {formatCurrency(product.salePrice, currency)}
    </Button>
  ) : (
    <div className="ag-row" style={{ gap: 12, flexWrap: "nowrap" }}>
      <div className="pd-stepper" role="group" aria-label="Cantidad">
        <button type="button" aria-label="Quitar uno" onClick={() => changeQty(-1)}>
          <IconMinus size={16} />
        </button>
        <span>{qty}</span>
        <button type="button" aria-label="Agregar uno" onClick={() => changeQty(1)}>
          <IconPlus size={16} />
        </button>
      </div>
      <Button style={{ flex: 1 }} size="md" onClick={() => navigate("/tienda", { state: { openCart: true } })}>
        Ver pedido
      </Button>
    </div>
  );

  return (
    <div style={page}>
      <style>{STYLES}</style>
      <Link to={backTo} className="ag-link ag-row" style={{ gap: 4, marginBottom: 16, display: "inline-flex" }}>
        <IconArrowLeft size={14} /> Volver a la tienda
      </Link>

      <div className="pd-layout">
        <div className="pd-photo ag-photo">
          {images.length > 1 ? (
            <Carousel withIndicators loop height="100%" style={{ width: "100%", height: "100%" }}>
              {images.map((img, i) => (
                <Carousel.Slide key={i}>
                  <img src={storeImageSrc(img)} alt={`${product.name} (${i + 1} de ${images.length})`} />
                </Carousel.Slide>
              ))}
            </Carousel>
          ) : images.length === 1 ? (
            <img src={storeImageSrc(images[0])} alt={product.name} />
          ) : (
            <IconPhoto size={48} />
          )}
        </div>

        <div className="ag-stack" style={{ gap: 16 }}>
          <div className="ag-stack" style={{ gap: 6 }}>
            <div className="ag-row" style={{ justifyContent: "space-between", gap: 8 }}>
              <div className="ag-row" style={{ gap: 6 }}>
                {product.category && <span className="ag-badge ag-badge--outline">{product.category}</span>}
                {product.featured && !soldOut && <span className="ag-badge ag-badge--brand">Destacado</span>}
                {soldOut && <span className="ag-badge ag-badge--danger">Agotado</span>}
              </div>
              <Button variant="subtle" color="gray" size="xs" leftSection={<IconShare size={14} />} onClick={handleShare}>
                Compartir
              </Button>
            </div>
            {product.brand && (
              <div className="ag-subtle" style={{ textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600 }}>
                {product.brand}
              </div>
            )}
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>{product.name}</h1>
            <div className="ag-price" style={{ fontSize: 22, lineHeight: "28px" }}>
              {formatCurrency(product.salePrice, currency)}
            </div>
          </div>

          {!isMobile && addBar}

          {product.description && (
            <div style={{ fontSize: 15, lineHeight: "23px", whiteSpace: "pre-wrap" }}>{product.description}</div>
          )}

          {product.usageInstructions && (
            <div className="ag-card" style={{ padding: 16 }}>
              <b style={{ display: "block", fontSize: 14, marginBottom: 4 }}>Modo de uso</b>
              <div className="ag-muted" style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>
                {product.usageInstructions}
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && <div className="pd-bar-mobile">{addBar}</div>}
    </div>
  );
}
