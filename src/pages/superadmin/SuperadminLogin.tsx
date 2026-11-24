// Login del panel de plataforma (rediseño, SuperadminAcceso): dos columnas,
// a la izquierda el formulario y a la derecha un panel en el color de la
// plataforma. Errores que dicen qué hacer; sin colores fijos ni react-icons.
import { useState, type FormEvent } from "react";
import { Button, PasswordInput, TextInput } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { IconInfoCircle, IconLock } from "@tabler/icons-react";
import { loginSuccess } from "../../features/auth/sliceAuth";
import { loginSuperadmin } from "../../services/authService";

export default function SuperadminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await loginSuperadmin(email.trim(), password);
      dispatch(
        loginSuccess({
          userId: data.adminId,
          organizationId: "", // Superadmins no pertenecen a una organización
          token: data.token,
          role: data.userType,
          permissions: [],
          expiresAt: data.expiresAt,
        })
      );
      navigate("/superadmin/orgs");
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (res?.status === 401 || res?.status === 400) setError("Ese correo y esa contraseña no coinciden. Revisa e intenta de nuevo.");
      else if (res?.status === 429) setError("Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.");
      else setError(res?.data?.message || "No pudimos entrar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sa-login">
      <style>{`
        .sa-login { min-height: calc(100dvh - var(--app-shell-header-offset, 0px)); display: grid; grid-template-columns: 1fr; background: var(--surface); }
        @media (min-width: 62em) { .sa-login { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
        .sa-login__form { display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
        .sa-login__side { display: none; background: var(--platform); color: #fff; padding: 56px; align-items: flex-end; }
        @media (min-width: 62em) { .sa-login__side { display: flex; } }
      `}</style>

      <div className="sa-login__form">
        <form onSubmit={handleLogin} className="ag-stack" style={{ gap: 18, width: "100%", maxWidth: 380 }} noValidate>
          <div>
            <div style={{ font: "600 17px/24px var(--mantine-font-family)", color: "var(--platform)" }}>
              AgenditApp <span className="ag-muted" style={{ fontWeight: 400 }}>· Plataforma</span>
            </div>
            <span className="ag-badge ag-badge--outline" style={{ marginTop: 16, gap: 4 }}>
              <IconLock size={13} /> Acceso restringido
            </span>
            <h1 style={{ margin: "10px 0 0", font: "600 28px/34px var(--mantine-font-family)", letterSpacing: "-0.02em" }}>Panel de plataforma</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>Solo para el equipo de AgenditApp.</div>
          </div>

          {error && (
            <div className="ag-alert ag-alert--danger" role="alert">
              <IconInfoCircle size={20} />
              <div style={{ fontSize: 14 }}>{error}</div>
            </div>
          )}

          <TextInput label="Correo" type="email" placeholder="tu@agenditapp.com" value={email} onChange={(e) => setEmail(e.currentTarget.value)} autoComplete="email" />
          <PasswordInput label="Contraseña" value={password} onChange={(e) => setPassword(e.currentTarget.value)} autoComplete="current-password" />

          <Button type="submit" size="lg" fullWidth color="var(--platform)" loading={loading}>
            Entrar al panel
          </Button>
          <div className="ag-subtle">Tras varios intentos fallidos seguidos, el acceso se pausa unos minutos.</div>
        </form>
      </div>

      <aside className="sa-login__side" aria-hidden="true">
        <div style={{ maxWidth: 420 }}>
          <div style={{ font: "600 28px/36px var(--mantine-font-family)", letterSpacing: "-0.02em" }}>Todos los negocios, en un solo lugar.</div>
          <div style={{ fontSize: 15, opacity: 0.8, marginTop: 10 }}>Organizaciones, membresías, ventas, métricas y comunicación de AgenditApp.</div>
        </div>
      </aside>
    </div>
  );
}
