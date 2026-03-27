export interface Project {
    id: string;
    name: string;
    description: string | null;
    team_id: string;
    created_by: string | null;
    created_at: string;
}

export interface NewProject {
    name: string;
    description: string | null;
    team_id: string;
    created_by: string;
}

export interface ProjectFormValues {
    name: string;
    description: string | null;
}

export interface ProjectWithProgress extends Project {
    total_tasks: number;
    done_tasks: number;
}