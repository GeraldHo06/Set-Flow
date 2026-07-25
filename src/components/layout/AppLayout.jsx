import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { supabase } from '@/lib/supabaseClient';
import { LogOut } from 'lucide-react';
import MiniPlayer from './MiniPlayer';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="lg:hidden">
        <MobileNav />
      </div>
      <main className="lg:ml-64 min-h-screen">
        <Outlet />
      </main>
      <MiniPlayer />
    </div>
  );
}