import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Users, Music, Plus, Shield, LogOut, Trash2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SetlistCard from '@/components/setlists/SetlistCard';
import CreateSetlistDialog from '@/components/setlists/CreateSetlistDialog';

export default function GroupDetail() {
  const { id: groupId } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // 1. Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // 2. Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  // 3. Fetch group members with profiles
  const { data: members = [] } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          role,
          profile_id,
          profiles ( display_name, instrument )
        `)
        .eq('group_id', groupId);
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  // 4. Fetch group setlists
  const { data: setlists = [] } = useQuery({
    queryKey: ['group-setlists', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Setlist')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
  });

  // 5. Fetch song counts
  const { data: songs = [] } = useQuery({
    queryKey: ['group-songs-count', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('id, setlist_id')
        .eq('group_id', groupId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
  });

  const songCountBySetlist = songs.reduce((acc, song) => {
    if (song.setlist_id) acc[song.setlist_id] = (acc[song.setlist_id] || 0) + 1;
    return acc;
  }, {});

  // Get current user's role in this group
  const myMembership = members.find(m => m.profile_id === currentUser?.id);
  const isLeader = myMembership?.role === 'leader';

  // 6. Create setlist in group
  const createSetlistMutation = useMutation({
    mutationFn: async (formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('Setlist')
        .insert({
          name: formData.title,
          user_id: user.id,
          group_id: groupId,
          color: formData.color || 'amber',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-setlists', groupId] });
      setShowCreateSetlist(false);
      toast({ title: 'Setlist created!', description: 'All group members can now see it.' });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  });

  // 7. Remove member (leader only)
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({ title: 'Member removed.' });
    }
  });

  // 8. Leave group
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('profile_id', currentUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      window.location.href = '/groups';
    }
  });

  // 9. Delete group (leader only)
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('group_members').delete().eq('group_id', groupId);
      await supabase.from('Setlist').delete().eq('group_id', groupId);
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      window.location.href = '/groups';
    }
  });

  const copyGroupId = () => {
    navigator.clipboard.writeText(groupId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast({ title: 'Copied!', description: 'Share this code with your bandmates.' });
  };

  if (groupLoading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto pb-36 lg:pb-10 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <Link to="/groups">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{group?.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {members.length} {members.length === 1 ? 'member' : 'members'} · {setlists.length} {setlists.length === 1 ? 'setlist' : 'setlists'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLeader ? (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => {
                if (confirm('Delete this group and all its setlists?')) deleteGroupMutation.mutate();
              }}
            >
              <Trash2 className="w-3 h-3" />
              Delete Group
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm('Leave this group?')) leaveGroupMutation.mutate();
              }}
            >
              <LogOut className="w-3 h-3" />
              Leave Group
            </Button>
          )}
        </div>
      </div>

      {/* Invite Code */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 mb-8">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium mb-1">Invite Code — share with bandmates to join</p>
          <p className="text-sm font-mono text-foreground truncate">{groupId}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={copyGroupId}>
          {copiedId ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedId ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {/* Members */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Members
        </h2>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {(member.profiles?.display_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.profiles?.display_name || 'Unknown User'}
                    {member.profile_id === currentUser?.id && (
                      <span className="text-xs text-muted-foreground ml-2">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.profiles?.instrument || 'Musician'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  member.role === 'leader'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  <Shield className="w-3 h-3 inline mr-1" />
                  {member.role}
                </span>
                {isLeader && member.profile_id !== currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Remove this member?')) removeMemberMutation.mutate(member.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setlists */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Music className="w-4 h-4" /> Group Setlists
          </h2>
          {isLeader && (
            <Button size="sm" className="gap-2" onClick={() => setShowCreateSetlist(true)}>
              <Plus className="w-4 h-4" />
              New Setlist
            </Button>
          )}
        </div>

        {setlists.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Music className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-3">No group setlists yet.</p>
            {isLeader && (
              <Button size="sm" className="gap-2" onClick={() => setShowCreateSetlist(true)}>
                <Plus className="w-4 h-4" />
                Create first setlist
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {setlists.map(setlist => (
              <SetlistCard
                key={setlist.id}
                setlist={setlist}
                songCount={songCountBySetlist[setlist.id] || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Setlist Dialog */}
      {showCreateSetlist && (
        <CreateSetlistDialog
          open={showCreateSetlist}
          onOpenChange={setShowCreateSetlist}
          myGroups={[]}
          onSubmit={(data) => createSetlistMutation.mutate(data)}
        />
      )}
    </div>
  );
}
