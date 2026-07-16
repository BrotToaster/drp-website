import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={"container-shell " + styles.shell} aria-busy="true" aria-label="Inhalt wird geladen">
      <div className={styles.line} style={{ width: "120px" }} />
      <div className={styles.line} style={{ width: "55%", height: "54px" }} />
      <div className={styles.line} style={{ width: "38%" }} />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <div className={styles.card} />
        <div className={styles.card} />
        <div className={styles.card} />
      </div>
    </div>
  );
}
