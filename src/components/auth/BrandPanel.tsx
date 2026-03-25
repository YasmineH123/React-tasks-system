import styles from '../../modules/BrandPanel.module.css';

export default function BrandPanel() {
    return (
        <div className={styles.panel}>
            <div className={styles.brand}>
                <span className={styles.brandMark}>T</span>
                <span className={styles.brandName}>Task-Manager</span>
            </div>
            <p className={styles.tagline}>
                One place for your team's work. Clear tasks, real progress.
            </p>
        </div>
    );
}