import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List, Table2, Plus, FolderOpen } from 'lucide-react';
import type { ProjectWithTasks, ViewMode, SortMode } from '../../hooks/useProjectsPage';
import ProjectCard from './ProjectCard';
import styles from '../../styles/Projects.module.css';

interface Props {
    projects: ProjectWithTasks[];
    viewMode: ViewMode;
    sortMode: SortMode;
    onViewMode: (v: ViewMode) => void;
    onSortMode: (s: SortMode) => void;
    selectedProjectId: string | null;
    onSelectProject: (id: string) => void;
    isInstructor: boolean;
}

export default function ProjectsGrid({ projects, viewMode, sortMode, onViewMode, onSortMode, selectedProjectId, onSelectProject, isInstructor }: Props) {
    const navigate = useNavigate();

    return (
        <div>
            <div className={styles.lh}>
                <span className={styles.sectionTitle}>My projects</span>
                <div className={styles.lhRight}>
                    <div className={styles.sortGroup}>
                        <span className={styles.sortLabel}>Sort:</span>
                        {(['name', 'progress', 'deadline'] as SortMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => onSortMode(mode)}
                                className={`${styles.sortBtn} ${sortMode === mode ? styles.sortBtnActive : styles.sortBtnInactive}`}
                            >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className={styles.viewGroup}>
                        {([
                            { mode: 'cards', icon: <LayoutGrid size={12} /> },
                            { mode: 'list', icon: <List size={12} /> },
                            { mode: 'detailed', icon: <Table2 size={12} /> },
                        ] as { mode: ViewMode; icon: React.ReactNode }[]).map(({ mode, icon }) => (
                            <button
                                key={mode}
                                onClick={() => onViewMode(mode)}
                                className={`${styles.viewBtn} ${viewMode === mode ? styles.viewBtnActive : ''}`}
                                title={mode}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={viewMode === 'cards' ? styles.projGrid : styles.projList}>
                {projects.map(p => (
                    <ProjectCard
                        key={p.id}
                        project={p}
                        viewMode={viewMode}
                        isSelected={selectedProjectId === p.id}
                        onSelect={onSelectProject}
                        isInstructor={isInstructor}
                    />
                ))}

                {isInstructor && (
                    <div
                        className={styles.pcAdd}
                        onClick={() => navigate('/projects/new')}
                    >
                        <div className={styles.pcAddIcon}>
                            <Plus size={16} color="var(--color-primary)" />
                        </div>
                        <span className={styles.pcAddLabel}>New project</span>
                    </div>
                )}

                {projects.length === 0 && (
                    <div className={styles.emptyState}>
                        <FolderOpen size={32} color="var(--color-text-secondary)" />
                        <p>No projects found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}