import type { ReactNode } from 'react';
import styles from '../../styles/AuthCard.module.css';

interface Props {
    title: string;
    subtitle: string;
    children: ReactNode;
}

export default function AuthCard({ title, subtitle, children }: Props) {
    return (
        <div className={styles.right}>
            <div className={styles.card}>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.subtitle}>{subtitle}</p>
                {children}
            </div>
        </div>
    );
}