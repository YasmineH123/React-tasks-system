import styles from '../../styles/GreetingBanner.module.css';

interface Props {
    name: string | null;
    statValue: number;
    statLabel: string;
    subMessage: React.ReactNode;
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function GreetingBanner({ name, statValue, statLabel, subMessage }: Props) {
    const firstName = name?.split(' ')[0] ?? 'there';

    return (
        <div className={styles.banner}>
            <div className={styles.circles} />
            <div className={styles.text}>
                <p className={styles.greeting}>Welcome back</p>
                <h1 className={styles.name}>{getGreeting()}, {firstName}</h1>
                <p className={styles.sub}>{subMessage}</p>
            </div>
            <div className={styles.statsRow}>
                <div className={styles.statPill}>
                    <span className={styles.pillVal}>{statValue}</span>
                    <span className={styles.pillLabel}>{statLabel}</span>
                </div>
            </div>
        </div>
    );
}