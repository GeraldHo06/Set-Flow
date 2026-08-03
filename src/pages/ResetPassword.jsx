import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, Lock, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // 1. Initial check of the active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true);
      }
      setCheckingSession(false);
    });

    // 2. Listen for recovery events or active sessions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
      }
      if (session) {
        setValidSession(true);
      }
      setCheckingSession(false);
    });

    // Safety timeout fallback
    const timer = setTimeout(() => {
      setCheckingSession(false);
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
      });
      return;
    }
    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setDone(true);
      toast({
        title: 'Password updated!',
        description: 'You can now sign in with your new password.',
      });
      
      // 🔐 Sign out to clear the temporary recovery session so they must sign in fresh
      await supabase.auth.signOut();
      setTimeout(() => { window.location.href = '/auth'; }, 3000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!validSession && !done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
        <div className="w-full max-w-md space-y-6 bg-card border border-border/50 p-8 rounded-2xl shadow-xl text-center">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto text-destructive">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This password reset link is invalid, expired, or has already been used. Please request a new link from the Sign In page.
          </p>
          <Button onClick={() => { window.location.href = '/auth'; }} className="w-full">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="w-full max-w-md space-y-8 bg-card border border-border/50 p-8 rounded-2xl shadow-xl">

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Music className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {done ? 'Password Updated!' : 'Set New Password'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {done
              ? 'Redirecting you to sign in...'
              : 'Enter your new password below'}
          </p>
        </div>

        {done ? (
          <div className="flex justify-center py-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1 relative">
              <Lock className="absolute left-3 top-9 w-4 h-4 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">New Password</label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>

            <div className="space-y-1 relative">
              <Lock className="absolute left-3 top-9 w-4 h-4 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>

            <Button type="submit" className="w-full font-medium mt-2" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>

            <div className="text-center">
              <a href="/auth" className="text-xs text-primary hover:underline">
                Back to Sign In
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
