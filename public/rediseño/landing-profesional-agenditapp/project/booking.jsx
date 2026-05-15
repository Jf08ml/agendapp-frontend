// Booking flow — full-page view, not a modal.
// Mounted at route="booking" (hash #/reservar). Two columns: stepper card + sticky recap.
const { useState, useEffect } = React;

function BookingView({ initialService, onExit }) {
  const [step, setStep] = useState(initialService ? 1 : 0);
  const [service, setService] = useState(initialService || null);
  const [pro, setPro] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);

  // Reset to step 1 if the caller swapped in a pre-selected service after mount.
  useEffect(() => {
    if (initialService) {
      setService(initialService);
      setStep((s) => (s === 0 ? 1 : s));
    }
  }, [initialService]);

  const steps = [
    { label: "Servicio", icon: <IconSparkle size={14} /> },
    { label: "Profesional", icon: <IconUser size={14} /> },
    { label: "Fecha y hora", icon: <IconCalendar size={14} /> },
    { label: "Confirmación", icon: <IconCheck size={14} /> },
  ];
  const canNext =
    (step === 0 && service) ||
    (step === 1 && pro) ||
    (step === 2 && date && time) ||
    step === 3;
  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <section className="booking-view">
      <div className="mn-container">
        <button className="booking-back" onClick={onExit}>
          <IconArrowLeft size={14} /> Volver al inicio
        </button>

        <h1 className="booking-title">Reserva tu cita</h1>
        <p className="booking-subtitle">Completa los pasos. Tu agenda queda apartada al confirmar.</p>

        <div className="booking-shell">
          <div className="booking-card">
            <div className="booking-steps-bar">
              {steps.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  className={`booking-step-tab ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
                  disabled
                >
                  <span className="step-num">{i < step ? <IconCheck size={12} /> : i + 1}</span>
                  <span className="step-label">{s.label}</span>
                </button>
              ))}
            </div>

            <div className="booking-body">
              {step === 0 && <StepService selected={service} onSelect={setService} />}
              {step === 1 && <StepPro selected={pro} onSelect={setPro} />}
              {step === 2 && <StepDateTime date={date} time={time} onDate={setDate} onTime={setTime} />}
              {step === 3 && <StepConfirm service={service} pro={pro} date={date} time={time} onExit={onExit} />}
            </div>

            {step < 3 && (
              <div className="booking-foot">
                {step > 0 ? (
                  <button className="mn-btn mn-btn-subtle" onClick={back}>
                    <IconArrowLeft size={16} /> Atrás
                  </button>
                ) : <span />}

                <button
                  className="mn-btn mn-btn-filled mn-btn-lg"
                  disabled={!canNext}
                  style={{ opacity: canNext ? 1 : 0.4 }}
                  onClick={next}
                >
                  {step === 2 ? "Confirmar reserva" : "Continuar"}
                  <IconArrowRight size={16} />
                </button>
              </div>
            )}
          </div>

          <BookingRecap service={service} pro={pro} date={date} time={time} step={step} />
        </div>
      </div>
    </section>
  );
}

function BookingRecap({ service, pro, date, time, step }) {
  return (
    <aside className="booking-recap" aria-label="Resumen de la reserva">
      <div className="booking-recap-head">
        <span className="eyebrow">Resumen</span>
        <h4>{service ? service.name : "Selecciona un servicio"}</h4>
      </div>

      <div className="booking-recap-body">
        <div className="recap-row">
          <span className="lbl">Profesional</span>
          <span className={`val ${pro ? "" : "empty"}`}>{pro ? pro.name : "Sin asignar"}</span>
        </div>
        <div className="recap-row">
          <span className="lbl">Fecha</span>
          <span className={`val ${date ? "" : "empty"}`}>
            {date ? `${date.dow} ${date.day} ${date.monthLabel}` : "Sin elegir"}
          </span>
        </div>
        <div className="recap-row">
          <span className="lbl">Hora</span>
          <span className={`val ${time ? "" : "empty"}`}>{time || "Sin elegir"}</span>
        </div>
        <div className="recap-row">
          <span className="lbl">Duración</span>
          <span className={`val ${service ? "" : "empty"}`}>{service ? `${service.duration} min` : "—"}</span>
        </div>
      </div>

      {service && (
        <div className="recap-points">
          <IconGift size={16} />
          <div>Sumarás <strong>+{Math.round(service.price / 1000)} puntos</strong> al confirmar</div>
        </div>
      )}

      <div className="recap-total">
        <span className="lbl">Total estimado</span>
        <span className="val">{service ? COP(service.price) : "—"}</span>
      </div>
    </aside>
  );
}

function StepService({ selected, onSelect }) {
  return (
    <>
      <h3 className="step-title">¿Qué servicio te gustaría?</h3>
      <div className="option-list">
        {services.map((s) => (
          <div
            key={s.id}
            className={`option-row ${selected?.id === s.id ? "selected" : ""}`}
            onClick={() => onSelect(s)}
          >
            <div className="option-thumb" style={{ backgroundImage: `url(${s.photo})` }} />
            <div className="option-meta">
              <strong>{s.name}</strong>
              <span>{s.description}</span>
            </div>
            <div className="option-right">
              <div className="option-price">{COP(s.price)}</div>
              <div className="option-dur">{s.duration} min</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function StepPro({ selected, onSelect }) {
  const opts = [
    { id: "any", name: "Cualquier disponible", role: "Te asignamos al mejor disponible", any: true },
    ...professionals,
  ];
  return (
    <>
      <h3 className="step-title">Elige un profesional</h3>
      <div className="option-list">
        {opts.map((p) => (
          <div
            key={p.id}
            className={`option-row ${selected?.id === p.id ? "selected" : ""}`}
            onClick={() => onSelect(p)}
          >
            {p.any ? (
              <div className="option-thumb" style={{
                display: "grid", placeItems: "center",
                background: "var(--primary-soft)", color: "var(--primary)"
              }}>
                <IconSparkle size={22} />
              </div>
            ) : (
              <div className="option-thumb" style={{ backgroundImage: `url(${p.photo})`, borderRadius: "50%" }} />
            )}
            <div className="option-meta">
              <strong>{p.name}</strong>
              <span>{p.role}</span>
            </div>
            {!p.any && (
              <div className="option-right">
                <div className="row" style={{ gap: 4, fontSize: 13, color: "var(--text-dim)" }}>
                  <IconStar size={14} fill="currentColor" />
                  {p.rating.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function StepDateTime({ date, time, onDate, onTime }) {
  const sevenDays = upcomingDates.slice(0, 7);
  return (
    <>
      <h3 className="step-title">¿Cuándo nos vemos?</h3>
      <div className="eyebrow" style={{ marginBottom: 12 }}>Esta semana</div>
      <div className="date-strip">
        {sevenDays.map((d) => (
          <div
            key={d.key}
            className={`date-cell ${date?.key === d.key ? "selected" : ""} ${d.disabled ? "disabled" : ""}`}
            onClick={() => !d.disabled && (onDate(d), onTime(null))}
          >
            <div className="dow">{d.dow}</div>
            <div className="dnum">{d.day}</div>
          </div>
        ))}
      </div>

      <div className="eyebrow" style={{ marginBottom: 12 }}>
        {date ? `Horarios disponibles · ${date.dow} ${date.day} de ${date.monthLabel}` : "Selecciona un día"}
      </div>
      <div className="time-grid">
        {timeSlots.map((s) => (
          <button
            key={s.t}
            type="button"
            className={`time-cell ${time === s.t ? "selected" : ""} ${(!date || s.taken) ? "disabled" : ""}`}
            disabled={!date || s.taken}
            onClick={() => onTime(s.t)}
          >
            {s.t}
          </button>
        ))}
      </div>
    </>
  );
}

function StepConfirm({ service, pro, date, time, onExit }) {
  const code = React.useMemo(() => "GG-" + Math.random().toString(36).slice(2, 7).toUpperCase(), []);
  return (
    <div className="confirm-wrap">
      <div className="confirm-icon">
        <IconCheckCircle size={36} stroke={1.8} />
      </div>
      <h3>¡Reserva confirmada!</h3>
      <p>Te enviamos los detalles a tu correo. También sumaste <strong style={{ color: "var(--text)" }}>+{Math.round(service.price / 1000)} puntos</strong>.</p>

      <div className="summary-card" style={{ textAlign: "left", marginTop: 8 }}>
        <div className="summary-row"><span className="label">Servicio</span><span className="value">{service.name}</span></div>
        <div className="summary-row"><span className="label">Profesional</span><span className="value">{pro.name}</span></div>
        <div className="summary-row"><span className="label">Fecha</span><span className="value">{date.dow} {date.day} {date.monthLabel}</span></div>
        <div className="summary-row"><span className="label">Hora</span><span className="value">{time}</span></div>
        <div className="summary-row"><span className="label">Duración</span><span className="value">{service.duration} min</span></div>
        <div className="summary-total">
          <span className="label">Total estimado</span>
          <span className="value">{COP(service.price)}</span>
        </div>
      </div>

      <div className="confirm-code" style={{ marginTop: 20 }}>Código · {code}</div>

      <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 10 }}>
        <button className="mn-btn mn-btn-outline" onClick={onExit}>Volver al inicio</button>
        <button className="mn-btn mn-btn-filled">Agregar al calendario <IconCalendar size={14} /></button>
      </div>
    </div>
  );
}

Object.assign(window, { BookingView });
