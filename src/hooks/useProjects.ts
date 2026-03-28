import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface SidebarProject {
    id: string;
    name: string;
}

export function useProjects(userId: string) {
    const [projects, setProjects] = useState<SidebarProject[]>([]);

    useEffect(() => {
        if (!userId) return;
        supabase
            .from('projects')
            .select('id, name')
            .then(({ data }) => setProjects(data ?? []));
    }, [userId]);

    return projects;
}