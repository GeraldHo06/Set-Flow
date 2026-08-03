import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Headphones, Clock, Hash, GripVertical, Pencil, Trash2, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SongRow({ song, index, dragHandleProps, onEdit, onDelete, onShare, canEdit = true }) {
  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-secondary/30 hover:border-border transition-all duration-200">
      {/* Drag handle */}
      {canEdit && dragHandleProps && (
        <div
          {...dragHandleProps}
          className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Track number */}
      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <span className="text-xs font-mono font-medium text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Song info — navigates to practice */}
      <Link to={`/practice/${song.id}`} className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground truncate">{song.title}</h4>
        {song.artist && (
          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
        )}
      </Link>

      {/* Metadata badges */}
      <div className="hidden sm:flex items-center gap-1.5">
        {song.key && (
          <Badge variant="secondary" className="text-[10px] font-mono gap-1">
            <Hash className="w-3 h-3" />
            {song.key}
          </Badge>
        )}
        {song.bpm && (
          <Badge variant="secondary" className="text-[10px] font-mono gap-1">
            <Clock className="w-3 h-3" />
            {song.bpm} BPM
          </Badge>
        )}
        {song.duration && (
          <Badge variant="secondary" className="text-[10px] font-mono">
            {song.duration}
          </Badge>
        )}
      </div>

      {/* Asset indicators */}
      <div className="flex items-center gap-1">
        {song.score_url && (
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <FileText className="w-3 h-3 text-primary" />
          </div>
        )}
        {(song.audio_url || song.stems?.some(s => s.url)) && (
          <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
            <Headphones className="w-3 h-3 text-blue-400" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => { e.preventDefault(); onShare(song); }}
        >
          <Share2 className="w-3.5 h-3.5" />
        </Button>
        {canEdit && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.preventDefault(); onEdit(song); }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => { e.preventDefault(); onDelete(song.id); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
} 