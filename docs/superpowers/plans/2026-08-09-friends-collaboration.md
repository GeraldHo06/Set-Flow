# Friends & Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a social Friends system in SetFlow supporting adding/removing connections, inviting friends to bands, and sharing setlists for read-only practice.

**Architecture:** We will create a dedicated `/friends` page in Enyao's layout, update the navigation menus, and integrate invitation/sharing controls into the existing Group and Setlist interfaces. All database interactions will use Supabase and React Query.

**Tech Stack:** React 18, Vite, Supabase JS, React Router DOM v6, Tailwind CSS, Lucide React, and `@tanstack/react-query`.

## Global Constraints
- Naming: The new navigation link must be labeled "Friends".
- Security: All queries must respect RLS policies configured on `friendships` and `shared_setlists` tables.
- Compilation: Verification must run `npm run build` after each task to ensure zero typescript/compilation errors.

---

### Task 1: Navigation and Route Setup

**Files:**
- Create: `src/pages/Friends.jsx` (initial scaffold)
- Modify: `src/components/layout/Sidebar.jsx`, `src/components/layout/MobileNav.jsx`, `src/App.jsx`

**Interfaces:**
- Consumes: None
- Produces: Sidebar entry, mobile nav entry, and route `/friends` leading to `Friends.jsx`.

- [ ] **Step 1: Scaffold Friends Page**
  Create `src/pages/Friends.jsx` with a simple container:
  ```jsx
  import React from 'react';

  export default function Friends() {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Friends</h1>
        <p className="text-muted-foreground">Friends and social connections will be managed here.</p>
      </div>
    );
  }
  ```

- [ ] **Step 2: Add Route to App.jsx**
  Import `Friends` page and define route `/friends` inside the authenticated layout container of `src/App.jsx`.
  Add import:
  `import Friends from '@/pages/Friends';`
  Add route:
  `<Route path="/friends" element={<Friends />} />`

- [ ] **Step 3: Add to Sidebar and MobileNav**
  Import `UserPlus` from `lucide-react`.
  In `src/components/layout/Sidebar.jsx`, update the `navItems` array:
  ```javascript
  import { Music, ListMusic, LayoutDashboard, Library, Users, LogOut, UserPlus } from 'lucide-react';

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/setlists', label: 'Setlists', icon: ListMusic },
    { path: '/library', label: 'Library', icon: Library },
    { path: '/groups', label: 'Bands & Groups', icon: Users },
    { path: '/friends', label: 'Friends', icon: UserPlus },
  ];
  ```
  In `src/components/layout/MobileNav.jsx`, update the `navItems` array to include the Friends link so it is visible in the bottom bar on mobile:
  ```javascript
  import { Music, ListMusic, LayoutDashboard, Library, Users, LogOut, UserPlus } from 'lucide-react';

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/setlists', label: 'Setlists', icon: ListMusic },
    { path: '/library', label: 'Library', icon: Library },
    { path: '/groups', label: 'Groups', icon: Users },
    { path: '/friends', label: 'Friends', icon: UserPlus },
  ];
  ```

- [ ] **Step 4: Verify Compilation**
  Run: `npm run build`
  Expected: Build succeeds with no syntax or compiler errors.

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add src/pages/Friends.jsx src/App.jsx src/components/layout/Sidebar.jsx src/components/layout/MobileNav.jsx
  git commit -m "feat: setup navigation and routes for Friends page"
  ```

---

### Task 2: Implement the Friends Hub

**Files:**
- Modify: `src/pages/Friends.jsx` (Full implementation)

**Interfaces:**
- Consumes: Supabase client from `@/lib/supabaseClient`, auth session from `@/lib/AuthContext`
- Produces: Centralized dashboard for active friends, pending requests, and user searches.

- [ ] **Step 1: Implement Friends Component**
  Replace `src/pages/Friends.jsx` with the full friends hub implementation containing My Friends list, Requests tab (Incoming/Outgoing), and User Search tab.
  Use the following template code:
  ```jsx
  import React, { useState } from 'react';
  import { supabase } from '@/lib/supabaseClient';
  import { useAuth } from '@/lib/AuthContext';
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { useToast } from '@/components/ui/use-toast';
  import { UserPlus, UserMinus, Check, X, Search, Loader2 } from 'lucide-react';

  export default function Friends() {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState('my-friends'); // 'my-friends' | 'requests' | 'add'

    // Fetch friendships
    const { data: friendships = [], isLoading: isLoadingFriendships } = useQuery({
      queryKey: ['friendships', currentUser?.id],
      queryFn: async () => {
        if (!currentUser) return [];
        const { data, error } = await supabase
          .from('friendships')
          .select(`
            id,
            status,
            sender_id,
            receiver_id,
            sender:profiles!sender_id(id, display_name, instrument, email),
            receiver:profiles!receiver_id(id, display_name, instrument, email)
          `)
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
        if (error) throw error;
        return data;
      },
      enabled: !!currentUser,
    });

    // Mutations
    const sendRequestMutation = useMutation({
      mutationFn: async (targetId) => {
        const { error } = await supabase
          .from('friendships')
          .insert({ sender_id: currentUser.id, receiver_id: targetId, status: 'pending' });
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['friendships'] });
        toast({ title: "Friend request sent!" });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error sending request", description: err.message });
      }
    });

    const acceptRequestMutation = useMutation({
      mutationFn: async (friendshipId) => {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendshipId);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['friendships'] });
        toast({ title: "Friend request accepted!" });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error accepting request", description: err.message });
      }
    });

    const deleteRequestMutation = useMutation({
      mutationFn: async (friendshipId) => {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendshipId);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['friendships'] });
        toast({ title: "Friendship/Request removed" });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error removing connection", description: err.message });
      }
    });

    const handleSearch = async (e) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, instrument, email')
          .neq('id', currentUser?.id)
          .or(`display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        toast({ variant: "destructive", title: "Search failed", description: error.message });
      } finally {
        setIsSearching(false);
      }
    };

    // Process friendships
    const activeFriends = friendships.filter(f => f.status === 'accepted').map(f => {
      const friendProfile = f.sender_id === currentUser?.id ? f.receiver : f.sender;
      return { friendshipId: f.id, ...friendProfile };
    });

    const incomingRequests = friendships.filter(f => f.status === 'pending' && f.receiver_id === currentUser?.id).map(f => {
      return { friendshipId: f.id, ...f.sender };
    });

    const outgoingRequests = friendships.filter(f => f.status === 'pending' && f.sender_id === currentUser?.id).map(f => {
      return { friendshipId: f.id, ...f.receiver };
    });

    const getFriendshipStatus = (userId) => {
      const existing = friendships.find(f => f.sender_id === userId || f.receiver_id === userId);
      if (!existing) return null;
      return { id: existing.id, status: existing.status, sender_id: existing.sender_id };
    };

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-border/50 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Friends Hub</h1>
            <p className="text-sm text-muted-foreground">Manage your bandmates and practice collaborators</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-border/40 pb-px">
          {[
            { id: 'my-friends', label: `My Friends (${activeFriends.length})` },
            { id: 'requests', label: `Requests (${incomingRequests.length + outgoingRequests.length})` },
            { id: 'add', label: 'Add Friends' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoadingFriendships ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* My Friends Tab */}
            {activeTab === 'my-friends' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeFriends.length === 0 ? (
                  <p className="text-muted-foreground text-sm col-span-full">You haven't added any friends yet.</p>
                ) : (
                  activeFriends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {(friend.display_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{friend.display_name || 'Unknown User'}</h4>
                          <p className="text-xs text-muted-foreground">{friend.instrument || 'Musician'}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => deleteRequestMutation.mutate(friend.friendshipId)}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Incoming Requests ({incomingRequests.length})</h3>
                  {incomingRequests.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No incoming friend requests.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {incomingRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card">
                          <div>
                            <h4 className="font-semibold text-foreground">{req.display_name || 'Unknown User'}</h4>
                            <p className="text-xs text-muted-foreground">{req.instrument || 'Musician'}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => acceptRequestMutation.mutate(req.friendshipId)}
                            >
                              <Check className="w-4 h-4 mr-1" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                              onClick={() => deleteRequestMutation.mutate(req.friendshipId)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border/40 pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Sent Pending Requests ({outgoingRequests.length})</h3>
                  {outgoingRequests.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No pending sent requests.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {outgoingRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card">
                          <div>
                            <h4 className="font-semibold text-foreground">{req.display_name || 'Unknown User'}</h4>
                            <p className="text-xs text-muted-foreground">{req.instrument || 'Musician'}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => deleteRequestMutation.mutate(req.friendshipId)}
                          >
                            Cancel Request
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add Friends Tab */}
            {activeTab === 'add' && (
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                  <Input
                    placeholder="Search by display name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background/50"
                  />
                  <Button type="submit" disabled={isSearching}>
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {searchResults.length === 0 && searchQuery && !isSearching && (
                    <p className="text-sm text-muted-foreground col-span-full">No users found matching your search.</p>
                  )}
                  {searchResults.map(profile => {
                    const statusInfo = getFriendshipStatus(profile.id);
                    return (
                      <div key={profile.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card">
                        <div>
                          <h4 className="font-semibold text-foreground">{profile.display_name || 'Unknown User'}</h4>
                          <p className="text-xs text-muted-foreground">{profile.instrument || 'Musician'}</p>
                        </div>
                        {statusInfo ? (
                          statusInfo.status === 'accepted' ? (
                            <Button size="sm" variant="secondary" disabled>
                              Friends
                            </Button>
                          ) : statusInfo.sender_id === currentUser?.id ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => deleteRequestMutation.mutate(statusInfo.id)}
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => acceptRequestMutation.mutate(statusInfo.id)}
                            >
                              Accept
                            </Button>
                          )
                        ) : (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/95 text-primary-foreground"
                            onClick={() => sendRequestMutation.mutate(profile.id)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify Compilation**
  Run: `npm run build`
  Expected: Build succeeds without errors.

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/pages/Friends.jsx
  git commit -m "feat: implement Friends Hub search and connection UI"
  ```

---

### Task 3: Group Invites integration

**Files:**
- Modify: `src/pages/GroupDetail.jsx`

**Interfaces:**
- Consumes: `profiles`, `friendships`, `group_members` tables.
- Produces: Dropdown / Dialog in Group Details page allowing group leaders or members to invite their friends into the band directly.

- [ ] **Step 1: Integrate Invite Modal into GroupDetail.jsx**
  Open `src/pages/GroupDetail.jsx`. Locate the "Members" card or layout section.
  Import React Dialog component or integrate with existing Tailwind modal design.
  Let's add the query for active friends and the invite button.
  Add imports if missing:
  `import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"`
  `import { UserPlus, Loader2 } from "lucide-react";`
  Add the query for active friends inside the `GroupDetail` component:
  ```javascript
  const { data: friendships = [] } = useQuery({
    queryKey: ['friendships', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, status, sender_id, receiver_id,
          sender:profiles!sender_id(id, display_name, instrument),
          receiver:profiles!receiver_id(id, display_name, instrument)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser,
  });

  const activeFriends = friendships.map(f => f.sender_id === currentUser?.id ? f.receiver : f.sender);
  ```
  Implement the invite mutation:
  ```javascript
  const inviteFriendMutation = useMutation({
    mutationFn: async (friendId) => {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, profile_id: friendId, role: 'member' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({ title: "Friend invited to group!" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Invitation failed", description: err.message });
    }
  });
  ```
  Add the invite UI button/popover next to the "Members" header:
  ```jsx
  {isLeader && (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" /> Invite Friend
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-card border border-border p-3" align="end">
        <h4 className="font-semibold text-xs text-foreground mb-2">Invite Bandmates</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {activeFriends.filter(f => !members.some(m => m.profile_id === f.id)).length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2 text-center">No friends available to invite.</p>
          ) : (
            activeFriends
              .filter(f => !members.some(m => m.profile_id === f.id))
              .map(friend => (
                <div key={friend.id} className="flex items-center justify-between py-1 text-xs">
                  <div>
                    <span className="font-medium text-foreground">{friend.display_name}</span>
                    <span className="block text-[10px] text-muted-foreground">{friend.instrument}</span>
                  </div>
                  <Button
                    size="xs"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => inviteFriendMutation.mutate(friend.id)}
                  >
                    Add
                  </Button>
                </div>
              ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )}
  ```

- [ ] **Step 2: Verify Compilation**
  Run: `npm run build`
  Expected: Build succeeds with zero errors.

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/pages/GroupDetail.jsx
  git commit -m "feat: integrate friends-based group invitation in GroupDetail"
  ```

---

### Task 4: Setlist Sharing and Read-Only Views

**Files:**
- Modify: `src/pages/Setlists.jsx`, `src/pages/SetlistDetail.jsx`
- Create: `src/components/setlists/ShareSetlistModal.jsx`

**Interfaces:**
- Consumes: `shared_setlists`, `Setlist`, `friendships` tables.
- Produces: Shared Setlists tab, Share Modal on Setlist card, and Read-Only state in Setlist details.

- [ ] **Step 1: Create ShareSetlistModal Component**
  Create `src/components/setlists/ShareSetlistModal.jsx` to select/deselect friends for a setlist:
  ```jsx
  import React from 'react';
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import { supabase } from '@/lib/supabaseClient';
  import { useAuth } from '@/lib/AuthContext';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
  import { Checkbox } from '@/components/ui/checkbox';
  import { useToast } from '@/components/ui/use-toast';
  import { Loader2 } from 'lucide-react';

  export default function ShareSetlistModal({ setlistId, open, onOpenChange }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch friends
    const { data: friendships = [], isLoading: isLoadingFriends } = useQuery({
      queryKey: ['friendships', user?.id],
      queryFn: async () => {
        if (!user) return [];
        const { data, error } = await supabase
          .from('friendships')
          .select(`
            id, status, sender_id, receiver_id,
            sender:profiles!sender_id(id, display_name, instrument),
            receiver:profiles!receiver_id(id, display_name, instrument)
          `)
          .eq('status', 'accepted')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
        if (error) throw error;
        return data;
      },
      enabled: !!user && open,
    });

    const friends = friendships.map(f => f.sender_id === user?.id ? f.receiver : f.sender);

    // Fetch current shares
    const { data: sharedRows = [], isLoading: isLoadingShares } = useQuery({
      queryKey: ['shared_setlists', setlistId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('shared_setlists')
          .select('shared_to')
          .eq('setlist_id', setlistId);
        if (error) throw error;
        return data.map(r => r.shared_to);
      },
      enabled: !!setlistId && open,
    });

    const toggleShareMutation = useMutation({
      mutationFn: async ({ friendId, isShared }) => {
        if (isShared) {
          const { error } = await supabase
            .from('shared_setlists')
            .delete()
            .match({ setlist_id: setlistId, shared_to: friendId });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('shared_setlists')
            .insert({ setlist_id: setlistId, shared_by: user.id, shared_to: friendId });
          if (error) throw error;
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['shared_setlists', setlistId] });
        toast({ title: "Share settings updated" });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to update share", description: err.message });
      }
    });

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle>Share Setlist</DialogTitle>
            <DialogDescription>Select the friends you want to share this setlist with.</DialogDescription>
          </DialogHeader>
          {isLoadingFriends || isLoadingShares ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto py-2">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">Add friends in the Friends page first.</p>
              ) : (
                friends.map(friend => {
                  const isShared = sharedRows.includes(friend.id);
                  return (
                    <div key={friend.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/40">
                      <Checkbox
                        id={`share-${friend.id}`}
                        checked={isShared}
                        onCheckedChange={() => toggleShareMutation.mutate({ friendId: friend.id, isShared })}
                      />
                      <label htmlFor={`share-${friend.id}`} className="text-sm font-medium text-foreground cursor-pointer flex-1">
                        <div>{friend.display_name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{friend.instrument}</div>
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
  ```

- [ ] **Step 2: Integrate Share Button & Tabs in Setlists.jsx**
  Open `src/pages/Setlists.jsx`. Add a state `activeLockerTab` ('my-locker' | 'shared') and state for tracking the sharing modal `sharingSetlistId`.
  Import `ShareSetlistModal` and `Share2` icon:
  `import ShareSetlistModal from '@/components/setlists/ShareSetlistModal';`
  `import { Share2 } from 'lucide-react';`

  Fetch the shared setlists inside the component:
  ```javascript
  const { data: sharedSetlists = [] } = useQuery({
    queryKey: ['shared-setlists-list'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('shared_setlists')
        .select(`
          id,
          setlist_id,
          setlist:Setlist (
            id,
            name,
            created_at,
            user_id,
            profiles:user_id ( display_name )
          )
        `)
        .eq('shared_to', user.id);
      if (error) throw error;
      return data.filter(d => d.setlist).map(d => ({
        ...d.setlist,
        owner_name: d.setlist.profiles?.display_name || 'Unknown'
      }));
    }
  });
  ```

  Render the tab switcher at the top:
  ```jsx
  <div className="flex gap-2 mb-4 border-b border-border/40 pb-px">
    <button
      onClick={() => setActiveLockerTab('my-locker')}
      className={`px-4 py-2 text-sm font-medium transition-all relative ${
        activeLockerTab === 'my-locker'
          ? 'text-primary border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      My Locker
    </button>
    <button
      onClick={() => setActiveLockerTab('shared')}
      className={`px-4 py-2 text-sm font-medium transition-all relative ${
        activeLockerTab === 'shared'
          ? 'text-primary border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      Shared with Me ({sharedSetlists.length})
    </button>
  </div>
  ```

  When rendering setlist cards under "My Locker", check if `card.user_id === user.id` (meaning it's personal and owned by user). If so, render a `Share2` action button on the card:
  ```jsx
  {card.user_id === user.id && (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-2 right-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setSharingSetlistId(card.id);
      }}
    >
      <Share2 className="w-4 h-4" />
    </Button>
  )}
  ```

  Under the "Shared with Me" tab, map over `sharedSetlists` to render read-only cards, showing `Shared by: {card.owner_name}` inside each card.

  Include `<ShareSetlistModal setlistId={sharingSetlistId} open={!!sharingSetlistId} onOpenChange={(open) => !open && setSharingSetlistId(null)} />` at the bottom.

- [ ] **Step 3: Handle Read-Only View in SetlistDetail.jsx**
  Open `src/pages/SetlistDetail.jsx`.
  In `useQuery` for the setlist details, check if the current user owns it, or if it belongs to a group the user belongs to.
  Add a state/flag `isReadOnly = setlist && setlist.user_id !== currentUser?.id && !groupIds.includes(setlist.group_id);`.
  If `isReadOnly` is true:
  1. Hide or disable the "Add Song" button/dialog.
  2. Disable the DragDropContext reordering callback or set `isDragDisabled` to `true` on the Draggable elements.
  3. Hide the song deletion `Trash` buttons.
  4. Render a prominent banner at the top of the header:
     ```jsx
     {isReadOnly && (
       <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs px-4 py-2 rounded-xl mb-4">
         This setlist is shared with you. You can view and practice its songs, but editing is disabled.
       </div>
     )}
     ```

- [ ] **Step 4: Verify Compilation**
  Run: `npm run build`
  Expected: Build succeeds with zero errors.

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add src/components/setlists/ShareSetlistModal.jsx src/pages/Setlists.jsx src/pages/SetlistDetail.jsx
  git commit -m "feat: implement setlist sharing and read-only detailed views"
  ```
