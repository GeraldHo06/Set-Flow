import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient'; 
import { Plus, ArrowLeft, Trash2, MoreVertical, Share2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import SongRow from '@/components/setlists/SongRow';
import AddSongDialog from '@/components/setlists/AddSongDialog';
import EditSongDialog from '@/components/setlists/EditSongDialog';
import ShareDialog from '@/components/setlists/ShareDialog';

export default function SetlistDetail() {
  const { id: routeId } = useParams();
  
  // 🔑 Ensure we extract a clean string ID. If it's a fallback placeholder like "1", we can safely match records
  const setlistId = routeId || new URLSearchParams(window.location.search).get('id') || window.location.pathname.split('/').pop();

  const [showAddSong, setShowAddSong] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [showShareSetlist, setShowShareSetlist] = useState(false);
  const [sharingsong, setSharingSong] = useState(null);
  const queryClient = useQueryClient();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const titleInputRef = useRef(null);

  const updateSetlistMutation = useMutation({
    mutationFn: async (name) => {
      const { error } = await supabase
        .from('Setlist')
        .update({ name })
        .eq('id', setlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlist', setlistId] });
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setIsEditingTitle(false);
    },
  });

  const handleTitleClick = () => {
    setEditTitle(setlist?.name || '');
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  const handleTitleSave = () => {
    if (editTitle.trim()) {
      updateSetlistMutation.mutate(editTitle.trim());
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') setIsEditingTitle(false);
  };

  const REQUIRED_STEMS = ['Vocals', 'Guitar', 'Bass', 'Drums', 'Piano/Keys', 'Others', 'Click'];

  // Helper utility to validate if a string is a standard Postgres UUID format
  const isUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // 1. Fetch Setlist details from Supabase safely
  const { data: setlist } = useQuery({
    queryKey: ['setlist', setlistId],
    queryFn: async () => {
      // Prevent query crashing if the ID isn't a valid UUID layout yet
      if (!isUUID(setlistId)) {
        console.warn(`Provided Setlist ID "${setlistId}" is an integer or legacy key string, not a valid UUID.`);
        return { name: "Mock / Demo Setlist", description: "Convert this setlist row to live database entry to track songs." };
      }

      const { data, error } = await supabase
        .from('Setlist')
        .select('*')
        .eq('id', setlistId)
        .maybeSingle(); // 🛡️ uses maybeSingle to avoid crushing with a 406/400 error loop

      if (error) throw error;
      return data;
    },
    enabled: !!setlistId,
  });

  // 2. Fetch Songs with fixed string column escaping syntax
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['songs', setlistId],
    queryFn: async () => {
      if (!isUUID(setlistId)) return [];

      const { data: list, error } = await supabase
        .from('songs')
        .select('*')
        .eq('setlist_id', setlistId);

      if (error) throw error;

      const sortedList = (list || []).sort((a, b) => (a.order || 0) - (b.order || 0));

      // Sync stems without triggering query invalidation
      const syncedList = sortedList.map((song) => {
        const existingNames = (song.stems || []).map(s => s.name);
        const missing = REQUIRED_STEMS.filter(name => !existingNames.includes(name));

        if (missing.length > 0) {
          const updatedStems = [
            ...(song.stems || []),
            ...missing.map(name => ({ name, url: '' })),
          ];
          // Fire and forget — don't await, don't invalidate
          supabase.from('songs').update({ stems: updatedStems }).eq('id', song.id);
          return { ...song, stems: updatedStems };
        }
        return song;
      });

      return syncedList;
    },
    enabled: !!setlistId,
  });

  // 3. Add Song Mutation capturing complete structural data properties
  const addSongMutation = useMutation({
    mutationFn: async (formData) => {
      if (!isUUID(setlistId)) {
        alert("Cannot add songs to a mock layout id. Please create a new setlist from your dashboard page first so a proper unique database entry is populated!");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const defaultStems = REQUIRED_STEMS.map(name => ({ name, url: '' }));

      const { data: newSong, error } = await supabase
        .from('songs')
        .insert({
          title: formData.title,
          artist: formData.artist,
          key: formData.key,
          bpm: formData.bpm,
          notes: formData.notes,
          setlist_id: setlistId,
          uploaded_by: user ? user.id : null,
          group_id: setlist?.group_id || null,
          order: songs.length,
          stems: defaultStems,
        })
        .select()
        .single();

      if (error) throw error;
      return newSong;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs', setlistId] });
      setShowAddSong(false);
    },
  });

  // 4. Update Song Mutation
  const updateSongMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from('songs')
        .update({
          title: data.title || data.name,
          stems: data.stems,
          artist: data.artist,
          key: data.key,
          bpm: data.bpm,
          notes: data.notes
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songs', setlistId] }),
  });

  // 5. Delete Song
  const deleteSongMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songs', setlistId] }),
  });

  // 6. Delete Full Parent Setlist
  const deleteSetlistMutation = useMutation({
    mutationFn: async () => {
      if (isUUID(setlistId)) {
        await supabase.from('songs').delete().eq('setlist_id', setlistId);
        await supabase.from('Setlist').delete().eq('id', setlistId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      window.location.href = '/setlists';
    },
  });

  const handleDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;

    const reordered = Array.from(songs);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    queryClient.setQueryData(['songs', setlistId], reordered);

    await Promise.all(
      reordered.map((song, idx) =>
        supabase.from('songs').update({ order: idx }).eq('id', song.id)
      )
    );
    queryClient.invalidateQueries({ queryKey: ['songs', setlistId] });
  };

  const handleEditSubmit = (data) => {
    updateSongMutation.mutate({ id: editingSong.id, data });
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto pb-24 lg:pb-10 font-sans">
      {/* Header Panel */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <Link to="/setlists">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleSave}
                  className="text-2xl font-bold text-foreground tracking-tight bg-transparent border-b-2 border-primary outline-none w-full"
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={handleTitleClick}
              >
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {setlist?.name || 'Loading...'}
                </h1>
                <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            {setlist?.description && (
              <p className="text-sm text-muted-foreground mt-1">{setlist.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowShareSetlist(true)} title="Share setlist">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button className="gap-2" onClick={() => setShowAddSong(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Song</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm('Delete this setlist and all its songs?')) {
                    deleteSetlistMutation.mutate();
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Setlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Track Display Engine */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="text-center py-20 border border-border/50 border-dashed rounded-xl">
          <p className="text-muted-foreground text-sm mb-3">No songs in this setlist yet.</p>
          <Button size="sm" className="gap-2" onClick={() => setShowAddSong(true)}>
            <Plus className="w-4 h-4" />
            Add your first song
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="songs">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {songs.map((song, i) => (
                  <Draggable key={song.id} draggableId={song.id} index={i}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={snapshot.isDragging ? 'opacity-80 shadow-xl' : ''}
                      >
                        <SongRow
                          song={song}
                          index={i}
                          dragHandleProps={provided.dragHandleProps}
                          onEdit={setEditingSong}
                          onShare={setSharingSong}
                          onDelete={(id) => {
                            if (confirm('Remove this song?')) deleteSongMutation.mutate(id);
                          }}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Overlays / Modal Dialogs */}
      <AddSongDialog
        open={showAddSong}
        onOpenChange={setShowAddSong}
        onSubmit={(data) => addSongMutation.mutate(data)}
      />

      {editingSong && (
        <EditSongDialog
          open={!!editingSong}
          onOpenChange={(open) => { if (!open) setEditingSong(null); }}
          song={editingSong}
          onSubmit={handleEditSubmit}
        />
      )}

      <ShareDialog
        open={showShareSetlist}
        onOpenChange={setShowShareSetlist}
        title={setlist?.name}
        url={`${window.location.origin}/setlists/${setlistId}`}
      />

      <ShareDialog
        open={!!sharingsong}
        onOpenChange={(open) => { if (!open) setSharingSong(null); }}
        title={sharingsong?.title || sharingsong?.name}
        url={sharingsong ? `${window.location.origin}/practice/${sharingsong.id}` : ''}
      />
    </div>
  );
}