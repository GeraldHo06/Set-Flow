import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, ListMusic, LayoutDashboard, Library, Users, LogOut } from 'lucide-react'; // 🚀 Added Users and LogOut imports
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient'; // 🚀 Added supabase client import

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/setlists', label: 'Setlists', icon: ListMusic },
  { path: '/library', label: 'Library', icon: Library },
  { path: '/groups', label: 'Groups', icon: Users }, // Changed label to "Groups" so it fits nicely on tiny mobile screens!
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <>
      {/* Top Bar Navigation Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">SetFlow</span>
        </div>

        {/* 🔐 Sign Out Action Icon placed cleanly on the top right */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/auth';
          }}
          className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-red-400 active:bg-red-500/10 rounded-xl transition-all"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Tab Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-around z-30 pb-safe">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Content Top Spacer */}
      <div className="h-14" />
    </>
  );
}