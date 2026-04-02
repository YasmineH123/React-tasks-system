import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, FolderOpen, FolderPlus, LayoutGrid, ClipboardList,
    Users, GraduationCap, User, LogOut, ChevronDown,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { signOut } from '../../services/authService';
import { getInitials } from '../../utils/taskUtils';
import { useProjects } from '../../hooks/useProjects';
import styles from '../../styles/Sidebar.module.css';

export default function Sidebar() {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const projects = useProjects(user?.id ?? '');

    const [hoverExpanded, setHoverExpanded] = useState(false);
    const [projectsOpen, setProjectsOpen] = useState(false);

    const isExpanded = hoverExpanded;
    const isProjectsActive = location.pathname.startsWith('/projects');

    function handleMouseEnter() { if (!hoverExpanded) setHoverExpanded(true); }
    function handleMouseLeave() { setHoverExpanded(false); }

    async function handleSignOut() {
        await signOut();
        navigate('/login');
    }

    if (!user) return null;

    const initials = getInitials(user.full_name);

    return (
        <aside
            className={`${styles.sidebar} ${!isExpanded ? styles.collapsed : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className={styles.top}>
                <div className={styles.brand}>
                    <div className={styles.brandMark}>S</div>
                    {isExpanded && (
                        <div className={styles.brandText}>
                            <span className={styles.brandName}>Synco</span>
                            <span className={styles.brandSub}>Collaboration system</span>
                        </div>
                    )}
                </div>
            </div>

            <nav className={styles.nav}>
                {isExpanded && <span className={styles.sectionLabel}>Main</span>}

                {/* Dashboard */}
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && <div className={styles.curveTop} />}
                            <div className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                                <LayoutDashboard size={17} />
                            </div>
                            {isExpanded && <span className={styles.navLabel}>Dashboard</span>}
                            {isActive && <div className={styles.curveBottom} />}
                        </>
                    )}
                </NavLink>

                {/* Projects — collapsible */}
                <div
                    className={`${styles.navItem} ${isProjectsActive ? styles.navActive : ''}`}
                    onClick={() => setProjectsOpen(v => !v)}
                    style={{ cursor: 'pointer' }}
                >
                    {isProjectsActive && <div className={styles.curveTop} />}
                    <div className={`${styles.navIcon} ${isProjectsActive ? styles.navIconActive : ''}`}>
                        <FolderOpen size={17} />
                    </div>
                    {isExpanded && (
                        <>
                            <span className={styles.navLabel}>Projects</span>
                            <ChevronDown
                                size={13}
                                className={`${styles.chevron} ${projectsOpen ? styles.chevronOpen : ''}`}
                            />
                        </>
                    )}
                    {isProjectsActive && <div className={styles.curveBottom} />}
                </div>

                {isExpanded && projectsOpen && (
                    <div className={styles.subList}>
                        <NavLink
                            to="/projects"
                            end
                            className={({ isActive }) => `${styles.subItem} ${isActive ? styles.subItemActive : ''}`}
                        >
                            All projects
                        </NavLink>
                        {projects.map(p => (
                            <NavLink
                                key={p.id}
                                to={`/projects/${p.id}`}
                                className={({ isActive }) => `${styles.subItem} ${isActive ? styles.subItemActive : ''}`}
                            >
                                <span className={styles.subDot} />
                                <span className={styles.subName}>{p.name}</span>
                            </NavLink>
                        ))}
                    </div>
                )}

                {/* Board */}
                <NavLink
                    to="/board"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && <div className={styles.curveTop} />}
                            <div className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                                <LayoutGrid size={17} />
                            </div>
                            {isExpanded && <span className={styles.navLabel}>Board</span>}
                            {isActive && <div className={styles.curveBottom} />}
                        </>
                    )}
                </NavLink>

                {/* ── INSTRUCTOR ── */}
                {user.role === 'instructor' && (
                    <>
                        <div className={styles.divider} />
                        {isExpanded && <span className={styles.sectionLabel}>Manage</span>}

                        <NavLink
                            to="/teams"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className={styles.curveTop} />}
                                    <div className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                                        <Users size={17} />
                                    </div>
                                    {isExpanded && <span className={styles.navLabel}>Teams</span>}
                                    {isActive && <div className={styles.curveBottom} />}
                                </>
                            )}
                        </NavLink>

                        <NavLink
                            to="/projects/new"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className={styles.curveTop} />}
                                    <div className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                                        <FolderPlus size={17} />
                                    </div>
                                    {isExpanded && <span className={styles.navLabel}>New project</span>}
                                    {isActive && <div className={styles.curveBottom} />}
                                </>
                            )}
                        </NavLink>

                        <div className={styles.divider} />
                        {isExpanded && <span className={styles.sectionLabel}>Instructor</span>}

                        <NavLink
                            to="/instructor/overview"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className={styles.curveTop} />}
                                    <div className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                                        <GraduationCap size={17} />
                                    </div>
                                    {isExpanded && <span className={styles.navLabel}>Overview</span>}
                                    {isActive && <div className={styles.curveBottom} />}
                                </>
                            )}
                        </NavLink>

                        <NavLink
                            to="/instructor/manage"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className={styles.curveTop} />}
                                    <div className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                                        <Users size={17} />
                                    </div>
                                    {isExpanded && <span className={styles.navLabel}>Manage</span>}
                                    {isActive && <div className={styles.curveBottom} />}
                                </>
                            )}
                        </NavLink>
                        <NavLink
                            to="/projects/create"
                            className={({ isActive }) =>
                                `${styles.navItem} ${isActive ? styles.navActive : ''}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className={styles.curveTop} />}
                                    <div className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                                        <FolderPlus size={17} />
                                    </div>
                                    {isExpanded && <span className={styles.navLabel}>Create Project</span>}
                                    {isActive && <div className={styles.curveBottom} />}
                                </>
                            )}
                        </NavLink>
                    </>
                )}

                {/* ── LEADER ── */}
                {user.role === 'leader' && (
                    <>
                        <div className={styles.divider} />
                        {isExpanded && <span className={styles.sectionLabel}>Manage</span>}

                        <NavLink
                            to="/tasks/new"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className={styles.curveTop} />}
                                    <div className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                                        <ClipboardList size={17} />
                                    </div>
                                    {isExpanded && <span className={styles.navLabel}>New task</span>}
                                    {isActive && <div className={styles.curveBottom} />}
                                </>
                            )}
                        </NavLink>
                    </>
                )}

                {/* ── ACCOUNT (all roles) ── */}
                <div className={styles.divider} />
                {isExpanded && <span className={styles.sectionLabel}>Account</span>}

                <NavLink
                    to="/profile"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && <div className={styles.curveTop} />}
                            <div className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                                <User size={17} />
                            </div>
                            {isExpanded && <span className={styles.navLabel}>Profile</span>}
                            {isActive && <div className={styles.curveBottom} />}
                        </>
                    )}
                </NavLink>
            </nav>

            <div className={styles.bottom}>
                <div className={styles.userCard} onClick={() => navigate('/profile')}>
                    <div className={styles.userAvatar}>
                        {user.avatar_url
                            ? <img src={user.avatar_url} alt="" className={styles.avatarImg} />
                            : <span>{initials}</span>
                        }
                    </div>
                    {isExpanded && (
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{user.full_name ?? user.email}</span>
                            <span className={styles.userRole}>{user.role}</span>
                        </div>
                    )}
                </div>

                <button className={styles.signOutBtn} onClick={handleSignOut}>
                    <div className={styles.signOutIcon}><LogOut size={15} /></div>
                    {isExpanded && <span className={styles.signOutText}>Sign out</span>}
                </button>
            </div>
        </aside>
    );
}