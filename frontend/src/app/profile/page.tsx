'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { User, Shield, Compass, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    preferred_budget_tier: 'STANDARD',
    preferred_travel_style: '',
    preferred_food: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.profile) {
      setFormData({
        preferred_budget_tier: user.profile.preferred_budget_tier || 'STANDARD',
        preferred_travel_style: user.profile.preferred_travel_style || '',
        preferred_food: user.profile.preferred_food || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      await updateProfile({
        preferred_budget_tier: formData.preferred_budget_tier,
        preferred_travel_style: formData.preferred_travel_style,
        preferred_food: formData.preferred_food,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.detail || err.error || 'Failed to update profile preferences.');
    } finally {
      setLoading(false);
    }
  };

  // Determine back dashboard link based on role
  let dashboardLink = '/traveler';
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    dashboardLink = '/admin';
  } else if (user?.role && user.role !== 'TRAVELER') {
    dashboardLink = '/manager';
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-100">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link 
              href={dashboardLink} 
              className="inline-flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              My Profile Settings
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Account Card (Read-only) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex flex-col items-center space-y-3 text-center">
                <div className="bg-slate-950 p-4 rounded-full border border-slate-800 text-emerald-400">
                  <User className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{user?.username}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-6 space-y-4">
                <div className="flex items-center space-x-3 text-sm">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-slate-500 text-xs">Access Role</p>
                    <p className="font-semibold text-slate-300">{user?.role}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Compass className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-slate-500 text-xs">Account Status</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {user?.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Travel Preferences Form (Write) */}
            <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <h2 className="text-lg font-bold mb-6 flex items-center space-x-2">
                <Compass className="h-5 w-5 text-emerald-400" />
                <span>AI Travel Preferences & Configuration</span>
              </h2>

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm mb-6">
                  Profile preferences saved successfully. AI recommendations will calibrate to these.
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-sm mb-6">
                  {error}
                </div>
              )}

              {user?.role === 'TRAVELER' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Preferred Budget Tier (For AI scoring)
                    </label>
                    <select
                      name="preferred_budget_tier"
                      value={formData.preferred_budget_tier}
                      onChange={handleChange}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="BUDGET">Budget Friendly (18% margin)</option>
                      <option value="STANDARD">Standard Travel (25% margin)</option>
                      <option value="LUXURY">Luxury Expeditions (32% margin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Preferred Travel Style / Keyword
                    </label>
                    <input
                      type="text"
                      name="preferred_travel_style"
                      value={formData.preferred_travel_style}
                      onChange={handleChange}
                      placeholder="e.g. Adventure, Relaxing, Cultural"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Preferred Food Cuisine / Allergies
                    </label>
                    <input
                      type="text"
                      name="preferred_food"
                      value={formData.preferred_food}
                      onChange={handleChange}
                      placeholder="e.g. Halal, Vegan, Italian, Seafood"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-6 rounded-xl transition-all duration-300 transform active:scale-95 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving preferences...' : 'Save Configuration'}</span>
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-400 leading-relaxed">
                  Only travelers configure AI style matrices. Service managers handle items inventories, and admins govern dashboard telemetry logs.
                </p>
              )}
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
