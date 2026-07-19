'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import { ShieldCheck, User, Calendar, Sparkles, Check, X, Info, HelpCircle } from 'lucide-react';

interface ApprovalWorkflow {
  id: number;
  tour: number;
  tour_details: {
    id: number;
    title: string;
    budget_tier: string;
    final_price: string;
    start_date: string;
    end_date: string;
    traveler: {
      username: string;
      email: string;
    };
  };
  admin_status: string;
  flight_status: string;
  hotel_status: string;
  restaurant_status: string;
  ride_status: string;
  decision_engine_status: string;
}

export default function ApprovalWorkspacePage() {
  const [queue, setQueue] = useState<ApprovalWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [aiReport, setAiReport] = useState<any | null>(null);
  
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
  }, []);

  const handleSelectWorkflow = async (wf: ApprovalWorkflow) => {
    setSelectedWorkflow(wf);
    setAiReport(null);
    setRemarks('');
    setError('');
    setSuccess('');
    
    // Fetch AI Analysis report for this tour plan
    setLoadingAI(true);
    try {
      const res = await api.get(`tours/tours/${wf.tour}/ai-analysis/`);
      setAiReport(res.data);
    } catch (err) {
      console.error('Failed to fetch AI analysis parameters.', err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAction = async (statusVal: 'APPROVED' | 'REJECTED') => {
    if (!selectedWorkflow) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`approvals/${selectedWorkflow.id}/action/`, {
        status: statusVal,
        comments: remarks,
      });

      setSuccess(`Workflow has been successfully ${statusVal.toLowerCase()}!`);
      setSelectedWorkflow(null);
      fetchQueue();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit approval action.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const base = "px-2 py-0.5 rounded-full text-xs font-semibold border";
    let classes = "";
    if (status === 'APPROVED') classes = `${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
    else if (status === 'REJECTED') classes = `${base} bg-rose-500/10 text-rose-400 border-rose-500/20`;
    else if (status === 'SKIPPED') classes = `${base} bg-slate-800/80 text-slate-500 border-slate-700/30`;
    else classes = `${base} bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse`;
    return <span className={classes}>{status}</span>;
  };

  return (
    <ProtectedRoute allowedRoles={['FLIGHT_MANAGER', 'HOTEL_MANAGER', 'RESTAURANT_MANAGER', 'RIDE_MANAGER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Approvals Workspace</h1>
              <p className="text-slate-400 text-xs mt-0.5">Sequential State Verification Queue</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Center pending requests queue table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                  <span>Pending Tasks Queue</span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">{queue.length}</span>
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-850">
                        <th className="py-3 px-4">Tour Title</th>
                        <th className="py-3 px-4">Traveler</th>
                        <th className="py-3 px-4">Est Price</th>
                        <th className="py-3 px-4">Actions Checkpoint</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {queue.map((wf) => (
                        <tr 
                          key={wf.id} 
                          onClick={() => handleSelectWorkflow(wf)}
                          className={`hover:bg-slate-850/50 cursor-pointer transition-colors ${selectedWorkflow?.id === wf.id ? 'bg-slate-850/80' : ''}`}
                        >
                          <td className="py-4 px-4 font-bold text-slate-200">{wf.tour_details.title}</td>
                          <td className="py-4 px-4 text-slate-400">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{wf.tour_details.traveler.username}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-emerald-400 font-bold">${wf.tour_details.final_price}</td>
                          <td className="py-4 px-4">
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              Needs Review
                            </span>
                          </td>
                        </tr>
                      ))}
                      {queue.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500">
                            Hooray! No pending approvals workflows in your queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right details review drawer */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 h-fit space-y-6">
              {selectedWorkflow ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{selectedWorkflow.tour_details.title}</h3>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      Plan dates: {selectedWorkflow.tour_details.start_date} to {selectedWorkflow.tour_details.end_date}
                    </p>
                  </div>

                  {/* Checkpoints logs matrix */}
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 space-y-3">
                    <p className="text-xs font-bold text-slate-300">Approval States Flow</p>
                    <div className="grid grid-cols-2 gap-2 text-2xs">
                      <div className="flex justify-between items-center p-1 bg-slate-900 rounded">
                        <span className="text-slate-500">Admin:</span>
                        {renderStatusBadge(selectedWorkflow.admin_status)}
                      </div>
                      <div className="flex justify-between items-center p-1 bg-slate-900 rounded">
                        <span className="text-slate-500">Flight:</span>
                        {renderStatusBadge(selectedWorkflow.flight_status)}
                      </div>
                      <div className="flex justify-between items-center p-1 bg-slate-900 rounded">
                        <span className="text-slate-500">Hotel:</span>
                        {renderStatusBadge(selectedWorkflow.hotel_status)}
                      </div>
                      <div className="flex justify-between items-center p-1 bg-slate-900 rounded">
                        <span className="text-slate-500">Restaurant:</span>
                        {renderStatusBadge(selectedWorkflow.restaurant_status)}
                      </div>
                      <div className="flex justify-between items-center p-1 bg-slate-900 rounded">
                        <span className="text-slate-500">Ride:</span>
                        {renderStatusBadge(selectedWorkflow.ride_status)}
                      </div>
                    </div>
                  </div>

                  {/* AI Assistance module */}
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 space-y-3">
                    <p className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      <span>AI Decision Parameters</span>
                    </p>
                    {loadingAI ? (
                      <p className="text-2xs text-slate-500 animate-pulse">Running AI analysis engine...</p>
                    ) : aiReport ? (
                      <div className="space-y-2 text-2xs text-slate-400 leading-relaxed">
                        <div className="flex justify-between">
                          <span>Approval Probability:</span>
                          <span className="font-bold text-slate-200">{(aiReport.approval_probability * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Future Cost Forecast:</span>
                          <span className="font-bold text-slate-200">${aiReport.future_cost_prediction?.toFixed(2)}</span>
                        </div>
                        {aiReport.weather_recommendations && (
                          <div className="border-t border-slate-850 pt-2 text-3xs text-amber-300">
                            Weather Alert: {aiReport.weather_recommendations.alerts || 'Clear skies expected.'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-2xs text-slate-500">AI metrics not loaded.</p>
                    )}
                  </div>

                  {/* Decision fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Review Remarks</label>
                      <textarea
                        rows={3}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Add verification notes, availability checks or remarks..."
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleAction('REJECTED')}
                        disabled={loading}
                        className="flex items-center justify-center space-x-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold py-3.5 rounded-xl text-xs transition-all"
                      >
                        <X className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleAction('APPROVED')}
                        disabled={loading}
                        className="flex items-center justify-center space-x-1 bg-emerald-500 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all"
                      >
                        <Check className="h-4 w-4" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 space-y-3">
                  <HelpCircle className="h-10 w-10 mx-auto opacity-30" />
                  <p className="text-xs">Select a tour workflow request from the queue to verify details and run AI reviews.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
