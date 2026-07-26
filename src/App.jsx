import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Dashboard from '@/pages/Dashboard';
import Setlists from '@/pages/Setlists';
import SetlistDetail from '@/pages/SetlistDetail';
import Practice from '@/pages/Practice';
import Library from '@/pages/Library';
import AppLayout from '@/components/layout/AppLayout';
import Auth from '@/pages/Auth';
import React from 'react';
import Groups from '@/pages/Groups';
import ResetPassword from '@/pages/ResetPassword';
import { PlayerProvider } from '@/lib/PlayerContext';
import GroupDetail from '@/pages/GroupDetail';

const AuthenticatedApp = () => {
  const { session, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={session ? <AppLayout /> : <Navigate to="/auth" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/setlists" element={<Setlists />} />
        <Route path="/setlists/:id" element={<SetlistDetail />} />
        <Route path="/practice/:id" element={<Practice />} />
        <Route path="/library" element={<Library />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <PlayerProvider>
            <AuthenticatedApp />
            <Toaster />
          </PlayerProvider>
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}
export default App;