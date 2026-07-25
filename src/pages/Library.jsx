import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Music, Play, Pause, Search, Disc } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Library() {
  const [search, setSearch] = useState('');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement] = useState(new Audio());

  // 1. Fetch songs belonging to the user OR their active band groups
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['library-songs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get all group IDs the current user belongs to
      const { data: memberRows } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('profile_id', user.id);
      const groupIds = memberRows?.map(r => r.group_id) || [];

      let query = supabase.from('songs').select('*, Setlist(name)');

      // If user belongs to bands, show personal files AND band files
      if (groupIds.length > 0) {
        query = query.or(`uploaded_by.eq.${user.id},group_id.in.(${groupIds.join(',')})`);
      } else {
        query = query.eq('uploaded_by', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Simple audio playback toggle mechanics
  const handlePlayToggle = (track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play().catch(err => console.log("Playback error:", err));
        setIsPlaying(true);
      }
    } else {
      // Stream a completely new audio track source
      audioElement.src = track.audio_url;
      audioElement.play().catch(err => console.log("Playback error:", err));
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  // 3. Client-side string filtering for search bars
  const filteredSongs = songs.filter(song =>
    (song.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto pb-32 font-sans">
      {/* Page Layout Title Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Music Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Access your personal locker stems and shared group tracks.</p>
      </div>

      {/* Search Filter Strip Input */}
      {songs.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audio titles..."
            className="pl-9 bg-background/50"
          />
        </div>
      )}

      {/* Main Track Display Grid Engine */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-2xl bg-card/20">
          <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No tracks match your query parameters.' : 'Your music library space is currently empty.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSongs.map((song) => {
            const isThisPlaying = currentTrack?.id === song.id && isPlaying;
            return (
              <div 
                key={song.id} 
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isThisPlaying ? 'bg-primary/5 border-primary/40' : 'bg-card/40 border-border/50 hover:border-border'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Play Action Trigger Toggle Button */}
                  <button
                    onClick={() => handlePlayToggle(song)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isThisPlaying ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground'
                    }`}
                  >
                    {isThisPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{song.title || 'Unnamed Audio Stem'}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {song.group_id ? "👥 Group Shared" : "🔒 Personal Locker"}
                      </span>
                      {song.Setlist?.name && (
                        <>
                          <span className="text-muted-foreground/40 text-xs">•</span>
                          <span className="text-[11px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">
                            📂 {song.Setlist.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Floating Audio Playbar Panel */}
      {currentTrack && (
        <div className="fixed bottom-20 left-4 right-4 md:left-72 md:right-8 bg-card/90 backdrop-blur-xl border border-border p-4 rounded-2xl shadow-xl flex items-center justify-between z-40 transition-all animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}>
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground leading-none">{currentTrack.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Playing from SetFlow Audio Cloud</p>
            </div>
          </div>
          <button 
            onClick={() => handlePlayToggle(currentTrack)}
            className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
        </div>
      )}
    </div>
  );
}