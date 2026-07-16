'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { Compass, Sparkles, User, Calendar, CreditCard, ChevronRight, PlusCircle, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Tour {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  budget_tier: string;
  base_cost: string;
  final_price: string;
  status: string;
}

export default function TravelerDashboardPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTours = async () => {
    try {
      const res = await api.get('tours/tours/');
      setTours(res.data);
    } catch (err) {
      setError('Failed to fetch your vacation plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  const renderStatusBadge = (status: string) => {
    const base = "px-2.5 py-0.5 rounded-full text-2xs font-bold border uppercase tracking-wider";
    if (status === 'UNLOCKED') return `${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
    if (status === 'LOCKED') return `${base} bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse`;
    if (status === 'REJECTED') return `${base} bg-rose-500/10 text-rose-400 border-rose-500/20`;
    return `${base} bg-slate-800 text-slate-400 border-slate-700/50`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-slate-400 font-medium">Loading your itineraries...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['TRAVELER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Topbar */}
          <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  Traveler Console
                </h1>
                <p className="text-slate-400 text-xs">Manage your vacation schedules and checkouts</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/profile"
                className="text-slate-400 hover:text-white text-xs font-semibold py-2 px-3 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
              >
                Profile Settings
              </Link>
              <button 
                onClick={logout}
                className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-rose-400 hover:text-rose-300 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Quick Actions & Presets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-bold flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <span>Custom Itinerary Compiler</span>
                </h2>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                  Select available flight tickets, customize room layouts, and add restaurant or ride schedules. The system applies dynamic profit margins based on standard rules.
                </p>
              </div>
              <Link 
                href="/traveler/create-tour"
                className="w-fit inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-6 rounded-xl transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Plan a New Trip</span>
              </Link>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-4">
              <h3 className="font-bold text-slate-100 flex items-center space-x-2 text-sm uppercase tracking-wider">
                <User className="h-4 w-4 text-emerald-400" />
                <span>Preferences Helper</span>
              </h3>
              <p className="text-slate-500 text-2xs leading-relaxed">
                We calibrate recommendations automatically. Update your food, style, or budget parameters to get higher score presets.
              </p>
              <Link href="/profile" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1">
                <span>Update preferences</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Itineraries List */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-bold mb-6">Your Vacation Plans</h2>
            
            <div className="space-y-4">
              {tours.map((t) => (
                <div 
                  key={t.id} 
                  className="bg-slate-950/80 border border-slate-850 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-slate-800 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-bold text-slate-200 text-base">{t.title}</h4>
                      {renderStatusBadge(t.status)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-slate-500 text-2xs">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{t.start_date} to {t.end_date}</span>
                      </div>
                      <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-semibold uppercase tracking-wider">
                        Tier: {t.budget_tier}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-900 pt-4 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-4xs uppercase tracking-widest text-slate-550 font-bold">Total Price</span>
                      <p className="text-lg font-black text-emerald-400">${parseFloat(t.final_price).toFixed(2)}</p>
                    </div>

                    {t.status === 'LOCKED' && (
                      <Link 
                        href={`/traveler/checkout?tourId=${t.id}`}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-2.5 px-5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-500/15 animate-pulse"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Pay to Unlock</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {tours.length === 0 && (
                <div className="text-center py-12 text-slate-500 space-y-3">
                  <Compass className="h-10 w-10 mx-auto opacity-30 animate-spin-slow" />
                  <p className="text-xs">No tours planned yet. Click &quot;Plan a New Trip&quot; to compile your first vacation itinerary!</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
