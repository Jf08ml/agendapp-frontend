// Pedir mi tarjeta (rediseño, FidelidadPublico). El cliente escribe su número y le
// llega el enlace a su tarjeta por WhatsApp (así nadie ve la de otro con solo
// saber su número). Si el negocio no puede enviar WhatsApp, se abre la tarjeta
// directamente. Si ya se abrió en este dispositivo, se va directo a ella.
import React, { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IconBrandWhatsapp, IconInfoCircle } from "@tabler/icons-react";
import { type CountryCode } from "libphonenumber-js";
import { RootState } from "../../app/store";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import { requestLoyaltyCard, savedCardKey } from "../../services/loyaltyCardService";

const SearchClient: React.FC = () => {
  const navigate = useNavigate();
  const organization = useSelector((state: RootState) => state.organization.organization);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<"sent" | "cooldown" | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!organization?._id) return;
    try {
      // Consulta anterior por teléfono guardada (ya no se usa).
      localStorage.removeItem("savedClientData");
      const token = localStorage.getItem(savedCardKey(organization._id as string));
      if (token) navigate(`/mi-tarjeta/${token}`, { replace: true });
    } catch {
      /* almacenamiento no disponible */
    }
  }, [organization?._id, navigate]);

  const handleSearch = async () => {
    setError("");
    setSent(null);
    if (!phoneE164) {
      setError("Escribe un número de WhatsApp válido, con su indicativo.");
      return;
    }
    setSearching(true);
    try {
      const result = await requestLoyaltyCard(phoneE164);
      if (result.status === "direct") navigate(`/mi-tarjeta/${result.token}`);
      else setSent(result.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos buscar tu tarjeta. Inténtalo de nuevo.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div className="ag-card" style={{ width: "100%", maxWidth: 400, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Mi tarjeta de fidelidad</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>Escribe tu número y te enviamos por WhatsApp el enlace a tu tarjeta con tus sellos y premios.</div>
        </div>

        {sent ? (
          <div className="ag-alert ag-alert--success">
            <IconBrandWhatsapp size={20} />
            <div>
              {sent === "sent" ? "Listo. Revisa tu WhatsApp: te enviamos el enlace a tu tarjeta." : "Ya te enviamos el enlace hace un momento. Revisa tu WhatsApp."}
            </div>
          </div>
        ) : (
          <>
            <InternationalPhoneInput
              label="Número de WhatsApp"
              organizationDefaultCountry={(organization?.default_country as CountryCode) || "CO"}
              onChange={(e164) => setPhoneE164(e164)}
              required
              compact
            />
            {error && (
              <div className="ag-alert ag-alert--danger" style={{ padding: "8px 12px" }}>
                <IconInfoCircle size={18} />
                <div style={{ fontSize: 13 }}>{error}</div>
              </div>
            )}
            <Button fullWidth size="md" onClick={handleSearch} loading={searching} disabled={!phoneE164}>
              Ver mi tarjeta
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchClient;
