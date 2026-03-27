import type { LucideIcon } from 'lucide-react';
import styles from '../../styles/StatCard.module.css';

interface Props {
    icon: LucideIcon;
    value: number | string;
    label: string;
    variant?: 'purple' | 'blue' | 'coral' | 'green' | 'glass';
}

export default function StatCard({ icon: Icon, value, label, variant = 'purple' }: Props) {
    return (
        <div className={`${styles.card} ${styles[variant]}`}>
            <div className={styles.iconWrap}>
                <Icon size={20} />
            </div>
            <div className={styles.info}>
                <div className={styles.value}>{value}</div>
                <div className={styles.label}>{label}</div>
            </div>
        </div>
    );
}