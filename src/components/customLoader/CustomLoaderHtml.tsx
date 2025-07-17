// src/CustomLoader.tsx
import styles from "./CustomLoaderHtml.module.css";

interface CustomLoaderProps {
  loadingText?: string;
}

export function CustomLoaderHtml({
  loadingText = "Cargando...",
}: CustomLoaderProps) {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.spinnerWrapper}>
        <svg
          className={styles.spinner}
          width="64"
          height="64"
          viewBox="0 0 50 50"
        >
          <circle
            className={styles.spinnerTrack}
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="6"
          />
          <circle
            className={styles.spinnerArc}
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="6"
          />
        </svg>
      </div>
      <div className={styles.loadingText}>{loadingText}</div>
    </div>
  );
}
