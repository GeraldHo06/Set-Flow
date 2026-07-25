import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, Mail, Lock, User, Guitar, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Auth() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [instrument, setInstrument] = useState('Vocalist');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              instrument: instrument,
            }
          }
        });
        if (error) throw error;
        toast({
          title: "Registration Successful!",
          description: "Check your email for a confirmation link if required.",
        });

      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: "Loading your practice studio...",
        });
        window.location.href = '/';

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "Reset Email Sent!",
          description: "Check your inbox for a password reset link.",
        });
        setMode('signin');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="w-full max-w-md space-y-8 bg-card border border-border/50 p-8 rounded-2xl shadow-xl">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Music className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === 'signup' ? 'Create your Musician Profile' :
             mode === 'forgot' ? 'Reset your Password' :
             'Sign in to SetFlow'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'signup' ? 'Join groups and share your practice sheets' :
             mode === 'forgot' ? "Enter your email and we'll send you a reset link" :
             'Your practice studio is ready'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">

          {mode === 'signup' && (
            <>
              <div className="space-y-1 relative">
                <User className="absolute left-3 top-9 w-4 h-4 text-muted-foreground" />
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. John Lim"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-9 bg-background/50"
                />
              </div>

              <div className="space-y-1 relative">
                <Guitar className="absolute left-3 top-9 w-4 h-4 text-muted-foreground" />
                <label className="text-xs font-medium text-muted-foreground">Primary Instrument</label>
                <select
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground"
                >
                  <option value="Vocalist">Vocalist</option>
                  <option value="Guitarist">Guitarist</option>
                  <option value="Bassist">Bassist</option>
                  <option value="Drummer">Drummer</option>
                  <option value="Keyboardist">Keyboardist</option>
                </select>
              </div>
            </>
          )}

          {/* Email — shown in all modes */}
          <div className="space-y-1 relative">
            <Mail className="absolute left-3 top-9 w-4 h-4 text-muted-foreground" />
            <label className="text-xs font-medium text-muted-foreground">Email address</label>
            <Input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>

          {/* Password — only for signin and signup */}
          {mode !== 'forgot' && (
            <div className="space-y-1 relative">
              <Lock className="absolute left-3 top-9 w-4 h-4 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
          )}

          {/* Forgot password link — only on signin */}
          {mode === 'signin' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <Button type="submit" className="w-full font-medium mt-2" disabled={loading}>
            {loading ? 'Please wait...' :
             mode === 'signup' ? 'Sign Up' :
             mode === 'forgot' ? 'Send Reset Link' :
             'Sign In'}
          </Button>
        </form>

        {/* Bottom navigation */}
        <div className="text-center pt-2 space-y-2">
          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm text-primary hover:underline"
            >
              {mode === 'signup'
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}