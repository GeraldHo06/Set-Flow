import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient'; 
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SetlistCard from '@/components/setlists/SetlistCard';
import CreateSetlistDialog from '@/components/setlists/CreateSetlistDialog';
import { useToast } from '@/components/ui/use-toast';

export default function Setlists() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1. Fetch groups user belongs to so we can pass them down into the Creation Form Modal
  const { data: myGroups = [] } = useQuery({
    queryKey: ['my-groups-list'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('group_members')
        .select('groups ( id, name )')
        .eq('profile_id', user.id);
      if (error) throw error;
      return data.filter(item => item.groups).map(item => item.groups);
    }
  });

  // 2. Fetch setlists (Personal Locker OR Shared Bands)
  const { data: setlists = [], isLoading } = useQuery({
    queryKey: ['setlists'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get array of group IDs user is associated with
      const { data: memberRows } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('profile_id', user.id);
      const groupIds = memberRows?.map(r => r.group_id) || [];

      let query = supabase.from('Setlist').select('*');

      if (groupIds.length > 0) {
        query = query.or(`user_id.eq.${user.id},group_id.in.(${groupIds.join(',')})`);
      } else {
        query = query.eq('user_id', user.id).is('group_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Fetch song associations to calculate aggregate quantities per playlist card
  const { data: songs = [] } = useQuery({
    queryKey: ['songs-count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('songs').select('id, setlist_id');
      if (error) throw error;
      return data || [];
    },
  });

  // 4. Create mutations handling individual data injection requests safely
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('Setlist')
        .insert({
          name: formData.title, // 🔥 FIXED: Changed 'title' to 'name' to match your actual database column!
          user_id: user.id,
          group_id: formData.group_id || null 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setShowCreate(false);
      toast({ title: "Success!", description: "Setlist populated to your workspace canvas." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    }
  });

  // Calculate song count mapping
  const songCountBySetlist = {};
  songs.forEach(s => {
    if (s.setlist_id) {
      songCountBySetlist[s.setlist_id] = (songCountBySetlist[s.setlist_id] || 0) + 1;
    }
  });

  // 🔥 FIXED: Cleared duplicate declarations. Points cleanly to s.name from database.
  const filtered = setlists.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <div className="p-6 lg:p-10 max-w-6xl mx-auto pb-36 lg:pb-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Setlists</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize your music for rehearsals and gigs.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Setlist</span>
        </Button>
      </div>

      {/* Search */}
      {setlists.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search setlists..."
            className="pl-9"
          />
        </div>
      )}

      {/* Grid Display Render block */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-xl bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">
            {search ? 'No setlists match your search.' : 'No setlists yet. Create one to get started!'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(setlist => (
            <SetlistCard
              key={setlist.id}
              setlist={setlist}
              songCount={songCountBySetlist[setlist.id] || 0}
            />
          ))}
        </div>
      )}

      {/* Upgraded creation dialog modal injection */}
      {showCreate && (
        <CreateSetlistDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          myGroups={myGroups} 
          onSubmit={(data) => createMutation.mutate(data)}
        />
      )}
    </div>
    </>
  );
}