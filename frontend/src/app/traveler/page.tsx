'use client';

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import {
  Compass, Sparkles, User, Calendar, CreditCard, ChevronRight,
  PlusCircle, LogOut, ChevronDown, ChevronUp, CloudSun, AlertTriangle,
  ArrowRightLeft, TrendingUp, Home, MapPin, Plane, Globe, Star,
  Clock, Shield, CheckCircle2, XCircle, Loader2, ArrowLeft, Zap,
  RefreshCw, X, Check, Building, Utensils, Car
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ApprovalWorkflow {
  id: number;
  admin_status: string;
  flight_status: string;
  hotel_status: string;
  restaurant_status: string;
  ride_status: string;
  decision_engine_status: string;
  admin_remarks?: string;
  service_remarks?: Record<string, string>;
}

interface TourRefund {
  id: number;
  service_type: string;
  service_name: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
}

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
  ai_itinerary?: any;
  approval_workflow?: ApprovalWorkflow | null;
  refunds?: TourRefund[];
  created_at?: string;
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

  // Modal state for resolving rejected services
  const [resolveModal, setResolveModal] = useState<{
    tourId: number;
    tourTitle: string;
    serviceType: 'flight' | 'hotel' | 'restaurant' | 'ride';
    serviceLabel: string;
    reason?: string;
    actionType: 'custom' | 'catalog' | 'skip';
    customName: string;
    customDetails: string;
    customCost: string;
    catalogId: number | null;
  } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

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
      const data = Array.isArray(res.data) ? res.data : [];
      // Guarantee LIFO sorting (newest/highest ID/latest created_at at the top)
      const sorted = [...data].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : a.id;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : b.id;
        return timeB - timeA;
      });
      setTours(sorted);
    } catch (err) {
      setError('Failed to fetch your vacation plans.');
    } finally {
      setLoading(false);
    }
  };

  const openResolveModal = async (tour: Tour, serviceType: 'flight' | 'hotel' | 'restaurant' | 'ride', label: string, reason?: string) => {
    setResolveModal({
      tourId: tour.id,
      tourTitle: tour.title,
      serviceType,
      serviceLabel: label,
      reason,
      actionType: 'custom',
      customName: '',
      customDetails: '',
      customCost: '0',
      catalogId: null
    });
    setAvailableServices([]);
    setLoadingAvailable(true);

    try {
      let endpoint = '';
      if (serviceType === 'flight') endpoint = 'tours/flights/?available=true';
      else if (serviceType === 'hotel') endpoint = 'tours/hotels/?available=true';
      else if (serviceType === 'restaurant') endpoint = 'tours/restaurants/?available=true';
      else if (serviceType === 'ride') endpoint = 'tours/rides/?available=true';

      if (endpoint) {
        const res = await api.get(endpoint);
        setAvailableServices(res.data);
      }
    } catch (err) {
      console.error('Failed to load alternative services:', err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolveModal) return;
    setResolving(true);
    try {
      await api.post(`tours/tours/${resolveModal.tourId}/resolve-service/`, {
        service_type: resolveModal.serviceType,
        action_type: resolveModal.actionType,
        catalog_id: resolveModal.catalogId,
        custom_provider_name: resolveModal.customName,
        custom_details: resolveModal.customDetails,
        custom_cost: parseFloat(resolveModal.customCost || '0'),
      });
      setResolveModal(null);
      await fetchTours();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update service.');
    } finally {
      setResolving(false);
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

                const wf = t.approval_workflow;
                const rejectedList: Array<{ type: 'flight' | 'hotel' | 'restaurant' | 'ride'; label: string; reason?: string }> = [];
                if (wf) {
                  if (wf.flight_status === 'REJECTED') rejectedList.push({ type: 'flight', label: 'Flight Service', reason: wf.service_remarks?.FLIGHT });
                  if (wf.hotel_status === 'REJECTED') rejectedList.push({ type: 'hotel', label: 'Hotel / Lodging', reason: wf.service_remarks?.HOTEL });
                  if (wf.restaurant_status === 'REJECTED') rejectedList.push({ type: 'restaurant', label: 'Dining / Restaurant', reason: wf.service_remarks?.RESTAURANT });
                  if (wf.ride_status === 'REJECTED') rejectedList.push({ type: 'ride', label: 'Transport / Ride', reason: wf.service_remarks?.RIDE });
                }

                return (
                  <div
                    key={t.id}
                    className={`bg-white/2 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 ${
                      rejectedList.length > 0
                        ? 'border-amber-500/40 shadow-lg shadow-amber-500/10'
                        : t.status === 'LOCKED'
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

                    {/* Rejected Service Action Banners */}
                    {rejectedList.length > 0 && (
                      <div className="px-5 pb-4 space-y-2.5">
                        {rejectedList.map((rej) => (
                          <div
                            key={rej.type}
                            className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-amber-950/30 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">{rej.label} Declined by Provider</span>
                                <span className="text-3xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">Tour Still Active</span>
                              </div>
                              <p className="text-2xs text-slate-300">
                                Provider Remarks: <span className="italic text-slate-400">{rej.reason || 'Service provider unable to fulfill request on requested dates.'}</span>
                              </p>
                              <p className="text-2xs text-teal-300">
                                You can choose an alternative catalog service, enter your own custom provider details, or remove this service from your itinerary.
                              </p>
                              {t.refunds && t.refunds.filter(r => r.service_type === rej.type.toUpperCase()).length > 0 && (
                                <p className="text-2xs text-emerald-400 font-bold flex items-center gap-1 pt-0.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>Refund of ${t.refunds.filter(r => r.service_type === rej.type.toUpperCase()).reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)} was credited back to your account.</span>
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => openResolveModal(t, rej.type, rej.label, rej.reason)}
                              className="shrink-0 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-amber-400/20 hover:scale-105"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Choose Custom / Alternative</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* General Refunds Notice if any */}
                    {rejectedList.length === 0 && t.refunds && t.refunds.length > 0 && (
                      <div className="px-5 pb-3">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-2xs text-emerald-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Total refunds processed for this tour: <strong>${t.refunds.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}</strong></span>
                          </span>
                          <span className="text-slate-400">{t.refunds.length} transaction(s)</span>
                        </div>
                      </div>
                    )}

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
                              {(() => {
                                const w = aiReports[t.id]?.weather_recommendations;
                                return (
                                  <div className="bg-[#0f1a24] border border-white/8 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                                        <CloudSun className="h-3.5 w-3.5" />
                                        <span>Weather Insights</span>
                                      </div>
                                      {w?.temp && (
                                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                          {w.temp}
                                        </span>
                                      )}
                                    </div>

                                    {w ? (
                                      <div className="space-y-2 text-2xs">
                                        {/* Destination Location */}
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-500 flex items-center gap-1 shrink-0">
                                            <MapPin className="h-3 w-3 text-teal-400" />
                                            Location:
                                          </span>
                                          <span className="font-bold text-slate-200 text-right truncate max-w-[130px]" title={w.location}>
                                            {w.location || 'Tour Destination'}
                                          </span>
                                        </div>

                                        {/* Starting Date */}
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-500 flex items-center gap-1 shrink-0">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            Start Date:
                                          </span>
                                          <span className="font-semibold text-slate-200 text-right">
                                            {w.date_formatted || t.start_date}
                                          </span>
                                        </div>

                                        {/* Condition */}
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-500">Condition:</span>
                                          <span className="font-bold text-teal-300 text-right truncate max-w-[130px]">
                                            {w.condition || 'Pleasant & Mild'}
                                          </span>
                                        </div>

                                        {/* Summary */}
                                        {w.summary && (
                                          <p className="text-3xs text-slate-400 italic bg-white/3 p-1.5 rounded border border-white/5">
                                            {w.summary}
                                          </p>
                                        )}

                                        {/* Alert if any */}
                                        {w.alert && (
                                          <div className="mt-1 flex items-start gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/20 p-1.5 rounded">
                                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-400" />
                                            <span className="text-3xs">{w.alert}</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-2xs text-slate-600">No weather data available</span>
                                    )}
                                  </div>
                                );
                              })()}

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

                            {/* Custom AI Day-by-Day Itinerary If Stored */}
                            {(() => {
                              const itin = aiReports[t.id]?.ai_itinerary || t.ai_itinerary;
                              if (!itin || !itin.daily_itinerary || itin.daily_itinerary.length === 0) return null;
                              return (
                                <div className="bg-[#0f1a24] border border-white/8 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                                      <Sparkles className="h-3.5 w-3.5" />
                                      AI Day-by-Day Itinerary ({itin.days_count || itin.daily_itinerary.length} Days in {itin.destination || 'Destination'})
                                    </p>
                                    {itin.highlights?.food?.length > 0 && (
                                      <span className="text-2xs text-slate-400">Must Try: {itin.highlights.food[0]}</span>
                                    )}
                                  </div>

                                  <div className="space-y-2 pt-1">
                                    {itin.daily_itinerary.map((d: any, idx: number) => (
                                      <div key={idx} className="bg-black/20 border border-white/5 rounded-lg p-3 text-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-extrabold text-white text-xs">Day {d.day_number}: {d.theme}</span>
                                          <span className="text-2xs text-slate-500">{d.date}</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-2xs text-slate-400">
                                          <div className="bg-white/2 p-2 rounded border border-white/5">
                                            <span className="font-bold text-amber-400 block mb-0.5">🌅 Morning</span>
                                            <p className="font-semibold text-slate-200 truncate">{d.morning?.title}</p>
                                            <p className="text-slate-500 text-3xs truncate">{d.morning?.location}</p>
                                          </div>
                                          <div className="bg-white/2 p-2 rounded border border-white/5">
                                            <span className="font-bold text-sky-400 block mb-0.5">☀️ Afternoon</span>
                                            <p className="font-semibold text-slate-200 truncate">{d.afternoon?.title}</p>
                                            <p className="text-slate-500 text-3xs truncate">{d.afternoon?.location}</p>
                                          </div>
                                          <div className="bg-white/2 p-2 rounded border border-white/5">
                                            <span className="font-bold text-violet-400 block mb-0.5">🌙 Evening</span>
                                            <p className="font-semibold text-slate-200 truncate">{d.evening?.title}</p>
                                            <p className="text-slate-500 text-3xs truncate">{d.evening?.location}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
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

      {/* ─── MODAL: RESOLVE REJECTED SERVICE ─── */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0b131e] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xs font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                  Provider Resolution
                </span>
                <h3 className="text-lg font-black text-white mt-1.5 flex items-center gap-2">
                  <span>Resolve {resolveModal.serviceLabel}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5 truncate max-w-md">
                  Tour: <span className="text-white font-semibold">{resolveModal.tourTitle}</span>
                </p>
              </div>
              <button
                onClick={() => setResolveModal(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Provider Rejection Context */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-2xs space-y-1">
              <span className="font-bold text-amber-300">Decline Reason:</span>
              <p className="text-slate-300 italic">{resolveModal.reason || 'Service provider unable to fulfill request on requested dates.'}</p>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-white/3 p-1 rounded-xl border border-white/8 text-xs font-bold">
              <button
                type="button"
                onClick={() => setResolveModal({ ...resolveModal, actionType: 'custom' })}
                className={`py-2 px-3 rounded-lg transition-all text-center ${
                  resolveModal.actionType === 'custom'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Provider
              </button>
              <button
                type="button"
                onClick={() => setResolveModal({ ...resolveModal, actionType: 'catalog' })}
                className={`py-2 px-3 rounded-lg transition-all text-center ${
                  resolveModal.actionType === 'catalog'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Alternative Catalog
              </button>
              <button
                type="button"
                onClick={() => setResolveModal({ ...resolveModal, actionType: 'skip' })}
                className={`py-2 px-3 rounded-lg transition-all text-center ${
                  resolveModal.actionType === 'skip'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Skip Service
              </button>
            </div>

            {/* Tab 1: Custom Provider */}
            {resolveModal.actionType === 'custom' && (
              <div className="space-y-4 pt-1">
                <p className="text-2xs text-slate-400 leading-relaxed">
                  Provide your own custom or self-booked arrangement. If you booked externally on your own, set cost to $0.00.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Custom Provider Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Airbnb Beachfront Villa / Emirates Flight / Local Taxi"
                      value={resolveModal.customName}
                      onChange={(e) => setResolveModal({ ...resolveModal, customName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Booking Reference / Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Confirmation #AB-9921, reservation confirmed directly with host"
                      value={resolveModal.customDetails}
                      onChange={(e) => setResolveModal({ ...resolveModal, customDetails: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Custom Cost ($ USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={resolveModal.customCost}
                      onChange={(e) => setResolveModal({ ...resolveModal, customCost: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                    <span className="text-3xs text-slate-500 mt-1 block">Set $0.00 if already paid externally.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Available Catalog Services */}
            {resolveModal.actionType === 'catalog' && (
              <div className="space-y-3 pt-1">
                <p className="text-2xs text-slate-400">
                  Select another verified provider from our live system catalog:
                </p>
                {loadingAvailable ? (
                  <div className="py-8 flex items-center justify-center space-x-2 text-slate-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>Loading available services...</span>
                  </div>
                ) : availableServices.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {availableServices.map((svc) => {
                      const isSelected = resolveModal.catalogId === svc.id;
                      const title = svc.name || svc.vehicle_type || 'Service';
                      const subtitle = svc.location || `${svc.departure_city || ''} → ${svc.destination_city || ''}` || svc.room_type || svc.cuisine;
                      const price = svc.price || svc.price_per_night || svc.price_per_meal || svc.price_per_km || 0;

                      return (
                        <div
                          key={svc.id}
                          onClick={() => setResolveModal({ ...resolveModal, catalogId: svc.id })}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                              : 'bg-white/2 border-white/8 hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs text-white flex items-center gap-1.5">
                              {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                              <span>{title}</span>
                            </p>
                            <p className="text-2xs text-slate-500">{subtitle}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-emerald-400 text-xs">${parseFloat(price).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                    No alternative services found in this category. You can use the "Custom Provider" tab instead.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Skip Service */}
            {resolveModal.actionType === 'skip' && (
              <div className="bg-white/2 border border-white/8 rounded-xl p-4 text-xs text-slate-300 space-y-2 pt-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-rose-400" />
                  <span>Remove this service from your tour</span>
                </p>
                <p className="text-2xs text-slate-400 leading-relaxed">
                  Choosing this will remove {resolveModal.serviceLabel} from your itinerary. The base tour cost will be updated to deduct this item, and the checkpoint will be marked as skipped so your tour can proceed directly to approval and payment.
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-white/8">
              <button
                type="button"
                onClick={() => setResolveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resolving || (resolveModal.actionType === 'catalog' && !resolveModal.catalogId)}
                onClick={handleResolveSubmit}
                className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 hover:scale-105"
              >
                {resolving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save & Apply Resolution</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
