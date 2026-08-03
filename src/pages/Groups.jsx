import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Shield, Music, Copy, Check, UserPlus, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

export default function Groups() {
  const [newGroupName, setNewGroupName] = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['my-groups'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('group_members')
        .select(`role, groups ( id, name, created_by )`)
        .eq('profile_id', user.id);
      if (error) throw error;
      return data
        .filter(item => item.groups)
        .map(item => ({ role: item.role, ...item.groups }));
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name, created_by: user.id })
        .select()
        .single();
      if (groupError) throw groupError;
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, profile_id: user.id, role: 'leader' });
      if (memberError) throw memberError;
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      setNewGroupName('');
      toast({ title: "Group Created!", description: "Your collaborative space is ready." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error creating group", description: error.message });
    }
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('profile_id', user.id)
        .maybeSingle();
      if (existing) throw new Error("You are already a member of this group!");
      const { data: groupExists } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .maybeSingle();
      if (!groupExists) throw new Error("No group found with that ID code.");
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, profile_id: user.id, role: 'member' });
      if (error) throw error;
      return groupExists;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      setJoinGroupId('');
      toast({ title: `Joined ${group.name}!`, description: "You can now view shared files." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Unable to join group", description: error.message });
    }
  });

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    createGroupMutation.mutate(newGroupName.trim());
  };

  const handleJoinGroup = (e) => {
    e.preventDefault();
    if (!joinGroupId.trim()) return;
    joinGroupMutation.mutate(joinGroupId.trim());
  };

  const copyToClipboard = (e, id) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied!", description: "Share this code with your bandmates." });
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto pb-36 lg:pb-10 font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Bands & Groups</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your collaborative music rooms and invite members.</p>
      </div>

      {/* Forms */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border/50 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Start a New Group
          </h3>
          <form onSubmit={handleCreateGroup} className="space-y-3">
            <Input
              type="text"
              placeholder="e.g. Acoustic Trio, Church Choir..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="bg-background/50"
            />
            <Button type="submit" disabled={createGroupMutation.isPending} className="w-full">
              {createGroupMutation.isPending ? 'Creating...' : 'Create Band'}
            </Button>
          </form>
        </div>

        <div className="bg-card border border-border/50 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" /> Join an Existing Group
          </h3>
          <form onSubmit={handleJoinGroup} className="space-y-3">
            <Input
              type="text"
              placeholder="Paste Group ID code here..."
              value={joinGroupId}
              onChange={(e) => setJoinGroupId(e.target.value)}
              className="bg-background/50"
            />
            <Button type="submit" variant="secondary" disabled={joinGroupMutation.isPending} className="w-full">
              {joinGroupMutation.isPending ? 'Joining...' : 'Join Group'}
            </Button>
          </form>
        </div>
      </div>

      {/* Groups List */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Your Active Spaces</h3>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-secondary/30 animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">You haven't joined any groups yet. Create or join one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link key={group.id} to={`/groups/${group.id}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border border-border/50 bg-card/50 hover:border-border hover:bg-secondary/20 transition-all gap-4 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-foreground">{group.name}</h4>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-mono mt-1">
                      <Shield className="w-3 h-3" /> {group.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-background/50 border border-border/60 p-1.5 rounded-lg">
                    <span className="text-xs font-mono text-muted-foreground px-2 truncate max-w-[140px]">
                      {group.id.substring(0, 8)}...
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={(e) => copyToClipboard(e, group.id)}
                    >
                      {copiedId === group.id
                        ? <Check className="w-3.5 h-3.5 text-green-400" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}