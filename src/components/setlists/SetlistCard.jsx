import React from 'react';
import { Link } from 'react-router-dom';
import { ListMusic, ChevronRight, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorMap = {
  amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
  blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
  green: 'from-green-500/20 to-green-600/5 border-green-500/20',
  purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
  red: 'from-red-500/20 to-red-600/5 border-red-500/20',
  pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/20',
};

const iconColorMap = {
  amber: 'text-amber-400',
  blue: 'text-blue-400',
  green: 'text-green-400',
  purple: 'text-purple-400',
  red: 'text-red-400',
  pink: 'text-pink-400',
};

export default function SetlistCard({ setlist, songCount }) {
  const color = setlist.color || 'amber';

  // 🔑 FIX: Bulletproof ID resolution. Falls back gracefully to any variation of the primary key field
  const targetId = setlist.id || setlist.ID || setlist._id;

  return (
    <Link to={`/setlists/${targetId}`}>
      <div className={cn(
        "group relative rounded-xl border bg-gradient-to-br p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer",
        colorMap[color]
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center">
              <ListMusic className={cn("w-5 h-5", iconColorMap[color])} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{setlist.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Music className="w-3 h-3" />
                {songCount} {songCount === 1 ? 'song' : 'songs'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
        </div>
        {setlist.description && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{setlist.description}</p>
        )}
      </div>
    </Link>
  );
}