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

        async function fetchProjects() {
            const { data: memberRows } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', userId);

            if (!memberRows?.length) {
                setProjects([]);
                return;
            }

            const teamIds = memberRows.map(r => r.team_id);

            const { data } = await supabase
                .from('projects')
                .select('id, name')
                .in('team_id', teamIds);

            setProjects(data ?? []);
        }

        fetchProjects();

        const channel = supabase
            .channel(`projects-channel-${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    return projects;
}