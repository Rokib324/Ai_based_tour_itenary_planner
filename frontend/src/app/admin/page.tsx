'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import {
  ShieldCheck, LogOut, DollarSign, Users, Compass, Activity,
  Check, X, RefreshCw, CheckCircle, ExternalLink, Home,
  TrendingUp, CreditCard, UserCheck, Zap, Globe,
  BarChart3, AlertTriangle, Loader2, ChevronRight,
  Plane, Hotel, Utensils, Car, Eye, XCircle, Clock, Calendar,
  PieChart, ArrowUpRight, ArrowDownRight, Wallet, Hash, Mail,
  UserCircle, Shield
} from 'lucide-react';
import Link from 'next/link';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface AdminMetrics {
  total_users: number;
  pending_registrations: number;
  total_tours: number;
  pending_approvals: number;
  tour_status_distribution: Record<string, number>;
  tour_tier_distribution: Record<string, number>;
  role_distribution: Record<string, number>;
}
interface Financials {
  total_revenue: number;
  total_base_cost: number;
  total_profit: number;
  profit_margin_percent: number;
  revenue_by_tier: { tier: string; revenue: number; count: number }[];
  revenue_by_method: { method: string; revenue: number; count: number }[];
  revenue_by_status: { status: string; revenue: number; count: number }[];
}
interface UserRow {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  is_email_verified: boolean;
  date_joined: string;
  tour_count: number;
  total_spent: number;
}
interface TourRow {
  id: number;
  title: string;
  traveler_email: string;
  traveler_username: string;
  status: string;
  budget_tier: string;
  start_date: string;
  end_date: string;
  final_price: number;
  base_cost: number;
  created_at: string;
}
interface PaymentRow {
  id: number;
  traveler_email: string;
  traveler_username: string;
  tour_title: string;
  tour_id: number;
  amount: number;
  status: string;
  payment_method: string;
  transaction_id: string;
  created_at: string;
}
interface PendingUser { id: number; email: string; username: string; role: string; }
interface ActivityLog { id: number; user_email: string; action: string; details: string; created_at: string; }

type ModalType = 'users' | 'tours' | 'revenue' | null;

/* ─── Helpers ────────────────────────────────────────────────────────── */
const TIER_COLORS: Record<string, string> = {
  BUDGET: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  STANDARD: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  LUXURY: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  CUSTOM: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  APPROVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  REJECTED: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  LOCKED: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  UNLOCKED: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  COMPLETED: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  SUCCESSFUL: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  FAILED: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
};
const ROLE_COLORS: Record<string, string> = {
  TRAVELER: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  ADMIN: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  SUPER_ADMIN: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  FLIGHT_MANAGER: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  HOTEL_MANAGER: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  RESTAURANT_MANAGER: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  RIDE_MANAGER: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  REGISTERED: 'text-slate-400 bg-white/5 border-white/10',
  ANONYMOUS: 'text-slate-600 bg-white/3 border-white/8',
};

function Badge({ value, colorClass }: { value: string; colorClass: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-bold border ${colorClass}`}>
      {value}
    </span>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const { logout } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [usersList, setUsersList] = useState<UserRow[]>([]);
  const [toursList, setToursList] = useState<TourRow[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingTours, setPendingTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState<number | null>(null);
  const [processingTour, setProcessingTour] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [tourSearch, setTourSearch] = useState('');
  const [tourStatusFilter, setTourStatusFilter] = useState('ALL');
  const [revenueTab, setRevenueTab] = useState<'tier' | 'method' | 'status' | 'payments'>('tier');

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [dashRes, usersRes, toursRes] = await Promise.all([
        api.get('analytics/dashboard/admin/'),
        api.get('auth/pending-approvals/'),
        api.get('approvals/queue/'),
      ]);
      const usersList_ = Array.isArray(usersRes.data) ? usersRes.data : [];
      const toursList_ = Array.isArray(toursRes.data) ? toursRes.data : [];
      setMetrics(dashRes.data.metrics);
      setFinancials(dashRes.data.financials);
      setUsersList(dashRes.data.users_list || []);
      setToursList(dashRes.data.tours_list || []);
      setAllPayments(dashRes.data.all_payments || []);
      setActivityLogs(dashRes.data.recent_activity_logs || []);
      setRecentPayments(dashRes.data.recent_payments || []);
      setPendingUsers([...usersList_].sort((a, b) => b.id - a.id));
      setPendingTours([...toursList_].sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : a.id;
        const tB = b.created_at ? new Date(b.created_at).getTime() : b.id;
        return tB - tA;
      }));
    } catch {
      setError('Failed to fetch dashboard intelligence.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleApproveRejectUser = async (userId: number, action: 'approve' | 'reject') => {
    setProcessingUser(userId);
    try {
      await api.post(`auth/approve/${userId}/`, { action });
      loadData();
    } catch { /* silent */ } finally {
      setProcessingUser(null);
    }
  };

  const handleApproveRejectTour = async (workflowId: number, statusVal: 'APPROVED' | 'REJECTED') => {
    setProcessingTour(workflowId);
    try {
      await api.post(`approvals/${workflowId}/action/`, { status: statusVal, comments: 'Admin action via portal' });
      loadData();
    } catch { /* silent */ } finally {
      setProcessingTour(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080b12] text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-slate-400 font-medium">Bootstrapping system telemetry...</p>
        </div>
      </div>
    );
  }

  /* ── Filtered lists for modals ── */
  const filteredUsers = usersList.filter(u => {
    const matchSearch = !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });
  const filteredTours = toursList.filter(t => {
    const matchSearch = !tourSearch || t.title.toLowerCase().includes(tourSearch.toLowerCase()) || t.traveler_email.toLowerCase().includes(tourSearch.toLowerCase());
    const matchStatus = tourStatusFilter === 'ALL' || t.status === tourStatusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenueByTier = financials?.revenue_by_tier.reduce((s, r) => s + r.revenue, 0) || 1;
  const totalRevenueByMethod = financials?.revenue_by_method.reduce((s, r) => s + r.revenue, 0) || 1;

  /* ── KPI data ── */
  const kpis = [
    {
      key: 'users',
      label: 'Total Users',
      value: metrics?.total_users ?? 0,
      sub: metrics?.pending_registrations ? `${metrics.pending_registrations} pending` : 'All verified',
      subColor: metrics?.pending_registrations ? 'text-amber-400' : 'text-emerald-400',
      icon: Users,
      iconBg: 'bg-sky-500/10 border-sky-500/20',
      iconColor: 'text-sky-400',
      badgeBg: 'bg-sky-500/15 border-sky-500/30',
      trend: `${metrics?.role_distribution?.TRAVELER ?? 0} travelers`,
      clickable: true,
    },
    {
      key: 'tours',
      label: 'Total Tours',
      value: metrics?.total_tours ?? 0,
      sub: metrics?.pending_approvals ? `${metrics.pending_approvals} awaiting approval` : 'All processed',
      subColor: metrics?.pending_approvals ? 'text-rose-400 animate-pulse' : 'text-emerald-400',
      icon: Compass,
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      iconColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 border-amber-500/30',
      trend: `${metrics?.tour_status_distribution?.UNLOCKED ?? 0} paid`,
      clickable: true,
    },
    {
      key: 'revenue',
      label: 'Total Revenue',
      value: `$${(financials?.total_revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: `Base cost $${(financials?.total_base_cost ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subColor: 'text-slate-500',
      icon: DollarSign,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
      trend: `${(financials?.revenue_by_tier?.length ?? 0)} tiers`,
      clickable: true,
    },
    {
      key: 'profit',
      label: 'Net Profit',
      value: `$${(financials?.total_profit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: `${financials?.profit_margin_percent ?? 0}% margin`,
      subColor: 'text-teal-400',
      icon: BarChart3,
      iconBg: 'bg-teal-500/10 border-teal-500/20',
      iconColor: 'text-teal-400',
      badgeBg: 'bg-teal-500/15 border-teal-500/30',
      trend: 'Revenue – Cost',
      clickable: false,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-[#080b12] text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Ambient */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-[600px] h-[400px] bg-emerald-500/3 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-teal-500/3 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">

          {/* ─── HEADER ─── */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/3 backdrop-blur-xl border border-white/8 p-5 rounded-2xl shadow-2xl">
            <div className="flex items-center space-x-4">
              <Link href="/" className="group flex items-center space-x-2 bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 px-3.5 py-2 rounded-xl transition-all">
                <Home className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-400 hidden sm:block">Home</span>
              </Link>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h1 className="text-base font-black text-white">System Admin Portal</h1>
                  <p className="text-slate-500 text-xs">Platform Intelligence & Audit Control</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <Link href="/manager/approvals" className="inline-flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all">
                <span>Full Approvals Workspace</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button onClick={() => { setRefreshing(true); loadData(); }} disabled={refreshing} className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-all" title="Refresh">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={logout} className="flex items-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Log Out</span>
              </button>
            </div>
          </header>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {/* ─── KPI CARDS ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.key}
                  onClick={() => kpi.clickable ? setActiveModal(kpi.key as ModalType) : undefined}
                  className={`bg-white/3 border border-white/8 p-5 rounded-2xl transition-all group relative overflow-hidden
                    ${kpi.clickable ? 'cursor-pointer hover:border-white/20 hover:bg-white/5 hover:scale-[1.02] active:scale-100' : 'hover:border-white/15'}`}
                >
                  {kpi.clickable && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${kpi.iconBg}`}>
                      <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                    </div>
                    <span className={`text-2xs font-bold ${kpi.subColor}`}>{kpi.sub}</span>
                  </div>
                  <p className={`text-3xl font-black ${kpi.key === 'revenue' ? 'text-emerald-400' : kpi.key === 'profit' ? 'text-teal-400' : 'text-white'}`}>
                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                  </p>
                  <p className="text-slate-600 text-2xs font-bold uppercase tracking-wider mt-1">{kpi.label}</p>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-3xs text-slate-600">{kpi.trend}</span>
                    {kpi.clickable && <ChevronRight className="h-3 w-3 text-slate-700 group-hover:text-slate-500 transition-colors" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── KPI SECONDARY BARS (tour breakdown) ─── */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tour status distribution */}
              <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black text-white flex items-center gap-2"><PieChart className="h-4 w-4 text-amber-400" />Tour Status Breakdown</h3>
                {Object.entries(metrics.tour_status_distribution).map(([s, cnt]) => (
                  <div key={s} className="space-y-1">
                    <div className="flex justify-between text-2xs">
                      <span className="text-slate-400 font-semibold">{s}</span>
                      <span className="text-white font-black">{cnt}</span>
                    </div>
                    <MiniBar pct={(cnt / (metrics.total_tours || 1)) * 100} color={STATUS_COLORS[s]?.split(' ')[2] || 'bg-white/20'} />
                  </div>
                ))}
              </div>

              {/* Tier distribution */}
              <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black text-white flex items-center gap-2"><Zap className="h-4 w-4 text-violet-400" />Budget Tier Distribution</h3>
                {Object.entries(metrics.tour_tier_distribution).map(([tier, cnt]) => (
                  <div key={tier} className="space-y-1">
                    <div className="flex justify-between text-2xs">
                      <span className="text-slate-400 font-semibold">{tier}</span>
                      <span className="text-white font-black">{cnt}</span>
                    </div>
                    <MiniBar pct={(cnt / (metrics.total_tours || 1)) * 100} color="bg-violet-500" />
                  </div>
                ))}
              </div>

              {/* Role distribution */}
              <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black text-white flex items-center gap-2"><UserCircle className="h-4 w-4 text-sky-400" />User Role Distribution</h3>
                {Object.entries(metrics.role_distribution).sort((a,b)=>b[1]-a[1]).map(([role, cnt]) => (
                  <div key={role} className="space-y-1">
                    <div className="flex justify-between text-2xs">
                      <span className="text-slate-400 font-semibold">{role.replace('_', ' ')}</span>
                      <span className="text-white font-black">{cnt}</span>
                    </div>
                    <MiniBar pct={(cnt / (metrics.total_users || 1)) * 100} color="bg-sky-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Registration Queue */}
              <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-sm font-black text-white flex items-center space-x-2">
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    <span>Registration Approval Queue</span>
                  </h2>
                  {pendingUsers.length > 0 && (
                    <span className="text-2xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">{pendingUsers.length} pending</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-600 uppercase tracking-wider font-bold border-b border-white/5 text-2xs">
                        <th className="py-3 px-5">User</th>
                        <th className="py-3 px-5">Email</th>
                        <th className="py-3 px-5">Role Request</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/4">
                      {pendingUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/3 transition-colors">
                          <td className="py-4 px-5 font-bold text-white text-xs">{u.username}</td>
                          <td className="py-4 px-5 text-slate-400 text-xs">{u.email}</td>
                          <td className="py-4 px-5">
                            <Badge value={u.role} colorClass={ROLE_COLORS[u.role] || 'text-slate-400 bg-white/5 border-white/10'} />
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleApproveRejectUser(u.id, 'reject')} disabled={processingUser === u.id}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-50">
                                {processingUser === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                              <button onClick={() => handleApproveRejectUser(u.id, 'approve')} disabled={processingUser === u.id}
                                className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all disabled:opacity-50">
                                {processingUser === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pendingUsers.length === 0 && (
                        <tr><td colSpan={4} className="py-8 text-center text-slate-600 text-xs">
                          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-emerald-400/30" />
                          No registrations pending sign-off.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tour Approval Queue */}
              <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-sm font-black text-white flex items-center space-x-2">
                    <Compass className="h-4 w-4 text-emerald-400" />
                    <span>Tour Itinerary Approvals</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-2xs px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">{pendingTours.length}</span>
                  </h2>
                  <Link href="/manager/approvals" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1">
                    <span>Full Workspace</span><ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-600 uppercase tracking-wider font-bold border-b border-white/5 text-2xs">
                        <th className="py-3 px-5">Tour Plan</th>
                        <th className="py-3 px-5">Traveler</th>
                        <th className="py-3 px-5">Cost</th>
                        <th className="py-3 px-5 text-right">Admin Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/4">
                      {pendingTours.map((wf: any) => (
                        <tr key={wf.id} className="hover:bg-white/3 transition-colors">
                          <td className="py-4 px-5">
                            <p className="font-bold text-white text-xs">{wf.tour_details?.title}</p>
                            <p className="text-slate-600 text-2xs mt-0.5">{wf.tour_details?.start_date} → {wf.tour_details?.end_date}</p>
                          </td>
                          <td className="py-4 px-5 text-slate-400 text-xs">{wf.tour_details?.traveler?.username}</td>
                          <td className="py-4 px-5 text-emerald-400 font-black">${parseFloat(wf.tour_details?.final_price || '0').toFixed(2)}</td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleApproveRejectTour(wf.id, 'REJECTED')} disabled={processingTour === wf.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold transition-all text-2xs disabled:opacity-50">
                                {processingTour === wf.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} Reject
                              </button>
                              <button onClick={() => handleApproveRejectTour(wf.id, 'APPROVED')} disabled={processingTour === wf.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition-all text-2xs shadow-md disabled:opacity-50">
                                {processingTour === wf.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pendingTours.length === 0 && (
                        <tr><td colSpan={4} className="py-8 text-center text-slate-600 text-xs">
                          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-emerald-400/30" />No tours pending checkpoint sign-off.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-sm font-black text-white flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-emerald-400" /><span>Recent Payment Transactions</span>
                  </h2>
                  <button onClick={() => setActiveModal('revenue')} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                    View All <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-white/4">
                  {recentPayments.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center px-5 py-4 hover:bg-white/3 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-xs truncate">{p.traveler_email}</p>
                        <p className="text-slate-600 text-2xs mt-0.5">
                          {p.payment_method} · {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="font-black text-emerald-400 text-sm">${parseFloat(p.amount.toString()).toFixed(2)}</p>
                        <Badge value={p.status} colorClass={STATUS_COLORS[p.status] || 'text-slate-400 bg-white/5 border-white/10'} />
                      </div>
                    </div>
                  ))}
                  {recentPayments.length === 0 && <div className="py-8 text-center text-slate-600 text-xs">No payment logs recorded yet.</div>}
                </div>
              </div>
            </div>

            {/* ─── AUDIT LOG SIDEBAR ─── */}
            <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden shadow-xl h-fit">
              <div className="p-5 border-b border-white/5">
                <h2 className="text-sm font-black text-white flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-emerald-400" /><span>Security Audit Logs</span>
                </h2>
              </div>
              <div className="divide-y divide-white/4 max-h-[700px] overflow-y-auto">
                {activityLogs.map((log) => (
                  <div key={log.id} className="px-5 py-4 hover:bg-white/3 transition-colors space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-2xs font-black text-slate-300 uppercase tracking-wider leading-tight flex-1 pr-2">{log.action}</span>
                      <span className="text-3xs text-slate-600 font-mono shrink-0">{new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-2xs text-slate-400 leading-relaxed font-mono truncate">{log.details}</p>
                    <p className="text-3xs text-slate-600">Actor: {log.user_email}</p>
                  </div>
                ))}
                {activityLogs.length === 0 && <div className="py-8 text-center text-slate-600 text-xs">No audit events logged.</div>}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            MODALS
        ════════════════════════════════════════════════════════════════════ */}
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
            <div className="bg-[#0d1120] border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

              {/* ── USERS MODAL ── */}
              {activeModal === 'users' && (
                <>
                  <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                        <Users className="h-5 w-5 text-sky-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">All Platform Users</h2>
                        <p className="text-slate-500 text-xs">{filteredUsers.length} of {usersList.length} users</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
                  </div>
                  {/* Summary badges */}
                  <div className="px-5 py-3 border-b border-white/5 flex flex-wrap gap-2">
                    {metrics && Object.entries(metrics.role_distribution).map(([role, cnt]) => (
                      <span key={role} className={`text-2xs px-2 py-1 rounded-lg border font-bold ${ROLE_COLORS[role] || 'text-slate-400 bg-white/5 border-white/10'}`}>
                        {role.replace(/_/g,' ')} · {cnt}
                      </span>
                    ))}
                  </div>
                  {/* Filters */}
                  <div className="px-5 py-3 border-b border-white/5 flex flex-col sm:flex-row gap-3">
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search by name or email..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40" />
                    <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500/40">
                      <option value="ALL">All Roles</option>
                      {['TRAVELER','FLIGHT_MANAGER','HOTEL_MANAGER','RESTAURANT_MANAGER','RIDE_MANAGER','ADMIN','SUPER_ADMIN','REGISTERED'].map(r => (
                        <option key={r} value={r}>{r.replace(/_/g,' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-[#0d1120] border-b border-white/8">
                        <tr className="text-slate-600 uppercase tracking-wider font-bold text-2xs">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Username</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Verified</th>
                          <th className="py-3 px-4">Joined</th>
                          <th className="py-3 px-4">Tours</th>
                          <th className="py-3 px-4">Total Spent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/4">
                        {filteredUsers.map((u, i) => (
                          <tr key={u.id} className="hover:bg-white/3 transition-colors">
                            <td className="py-3 px-4 text-slate-600 font-mono">{i + 1}</td>
                            <td className="py-3 px-4 font-bold text-white">{u.username}</td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-2xs">{u.email}</td>
                            <td className="py-3 px-4"><Badge value={u.role.replace(/_/g,' ')} colorClass={ROLE_COLORS[u.role] || 'text-slate-400 bg-white/5 border-white/10'} /></td>
                            <td className="py-3 px-4"><Badge value={u.status} colorClass={STATUS_COLORS[u.status] || 'text-slate-400 bg-white/5 border-white/10'} /></td>
                            <td className="py-3 px-4">{u.is_email_verified ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}</td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-2xs">{u.date_joined}</td>
                            <td className="py-3 px-4 text-center font-black text-white">{u.tour_count}</td>
                            <td className="py-3 px-4 font-black text-emerald-400">${u.total_spent.toFixed(2)}</td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={9} className="py-10 text-center text-slate-600">No users match your filter.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── TOURS MODAL ── */}
              {activeModal === 'tours' && (
                <>
                  <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                        <Compass className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">All Tours</h2>
                        <p className="text-slate-500 text-xs">{filteredTours.length} of {toursList.length} tours</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
                  </div>
                  {/* Summary badges */}
                  <div className="px-5 py-3 border-b border-white/5 flex flex-wrap gap-2">
                    {metrics && Object.entries(metrics.tour_status_distribution).map(([s, cnt]) => (
                      <span key={s} className={`text-2xs px-2 py-1 rounded-lg border font-bold ${STATUS_COLORS[s] || 'text-slate-400 bg-white/5 border-white/10'}`}>
                        {s} · {cnt}
                      </span>
                    ))}
                  </div>
                  {/* Filters */}
                  <div className="px-5 py-3 border-b border-white/5 flex flex-col sm:flex-row gap-3">
                    <input value={tourSearch} onChange={e => setTourSearch(e.target.value)}
                      placeholder="Search by title or traveler..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40" />
                    <select value={tourStatusFilter} onChange={e => setTourStatusFilter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/40">
                      <option value="ALL">All Statuses</option>
                      {['PENDING','APPROVED','REJECTED','LOCKED','UNLOCKED','COMPLETED'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-[#0d1120] border-b border-white/8">
                        <tr className="text-slate-600 uppercase tracking-wider font-bold text-2xs">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Tour Title</th>
                          <th className="py-3 px-4">Traveler</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Tier</th>
                          <th className="py-3 px-4">Dates</th>
                          <th className="py-3 px-4">Base Cost</th>
                          <th className="py-3 px-4">Final Price</th>
                          <th className="py-3 px-4">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/4">
                        {filteredTours.map((t, i) => (
                          <tr key={t.id} className="hover:bg-white/3 transition-colors">
                            <td className="py-3 px-4 text-slate-600 font-mono">{i + 1}</td>
                            <td className="py-3 px-4 font-bold text-white max-w-[160px] truncate">{t.title}</td>
                            <td className="py-3 px-4 text-slate-400 text-2xs">{t.traveler_username}</td>
                            <td className="py-3 px-4"><Badge value={t.status} colorClass={STATUS_COLORS[t.status] || 'text-slate-400 bg-white/5 border-white/10'} /></td>
                            <td className="py-3 px-4"><Badge value={t.budget_tier} colorClass={TIER_COLORS[t.budget_tier] || 'text-slate-400 bg-white/5 border-white/10'} /></td>
                            <td className="py-3 px-4 text-slate-500 text-2xs font-mono">{t.start_date}→{t.end_date}</td>
                            <td className="py-3 px-4 text-slate-400 font-bold">${t.base_cost.toFixed(2)}</td>
                            <td className="py-3 px-4 text-emerald-400 font-black">${t.final_price.toFixed(2)}</td>
                            <td className="py-3 px-4 text-slate-600 text-2xs font-mono">{t.created_at}</td>
                          </tr>
                        ))}
                        {filteredTours.length === 0 && (
                          <tr><td colSpan={9} className="py-10 text-center text-slate-600">No tours match your filter.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── REVENUE MODAL ── */}
              {activeModal === 'revenue' && (
                <>
                  <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">Revenue Intelligence</h2>
                        <p className="text-slate-500 text-xs">Total: <span className="text-emerald-400 font-black">${(financials?.total_revenue ?? 0).toLocaleString()}</span> · Profit: <span className="text-teal-400 font-black">${(financials?.total_profit ?? 0).toLocaleString()}</span></p>
                      </div>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
                  </div>

                  {/* Summary KPIs */}
                  <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-white/5">
                    {[
                      { label: 'Total Revenue', value: `$${(financials?.total_revenue ?? 0).toLocaleString()}`, color: 'text-emerald-400' },
                      { label: 'Total Base Cost', value: `$${(financials?.total_base_cost ?? 0).toLocaleString()}`, color: 'text-slate-300' },
                      { label: 'Net Profit', value: `$${(financials?.total_profit ?? 0).toLocaleString()}`, color: 'text-teal-400' },
                    ].map(k => (
                      <div key={k.label} className="bg-white/3 rounded-xl p-3 text-center border border-white/5">
                        <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
                        <p className="text-2xs text-slate-600 font-bold uppercase tracking-wide mt-0.5">{k.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 px-5 py-3 border-b border-white/5">
                    {(['tier', 'method', 'status', 'payments'] as const).map(tab => (
                      <button key={tab} onClick={() => setRevenueTab(tab)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${revenueTab === tab ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                        {tab === 'tier' ? 'By Budget Tier' : tab === 'method' ? 'By Payment Method' : tab === 'status' ? 'By Tour Status' : 'All Payments'}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-auto flex-1 p-5">
                    {/* By Tier */}
                    {revenueTab === 'tier' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 mb-4">Revenue generated grouped by tour budget tier from paid (Unlocked/Completed) tours.</p>
                        {(financials?.revenue_by_tier ?? []).map(item => (
                          <div key={item.tier} className="bg-white/3 border border-white/8 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge value={item.tier} colorClass={TIER_COLORS[item.tier] || 'text-slate-400 bg-white/5 border-white/10'} />
                                <span className="text-xs text-slate-500">{item.count} tour{item.count !== 1 ? 's' : ''}</span>
                              </div>
                              <span className="text-emerald-400 font-black text-sm">${item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <MiniBar pct={(item.revenue / totalRevenueByTier) * 100} color="bg-emerald-500" />
                            <p className="text-2xs text-slate-600 mt-1 text-right">{((item.revenue / totalRevenueByTier) * 100).toFixed(1)}% of total</p>
                          </div>
                        ))}
                        {(financials?.revenue_by_tier?.length ?? 0) === 0 && <p className="text-center text-slate-600 py-10">No paid tours yet.</p>}
                      </div>
                    )}

                    {/* By Method */}
                    {revenueTab === 'method' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 mb-4">Revenue grouped by payment method used in successful transactions.</p>
                        {(financials?.revenue_by_method ?? []).map(item => (
                          <div key={item.method} className="bg-white/3 border border-white/8 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-sky-400" />
                                <span className="text-xs font-bold text-white">{item.method}</span>
                                <span className="text-xs text-slate-500">{item.count} payment{item.count !== 1 ? 's' : ''}</span>
                              </div>
                              <span className="text-emerald-400 font-black text-sm">${item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <MiniBar pct={(item.revenue / totalRevenueByMethod) * 100} color="bg-sky-500" />
                            <p className="text-2xs text-slate-600 mt-1 text-right">{((item.revenue / totalRevenueByMethod) * 100).toFixed(1)}% of total</p>
                          </div>
                        ))}
                        {(financials?.revenue_by_method?.length ?? 0) === 0 && <p className="text-center text-slate-600 py-10">No successful payments yet.</p>}
                      </div>
                    )}

                    {/* By Status */}
                    {revenueTab === 'status' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 mb-4">Revenue from tours grouped by their current status.</p>
                        {(financials?.revenue_by_status ?? []).map(item => (
                          <div key={item.status} className="bg-white/3 border border-white/8 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge value={item.status} colorClass={STATUS_COLORS[item.status] || 'text-slate-400 bg-white/5 border-white/10'} />
                                <span className="text-xs text-slate-500">{item.count} tour{item.count !== 1 ? 's' : ''}</span>
                              </div>
                              <span className="text-emerald-400 font-black text-sm">${item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <MiniBar pct={(item.revenue / (financials?.total_revenue || 1)) * 100} color="bg-teal-500" />
                          </div>
                        ))}
                        {(financials?.revenue_by_status?.length ?? 0) === 0 && <p className="text-center text-slate-600 py-10">No paid tours yet.</p>}
                      </div>
                    )}

                    {/* All Payments table */}
                    {revenueTab === 'payments' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-600 uppercase tracking-wider font-bold text-2xs border-b border-white/8">
                              <th className="py-3 px-3">#</th>
                              <th className="py-3 px-3">Traveler</th>
                              <th className="py-3 px-3">Tour</th>
                              <th className="py-3 px-3">Amount</th>
                              <th className="py-3 px-3">Method</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-3">Tx ID</th>
                              <th className="py-3 px-3">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/4">
                            {allPayments.map((p, i) => (
                              <tr key={p.id} className="hover:bg-white/3 transition-colors">
                                <td className="py-3 px-3 text-slate-600 font-mono">{i + 1}</td>
                                <td className="py-3 px-3">
                                  <p className="font-bold text-white">{p.traveler_username}</p>
                                  <p className="text-2xs text-slate-600 font-mono">{p.traveler_email}</p>
                                </td>
                                <td className="py-3 px-3 text-slate-400 max-w-[120px] truncate">{p.tour_title}</td>
                                <td className="py-3 px-3 text-emerald-400 font-black">${p.amount.toFixed(2)}</td>
                                <td className="py-3 px-3 text-slate-400">{p.payment_method}</td>
                                <td className="py-3 px-3"><Badge value={p.status} colorClass={STATUS_COLORS[p.status] || 'text-slate-400 bg-white/5 border-white/10'} /></td>
                                <td className="py-3 px-3 text-slate-600 font-mono text-2xs truncate max-w-[100px]">{p.transaction_id}</td>
                                <td className="py-3 px-3 text-slate-600 text-2xs font-mono">{p.created_at}</td>
                              </tr>
                            ))}
                            {allPayments.length === 0 && (
                              <tr><td colSpan={8} className="py-10 text-center text-slate-600">No payments found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
