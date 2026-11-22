// Paso «Servicio» (rediseño, ServicePicker de ReservaMovil): buscador, chips de
// categoría y lista de servicios seleccionables (varios a la vez). El
// profesional se elige en el paso siguiente.
import { useMemo, useState } from "react";
import { IconCheck, IconPhoto, IconSearch } from "@tabler/icons-react";
import { Service } from "../../services/serviceService";
import { SelectedService } from "../../types/multiBooking";
import { formatCurrency } from "../../utils/formatCurrency";

interface ServicePickerProps {
  services: Service[];
  value: SelectedService[];
  onChange: (next: SelectedService[]) => void;
  currency?: string;
}

const FEATURED = "__featured";
const ALL = "__all";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function serviceMeta(service: Service, currency?: string): string {
  const showPrice = !service.hidePrice && Number(service.price) > 0;
  return [`${service.duration} min`, showPrice ? formatCurrency(Number(service.price), currency) : null]
    .filter(Boolean)
    .join(" · ");
}

export default function ServicePicker({ services, value, onChange, currency }: ServicePickerProps) {
  const [query, setQuery] = useState("");
  const hasFeatured = services.some((s) => s.featured);
  const [category, setCategory] = useState<string>(hasFeatured ? FEATURED : ALL);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services) {
      const t = (s.type || "").trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [services]);

  const chips: { key: string; label: string; count: number }[] = [
    ...(hasFeatured ? [{ key: FEATURED, label: "Destacados", count: services.filter((s) => s.featured).length }] : []),
    { key: ALL, label: "Todos", count: services.length },
    ...(categories.length > 1 ? categories.map(([t, n]) => ({ key: t, label: t, count: n })) : []),
  ];

  const selectedIds = new Set(value.map((v) => v.serviceId));

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    // Con búsqueda se busca en todo el catálogo, sin importar la categoría
    if (q) return services.filter((s) => normalize(s.name).includes(q) || normalize(s.type || "").includes(q));
    if (category === FEATURED) return services.filter((s) => s.featured);
    if (category === ALL) return services;
    return services.filter((s) => (s.type || "").trim() === category);
  }, [services, query, category]);

  const toggle = (serviceId: string) => {
    if (selectedIds.has(serviceId)) onChange(value.filter((v) => v.serviceId !== serviceId));
    else onChange([...value, { serviceId, employeeId: null }]);
  };

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
      <div className="ag-search">
        <input
          className="ag-input"
          type="search"
          placeholder="Buscar servicio"
          aria-label="Buscar servicio"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <span aria-hidden="true">
          <IconSearch size={16} stroke={1.75} />
        </span>
      </div>

      {!query && chips.length > 1 && (
        <div className="ag-tabs" role="tablist" aria-label="Categorías" style={{ scrollbarWidth: "none" }}>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              className="ag-chip"
              aria-selected={category === c.key}
              onClick={() => setCategory(c.key)}
            >
              {c.label} <span className="count">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      <div role="listbox" aria-multiselectable="true" aria-label="Servicios">
        {visible.length === 0 && (
          <p className="ag-muted" style={{ textAlign: "center", margin: "var(--space-5) 0" }}>
            No encontramos servicios con «{query}».
          </p>
        )}
        {visible.map((service) => {
          const checked = selectedIds.has(service._id);
          const img = service.images?.[0];
          return (
            <div
              key={service._id}
              className="ag-pick"
              role="option"
              aria-checked={checked}
              aria-selected={checked}
              tabIndex={0}
              onClick={() => toggle(service._id)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggle(service._id);
                }
              }}
            >
              <div className="ag-pick__thumb ag-photo" style={{ overflow: "hidden" }}>
                {img ? (
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <IconPhoto size={18} stroke={1.75} />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="ag-pick__name">{service.name}</div>
                <div className="ag-subtle ag-num">{serviceMeta(service, currency)}</div>
              </div>
              <span className="ag-pick__check" aria-hidden="true">
                {checked && <IconCheck size={16} stroke={2.5} />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
