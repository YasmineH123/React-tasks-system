import type { TeamRole } from './auth';

export interface Team {
    id: string;
    name: string;
    created_by: string | null;
    created_at: string;
}

export interface NewTeam {
    name: string;
    created_by: string;
}

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    team_role: TeamRole;
}

export interface NewTeamMember {
    team_id: string;
    user_id: string;
    team_role: TeamRole;
}

export interface AppUserSummary {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    team_role?: TeamRole;
}

export interface TeamWithMembers extends Team {
    members: AppUserSummary[];
}