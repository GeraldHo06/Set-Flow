import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Upload, Music2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/lib/supabaseClient';
import { usePlayer } from '@/lib/PlayerContext';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function uploadAudioFile(file) {
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const { data, error } = await supabase.storage
    .from('song-files')
    .upload(fileName, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('song-files').getPublicUrl(data.path);
  return publicUrl;
}

export default function AudioPlayer({ audioUrl, stems = [], onUploadAudio, onRemoveAudio, onUploadStem, onRemoveStem, canEdit = true }) {
  const {
    isPlaying, currentTime, duration, volume,
    stemVolumes, stemMasterVolume, stemsLoaded,
    togglePlay, seek, changeVolume,
    changeStemVolume, changeStemMasterVolume,
    updateStems,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingStemIdx, setUploadingStemIdx] = useState(null);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const [draggingStemIdx, setDraggingStemIdx] = useState(null);

  const hasStems = stems && stems.length > 0 && stems.some(s => s.url);
  const hasAudio = !!audioUrl || hasStems;

  // Sync stems into global player when they change
  useEffect(() => {
    updateStems(stems);
  }, [stems?.map(s => s.url).join(',')]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try { const url = await uploadAudioFile(file); onUploadAudio(url); }
    catch (err) { alert('Audio upload failed: ' + err.message); }
    finally { setIsUploading(false); }
  };

  const handleStemUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStemIdx(idx);
    try { const url = await uploadAudioFile(file); onUploadStem(idx, url); }
    catch (err) { alert('Stem upload failed: ' + err.message); }
    finally { setUploadingStemIdx(null); }
  };

  const handleAudioDrop = async (e) => {
    e.preventDefault(); setIsDraggingAudio(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('audio/')) return;
    setIsUploading(true);
    try { const url = await uploadAudioFile(file); onUploadAudio(url); }
    catch (err) { alert('Audio upload failed: ' + err.message); }
    finally { setIsUploading(false); }
  };

  const handleStemDrop = async (e, idx) => {
    e.preventDefault(); setDraggingStemIdx(null);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('audio/')) return;
    setUploadingStemIdx(idx);
    try { const url = await uploadAudioFile(file); onUploadStem(idx, url); }
    catch (err) { alert('Stem upload failed: ' + err.message); }
    finally { setUploadingStemIdx(null); }
  };

  const stemColors = [
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-green-500/20 text-green-400 border-green-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-red-500/20 text-red-400 border-red-500/30',
    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ];

  return (
    <div
      className={`bg-card rounded-xl border p-5 transition-colors ${isDraggingAudio && canEdit ? 'border-primary/60 bg-primary/5' : 'border-border/50'}`}
      onDragOver={(e) => { if (!canEdit) return; e.preventDefault(); setIsDraggingAudio(true); }}
      onDragLeave={() => setIsDraggingAudio(false)}
      onDrop={(e) => { if (!canEdit) return; handleAudioDrop(e); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Music2 className="w-4 h-4 text-primary" />
          Audio Player
        </h3>
        {canEdit && (
          <div className="flex items-center gap-1">
            {audioUrl && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-destructive hover:text-destructive"
                onClick={() => onRemoveAudio?.()}>
                <Trash2 className="w-3 h-3" />Remove
              </Button>
            )}
            <label className="cursor-pointer">
              <Button variant="ghost" size="sm" className="gap-2 text-xs h-7" disabled={isUploading} asChild>
                <span>
                  <Upload className="w-3 h-3" />
                  {isUploading ? 'Uploading...' : isDraggingAudio ? 'Drop file' : 'Upload Audio'}
                </span>
              </Button>
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={(v) => seek(v[0])}
          className="w-full"
          disabled={!hasAudio}
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-mono text-muted-foreground">{formatTime(currentTime)}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <Button variant="ghost" size="icon" className="h-9 w-9"
          onClick={() => seek(Math.max(0, currentTime - 10))} disabled={!hasAudio}>
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button size="icon"
          className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          onClick={togglePlay} disabled={!hasAudio}>
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9"
          onClick={() => seek(Math.min(duration, currentTime + 10))} disabled={!hasAudio}>
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Volume */}
      <div className="flex items-center gap-3 mb-5 px-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
          onClick={() => { const next = !isMuted; setIsMuted(next); changeVolume(next ? 0 : volume); }}>
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01}
          onValueChange={(v) => { changeVolume(v[0]); setIsMuted(false); }} className="flex-1" />
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Stem Mixer */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instrument Stems</p>
          {hasStems && !stemsLoaded && <span className="text-[10px] text-muted-foreground">Loading stems...</span>}
        </div>
        <div className="flex items-center gap-3 mb-3 px-1">
          <span className="text-[10px] font-semibold text-muted-foreground w-16 shrink-0">Master</span>
          <Slider value={[stemMasterVolume ?? 1]} max={1} step={0.01}
            onValueChange={(v) => changeStemMasterVolume(v[0])} className="flex-1" />
          <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
            {Math.round((stemMasterVolume ?? 1) * 100)}%
          </span>
        </div>
        <div className="space-y-2.5">
          {(stems?.length ? stems : [
            { name: 'Vocals', url: '' }, { name: 'Guitar', url: '' },
            { name: 'Bass', url: '' }, { name: 'Drums', url: '' },
          ]).map((stem, idx) => (
            <div key={idx}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                draggingStemIdx === idx && canEdit ? 'border-primary/60 bg-primary/5 text-primary'
                : stem.url ? stemColors[idx % stemColors.length]
                : 'bg-secondary/30 text-muted-foreground border-border/50'}`}
              onDragOver={(e) => { if (!canEdit) return; e.preventDefault(); e.stopPropagation(); setDraggingStemIdx(idx); }}
              onDragLeave={() => setDraggingStemIdx(null)}
              onDrop={(e) => { if (!canEdit) return; handleStemDrop(e, idx); }}
            >
              <span className="text-xs font-medium w-16 truncate">{stem.name}</span>
              {stem.url ? (
                <Slider value={[stemVolumes?.[idx] ?? 1]} max={1} step={0.01}
                  onValueChange={(v) => changeStemVolume(idx, v[0])} className="flex-1" />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  {canEdit ? (
                    <label className="cursor-pointer">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"
                        disabled={uploadingStemIdx === idx} asChild>
                        <span>
                          <Upload className="w-3 h-3" />
                          {uploadingStemIdx === idx ? 'Uploading...' : draggingStemIdx === idx ? 'Drop file' : 'Upload or drop'}
                        </span>
                      </Button>
                      <input type="file" accept="audio/*" className="hidden"
                        onChange={(e) => handleStemUpload(e, idx)} />
                    </label>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">No track uploaded</span>
                  )}
                </div>
              )}
              {stem.url && (
                <>
                  <span className="text-[10px] font-mono w-8 text-right">
                    {Math.round((stemVolumes?.[idx] ?? 1) * 100)}%
                  </span>
                  {canEdit && (
                    <>
                      <label className="cursor-pointer shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6"
                          disabled={uploadingStemIdx === idx} asChild>
                          <span title="Re-upload">
                            {uploadingStemIdx === idx
                              ? <span className="text-[9px]">...</span>
                              : <Upload className="w-3 h-3" />}
                          </span>
                        </Button>
                        <input type="file" accept="audio/*" className="hidden"
                          onChange={(e) => handleStemUpload(e, idx)} />
                      </label>
                      <Button variant="ghost" size="icon"
                        className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => onRemoveStem?.(idx)} title="Remove">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}