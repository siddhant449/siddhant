import styles from "./Brief.module.css";

/** The brief as one big grey paragraph; its label hangs in the first line's indent. */
export default function Brief({ text }: { text: string }) {
  return (
    <section className={styles.brief} aria-labelledby="case-brief">
      <h2 id="case-brief" className={`label ${styles.label}`}>
        <span className="dot" />
        Brief
      </h2>
      <p className={`big big--indent ${styles.text}`}>{text}</p>
    </section>
  );
}
