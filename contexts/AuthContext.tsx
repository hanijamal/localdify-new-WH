import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';
import {
  loginUser,
  registerUser,
  logoutUser as apiLogoutUser,
  getUserProfile,
  updateUserProfile as apiUpdateUserProfile,
  updateUserPassword as apiUpdateUserPassword,
  sendPasswordResetEmail
} from '../services/supabaseService';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<User | null>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateUserPassword: (oldPass: string, newPass: string) => Promise<void>;
  sendPasswordResetLink: (email: string) => Promise<void>;
  updatePasswordForRecovery: (newPass: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isPasswordRecovery: false,
  isAdmin: false,
  login: async () => null,
  register: async () => { },
  logout: () => { },
  updateUserProfile: async () => { },
  updateUserPassword: async () => { },
  sendPasswordResetLink: async () => { },
  updatePasswordForRecovery: async () => { },
  refreshUser: async () => null,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Use a ref to capture the initial URL state
  const isRecoveryUrlOnLoad = useRef(
    window.location.search.includes('type=recovery') ||
    window.location.hash.includes('type=recovery')
  );

  const logout = useCallback(async () => {
    await apiLogoutUser();
    setUser(null);
    setIsAdmin(false);
    setIsPasswordRecovery(false);
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting auth user for refresh:", error.message);
      await logout();
      return null;
    }

    if (authUser) {
      try {
        const profile = await getUserProfile(authUser.id);
        if (profile) {
          setUser(currentUser => {
            if (JSON.stringify(currentUser) !== JSON.stringify(profile)) {
              return profile;
            }
            return currentUser;
          });
          setIsAdmin(profile.role === 'admin');
          return profile;
        } else {
          console.warn("User profile not found during refresh. Forcing sign out.");
          await logout();
          return null;
        }
      } catch (profileError: unknown) {
        const errorMessage = (profileError instanceof Error) ? profileError.message : String(profileError);
        console.error("Error refreshing user profile:", errorMessage);
        await logout();
        return null;
      }
    } else {
      setUser(null);
      setIsAdmin(false);
      return null;
    }
  }, [logout]);


  useEffect(() => {
    // --- START: Manual fix for BrowserRouter + Supabase recovery link ---
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    // Check if we have recovery tokens in URL params or hash
    const accessToken = searchParams.get('access_token') || new URLSearchParams(hash.substring(1)).get('access_token');
    const refreshToken = searchParams.get('refresh_token') || new URLSearchParams(hash.substring(1)).get('refresh_token');
    const type = searchParams.get('type') || new URLSearchParams(hash.substring(1)).get('type');

    if (type === 'recovery' && accessToken && refreshToken && window.location.pathname.includes('/update-password')) {
      console.log("Recovery URL detected. Manually setting session.");

      // Manually set the session using the tokens from the URL.
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        if (error) {
          console.error("Error manually setting session:", error);
          setLoading(false);
        } else {
          setIsPasswordRecovery(true);
          setLoading(false);
        }
      });

      // Clean up the URL to remove tokens
      window.history.replaceState(null, '', '/update-password');

      return;
    }
    // --- END: Manual fix ---

    const recoveryTimeout = setTimeout(() => {
      if (isRecoveryUrlOnLoad.current && loading) {
        console.warn("Timed out waiting for PASSWORD_RECOVERY event. Link is likely invalid or expired.");
        setLoading(false);
        setIsPasswordRecovery(false);
        isRecoveryUrlOnLoad.current = false; // Stop waiting
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(recoveryTimeout);
        setIsPasswordRecovery(true);
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        isRecoveryUrlOnLoad.current = false; // We have handled the recovery event, reset the flag.
        return;
      }

      // If the page loaded with a recovery URL, we ignore all other auth events
      // until we get the PASSWORD_RECOVERY event or time out.
      if (isRecoveryUrlOnLoad.current) {
        return;
      }

      // --- This is the standard auth flow for all other cases (login, logout, session refresh) ---
      clearTimeout(recoveryTimeout);
      setIsPasswordRecovery(false);

      if (session?.user) {
        getUserProfile(session.user.id)
          .then(profile => {
            if (profile) {
              setUser(currentUser => {
                if (JSON.stringify(currentUser) !== JSON.stringify(profile)) {
                  return profile;
                }
                return currentUser;
              });
              setIsAdmin(profile.role === 'admin');
            } else {
              console.warn("Session exists but user profile not found. Forcing sign out.");
              supabase.auth.signOut();
            }
          })
          .catch(error => {
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            console.error("Error fetching user profile on auth state change:", errorMessage);
            supabase.auth.signOut();
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(recoveryTimeout);
    };
  }, []); // Note: The empty dependency array is crucial for the useRef logic to work correctly.


  const login = async (email: string, pass: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userProfile = await loginUser(email, pass);
      if (userProfile) {
        setUser(userProfile);
        setIsAdmin(userProfile.role === 'admin');
        return userProfile;
      }
      return null;
    } catch (error) {
      // If login fails, ensure user state is cleared.
      setUser(null);
      setIsAdmin(false);
      throw error; // Re-throw the error to be caught by the login page
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    await registerUser(name, email, pass);
  }

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) throw new Error("Not logged in");
    const updatedUser = await apiUpdateUserProfile(user.id, data);
    setUser(updatedUser);
  };

  const updateUserPassword = async (oldPass: string, newPass: string) => {
    if (!user) throw new Error("Not logged in");
    await apiUpdateUserPassword(newPass);
  };

  const sendPasswordResetLink = async (email: string) => {
    await sendPasswordResetEmail(email);
  };

  const updatePasswordForRecovery = async (newPass: string) => {
    if (!isPasswordRecovery) throw new Error("Not in password recovery mode.");
    await apiUpdateUserPassword(newPass);
    // After password update, force logout to ensure re-login with new password
    await logout();
  };


  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isPasswordRecovery,
      isAdmin,
      login,
      register,
      logout,
      updateUserProfile,
      updateUserPassword,
      sendPasswordResetLink,
      updatePasswordForRecovery,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};