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
}

export interface NewTeamMember {
    team_id: string;
    user_id: string;
}

// a note for you guys:
// use it when you wanna retrive basic info of user 
export interface AppUserSummary {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
}

export interface TeamWithMembers extends Team {
    members: AppUserSummary[];
}

