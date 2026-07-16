'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { ShieldCheck, LogOut, DollarSign, Users, Compass, Activity, Check, X, RefreshCw } from 'lucide-react';

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
  
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    setError('');
    try {
      const [dashRes, usersRes] = await Promise.all([
        api.get('analytics/dashboard/admin/'),
        api.get('auth/pending-approvals/'),
      ]);
      
      setMetrics(dashRes.data.metrics);
      setFinancials(dashRes.data.financials);
      setActivityLogs(dashRes.data.recent_activity_logs);
      setPayments(dashRes.data.recent_payments);
      setPendingUsers(usersRes.data);
    } catch (err) {
      setError('Failed to fetch dashboard intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveRejectUser = async (userId: number, action: 'approve' | 'reject') => {
    setProcessingUser(userId);
    try {
      await api.post(`auth/approve/${userId}/`, { action });
      // Reload lists
      loadData();
    } catch (err) {
      console.error('Failed to process registration action.', err);
    } finally {
      setProcessingUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-slate-400 font-medium">Bootstrapping system telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  System Admin Portal
                </h1>
                <p className="text-slate-400 text-xs">Platform Financials & Audits</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={loadData}
                className="p-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
                title="Refresh dashboard data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
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

          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Users</p>
                <p className="text-2xl font-bold text-slate-100">{metrics?.total_users}</p>
              </div>
              <Users className="h-8 w-8 text-slate-650 opacity-50" />
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pending Approvals</p>
                <p className="text-2xl font-bold text-slate-100">{metrics?.pending_approvals}</p>
              </div>
              <Compass className="h-8 w-8 text-slate-655 opacity-50" />
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-400">${financials?.total_revenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500/30" />
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Net Profit</p>
                <p className="text-2xl font-bold text-teal-400">${financials?.total_profit.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-2xs text-teal-400 font-bold">Margin: {financials?.profit_margin_percent}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* User Approvals queue */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h2 className="text-lg font-bold mb-4">Registration Approvals Hold Queue</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-850">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role Request</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {pendingUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-850/30">
                          <td className="py-4 px-4 font-bold text-slate-200">{u.username}</td>
                          <td className="py-4 px-4 text-slate-400">{u.email}</td>
                          <td className="py-4 px-4">
                            <span className="bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800 font-semibold">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleApproveRejectUser(u.id, 'reject')}
                              disabled={processingUser === u.id}
                              className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                              title="Reject registration request"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleApproveRejectUser(u.id, 'approve')}
                              disabled={processingUser === u.id}
                              className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all"
                              title="Approve registration request"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {pendingUsers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500">
                            No registrations pending admin sign-off.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments logs */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h2 className="text-lg font-bold mb-4">Recent Payments</h2>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-slate-950/80 border border-slate-850 p-4 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-slate-200">Payment from: {p.traveler_email}</p>
                        <p className="text-slate-500 mt-0.5">Method: {p.payment_method} | Date: {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-emerald-400">${parseFloat(p.amount.toString()).toFixed(2)}</p>
                        <span className="inline-flex text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 mt-1 uppercase border border-emerald-500/20">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No payment logs recorded.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Right Activity Audit logs feed */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit space-y-4">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                <span>Security Telemetry Logs</span>
              </h2>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {activityLogs.map((log) => (
                  <div key={log.id} className="border-l-2 border-emerald-500 pl-3 py-1 space-y-1">
                    <div className="flex justify-between items-baseline text-3xs font-semibold uppercase tracking-wider">
                      <span className="text-slate-400 font-bold">{log.action}</span>
                      <span className="text-slate-600">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-2xs text-slate-300 leading-relaxed font-mono">{log.details}</p>
                    <p className="text-3xs text-slate-500">Actor: {log.user_email}</p>
                  </div>
                ))}
                {activityLogs.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No audit logs reported.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
