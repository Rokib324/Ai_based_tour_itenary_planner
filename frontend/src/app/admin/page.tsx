'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import {
  ShieldCheck, LogOut, DollarSign, Users, Compass, Activity,
  Check, X, RefreshCw, CheckCircle, ExternalLink, Home,
  TrendingUp, CreditCard, UserCheck, Clock, Zap, Globe,
  BarChart3, AlertTriangle, ChevronRight, Loader2
} from 'lucide-react';
import Link from 'next/link';

interface AdminMetrics {
  total_users: number;
  pending_registrations: number;
  total_tours: number;
  pending_approvals: number;
}

interface Financials {
  total_revenue: number;
  total_base_cost: number;
  total_profit: number;
  profit_margin_percent: number;
}

interface ActivityLog {
  id: number;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}

interface PaymentLog {
  id: number;
  traveler_email: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

interface PendingUser {
  id: number;
  email: string;
  username: string;
  role: string;
}

export default function AdminDashboardPage() {
  const { logout } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingTours, setPendingTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState<number | null>(null);
  const [processingTour, setProcessingTour] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setError('');
    try {
      const [dashRes, usersRes, toursRes] = await Promise.all([
        api.get('analytics/dashboard/admin/'),
        api.get('auth/pending-approvals/'),
        api.get('approvals/queue/'),
      ]);
      setMetrics(dashRes.data.metrics);
      setFinancials(dashRes.data.financials);
      setActivityLogs(dashRes.data.recent_activity_logs);
      setPayments(dashRes.data.recent_payments);
      setPendingUsers(usersRes.data);
      setPendingTours(toursRes.data || []);
    } catch (err) {
      setError('Failed to fetch dashboard intelligence.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveRejectUser = async (userId: number, action: 'approve' | 'reject') => {
    setProcessingUser(userId);
    try {
      await api.post(`auth/approve/${userId}/`, { action });
      loadData();
    } catch (err) {
      console.error('Failed to process registration action.', err);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleApproveRejectTour = async (workflowId: number, statusVal: 'APPROVED' | 'REJECTED') => {
    setProcessingTour(workflowId);
    try {
      await api.post(`approvals/${workflowId}/action/`, { status: statusVal, comments: 'Admin action via portal' });
      loadData();
    } catch (err) {
      console.error('Failed to process tour approval action.', err);
    } finally {
      setProcessingTour(null);
    }
  };

  const getRoleColor = (role: string) => {
    if (role.includes('FLIGHT')) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    if (role.includes('HOTEL')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (role.includes('RESTAURANT')) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (role.includes('RIDE')) return 'text-violet-400 bg-violet-500/10 border-violet-500/30';
    return 'text-slate-400 bg-white/5 border-white/10';
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

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-[#080b12] text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-[600px] h-[400px] bg-emerald-500/3 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-teal-500/3 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">

          {/* ─── HEADER ─── */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/3 backdrop-blur-xl border border-white/8 p-5 rounded-2xl shadow-2xl">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="group flex items-center space-x-2 bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 px-3.5 py-2 rounded-xl transition-all"
                title="Back to Home"
              >
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
              <Link
                href="/manager/approvals"
                className="inline-flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                <span>Full Approvals Workspace</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => { setRefreshing(true); loadData(); }}
                disabled={refreshing}
                className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Log Out</span>
              </button>
            </div>
          </header>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* ─── KPI METRIC CARDS ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/3 border border-white/8 p-5 rounded-2xl hover:border-white/15 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-sky-400" />
                </div>
                {(metrics?.pending_registrations ?? 0) > 0 && (
                  <span className="text-2xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold">{metrics?.pending_registrations} pending</span>
                )}
              </div>
              <p className="text-3xl font-black text-white">{metrics?.total_users ?? 0}</p>
              <p className="text-slate-600 text-2xs font-bold uppercase tracking-wider mt-1">Total Users</p>
            </div>

            <div className="bg-white/3 border border-white/8 p-5 rounded-2xl hover:border-white/15 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Compass className="h-4 w-4 text-amber-400" />
                </div>
                {(metrics?.pending_approvals ?? 0) > 0 && (
                  <span className="text-2xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full font-bold animate-pulse">{metrics?.pending_approvals} pending</span>
                )}
              </div>
              <p className="text-3xl font-black text-white">{metrics?.total_tours ?? 0}</p>
              <p className="text-slate-600 text-2xs font-bold uppercase tracking-wider mt-1">Total Tours</p>
            </div>

            <div className="bg-white/3 border border-white/8 p-5 rounded-2xl hover:border-emerald-500/20 border-emerald-500/10 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </div>
                <TrendingUp className="h-4 w-4 text-emerald-400/50" />
              </div>
              <p className="text-3xl font-black text-emerald-400">${financials?.total_revenue.toFixed(0) ?? '0'}</p>
              <p className="text-slate-600 text-2xs font-bold uppercase tracking-wider mt-1">Total Revenue</p>
            </div>

            <div className="bg-white/3 border border-white/8 p-5 rounded-2xl hover:border-teal-500/20 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-teal-400" />
                </div>
                <span className="text-2xs font-black text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded-full">{financials?.profit_margin_percent}%</span>
              </div>
              <p className="text-3xl font-black text-teal-400">${financials?.total_profit.toFixed(0) ?? '0'}</p>
              <p className="text-slate-600 text-2xs font-bold uppercase tracking-wider mt-1">Net Profit</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ─── MAIN CONTENT AREA ─── */}
            <div className="lg:col-span-2 space-y-5">

              {/* User Registration Queue */}
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
                            <span className={`text-2xs px-2 py-0.5 rounded-full border font-bold ${getRoleColor(u.role)}`}>{u.role}</span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveRejectUser(u.id, 'reject')}
                                disabled={processingUser === u.id}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-50"
                                title="Reject"
                              >
                                {processingUser === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => handleApproveRejectUser(u.id, 'approve')}
                                disabled={processingUser === u.id}
                                className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all disabled:opacity-50"
                                title="Approve"
                              >
                                {processingUser === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pendingUsers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-600 text-xs">
                            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-emerald-400/30" />
                            No registrations pending sign-off.
                          </td>
                        </tr>
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
                  <Link href="/manager/approvals" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors">
                    <span>Full Workspace</span>
                    <ExternalLink className="h-3 w-3" />
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
                              <button
                                onClick={() => handleApproveRejectTour(wf.id, 'REJECTED')}
                                disabled={processingTour === wf.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold transition-all text-2xs disabled:opacity-50"
                              >
                                {processingTour === wf.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                Reject
                              </button>
                              <button
                                onClick={() => handleApproveRejectTour(wf.id, 'APPROVED')}
                                disabled={processingTour === wf.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition-all text-2xs shadow-md shadow-emerald-500/20 disabled:opacity-50"
                              >
                                {processingTour === wf.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                Approve
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pendingTours.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-600 text-xs">
                            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-emerald-400/30" />
                            No tours pending checkpoint sign-off.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-white/5">
                  <h2 className="text-sm font-black text-white flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    <span>Recent Payment Transactions</span>
                  </h2>
                </div>
                <div className="divide-y divide-white/4">
                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center px-5 py-4 hover:bg-white/3 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-xs truncate">{p.traveler_email}</p>
                        <p className="text-slate-600 text-2xs mt-0.5">
                          {p.payment_method} · {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="font-black text-emerald-400 text-sm">${parseFloat(p.amount.toString()).toFixed(2)}</p>
                        <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <div className="py-8 text-center text-slate-600 text-xs">No payment logs recorded yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── AUDIT LOG SIDEBAR ─── */}
            <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden shadow-xl h-fit">
              <div className="p-5 border-b border-white/5">
                <h2 className="text-sm font-black text-white flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>Security Audit Logs</span>
                </h2>
              </div>
              <div className="divide-y divide-white/4 max-h-[600px] overflow-y-auto">
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
                {activityLogs.length === 0 && (
                  <div className="py-8 text-center text-slate-600 text-xs">No audit events logged.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
