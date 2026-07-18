import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Barrera global de errores de render: sin ella, cualquier error durante el
 * render desmonta toda la app y deja la página en blanco. Usa HTML plano con
 * estilos inline (no Mantine) porque envuelve a los providers — debe poder
 * renderizar aunque el crash venga de ellos.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Error de render no capturado:", error, errorInfo.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    // Un chunk que no carga suele ser un deploy nuevo con el navegador
    // sirviendo HTML viejo — recargar lo resuelve.
    const isChunkError = /dynamically imported module|Loading chunk|Failed to fetch/i.test(
      this.state.error.message
    );

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#f8f9fa",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#fff",
            border: "1px solid #e9ecef",
            borderRadius: 12,
            padding: "32px 28px",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 42, marginBottom: 12 }}>😥</div>
          <h1 style={{ fontSize: 20, margin: "0 0 8px", color: "#212529" }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: 14, color: "#495057", margin: "0 0 20px", lineHeight: 1.5 }}>
            {isChunkError
              ? "Hay una versión nueva de la aplicación. Recarga la página para actualizarla."
              : "Ocurrió un error inesperado y esta pantalla no se pudo mostrar. Tu información está a salvo — recarga la página para continuar."}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: "#228be6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar página
          </button>
          <div style={{ marginTop: 12 }}>
            <a href="/" style={{ fontSize: 13, color: "#868e96" }}>
              Volver al inicio
            </a>
          </div>
          <details style={{ marginTop: 20, textAlign: "left" }}>
            <summary style={{ fontSize: 12, color: "#adb5bd", cursor: "pointer" }}>
              Detalles técnicos
            </summary>
            <pre
              style={{
                fontSize: 11,
                color: "#868e96",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: "8px 0 0",
                maxHeight: 160,
                overflow: "auto",
              }}
            >
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack?.split("\n").slice(1, 6).join("\n")}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
