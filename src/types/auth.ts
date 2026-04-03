export type UserRole = 'student' | 'instructor';
export type TeamRole = 'leader' | 'member';

export interface AppUser {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    avatar_url: string | null;
    created_at: string;
}

export interface TeamMembership {
    team_id: string;
    team_role: TeamRole;
}

export interface RegisterFormValues {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
}

export interface LoginFormValues {
    email: string;
    password: string;
}