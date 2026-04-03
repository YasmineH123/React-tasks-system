import styles from '../../styles/BrandPanel.module.css';

export default function BrandPanel() {
    return (
        <div className={styles.panel}>
            <div className={styles.brand}>
                <span className={styles.brandMark}>S</span>
                <span className={styles.brandName}>Synco</span>
            </div>
            <p className={styles.tagline}>
                One place for your team's work.<br />
                <em>Clear tasks, real progress.</em>
            </p>
        </div>
    );
}