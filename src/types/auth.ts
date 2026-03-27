export type UserRole = 'student' | 'leader' | 'instructor';

export interface AppUser {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    avatar_url: string | null;
    created_at: string;
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