import { getInitials } from '../../utils/taskUtils';
import styles from '../../styles/MemberActivityTable.module.css';

interface MemberRow {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    todo: number;
    in_progress: number;
    done: number;
}

interface Props { members: MemberRow[]; }

export default function MemberActivityTable({ members }: Props) {
    if (members.length === 0) {
        return <p className={styles.empty}>No members yet.</p>;
    }

    return (
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>Member</th>
                    <th>Todo</th>
                    <th>In progress</th>
                    <th>Done</th>
                </tr>
            </thead>
            <tbody>
                {members.map(m => (
                    <tr key={m.id}>
                        <td>
                            <div className={styles.member}>
                                <div className={styles.avatar}>
                                    {m.avatar_url
                                        ? <img src={m.avatar_url} alt="" />
                                        : getInitials(m.full_name)
                                    }
                                </div>
                                <span>{m.full_name ?? 'Unknown'}</span>
                            </div>
                        </td>
                        <td><span className={`${styles.pill} ${styles.todo}`}>{m.todo}</span></td>
                        <td><span className={`${styles.pill} ${styles.inprog}`}>{m.in_progress}</span></td>
                        <td><span className={`${styles.pill} ${styles.done}`}>{m.done}</span></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}