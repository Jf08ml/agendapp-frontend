import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { Button, Skeleton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Carousel } from "@mantine/carousel";
import { Image } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import {
  IconArrowLeft,
  IconClock,
  IconPhoto,
  IconShare,
  IconClipboardCheck,
  IconFileTypePdf,
} from "@tabler/icons-react";
import { RootState } from "../../app/store";
import { getPublicClassById, ClassType } from "../../services/classService";
import { listPublicPackages, PublicPackageItem } from "../../services/collectionService";
import { formatCurrency } from "../../utils/formatCurrency";
import { getVideoEmbedUrl } from "../../utils/videoEmbed";
import { findPackageForClass, buildClassReserveLink, buildPackageBuyLink } from "../../utils/programPurchase";

// Detalle de una clase (rediseño, ClasesPublico): galería, compartir, precio por
// persona, duración, descripción, descuento grupal, video y «Comprar paquete».
// En móvil, barra inferior con el precio y «Reservar clase».
const shell = { maxWidth: 720, margin: "0 auto", padding: "24px 16px 48px" } as const;

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  // De dónde vino el visitante: landing ("/") o catálogo completo de
  // programas (/programas). Viaja por location.state; sin estado (visita
  // directa/compartida) cae a la raíz.
  const backTo = (location.state as { backTo?: string } | null)?.backTo || "/";
  const organization = useSelector((s: RootState) => s.organization.organization);
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [classDoc, setClassDoc] = useState<ClassType | null>(null);
  const [packages, setPackages] = useState<PublicPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !organization?._id) return;
    const classId = id;
    const organizationId = organization._id;
    let alive = true;
    setLoading(true);
    setNotFound(false);
    void (async () => {
      const [data, packagesResult] = await Promise.all([
        getPublicClassById(classId, organizationId),
        listPublicPackages(organizationId),
      ]);
      if (!alive) return;
      if (data) {
        setClassDoc(data);
        setPackages(packagesResult?.packages || []);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, organization?._id]);

  useEffect(() => {
    if (classDoc) {
      document.title = `${classDoc.name} — ${organization?.name || ""}`;
    }
    return () => {
      document.title = organization?.name || "AgenditApp";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classDoc]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: classDoc?.name,
      text: classDoc ? `${classDoc.name} — ${organization?.name || ""}` : undefined,
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
        color: "green",
        icon: <IconClipboardCheck size={16} />,
      });
    } catch {
      showNotification({
        title: "No se pudo copiar el enlace",
        message: "Copia la URL manualmente desde la barra de direcciones.",
        color: "red",
      });
    }
  };

  if (loading || !organization) {
    return (
      <div style={shell}>
        <Skeleton height={14} width={120} mb={16} />
        <Skeleton radius="lg" style={{ aspectRatio: "4 / 3", height: "auto" }} mb={16} />
        <Skeleton height={28} width="70%" mb={10} />
        <Skeleton height={20} width="40%" />
      </div>
    );
  }

  if (notFound || !classDoc) {
    return (
      <div style={shell}>
        <div className="ag-card" style={{ padding: 24, textAlign: "center" }}>
          <h1 style={{ margin: "0 0 6px", font: "600 20px/26px var(--mantine-font-family)" }}>No encontramos esta clase</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginBottom: 14 }}>Puede que ya no esté disponible. Mira el resto de clases de {organization.name}.</div>
          <Button component={Link} to={backTo === "/" ? "/programas" : backTo}>
            Ver todas las clases
          </Button>
        </div>
      </div>
    );
  }

  const isFree = classDoc.pricePerPerson === 0;
  const videoEmbedUrl = classDoc.videoUrl ? getVideoEmbedUrl(classDoc.videoUrl) : null;
  const packageId = findPackageForClass(classDoc._id, packages);
  const priceLabel = classDoc.hidePrice ? null : isFree ? "Gratis" : formatCurrency(classDoc.pricePerPerson, organization.currency || "COP");
  const discount = classDoc.groupDiscount?.enabled ? classDoc.groupDiscount : null;

  const actions = (
    <div className="ag-stack" style={{ gap: 8 }}>
      <Button component={Link} to={buildClassReserveLink(classDoc._id)} size="md" fullWidth>
        Reservar clase
      </Button>
      {packageId && (
        <Button component={Link} to={buildPackageBuyLink(packageId)} size="md" variant="subtle" fullWidth>
          Comprar paquete
        </Button>
      )}
    </div>
  );

  return (
    <div style={{ ...shell, paddingBottom: isMobile ? 120 : 48 }}>
      <Link to={backTo} className="ag-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, marginBottom: 16, color: "var(--ink-muted)" }}>
        <IconArrowLeft size={14} /> Volver a clases
      </Link>

      <div className="ag-photo" style={{ aspectRatio: "4 / 3", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--surface-muted)", display: "grid", placeItems: "center" }}>
        {classDoc.images && classDoc.images.length > 0 ? (
          classDoc.images.length > 1 ? (
            <Carousel withIndicators loop height="100%" style={{ width: "100%", height: "100%" }}>
              {classDoc.images.map((img, i) => (
                <Carousel.Slide key={i}>
                  <Image src={img} h="100%" fit="cover" alt={classDoc.name} />
                </Carousel.Slide>
              ))}
            </Carousel>
          ) : (
            <Image src={classDoc.images[0]} h="100%" w="100%" fit="cover" alt={classDoc.name} />
          )
        ) : (
          <IconPhoto size={40} stroke={1.3} color="var(--ink-subtle)" />
        )}
      </div>

      <div className="ag-stack" style={{ gap: 14, marginTop: 20 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <h1 style={{ margin: 0, font: "600 26px/32px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>{classDoc.name}</h1>
          <div className="ag-row" style={{ gap: 4, flex: "none" }}>
            {classDoc.pdfUrl && (
              <Button component="a" href={classDoc.pdfUrl} target="_blank" rel="noopener noreferrer" variant="subtle" color="gray" size="xs" leftSection={<IconFileTypePdf size={14} />}>
                PDF
              </Button>
            )}
            <Button variant="subtle" color="gray" size="xs" leftSection={<IconShare size={14} />} onClick={handleShare}>
              Compartir
            </Button>
          </div>
        </div>

        <div className="ag-row" style={{ gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
          {priceLabel && (
            <span className="ag-num" style={{ font: "600 24px/30px var(--font-sans)" }}>
              {priceLabel}
              {!isFree && <span className="ag-subtle" style={{ fontWeight: 400 }}> / persona</span>}
            </span>
          )}
          <span className="ag-duration">
            <IconClock size={16} stroke={1.75} /> {classDoc.duration} min
          </span>
        </div>

        {!isMobile && actions}

        {classDoc.description && <div style={{ whiteSpace: "pre-wrap", fontSize: 15, lineHeight: "22px" }}>{classDoc.description}</div>}

        {discount && (
          <div className="ag-card" style={{ padding: 14 }}>
            <b style={{ display: "block", fontSize: 14 }}>Descuento grupal</b>
            <div className="ag-muted" style={{ fontSize: 14 }}>
              {discount.discountPercent} % de descuento reservando desde {discount.minPeople} personas
              {discount.maxPeople ? ` hasta ${discount.maxPeople}` : ""}.
            </div>
          </div>
        )}

        {classDoc.videoUrl && (
          <div>
            <b style={{ display: "block", fontSize: 15, marginBottom: 8 }}>Video</b>
            {videoEmbedUrl ? (
              <div style={{ aspectRatio: "16 / 9", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <iframe
                  src={videoEmbedUrl}
                  title={`Video — ${classDoc.name}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ border: 0, width: "100%", height: "100%" }}
                />
              </div>
            ) : (
              <Button component="a" href={classDoc.videoUrl} target="_blank" rel="noopener noreferrer" variant="default">
                Ver video
              </Button>
            )}
          </div>
        )}
      </div>

      {isMobile && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            background: "var(--surface-raised)",
            borderTop: "1px solid var(--line)",
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          {priceLabel && (
            <div style={{ flex: "none" }}>
              <div className="ag-num" style={{ fontWeight: 600 }}>{priceLabel}</div>
              {!isFree && <div className="ag-subtle">por persona</div>}
            </div>
          )}
          <Button component={Link} to={buildClassReserveLink(classDoc._id)} size="md" style={{ flex: 1 }}>
            Reservar clase
          </Button>
        </div>
      )}
    </div>
  );
}
