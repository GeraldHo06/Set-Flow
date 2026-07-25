import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, ListMusic, LayoutDashboard, Library, Users, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

// 🚀 Added your Groups panel link here!
const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/setlists', label: 'Setlists', icon: ListMusic },
  { path: '/library', label: 'Library', icon: Library },
  { path: '/groups', label: 'Bands & Groups', icon: Users }, 
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-30">
      
      {/* Logo Container */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Music className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">SetFlow</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Practice Studio</p>
        </div>
      </div>

      {/* Navigation - flex-1 pushes everything below it down */}
      <nav className="flex-1 px-3 mt-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path || 
            (path !== '/' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("w-[18px] h-[18px]", isActive && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Help Footer Note Box */}
      <div className="p-4 mx-3 mb-2 rounded-xl bg-secondary/50 border border-border/50─">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Upload scores & audio to start practicing with your setlist.
        </p>
      </div>

      {/* 🔐 Sign Out Button - Cleanly pinned to the bottom */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/auth';
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

    </aside>
  );
}