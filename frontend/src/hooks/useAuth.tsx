import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, getTokens, clearTokens } from '@/services/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: User['role']) => boolean;
  isAllowed: (roles: User['role'][]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      console.log("[Auth] Starting initial auth check...");
      const tokens = getTokens();
      
      if (tokens?.access) {
        try {
          const userData = await authApi.getMe();
          console.log("[Auth] User data fetched successfully:", userData);
          setUser(userData);
        } catch (error) {
          console.error("[Auth] Failed to fetch user details. Clearing tokens.", error);
          clearTokens();
          setUser(null);
        }
      } else {
        console.log("[Auth] No access token found.");
      }
      
      setIsLoading(false);
      console.log("[Auth] Initial loading complete. isLoading set to false.");
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    console.log(`[Auth] Attempting login for user: ${username}`);
    await authApi.login(username, password);
    const userData = await authApi.getMe();
    setUser(userData);
    console.log("[Auth] Login successful. New user data:", userData);
    navigate('/');
  };

  const logout = () => {
    console.log("[Auth] Logging out user.");
    authApi.logout();
    setUser(null);
    navigate('/login');
  };

  const hasRole = (role: User['role']) => {
    const result = user?.role === role;
    console.log(`[Auth] hasRole('${role}') check: User Role='${user?.role}', Result=${result}`);
    return result; 
  };
  
  // NEW: Check if user role is in the provided list
  const isAllowed = (roles: User['role'][]) => {
    const userRole = user?.role;
    const result = !!userRole && roles.includes(userRole);
    console.log(`[Auth] isAllowed check (Roles: ${roles.join(',')}) - User Role='${userRole}', Result=${result}`);
    return result;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole, 
        isAllowed,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}