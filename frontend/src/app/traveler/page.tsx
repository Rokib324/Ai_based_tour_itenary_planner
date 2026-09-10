'use client';

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import {
  Compass, Sparkles, User, Calendar, CreditCard, ChevronRight,
  PlusCircle, LogOut, ChevronDown, ChevronUp, CloudSun, AlertTriangle,
  ArrowRightLeft, TrendingUp, Home, MapPin, Plane, Globe, Star,
  Clock, Shield, CheckCircle2, XCircle, Loader2, ArrowLeft, Zap
} from 'lucide-react';
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
  markup_percentage: string;
  status: string;
  items?: any[];
}

export default function TravelerDashboardPage() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTourId, setExpandedTourId] = useState<number | null>(null);
  const [aiReports, setAiReports] = useState<Record<number, any>>({});
  const [loadingAI, setLoadingAI] = useState<Record<number, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleExpandTour = async (tourId: number) => {
    if (expandedTourId === tourId) {
      setExpandedTourId(null);
      return;
    }
    setExpandedTourId(tourId);
    if (!aiReports[tourId]) {
      setLoadingAI(prev => ({ ...prev, [tourId]: true }));
      try {
        const res = await api.get(`tours/tours/${tourId}/ai-analysis/`);
        setAiReports(prev => ({ ...prev, [tourId]: res.data }));
      } catch (err) {
        console.error('Failed to fetch AI analysis for tour:', tourId, err);
      } finally {
        setLoadingAI(prev => ({ ...prev, [tourId]: false }));
      }
    }
  };

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
    const interval = setInterval(fetchTours, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'UNLOCKED':
        return { label: '✅ PAID & UNLOCKED', classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: <CheckCircle2 className="h-3 w-3" />, glow: 'shadow-emerald-500/20' };
      case 'LOCKED':
        return { label: '🔒 APPROVED — PAY NOW', classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse', icon: <CreditCard className="h-3 w-3" />, glow: 'shadow-amber-500/30' };
      case 'REJECTED':
        return { label: '❌ REJECTED', classes: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: <XCircle className="h-3 w-3" />, glow: 'shadow-rose-500/10' };
      default:
        return { label: '⏳ AWAITING APPROVAL', classes: 'bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse', icon: <Clock className="h-3 w-3" />, glow: 'shadow-sky-500/10' };
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'LUXURY': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'STANDARD': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'BUDGET': return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      default: return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    }
  };

  const lockedTours = tours.filter(t => t.status === 'LOCKED');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080b12] text-white">
        <div className="flex flex-col items-center space-y-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Compass className="h-8 w-8 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-emerald-400/10 blur-xl animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">Charting your adventures...</p>
            <p className="text-slate-500 text-xs mt-1">Loading your personalized travel hub</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['TRAVELER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-[#080b12] text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[400px] bg-teal-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-sky-500/3 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">

          {/* ─── HEADER ─── */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/3 backdrop-blur-xl border border-white/8 p-5 rounded-2xl shadow-2xl">
            <div className="flex items-center space-x-4">
              {/* Home button */}
              <Link
                href="/"
                className="group flex items-center space-x-2 bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 px-3.5 py-2 rounded-xl transition-all duration-200"
                title="Back to Home"
              >
                <Home className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-400 transition-colors hidden sm:block">Home</span>
              </Link>

              <div className="w-px h-8 bg-white/10" />

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Compass className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#080b12]" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">Traveler Hub</h1>
                  <p className="text-slate-500 text-xs">Welcome back, <span className="text-emerald-400 font-semibold">{user?.username || 'Explorer'}</span></p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
              <div className="hidden md:flex items-center space-x-1 bg-white/3 border border-white/8 px-3 py-1.5 rounded-lg">
                <Globe className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-slate-400 font-mono">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <Link
                href="/profile"
                className="text-slate-400 hover:text-white text-xs font-semibold py-2 px-3.5 border border-white/8 hover:border-white/20 rounded-xl transition-all"
              >
                Profile
              </Link>
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </header>

          {/* ─── PAYMENT ALERT BANNER ─── */}
          {lockedTours.length > 0 && (
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-emerald-950/80 border-2 border-emerald-500/50 p-5 rounded-2xl shadow-2xl shadow-emerald-500/10">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/10 to-emerald-500/5 animate-pulse" />
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                    <CreditCard className="h-6 w-6 text-slate-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">All Managers Approved!</span>
                      <span className="text-lg">🎉</span>
                    </div>
                    <h3 className="text-white font-black text-base mt-0.5">
                      "{lockedTours[0].title}" is Ready to Book
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Complete payment to lock in your reservation. Total: <span className="text-emerald-400 font-bold">${parseFloat(lockedTours[0].final_price).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <Link
                  href={`/traveler/checkout?tourId=${lockedTours[0].id}`}
                  className="shrink-0 w-full md:w-auto bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black py-3 px-6 rounded-xl text-sm transition-all transform hover:scale-105 shadow-xl shadow-emerald-500/30 flex items-center justify-center space-x-2"
                >
                  <span>Pay Now — ${parseFloat(lockedTours[0].final_price).toFixed(2)}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-center space-x-2">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ─── QUICK ACTION CARDS ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Plan a Trip Card */}
            <div className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#0f1a24] to-[#0a1520] border border-emerald-500/20 rounded-2xl p-7 group hover:border-emerald-500/40 transition-all duration-300">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full -translate-y-16 translate-x-16 group-hover:bg-emerald-500/10 transition-all duration-500" />
              <div className="absolute bottom-0 right-12 opacity-5 group-hover:opacity-10 transition-opacity">
                <Plane className="h-32 w-32 text-emerald-400 rotate-45" />
              </div>
              <div className="relative space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="bg-emerald-500/15 p-2 rounded-lg border border-emerald-500/20">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">AI-Powered Planning</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Build Your Dream Itinerary</h2>
                  <p className="text-slate-400 text-xs leading-relaxed mt-2 max-w-md">
                    Select flights, hotels, dining & rides. Our AI applies dynamic pricing and routes your plan through expert approval checkpoints.
                  </p>
                </div>
                <Link
                  href="/traveler/create-tour"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-2.5 px-5 rounded-xl text-xs transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/20"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Plan a New Trip</span>
                </Link>
              </div>
            </div>

            {/* Stats + Profile Card */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-sky-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">Your Stats</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/3 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-white">{tours.length}</p>
                  <p className="text-3xl text-slate-500 text-xs mt-0.5">Total Trips</p>
                </div>
                <div className="bg-white/3 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-400">{tours.filter(t => t.status === 'UNLOCKED').length}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Completed</p>
                </div>
              </div>

              <Link href="/profile" className="flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-emerald-400 transition-colors group">
                <span>Update Preferences</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* ─── TOURS LIST ─── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white flex items-center space-x-2">
                <Globe className="h-5 w-5 text-emerald-400" />
                <span>Your Vacation Plans</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">{tours.length}</span>
              </h2>
            </div>

            <div className="space-y-3">
              {tours.map((t) => {
                const statusCfg = getStatusConfig(t.status);
                const isExpanded = expandedTourId === t.id;
                const daysLeft = Math.ceil((new Date(t.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={t.id}
                    className={`bg-white/2 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 ${
                      t.status === 'LOCKED'
                        ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                        : t.status === 'UNLOCKED'
                        ? 'border-teal-500/30 shadow-lg shadow-teal-500/5'
                        : 'border-white/8 hover:border-white/15'
                    }`}
                  >
                    {/* Tour Header Row */}
                    <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-start space-x-4 flex-1 min-w-0">
                        {/* Destination icon */}
                        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border ${
                          t.status === 'LOCKED' ? 'bg-emerald-500/15 border-emerald-500/30' :
                          t.status === 'UNLOCKED' ? 'bg-teal-500/15 border-teal-500/30' :
                          'bg-white/5 border-white/10'
                        }`}>
                          <Plane className={`h-5 w-5 ${
                            t.status === 'LOCKED' ? 'text-emerald-400' :
                            t.status === 'UNLOCKED' ? 'text-teal-400' :
                            'text-slate-400'
                          }`} />
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-white text-sm truncate">{t.title}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold border ${statusCfg.classes}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-600" />
                              <span>{t.start_date} → {t.end_date}</span>
                            </div>
                            {daysLeft > 0 && (
                              <div className="flex items-center space-x-1 text-amber-400">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="font-semibold">{daysLeft}d away</span>
                              </div>
                            )}
                            <span className={`px-2 py-0.5 rounded-md border text-2xs font-bold ${getTierBadge(t.budget_tier)}`}>
                              {t.budget_tier}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 md:justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0 w-full md:w-auto">
                        {/* Price */}
                        <div className="text-right">
                          <p className="text-2xs text-slate-600 uppercase tracking-wider font-bold">Total Price</p>
                          <p className="text-xl font-black text-emerald-400">${parseFloat(t.final_price).toFixed(2)}</p>
                          <p className="text-2xs text-slate-600">Base: ${parseFloat(t.base_cost).toFixed(2)} +{t.markup_percentage}%</p>
                        </div>

                        {/* Pay Button */}
                        {t.status === 'LOCKED' && (
                          <Link
                            href={`/traveler/checkout?tourId=${t.id}`}
                            className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black py-2.5 px-5 rounded-xl text-xs flex items-center space-x-2 transition-all shadow-lg shadow-emerald-500/25 hover:scale-105"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Pay to Unlock</span>
                          </Link>
                        )}

                        {/* AI Insights Button */}
                        <button
                          onClick={() => toggleExpandTour(t.id)}
                          className={`flex items-center space-x-1.5 text-xs font-semibold py-2.5 px-4 border rounded-xl transition-all ${
                            isExpanded
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-white/3 border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30'
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          <span>AI Insights</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    {/* AI Insights Expanded Panel */}
                    {isExpanded && (
                      <div className="border-t border-white/5 bg-white/2 p-5 space-y-5">
                        {loadingAI[t.id] ? (
                          <div className="flex items-center justify-center py-8 space-x-3">
                            <Loader2 className="animate-spin h-5 w-5 text-emerald-400" />
                            <span className="text-slate-400 text-sm">Running AI analysis engine...</span>
                          </div>
                        ) : aiReports[t.id] ? (
                          <>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                              AI Intelligence Report
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Approval probability */}
                              <div className="bg-[#0f1a24] border border-white/8 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                  <Star className="h-3.5 w-3.5" />
                                  <span>Approval Score</span>
                                </div>
                                <div>
                                  <div className="flex justify-between items-baseline mb-1.5">
                                    <span className="text-2xl font-black text-white">{Math.round(aiReports[t.id].approval_probability)}%</span>
                                    <span className="text-2xs text-slate-500">Predicted</span>
                                  </div>
                                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                                      style={{ width: `${aiReports[t.id].approval_probability}%` }}
                                    />
                                  </div>
                                </div>
                                <p className="text-2xs text-slate-600">Based on historic slots & price markups</p>
                              </div>

                              {/* Price forecast */}
                              <div className="bg-[#0f1a24] border border-white/8 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                  <TrendingUp className="h-3.5 w-3.5" />
                                  <span>Future Price</span>
                                </div>
                                <div>
                                  <p className="text-2xl font-black text-emerald-400">${aiReports[t.id].future_cost_prediction?.toFixed(2)}</p>
                                  <p className="text-2xs text-slate-500 mt-0.5">Starting {t.start_date}</p>
                                </div>
                                <p className="text-2xs text-slate-600">Seasonal inflation forecast</p>
                              </div>

                              {/* Weather */}
                              <div className="bg-[#0f1a24] border border-white/8 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                                  <CloudSun className="h-3.5 w-3.5" />
                                  <span>Weather Insights</span>
                                </div>
                                {aiReports[t.id].weather_recommendations ? (
                                  <div className="space-y-1.5 text-2xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Condition:</span>
                                      <span className="font-bold text-slate-300 text-right max-w-[100px]">{aiReports[t.id].weather_recommendations.condition}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Temp:</span>
                                      <span className="font-bold text-slate-300">{aiReports[t.id].weather_recommendations.temp}</span>
                                    </div>
                                    {aiReports[t.id].weather_recommendations.alert && (
                                      <div className="mt-2 flex items-start gap-1 text-amber-300 bg-amber-500/5 border border-amber-500/15 p-1.5 rounded">
                                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                        <span className="text-3xs">{aiReports[t.id].weather_recommendations.alert}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-2xs text-slate-600">No weather data available</span>
                                )}
                              </div>

                              {/* Savings */}
                              <div className="bg-[#0f1a24] border border-white/8 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                  <span>Smart Savings</span>
                                </div>
                                <div className="space-y-2 max-h-[100px] overflow-y-auto">
                                  {aiReports[t.id].cheaper_alternatives?.length > 0 ? (
                                    aiReports[t.id].cheaper_alternatives.map((alt: any, i: number) => (
                                      <div key={i} className="bg-white/3 rounded-lg p-2 text-3xs space-y-1">
                                        <div className="flex justify-between text-slate-300 font-bold">
                                          <span>{alt.item_type}</span>
                                          <span className="text-emerald-400">Save ${alt.savings?.toFixed(2)}</span>
                                        </div>
                                        <p className="text-slate-600">{alt.alt_name}</p>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-2xs text-slate-600 py-2 text-center border border-dashed border-white/5 rounded-lg">
                                      ✓ Already optimized!
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-6 text-slate-500 text-sm">
                            Failed to load AI insights. Please try again.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {tours.length === 0 && (
                <div className="text-center py-20 space-y-5">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-3xl bg-white/3 border border-white/8 flex items-center justify-center mx-auto">
                      <Compass className="h-10 w-10 text-slate-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">No adventures yet!</h3>
                    <p className="text-slate-500 text-sm mt-1">Start planning your first trip with our AI-powered itinerary builder.</p>
                  </div>
                  <Link
                    href="/traveler/create-tour"
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black py-3 px-6 rounded-xl text-sm transition-all hover:scale-105"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Plan Your First Trip</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
