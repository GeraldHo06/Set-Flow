import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import { Plus, ListMusic, Music, FileText, Headphones, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SetlistCard from '@/components/setlists/SetlistCard';

export default function Dashboard() {
  const { data: setlists = [] } = useQuery({
    queryKey: ['setlists'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('Setlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const songsWithScores = songs.filter(s => s.score_url);
  const songsWithAudio = songs.filter(s => s.audio_url || s.stems?.some(st => st.url));
  const recentSongs = songs.slice(0, 5);

  const songCountBySetlist = {};
  songs.forEach(s => {
    if (s.setlist_id) {
      songCountBySetlist[s.setlist_id] = (songCountBySetlist[s.setlist_id] || 0) + 1;
    }
  });

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto pb-36 lg:pb-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1">Your practice studio is ready.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Setlists', value: setlists.length, icon: ListMusic, color: 'text-primary' },
          { label: 'Songs', value: songs.length, icon: Music, color: 'text-blue-400' },
          { label: 'Scores', value: songsWithScores.length, icon: FileText, color: 'text-green-400' },
          { label: 'Audio Tracks', value: songsWithAudio.length, icon: Headphones, color: 'text-purple-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Setlists */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Your Setlists</h2>
          <Link to="/setlists">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        {setlists.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/50 border-dashed p-10 text-center">
            <ListMusic className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No setlists yet</p>
            <Link to="/setlists">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Create your first setlist
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {setlists.slice(0, 6).map(setlist => (
              <SetlistCard
                key={setlist.id}
                setlist={setlist}
                songCount={songCountBySetlist[setlist.id] || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Songs */}
      {recentSongs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Songs</h2>
          <div className="space-y-2">
            {recentSongs.map((song, i) => (
              <Link key={song.id} to={`/practice/${song.id}`}>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <span className="text-xs font-mono text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist || 'Unknown artist'}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}