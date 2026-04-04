import { Search } from 'lucide-react';
import { useProjectsPage } from '../hooks/useProjectsPage';
import ProjectsGrid from '../components/projects/ProjectsGrid';
import TasksSidebar from '../components/projects/TasksSidebar';
import styles from '../styles/Projects.module.css';
import InstructorSpotlight from '../components/projects/InstructorSpotlight';


export default function Projects() {
  const {
    user, isLoading,
    filteredProjects, myTasks,
    filteredTasks, groupedTasks,
    search, setSearch,
    viewMode, setViewMode,
    sortMode, setSortMode,
    taskFilter, setTaskFilter,
    selectedProject, setSelectedProjectId,
  } = useProjectsPage();

  if (isLoading) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.ph}>
        <div>
          <h1>Projects overview</h1>
          <p className={styles.phSub}>
            {filteredProjects.length} active project{filteredProjects.length !== 1 ? 's' : ''} · {myTasks.length} tasks assigned to you
          </p>
        </div>
        <div className={styles.phRight}>
          <div className={styles.searchBox}>
            <Search size={14} color="var(--color-text-secondary)" />
            <input
              className={styles.searchInput}
              placeholder="Search projects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <ProjectsGrid projects={filteredProjects} viewMode={viewMode} sortMode={sortMode} isInstructor={user?.role === 'instructor'} onViewMode={setViewMode} onSortMode={setSortMode} selectedProjectId={selectedProject?.id ?? null} onSelectProject={setSelectedProjectId} />
        {user?.role === 'instructor'
          ? <InstructorSpotlight project={selectedProject} />
          : <TasksSidebar
            groupedTasks={groupedTasks}
            totalCount={filteredTasks.length}
            taskFilter={taskFilter}
            onTaskFilter={setTaskFilter}
          />
        }
      </div>
    </div>
  );
}