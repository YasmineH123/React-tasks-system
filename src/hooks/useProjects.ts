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

        const fetchProjects = async () => {
            const { data } = await supabase
                .from('projects')
                .select('id, name');
            setProjects(data ?? []);
        };

        fetchProjects();

        const channel = supabase
            .channel(`projects-channel-${userId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'projects' },
                () => {
                    fetchProjects();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return projects;
}