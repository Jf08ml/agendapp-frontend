// Page sections — nav, hero, services, professionals, loyalty, location
const { useState: useStateSec, useEffect: useEffectSec } = React;

function Nav({ onBook, onHome }) {
  return (
    <header className="nav">
      <div className="mn-container nav-inner">
        <a
          href="#"
          className="nav-logo"
          onClick={(e) => { e.preventDefault(); onHome && onHome(); }}
        >
          <div className="nav-logo-mark">{business.initials}</div>
          <div className="mn-stack" style={{ gap: 2 }}>
            <div>{business.name}</div>
            <div className="nav-logo-tag">{business.tagline}</div>
          </div>
        </a>

        <nav className="nav-links">
          <a className="nav-link" href="#servicios">Servicios</a>
          <a className="nav-link" href="#equipo">Equipo</a>
          <a className="nav-link" href="#fidelidad">Fidelidad</a>
          <a className="nav-link" href="#ubicacion">Ubicación</a>
        </nav>

        <div className="nav-cta">
          <button className="mn-btn mn-btn-subtle" aria-label="Mi cuenta">
            <IconUser size={16} />
            <span className="hide-mobile">Mi cuenta</span>
          </button>
          <button className="mn-btn mn-btn-filled" onClick={() => onBook()}>
            <IconCalendar size={16} />
            Reservar
          </button>
        </div>
      </div>
    </header>
  );
}

// Hero: business-editable welcome title + body, with a stylized booking preview to the right.
function Hero({ onBook, copy, setCopy }) {
  return (
    <section className="hero">
      <div className="mn-container hero-grid">
        <div>
          <div className="hero-eyebrow-row">
            <span className="hero-status-dot" />
            <span className="eyebrow" style={{ color: "var(--text-dim)" }}>
              Disponible hoy · {business.hours.find((h) => h.today)?.time}
            </span>
          </div>

          <h1
            className="h-display editable"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => setCopy({ ...copy, title: e.currentTarget.innerText })}
            spellCheck={false}
          >
            {copy.title}
          </h1>

          <p
            className="hero-sub editable"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => setCopy({ ...copy, body: e.currentTarget.innerText })}
            spellCheck={false}
          >
            {copy.body}
          </p>

          <div className="hero-cta-row">
            <button className="mn-btn mn-btn-filled mn-btn-lg" onClick={onBook}>
              <IconCalendar size={18} />
              Reservar una cita
            </button>
            <a className="mn-btn mn-btn-outline mn-btn-lg" href="#servicios">
              Ver servicios
              <IconArrowRight size={16} />
            </a>
          </div>

          <div className="edit-hint">El negocio puede editar el saludo. Haz clic en el título.</div>

          <div className="hero-meta">
            <div className="hero-meta-item">
              <div className="hero-meta-num">
                {business.rating} <IconStar size={20} fill="currentColor" style={{ verticalAlign: -3 }} />
              </div>
              <div className="hero-meta-label">{business.reviewCount} reseñas</div>
            </div>
            <div className="hero-meta-item">
              <div className="hero-meta-num">{business.totalBookings}</div>
              <div className="hero-meta-label">Reservas</div>
            </div>
            <div className="hero-meta-item">
              <div className="hero-meta-num">{business.yearsOpen} años</div>
              <div className="hero-meta-label">En el barrio</div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-photo" style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=1100&q=80)`
          }} />
          <div className="hero-overlay-card hero-overlay-time">
            <IconBolt size={14} />
            Hoy · 3 cupos restantes
          </div>
          <div className="hero-overlay-card hero-overlay-appt">
            <div className="option-thumb" style={{ width: 44, height: 44, backgroundImage: `url(${services[0].photo})` }} />
            <div className="option-meta" style={{ flex: 1 }}>
              <strong style={{ fontSize: 14 }}>Próxima cita</strong>
              <span style={{ fontSize: 12 }}>Corte y peinado · Camila R.</span>
            </div>
            <div className="option-right">
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>14:30</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Services({ onBookService }) {
  const [activeCat, setActiveCat] = useStateSec("all");
  const filtered = activeCat === "all" ? services : services.filter((s) => s.category === activeCat);

  return (
    <section id="servicios" className="section">
      <div className="mn-container">
        <div className="section-head">
          <div className="section-head-text">
            <span className="eyebrow">Servicios</span>
            <h2 className="h-section">Todo lo que hacemos por ti.</h2>
            <p>Explora el menú completo. Tiempos, precios y disponibilidad en tiempo real.</p>
          </div>
          <a className="mn-btn mn-btn-outline" href="#">Ver catálogo completo <IconArrowRight size={14} /></a>
        </div>

        <div className="chips-row">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`chip ${activeCat === c.id ? "active" : ""}`}
              onClick={() => setActiveCat(c.id)}
            >
              {c.label} <span className="count">{c.count}</span>
            </button>
          ))}
        </div>

        <div className="services-grid">
          {filtered.map((s) => (
            <article key={s.id} className="mn-card mn-card-hover service-card" onClick={() => onBookService(s)}>
              <div className="service-thumb" style={{ backgroundImage: `url(${s.photo})` }} />
              <div className="service-body">
                <div className="service-meta-row">
                  <h3 className="h-card">{s.name}</h3>
                  <span className="service-duration"><IconClock size={12} /> {s.duration}m</span>
                </div>
                <p className="service-desc">{s.description}</p>
                <div className="service-cta-row">
                  <span className="service-price">{COP(s.price)}</span>
                  <button className="mn-btn mn-btn-light mn-btn-sm" onClick={(e) => { e.stopPropagation(); onBookService(s); }}>
                    Reservar
                    <IconArrowRight size={12} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Professionals() {
  return (
    <section id="equipo" className="section" style={{ background: "var(--bg-muted)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="mn-container">
        <div className="section-head">
          <div className="section-head-text">
            <span className="eyebrow">Equipo</span>
            <h2 className="h-section">Especialistas con manos expertas.</h2>
            <p>Reserva con quien prefieras o deja que nosotros te asignemos al mejor disponible.</p>
          </div>
        </div>

        <div className="pros-grid">
          {professionals.map((p) => (
            <article key={p.id} className="mn-card mn-card-hover pro-card">
              <div className="pro-avatar" style={{ backgroundImage: `url(${p.photo})` }} />
              <div className="pro-name">{p.name}</div>
              <div className="pro-role">{p.role}</div>
              <div className="pro-rating">
                <IconStar size={12} fill="currentColor" />
                {p.rating.toFixed(1)} · 120+ servicios
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LoyaltyAndLocation() {
  return (
    <section className="section">
      <div className="mn-container">
        <div className="section-head">
          <div className="section-head-text">
            <span className="eyebrow">Más</span>
            <h2 className="h-section">Fidelidad y ubicación.</h2>
            <p>Cada visita suma puntos canjeables. Y siempre sabrás cómo llegar.</p>
          </div>
        </div>

        <div className="split-grid">
          <div id="fidelidad" className="loyalty-card">
            <div className="loyalty-head">
              <div>
                <div className="eyebrow" style={{ color: "rgba(255,255,255,0.55)" }}>Plan Estrella</div>
                <div style={{ fontSize: 14, opacity: 0.7, marginTop: 6 }}>Bienvenida, María</div>
              </div>
              <IconGift size={28} stroke={1.4} />
            </div>

            <div className="loyalty-balance">
              480<small>pts</small>
            </div>
            <div style={{ fontSize: 13, opacity: 0.7, position: "relative" }}>
              720 pts para tu próxima recompensa
            </div>

            <div className="loyalty-progress">
              <div className="loyalty-progress-fill" style={{ inset: "0 60% 0 0" }} />
            </div>
            <div className="loyalty-row">
              <span>0</span>
              <span style={{ opacity: 1 }}>480</span>
              <span>1.200</span>
            </div>

            <div className="loyalty-perks">
              <div className="loyalty-perk"><span className="loyalty-perk-dot" />20% off facial al llegar a 600 pts</div>
              <div className="loyalty-perk"><span className="loyalty-perk-dot" />Servicio sorpresa a los 1.000 pts</div>
              <div className="loyalty-perk"><span className="loyalty-perk-dot" />Reserva prioritaria en agenda</div>
              <div className="loyalty-perk"><span className="loyalty-perk-dot" />Cumpleaños con regalo</div>
            </div>
          </div>

          <div id="ubicacion" className="mn-card location-card">
            <div className="mn-stack" style={{ gap: 6 }}>
              <div className="eyebrow">Ubicación</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.02em" }}>
                Encuéntranos
              </div>
            </div>

            <div className="location-map" role="img" aria-label="Mapa de ubicación">
              <div className="location-pin" />
            </div>

            <div className="mn-stack" style={{ gap: 14 }}>
              <div className="location-info-row">
                <div className="location-info-icon"><IconMapPin size={16} /></div>
                <div className="mn-stack" style={{ gap: 2 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{business.address}</div>
                  <a href="#" style={{ fontSize: 12, color: "var(--text-soft)" }}>Cómo llegar →</a>
                </div>
              </div>
              <div className="location-info-row">
                <div className="location-info-icon"><IconPhone size={16} /></div>
                <div className="mn-stack" style={{ gap: 2 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{business.phone}</div>
                  <a href="#" style={{ fontSize: 12, color: "var(--text-soft)" }}>WhatsApp</a>
                </div>
              </div>

              <hr className="mn-divider" style={{ margin: "4px 0" }} />

              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Horarios</div>
                <div className="hours-list">
                  {business.hours.map((h) => (
                    <div key={h.day} className={`hours-row ${h.today ? "today" : ""}`}>
                      <span className="day">{h.day}</span>
                      <span style={{ color: h.closed ? "var(--text-soft)" : "inherit", fontFamily: "var(--font-mono)", fontSize: 12 }}>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="mn-container footer-inner">
        <div className="footer-left">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="nav-logo-mark" style={{ width: 26, height: 26, fontSize: 11 }}>{business.initials}</div>
            <strong style={{ color: "var(--primary-contrast)", fontWeight: 600 }}>{business.name}</strong>
          </div>
          <div className="footer-sep optional" />
          <span className="footer-copy">© 2026</span>
          <div className="footer-sep optional" />
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
        </div>

        <div className="footer-right">
          <a className="powered-by" href="#" title="AgenditApp">
            <div className="powered-by-mark">A</div>
            <span>
              <span className="powered-by-text-long">Impulsado por </span>
              <strong>AgenditApp</strong>
            </span>
          </a>
          <a className="admin-btn" href="#admin" title="Acceso para personal y administradores">
            <span className="lock-dot" />
            <IconUser size={14} />
            <span className="admin-label-long">Acceso staff</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Nav, Hero, Services, Professionals, LoyaltyAndLocation, Footer });
