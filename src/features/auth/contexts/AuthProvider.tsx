// src/features/auth/contexts/AuthProvider.tsx

console.log('🔵 AuthProvider.tsx: FILE LOADED');

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { supabase } from '@/core/lib/supabase';
import { httpClient } from '@/core/api/client';
import { logger } from '@/core/utils/logger';
import { AuthState, UserSubscription } from '../types/auth.types';


// =============================================================================
// TYPES
// =============================================================================

interface Business {
  id: string;
  name: string;
  industry?: string;
  created_at: string;
}

interface AuthContextValue extends AuthState {
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  businesses: Business[];
  selectedBusiness: Business | null;
  selectBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
  subscription: UserSubscription | null;
  refreshSubscription: () => Promise<void>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  console.log('🟢 AuthProvider: COMPONENT RENDERING');
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  console.log('🟡 AuthProvider: Initial state', { isLoading, isAuthenticated });

  // ===========================================================================
  // HELPER: LOAD BUSINESSES
  // ===========================================================================

const loadBusinesses = useCallback(async (userId: string): Promise<void> => {
  try {
    logger.info('Loading user businesses...', { userId });
    const response = await httpClient.get<Business[]>('/business-profiles');  // ✅ NEW
      if (response.success && response.data) {
        setBusinesses(response.data);
        if (response.data.length > 0 && !selectedBusiness) {
          const firstBusiness = response.data[0];
          if (firstBusiness) {
            setSelectedBusiness(firstBusiness);
            localStorage.setItem('oslira-selected-business', firstBusiness.id);
          }
        }
        logger.info('Businesses loaded', { count: response.data.length });
      } else {
        logger.warn('No businesses returned from API');
      }
    } catch (err) {
      logger.warn('Failed to load businesses (non-critical)', { 
        error: err instanceof Error ? err.message : 'Unknown error',
        userId 
      });
    }
  }, [selectedBusiness]);

  // ===========================================================================
  // HELPER: LOAD SUBSCRIPTION
  // ===========================================================================

const loadSubscription = useCallback(async (userId: string): Promise<void> => {
  try {
    logger.info('Loading user subscription...', { userId });
    const response = await httpClient.get<UserSubscription>('/user/subscription');  // ✅ NEW
      if (response.success && response.data) {
        setSubscription(response.data);
        logger.info('Subscription loaded', { plan: response.data.plan, status: response.data.status });
      } else {
        logger.info('No subscription found, using free tier');
        setSubscription({
          id: '',
          user_id: userId,
          plan: 'free',
          status: 'active',
          credits: 25,
          credits_used: 0,
          period_start: new Date().toISOString(),
          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    } catch (err) {
      logger.warn('Failed to load subscription, using free tier', {
        error: err instanceof Error ? err.message : 'Unknown error',
        userId
      });
      setSubscription({
        id: '',
        user_id: userId,
        plan: 'free',
        status: 'active',
        credits: 25,
        credits_used: 0,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }, []);


  // ===========================================================================
  // INITIALIZATION - OPTIMIZED FOR OAUTH CALLBACK
  // ===========================================================================

  useEffect(() => {
    console.log('🟣 AuthProvider: useEffect STARTED');
    let mounted = true;

    async function initializeAuth() {
      console.log('🔴 AuthProvider: initializeAuth() CALLED');
      
      try {
        console.log('⚪ AuthProvider: Fetching session...');
        
        // CRITICAL: getSession() will pick up the session set by the callback
        // because we're using the SAME Supabase singleton
        const { data: { session: initialSession }, error: sessionError } = 
          await supabase.auth.getSession();

        console.log('🟠 AuthProvider: Session fetched', { 
          hasSession: !!initialSession,
          hasError: !!sessionError,
          mounted,
          userId: initialSession?.user?.id
        });

        if (sessionError) {
          console.error('❌ AuthProvider: Session error', sessionError);
          // Don't throw - just log and continue with no session
        }

        // Check if component unmounted during async operation
        if (!mounted) {
          console.log('⚫ AuthProvider: Component unmounted, stopping');
          return;
        }

        // Update state based on session
        if (initialSession && !sessionError) {
          console.log('✅ AuthProvider: User authenticated', initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          setIsAuthenticated(true);

          // Load user data in background (don't block)
          console.log('🔵 AuthProvider: Loading businesses & subscription...');
          Promise.allSettled([
            loadBusinesses(initialSession.user.id),
            loadSubscription(initialSession.user.id),
          ]).then(() => {
            console.log('🟢 AuthProvider: Businesses & subscription loaded');
          }).catch((err) => {
            console.warn('⚠️ AuthProvider: Failed to load user data', err);
          });
        } else {
          console.log('⚠️ AuthProvider: No session, user not authenticated');
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('💥 AuthProvider: CRITICAL ERROR in initializeAuth', err);
        
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize auth';
          setError(errorMessage);
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        console.log('🎯 AuthProvider: Setting isLoading = false');
        if (mounted) {
          setIsLoading(false);
          console.log('✨ AuthProvider: Initialization COMPLETE');
        }
      }
    }

    // Start initialization
    initializeAuth();

    // Setup auth state listener
    console.log('👂 AuthProvider: Setting up auth state listener');
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('🔔 AuthProvider: Auth state changed', { 
          event, 
          hasSession: !!newSession,
          userId: newSession?.user?.id
        });
        
        if (!mounted) return;

        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          setIsAuthenticated(true);
          
          // Defer async operations to prevent blocking
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setTimeout(() => {
              if (mounted) {
                Promise.allSettled([
                  loadBusinesses(newSession.user.id),
                  loadSubscription(newSession.user.id),
                ]).catch((err) => {
                  console.error('Failed to load user data:', err);
                });
              }
            }, 0);
          }
        } else {
          // User signed out
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setBusinesses([]);
          setSelectedBusiness(null);
          setSubscription(null);
        }
      }
    );

    // Setup token provider for API calls
    httpClient.setTokenProvider(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return currentSession?.access_token ?? null;
    });

    // Cleanup
    return () => {
      console.log('🧹 AuthProvider: Cleanup - unmounting');
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, [loadBusinesses, loadSubscription]);
  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  const refreshBusinesses = useCallback(async () => {
    if (user) await loadBusinesses(user.id);
  }, [user, loadBusinesses]);

  const refreshSubscription = useCallback(async () => {
    if (user) await loadSubscription(user.id);
  }, [user, loadSubscription]);

  const selectBusiness = useCallback((businessId: string) => {
    const business = businesses.find((b) => b.id === businessId);
    if (business) {
      setSelectedBusiness(business);
      localStorage.setItem('oslira-selected-business', business.id);
      logger.info('Business selected', { businessId, name: business.name });
    }
  }, [businesses]);

  const signInWithOAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, scopes: 'email profile' },
      });
      if (signInError) throw signInError;
      logger.info('Google OAuth sign in initiated');
    } catch (err) {
      const errorMessage = err instanceof SupabaseAuthError 
        ? err.message 
        : 'Failed to sign in with Google';
      setError(errorMessage);
      logger.error('Google OAuth sign in failed', err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      localStorage.removeItem('oslira-selected-business');
      logger.info('Sign out successful');
    } catch (err) {
      const errorMessage = err instanceof SupabaseAuthError 
        ? err.message 
        : 'Failed to sign out';
      setError(errorMessage);
      logger.error('Sign out failed', err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    isAuthenticated,
    isLoading,
    error,
    signInWithOAuth,
    signOut,
    businesses,
    selectedBusiness,
    selectBusiness,
    refreshBusinesses,
    subscription,
    refreshSubscription,
  };

  console.log('🎨 AuthProvider: About to render children', { isLoading, isAuthenticated, hasUser: !!user });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
