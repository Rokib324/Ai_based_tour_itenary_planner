'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/utils/api';

interface UserProfile {
  email: string;
  username: string;
  role: string;
  status: string;
  is_email_verified: boolean;
  profile?: {
    phone_number: string;
    address: string;
    preferred_budget_tier: string;
    preferred_travel_style: string;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  updateProfile: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    setUser(null);
    setRole(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('auth/profile/');
      const formattedUser: UserProfile = {
        ...res.data.user,
        profile: {
          phone_number: res.data.phone_number || '',
          address: res.data.address || '',
          preferred_budget_tier: res.data.preferred_budget_tier || 'STANDARD',
          preferred_travel_style: res.data.preferred_travel_style || '',
          preferred_food: res.data.preferred_food || ''
        }
      };
      setUser(formattedUser);
      setRole(formattedUser.role);
      localStorage.setItem('user_role', formattedUser.role);
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const res = await api.post('auth/login/', { email, password });
      const { access, refresh, user: userData } = res.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user_role', userData.role);
      
      setUser(userData);
      setRole(userData.role);
      return userData;
    } catch (err: any) {
      setLoading(false);
      throw err.response?.data || err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    try {
      const res = await api.post('auth/register/', data);
      return res.data;
    } catch (err: any) {
      throw err.response?.data || err;
    }
  };

  const updateProfile = async (data: any) => {
    try {
      const res = await api.put('auth/profile/', data);
      const formattedUser: UserProfile = {
        ...res.data.user,
        profile: {
          phone_number: res.data.phone_number || '',
          address: res.data.address || '',
          preferred_budget_tier: res.data.preferred_budget_tier || 'STANDARD',
          preferred_travel_style: res.data.preferred_travel_style || '',
          preferred_food: res.data.preferred_food || ''
        }
      };
      setUser(formattedUser);
    } catch (err: any) {
      throw err.response?.data || err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
