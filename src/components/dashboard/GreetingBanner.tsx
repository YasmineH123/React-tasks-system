import styles from '../../styles/GreetingBanner.module.css';

interface Props {
    name: string | null;
    tasksDueCount: number;
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function GreetingBanner({ name, tasksDueCount }: Props) {
    const firstName = name?.split(' ')[0] ?? '';

    return (
        <div className={styles.banner}>
            <div className={styles.circles} />
            <div className={styles.text}>
                <p className={styles.greeting}>Welcome back</p>
                <h1 className={styles.name}>{getGreeting()}, {firstName} !</h1>
                <p className={styles.sub}>
                    You have <strong>{tasksDueCount} task{tasksDueCount !== 1 ? 's' : ''} due this week</strong>.
                    {tasksDueCount > 0 ? ' You\'re never behind! Everyday is a new oppurtiunity' : ' Nothing urgent. Keep it up!'}
                </p>
            </div>
            <div className={styles.statsRow}>
                <div className={styles.statPill}>
                    <span className={styles.pillVal}>{tasksDueCount}</span>
                    <span className={styles.pillLabel}>Due this week</span>
                </div>
            </div>
        </div>
    );
}