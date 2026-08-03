import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Pause, Volume2, X } from 'lucide-react';
import { usePlayer } from '@/lib/PlayerContext';
import { Slider } from '@/components/ui/slider';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const { currentSong, isPlaying, currentTime, duration, volume, togglePlay, seek, changeVolume, stop, hasStems } = usePlayer();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show mini player if no song or if we're already on the practice page
  if (!currentSong) return null;
  if (!currentSong.audio_url && !hasStems) return null;
  if (location.pathname === `/practice/${currentSong.id}`) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-64 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl">
      {/* Seek bar at very top of mini player */}
      <div className="w-full h-1 bg-secondary cursor-pointer" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        seek(ratio * duration);
      }}>
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Song info — clickable to go to practice page */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/practice/${currentSong.id}`)}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary text-xs font-bold">♪</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{currentSong.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentSong.artist || 'Unknown artist'}</p>
          </div>
        </div>

        {/* Time */}
        <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-muted-foreground shrink-0">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0"
        >
          {isPlaying
            ? <Pause className="w-4 h-4 fill-current" />
            : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-2 w-28 shrink-0">
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={(v) => changeVolume(v[0])}
            className="flex-1"
          />
        </div>

        {/* Stop / close */}
        <button
          onClick={stop}
          className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Stop playback"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
