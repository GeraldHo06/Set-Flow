import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Hash, Clock, StickyNote, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import PDFViewer from '@/components/practice/PDFViewer';
import AudioPlayer from '@/components/practice/AudioPlayer';
import Metronome from '@/components/practice/Metronome';
import { supabase } from '@/lib/supabaseClient'; // 🚀 Hook up your live Supabase client
import { usePlayer } from '@/lib/PlayerContext';

export default function Practice() {
  const songId = window.location.pathname.split('/').pop();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const { loadSong } = usePlayer();

  // 1. Fetch the single song by ID from your live Supabase table
  const { data: song, isLoading } = useQuery({
    queryKey: ['song', songId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', songId)
        .single(); // Tells Supabase to just return one object, not an array
      
      if (error) throw error;
      if (data?.notes) setNotes(data.notes);
      return data;
    },
    enabled: !!songId,
  });

  useEffect(() => {
    console.log('useEffect triggered, song:', song?.title, 'audio_url:', song?.audio_url);
    if (song?.audio_url) {
      loadSong({
        id: song.id,
        title: song.title,
        artist: song.artist,
        audio_url: song.audio_url,
        setlist_id: song.setlist_id,
      });
    }
  }, [song?.id, song?.audio_url]);

  // 2. Setup Mutation to push updates (notes, URLs, files) straight to Supabase
  const updateMutation = useMutation({
    mutationFn: async (updatedData) => {
      const { data, error } = await supabase
        .from('songs')
        .update(updatedData)
        .eq('id', songId);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['song', songId] }),
  });

  const handleUploadScore = (url) => {
    updateMutation.mutate({ score_url: url });
  };

  const handleUploadAudio = (url) => {
    updateMutation.mutate({ audio_url: url });
  };

  const handleRemoveAudio = () => {
    updateMutation.mutate({ audio_url: '' });
  };

  const handleUploadStem = (idx, url) => {
    const newStems = [...(song.stems || [])];
    if (newStems[idx]) {
      newStems[idx] = { ...newStems[idx], url };
    }
    updateMutation.mutate({ stems: newStems });
  };

  const handleRemoveScore = () => {
    updateMutation.mutate({ score_url: '' });
  };

  const handleRemoveStem = (idx) => {
    const newStems = [...(song.stems || [])];
    if (newStems[idx]) {
      newStems[idx] = { ...newStems[idx], url: '' };
    }
    updateMutation.mutate({ stems: newStems });
  };

  const handleSaveNotes = () => {
    updateMutation.mutate({ notes });
  };

  if (isLoading || !song) {
    return (
      <div className="p-10 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <Link to={song.setlist_id ? `/setlists/${song.setlist_id}` : '/setlists'}>
            <Button variant="ghost" size="icon" className="mt-0.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">{song.title}</h1>
            {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
            <div className="flex items-center gap-2 mt-2">
              {song.key && (
                <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                  <Hash className="w-3 h-3" />{song.key}
                </Badge>
              )}
              {song.bpm && (
                <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                  <Clock className="w-3 h-3" />{song.bpm} BPM
                </Badge>
              )}
              {song.duration && (
                <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                  {song.duration}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          variant={showNotes ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-2"
          onClick={() => setShowNotes(!showNotes)}
        >
          <StickyNote className="w-4 h-4" />
          <span className="hidden sm:inline">Notes</span>
        </Button>
      </div>

      {/* Notes panel */}
      {showNotes && (
        <div className="mb-6 bg-card rounded-xl border border-border/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Practice Notes</p>
            <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={handleSaveNotes}>
              <Save className="w-3 h-3" />
              Save
            </Button>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your practice notes here..."
            className="min-h-[80px] bg-background/50"
          />
        </div>
      )}

      {/* Main content: PDF + Audio side by side */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* PDF Score */}
        <div className="min-h-[500px] lg:min-h-[600px]">
          <PDFViewer
            scoreUrl={song.score_url}
            onUploadScore={handleUploadScore}
            onRemoveScore={handleRemoveScore}
          />
        </div>

        {/* Audio Player + Metronome */}
        <div className="space-y-4">
          <AudioPlayer
            audioUrl={song.audio_url}
            stems={song.stems}
            onUploadAudio={handleUploadAudio}
            onRemoveAudio={handleRemoveAudio}
            onUploadStem={handleUploadStem}
            onRemoveStem={handleRemoveStem}
          />
          <Metronome initialBpm={song.bpm || 120} />
        </div>
      </div>
    </div>
  );
}