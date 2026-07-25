import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // 1. Check active sessions on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    });

    // 2. Listen for auth changes (login, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
      
      if (_event === 'SIGNED_OUT') {
        setAuthError({ type: 'auth_required' });
      } else {
        setAuthError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign Up function
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthError({ type: 'error', message: error.message });
    return { data, error };
  };

  // Log In function
  const logIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError({ type: 'error', message: error.message });
    return { data, error };
  };

  // Log Out function
  const logOut = async () => {
    await supabase.auth.signOut();
  };

  const navigateToLogin = () => {
    // If your router has a login path, handle redirects here or let your pages handle it
    window.location.href = '/login'; 
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoadingAuth, 
      isLoadingPublicSettings: false, // Bypassing this boilerplate flag
      authError, 
      signUp, 
      logIn, 
      logOut,
      navigateToLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);