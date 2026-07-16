'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.status === 'PENDING') {
        router.push('/pending');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to correct dashboard based on actual role
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          router.push('/admin');
        } else if (user.role === 'TRAVELER') {
          router.push('/traveler');
        } else if (['FLIGHT_MANAGER', 'HOTEL_MANAGER', 'RESTAURANT_MANAGER', 'RIDE_MANAGER'].includes(user.role)) {
          router.push('/manager');
        } else {
          router.push('/');
        }
      }
    }
  }, [user, role, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-slate-400 font-medium animate-pulse">Loading secure session...</p>
        </div>
      </div>
    );
  }

  // Double check credentials
  if (!user || (allowedRoles && !allowedRoles.includes(user.role)) || user.status === 'PENDING') {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
