// Catálogo de clases (rediseño, ClasesPublico): buscador «Buscar clase» y
// tarjetas con foto, precio por persona (o «Gratis»; oculto si hidePrice),
// duración, «Destacada» y el descuento grupal. Misma tarjeta que los servicios.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ActionIcon, Button, Skeleton, TextInput } from "@mantine/core";
import { useSelector } from "react-redux";
import { IconClock, IconPhoto, IconSearch, IconStar, IconX } from "@tabler/icons-react";
import { RootState } from "../../app/store";
import { getClassesByOrganization, ClassType } from "../../services/classService";
import { listPublicPackages, PublicPackageItem } from "../../services/collectionService";
import { formatCurrency } from "../../utils/formatCurrency";
import { findPackageForClass, buildClassReserveLink, buildPackageBuyLink } from "../../utils/programPurchase";

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 } as const;

export default function ProgramsCatalogPage() {
  const organization = useSelector((state: RootState) => state.organization.organization);
  const orgId = organization?._id as string | undefined;

  const [classes, setClasses] = useState<ClassType[]>([]);
  const [packages, setPackages] = useState<PublicPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const [allClasses, packagesResult] = await Promise.all([getClassesByOrganization(orgId), listPublicPackages(orgId)]);
        if (!alive) return;
        setClasses(allClasses.filter((c) => c.isActive));
        setPackages(packagesResult?.packages || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orgId]);

  const filteredClasses = useMemo(() => {
    const q = normalize(query);
    const source = !q ? classes : classes.filter((c) => normalize(c.name).includes(q) || normalize(c.description || "").includes(q));
    // Destacadas primero, sin duplicarlas.
    return [...source.filter((c) => c.featured), ...source.filter((c) => !c.featured)];
  }, [classes, query]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, font: "600 26px/32px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Clases</h1>
          {!loading && (
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              {classes.length === 1 ? "1 clase" : `${classes.length} clases`} en {organization?.name}
            </div>
          )}
        </div>

        <TextInput
          placeholder="Buscar clase"
          aria-label="Buscar clase"
          leftSection={<IconSearch size={16} />}
          rightSection={
            query && (
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setQuery("")} aria-label="Borrar búsqueda">
                <IconX size={14} />
              </ActionIcon>
            )
          }
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          maw={420}
        />

        {loading ? (
          <div style={grid}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={300} radius="md" />
            ))}
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="ag-card" style={{ padding: "40px 20px", textAlign: "center" }}>
            <div className="ag-muted" style={{ fontSize: 14 }}>{classes.length === 0 ? "No hay clases disponibles." : "No encontramos clases con esa búsqueda."}</div>
          </div>
        ) : (
          <div style={grid}>
            {filteredClasses.map((cls) => (
              <ProgramCard key={cls._id} classDoc={cls} packageId={findPackageForClass(cls._id, packages)} currency={organization?.currency} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgramCard({ classDoc, packageId, currency }: { classDoc: ClassType; packageId: string | null; currency?: string }) {
  const navigate = useNavigate();
  const image = classDoc.images?.[0];
  const isFree = classDoc.pricePerPerson === 0;
  const open = () => navigate(`/programa/${classDoc._id}`, { state: { backTo: "/programas" } });
  const discount = classDoc.groupDiscount?.enabled ? classDoc.groupDiscount : null;

  return (
    <article
      className="ag-card ag-card--hover ag-service"
      style={{ width: "auto" }}
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === "Enter" && open()}
    >
      <div className="ag-service__img ag-photo">
        {image ? <img src={image} alt={classDoc.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <IconPhoto size={28} stroke={1.5} />}
        {classDoc.featured && (
          <span className="ag-badge">
            <IconStar size={14} stroke={2} /> Destacada
          </span>
        )}
      </div>
      <div className="ag-service__body">
        <h3 className="ag-service__name">{classDoc.name}</h3>
        {classDoc.description && (
          <span className="ag-subtle" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {classDoc.description}
          </span>
        )}
        <div className="ag-service__meta">
          {classDoc.hidePrice ? (
            <span />
          ) : (
            <span className="ag-price">
              {isFree ? "Gratis" : formatCurrency(classDoc.pricePerPerson, currency || "COP")}
              {!isFree && <span className="ag-subtle" style={{ fontWeight: 400 }}> / persona</span>}
            </span>
          )}
          <span className="ag-duration">
            <IconClock size={14} stroke={1.75} /> {classDoc.duration} min
          </span>
        </div>
        {discount && (
          <span className="ag-badge ag-badge--brand" style={{ alignSelf: "flex-start", marginTop: 4 }}>
            {discount.discountPercent ? `${discount.discountPercent} % de descuento` : "Descuento"} desde {discount.minPeople} personas
          </span>
        )}
        <div className="ag-stack" style={{ gap: 6, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
          <Button component={Link} to={buildClassReserveLink(classDoc._id)} variant="default" size="sm" fullWidth>
            Reservar clase
          </Button>
          {packageId && (
            <Button component={Link} to={buildPackageBuyLink(packageId)} variant="subtle" size="sm" fullWidth>
              Comprar paquete
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
