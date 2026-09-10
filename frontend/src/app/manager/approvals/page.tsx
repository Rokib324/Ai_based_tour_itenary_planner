'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import {
  ShieldCheck, User, Calendar, Sparkles, Check, X, HelpCircle,
  Home, ArrowLeft, Plane, Hotel, Utensils, Car, Globe, DollarSign,
  Clock, AlertTriangle, TrendingUp, CheckCircle2, XCircle, Loader2,
  ChevronRight, Info, MessageSquare, BarChart3
} from 'lucide-react';
import Link from 'next/link';

interface ApprovalWorkflow {
  id: number;
  tour: number;
  tour_details: {
    id: number;
    title: string;
    budget_tier: string;
    final_price: string;
    base_cost: string;
    markup_percentage: string;
    start_date: string;
    end_date: string;
    traveler: { username: string; email: string };
    items?: any[];
  };
  admin_status: string;
  flight_status: string;
  hotel_status: string;
  restaurant_status: string;
  ride_status: string;
  decision_engine_status: string;
}

const CHECKPOINT_ORDER = [
  { key: 'admin_status', label: 'Admin', icon: ShieldCheck },
  { key: 'flight_status', label: 'Flight', icon: Plane },
  { key: 'hotel_status', label: 'Hotel', icon: Hotel },
  { key: 'restaurant_status', label: 'Dining', icon: Utensils },
  { key: 'ride_status', label: 'Rides', icon: Car },
];

export default function ApprovalWorkspacePage() {
  const [queue, setQueue] = useState<ApprovalWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const fetchQueue = async () => {
    try {
      const res = await api.get('approvals/queue/');
      setQueue(res.data);
    } catch (err) {
      console.error('Failed to load pending queue.', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectWorkflow = async (wf: ApprovalWorkflow) => {
    setSelectedWorkflow(wf);
    setAiReport(null);
    setRemarks('');
    setError('');
    setSuccess('');
    setShowConfirm(null);
    setLoadingAI(true);
    try {
      const res = await api.get(`tours/tours/${wf.tour}/ai-analysis/`);
      setAiReport(res.data);
    } catch (err) {
      console.error('Failed to fetch AI analysis.', err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAction = async (statusVal: 'APPROVED' | 'REJECTED') => {
    if (!selectedWorkflow) return;
    setLoading(true);
    setError('');
    setSuccess('');
    setShowConfirm(null);
    try {
      await api.post(`approvals/${selectedWorkflow.id}/action/`, {
        status: statusVal,
        comments: remarks,
      });
      setSuccess(`Tour has been successfully ${statusVal.toLowerCase()}!`);
      setSelectedWorkflow(null);
      fetchQueue();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit approval action.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED': return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: <CheckCircle2 className="h-3 w-3" /> };
      case 'REJECTED': return { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', icon: <XCircle className="h-3 w-3" /> };
      case 'SKIPPED': return { bg: 'bg-slate-800/80', text: 'text-slate-500', border: 'border-slate-700/30', icon: <Info className="h-3 w-3" /> };
      default: return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20 animate-pulse', icon: <Clock className="h-3 w-3" /> };
    }
  };

  const getTierColor = (tier: string) => {
    if (tier === 'LUXURY') return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    if (tier === 'STANDARD') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    return 'text-sky-400 border-sky-500/30 bg-sky-500/10';
  };

  return (
    <ProtectedRoute allowedRoles={['FLIGHT_MANAGER', 'HOTEL_MANAGER', 'RESTAURANT_MANAGER', 'RIDE_MANAGER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-[#080b12] text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-emerald-500/4 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-teal-500/4 rounded-full blur-3xl" />
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
              <Link
                href="/manager"
                className="group flex items-center space-x-1.5 bg-white/3 hover:bg-white/8 border border-white/8 hover:border-white/15 px-3.5 py-2 rounded-xl transition-all text-xs font-semibold text-slate-500 hover:text-slate-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:block">Dashboard</span>
              </Link>

              <div className="w-px h-8 bg-white/10" />

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-base font-black text-white">Approvals Workspace</h1>
                  <p className="text-slate-500 text-xs">Sequential State Verification Queue</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="bg-white/3 border border-white/8 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-slate-400">Live Queue</span>
                <span className="text-xs font-black text-white">{queue.length}</span>
              </div>
            </div>
          </header>

          {/* Success/Error banners */}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-sm font-semibold flex items-center space-x-2 animate-pulse">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ─── LEFT: QUEUE TABLE ─── */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-base font-black text-white flex items-center space-x-2">
                    <span>Pending Queue</span>
                    <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">{queue.length}</span>
                  </h2>
                  <span className="text-2xs text-slate-500">Click a row to review</span>
                </div>

                <div className="overflow-x-auto">
                  {queue.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <CheckCircle2 className="h-12 w-12 text-emerald-400/30 mx-auto" />
                      <p className="text-slate-400 font-semibold">All clear! No pending approvals.</p>
                      <p className="text-slate-600 text-xs">Your queue is empty. New tour requests will appear here.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-600 uppercase tracking-wider font-bold border-b border-white/5 text-2xs">
                          <th className="py-3 px-5">Tour Plan</th>
                          <th className="py-3 px-5">Traveler</th>
                          <th className="py-3 px-5">Price</th>
                          <th className="py-3 px-5">Pipeline</th>
                          <th className="py-3 px-5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/4">
                        {queue.map((wf) => {
                          const isSelected = selectedWorkflow?.id === wf.id;
                          return (
                            <tr
                              key={wf.id}
                              onClick={() => handleSelectWorkflow(wf)}
                              className={`cursor-pointer transition-all duration-150 ${isSelected ? 'bg-emerald-500/8 border-l-2 border-l-emerald-500' : 'hover:bg-white/3'}`}
                            >
                              <td className="py-4 px-5">
                                <div>
                                  <p className="font-bold text-white text-xs">{wf.tour_details.title}</p>
                                  <p className="text-slate-600 text-2xs mt-0.5">{wf.tour_details.start_date} → {wf.tour_details.end_date}</p>
                                </div>
                              </td>
                              <td className="py-4 px-5">
                                <div className="flex items-center space-x-1.5">
                                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                    <User className="h-2.5 w-2.5 text-emerald-400" />
                                  </div>
                                  <span className="text-slate-400 text-xs">{wf.tour_details.traveler.username}</span>
                                </div>
                              </td>
                              <td className="py-4 px-5">
                                <span className="text-emerald-400 font-black">${parseFloat(wf.tour_details.final_price).toFixed(2)}</span>
                              </td>
                              <td className="py-4 px-5">
                                {/* Mini pipeline indicator */}
                                <div className="flex items-center gap-1">
                                  {CHECKPOINT_ORDER.map(({ key, label }) => {
                                    const status = (wf as any)[key];
                                    const s = getStatusStyle(status);
                                    return (
                                      <div
                                        key={key}
                                        title={`${label}: ${status}`}
                                        className={`w-2.5 h-2.5 rounded-full border ${
                                          status === 'APPROVED' ? 'bg-emerald-400 border-emerald-500' :
                                          status === 'REJECTED' ? 'bg-rose-400 border-rose-500' :
                                          status === 'SKIPPED' ? 'bg-slate-700 border-slate-600' :
                                          'bg-amber-400/60 border-amber-500/60 animate-pulse'
                                        }`}
                                      />
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-5">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-2xs font-bold border ${
                                  isSelected
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {isSelected ? <><CheckCircle2 className="h-2.5 w-2.5" /> Reviewing</> : <>Needs Review</>}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* ─── RIGHT: REVIEW PANEL ─── */}
            <div className="lg:col-span-2">
              {selectedWorkflow ? (
                <div className="space-y-4">

                  {/* Tour Summary Card */}
                  <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-white text-sm leading-tight">{selectedWorkflow.tour_details.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`text-2xs px-2 py-0.5 rounded-full border font-bold ${getTierColor(selectedWorkflow.tour_details.budget_tier)}`}>
                            {selectedWorkflow.tour_details.budget_tier}
                          </span>
                          <div className="flex items-center space-x-1 text-slate-500 text-2xs">
                            <Calendar className="h-3 w-3" />
                            <span>{selectedWorkflow.tour_details.start_date} → {selectedWorkflow.tour_details.end_date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-2xs text-slate-600 uppercase tracking-wider font-bold">Total</p>
                        <p className="text-xl font-black text-emerald-400">${parseFloat(selectedWorkflow.tour_details.final_price).toFixed(2)}</p>
                        <p className="text-2xs text-slate-600">Base: ${parseFloat(selectedWorkflow.tour_details.base_cost || '0').toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-2xs text-slate-500 border-t border-white/5 pt-3">
                      <User className="h-3 w-3" />
                      <span>{selectedWorkflow.tour_details.traveler.username}</span>
                      <span className="text-slate-700">·</span>
                      <span>{selectedWorkflow.tour_details.traveler.email}</span>
                    </div>
                  </div>

                  {/* Approval Pipeline Visualization */}
                  <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
                    <p className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                      <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Approval Pipeline Status</span>
                    </p>
                    <div className="space-y-2.5">
                      {CHECKPOINT_ORDER.map(({ key, label, icon: Icon }, idx) => {
                        const status = (selectedWorkflow as any)[key];
                        const s = getStatusStyle(status);
                        return (
                          <div key={key} className="flex items-center space-x-3">
                            {/* Step number/connector */}
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${s.bg} ${s.border}`}>
                                <Icon className={`h-3.5 w-3.5 ${s.text}`} />
                              </div>
                              {idx < CHECKPOINT_ORDER.length - 1 && (
                                <div className="w-px h-3 bg-white/5 mt-0.5" />
                              )}
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-400">{label} Manager</span>
                              <span className={`text-2xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${s.bg} ${s.text} ${s.border}`}>
                                {s.icon}
                                {status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Intelligence Card */}
                  <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
                    <p className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      <span>AI Decision Parameters</span>
                    </p>

                    {loadingAI ? (
                      <div className="flex items-center space-x-2 py-4 justify-center">
                        <Loader2 className="animate-spin h-4 w-4 text-emerald-400" />
                        <span className="text-xs text-slate-500">Analyzing with AI engine...</span>
                      </div>
                    ) : aiReport ? (
                      <div className="space-y-4">
                        {/* Approval Probability */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-2xs text-slate-500 font-semibold">Approval Probability</span>
                            <span className={`text-sm font-black ${aiReport.approval_probability >= 70 ? 'text-emerald-400' : aiReport.approval_probability >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {Math.round(aiReport.approval_probability)}%
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-1000 ${
                                aiReport.approval_probability >= 70 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                aiReport.approval_probability >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                                'bg-gradient-to-r from-rose-500 to-rose-400'
                              }`}
                              style={{ width: `${aiReport.approval_probability}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-2xs">
                          <div className="bg-white/3 rounded-xl p-3">
                            <p className="text-slate-600 font-semibold mb-1 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-emerald-400" />
                              Price Forecast
                            </p>
                            <p className="font-black text-emerald-400 text-sm">${aiReport.future_cost_prediction?.toFixed(2)}</p>
                          </div>
                          <div className="bg-white/3 rounded-xl p-3">
                            <p className="text-slate-600 font-semibold mb-1 flex items-center gap-1">
                              <Globe className="h-3 w-3 text-teal-400" />
                              Weather
                            </p>
                            <p className="font-bold text-slate-300 text-xs">{aiReport.weather_recommendations?.condition || 'N/A'}</p>
                          </div>
                        </div>

                        {aiReport.weather_recommendations?.alert && (
                          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 p-3 rounded-lg">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-2xs text-amber-300">{aiReport.weather_recommendations.alert}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-2xs text-slate-600 text-center py-3">AI data unavailable</p>
                    )}
                  </div>

                  {/* Decision Panel */}
                  <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
                    <p className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Your Decision</span>
                    </p>

                    {success && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        {success}
                      </div>
                    )}
                    {error && (
                      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="block text-2xs uppercase tracking-wider text-slate-500 mb-1.5 font-bold">Review Remarks (Optional)</label>
                      <textarea
                        rows={3}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Add availability checks, notes, or verification remarks..."
                        className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none transition-colors resize-none"
                      />
                    </div>

                    {/* Confirm dialog */}
                    {showConfirm ? (
                      <div className={`border rounded-xl p-4 space-y-3 ${showConfirm === 'APPROVED' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                        <p className="text-xs font-bold text-white">
                          {showConfirm === 'APPROVED' ? '✅ Confirm Approval?' : '❌ Confirm Rejection?'}
                        </p>
                        <p className="text-2xs text-slate-400">
                          {showConfirm === 'APPROVED'
                            ? 'This will approve your checkpoint. If all managers approve, the tour will be LOCKED for payment.'
                            : 'This will reject the tour. The traveler will be notified and must submit a new plan.'}
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowConfirm(null)}
                            className="flex-1 py-2 border border-white/10 text-slate-400 rounded-lg text-xs font-semibold hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAction(showConfirm)}
                            disabled={loading}
                            className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                              showConfirm === 'APPROVED'
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                : 'bg-rose-500 hover:bg-rose-400 text-white'
                            }`}
                          >
                            {loading ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : null}
                            Confirm {showConfirm === 'APPROVED' ? 'Approve' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setShowConfirm('REJECTED')}
                          disabled={loading}
                          className="flex items-center justify-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold py-3 rounded-xl text-xs transition-all hover:scale-[1.02]"
                        >
                          <X className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => setShowConfirm('APPROVED')}
                          disabled={loading}
                          className="flex items-center justify-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/2 border border-white/8 rounded-2xl p-8 text-center space-y-4 h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mx-auto">
                    <HelpCircle className="h-8 w-8 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-300 font-bold text-sm">Select a Tour to Review</p>
                    <p className="text-slate-600 text-xs mt-1 max-w-xs">Click any row from the pending queue to view full tour details, AI analysis, and submit your decision.</p>
                  </div>
                  {queue.length > 0 && (
                    <div className="flex items-center gap-1 text-2xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                      <Clock className="h-3 w-3" />
                      <span>{queue.length} pending — action required</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
