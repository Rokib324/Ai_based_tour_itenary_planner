'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import { 
  User, Shield, Compass, Save, ArrowLeft, Camera, Key, Lock, 
  MapPin, Phone, Mail, Globe, CheckCircle2, Sparkles, AlertCircle, Heart 
} from 'lucide-react';
import Link from 'next/link';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
];

export default function ProfilePage() {
  const { user, updateProfile, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'avatar' | 'preferences' | 'security'>('personal');
  
  // Profile Form Data
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    phone_number: '',
    address: '',
    city: '',
    country: '',
    preferred_budget_tier: 'STANDARD',
    preferred_travel_style: '',
    preferred_food: '',
    preferred_transport: 'Flight & Road Trip',
  });

  // Password Form Data
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        full_name: user.profile?.full_name || '',
        bio: user.profile?.bio || '',
        avatar_url: user.profile?.avatar_url || '',
        phone_number: user.profile?.phone_number || '',
        address: user.profile?.address || '',
        city: user.profile?.city || '',
        country: user.profile?.country || '',
        preferred_budget_tier: user.profile?.preferred_budget_tier || 'STANDARD',
        preferred_travel_style: user.profile?.preferred_travel_style || '',
        preferred_food: user.profile?.preferred_food || '',
        preferred_transport: user.profile?.preferred_transport || 'Flight & Road Trip',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateProfile(formData);
      await refreshUser();
      setSuccessMsg('Your profile details and preferences have been updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.detail || err.error || 'Failed to update profile information.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    try {
      const res = await api.post('auth/change-password/', passwordData);
      setPasswordSuccessMsg(res.data.message || 'Password changed successfully!');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setPasswordErrorMsg(err.response?.data?.error || 'Failed to change password. Please check your credentials.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Back link decision
  let dashboardLink = '/traveler';
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    dashboardLink = '/admin';
  } else if (user?.role && user.role !== 'TRAVELER') {
    dashboardLink = '/manager';
  }

  // Profile completion math
  const fields = [formData.full_name, formData.bio, formData.phone_number, formData.city, formData.country, formData.avatar_url];
  const filledFields = fields.filter(f => f && f.trim().length > 0).length;
  const completionPercent = Math.min(100, Math.round(((filledFields + 2) / 8) * 100));

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 p-4 md:p-12 text-slate-100">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link 
              href={dashboardLink} 
              className="inline-flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Console</span>
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Account Profile &amp; Preferences
            </h1>
          </div>

          {/* Hero Profile Header Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left">
                {/* Avatar Preview */}
                <div className="relative group">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-emerald-500/50 bg-slate-950 flex items-center justify-center shadow-xl">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-12 w-12 text-emerald-400" />
                    )}
                  </div>
                  <button 
                    onClick={() => setActiveTab('avatar')}
                    className="absolute bottom-0 right-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2 rounded-full shadow-lg transition-transform transform hover:scale-110"
                    title="Change Photo"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-2xl font-black text-white flex items-center justify-center md:justify-start space-x-2">
                    <span>{formData.full_name || user?.username}</span>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
                  
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                    <span className="px-3 py-1 rounded-full text-2xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                      Role: {user?.role}
                    </span>
                    <span className="px-3 py-1 rounded-full text-2xs font-extrabold bg-slate-950 text-slate-300 border border-slate-800 uppercase tracking-wider">
                      Status: {user?.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Completion Widget */}
              <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl w-full md:w-64 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-300">Profile Completion</span>
                  <span className="text-emerald-400 font-mono">{completionPercent}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" style={{ width: `${completionPercent}%` }} />
                </div>
                <p className="text-3xs text-slate-500">Add phone, location &amp; bio for 100% verified status.</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-850 space-x-4 overflow-x-auto text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveTab('personal')}
              className={`pb-3 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${activeTab === 'personal' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <User className="h-4 w-4" />
              <span>Personal Info</span>
            </button>
            <button
              onClick={() => setActiveTab('avatar')}
              className={`pb-3 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${activeTab === 'avatar' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <Camera className="h-4 w-4" />
              <span>Avatar &amp; Photo</span>
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`pb-3 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${activeTab === 'preferences' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <Compass className="h-4 w-4" />
              <span>AI Preferences</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 border-b-2 transition-all flex items-center space-x-2 shrink-0 ${activeTab === 'security' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <Lock className="h-4 w-4" />
              <span>Security &amp; Password</span>
            </button>
          </div>

          {/* Global Alert Banners */}
          {successMsg && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-pulse">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="bg-rose-500/15 border border-rose-500/40 text-rose-300 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB CONTENT 1: Personal Info */}
          {activeTab === 'personal' && (
            <form onSubmit={handleSaveProfile} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <User className="h-5 w-5 text-emerald-400" />
                <span>Personal Profile &amp; Contact Details</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="e.g. Rokibul Islam"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Display Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="e.g. rokibul324"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Email Address (Primary Account Key)</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-slate-950/40 border border-slate-850 rounded-xl px-4 py-3 text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="e.g. +880 1700 000000"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Dhaka, New York, London"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="e.g. Bangladesh, United Kingdom"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-2">Street Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. House 42, Road 11, Banani"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-2">Personal Bio / Traveler Statement</label>
                  <textarea
                    rows={3}
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell service managers and travel partners about yourself..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black py-3.5 px-6 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </form>
          )}

          {/* TAB CONTENT 2: Avatar & Photo */}
          {activeTab === 'avatar' && (
            <form onSubmit={handleSaveProfile} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Camera className="h-5 w-5 text-emerald-400" />
                  <span>Choose Profile Avatar &amp; Photo</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Select from curated traveler avatars or enter a direct image URL.</p>
              </div>

              {/* Preset Avatars Grid */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Curated Presets</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {PRESET_AVATARS.map((url, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setFormData({ ...formData, avatar_url: url })}
                      className={`h-20 w-20 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all transform hover:scale-105 ${formData.avatar_url === url ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-lg' : 'border-slate-800 hover:border-slate-700'}`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Image URL Field */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Or Custom Image URL</label>
                <input
                  type="text"
                  name="avatar_url"
                  value={formData.avatar_url}
                  onChange={handleChange}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black py-3.5 px-6 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Updating Avatar...' : 'Set Active Avatar'}</span>
              </button>
            </form>
          )}

          {/* TAB CONTENT 3: AI Preferences */}
          {activeTab === 'preferences' && (
            <form onSubmit={handleSaveProfile} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Compass className="h-5 w-5 text-emerald-400" />
                  <span>AI Recommendation Parameters</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Calibrate the recommendation matrix for budget ratios, food preferences, and transportation choices.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Preferred Budget Tier</label>
                  <select
                    name="preferred_budget_tier"
                    value={formData.preferred_budget_tier}
                    onChange={handleChange}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="BUDGET">Budget Friendly (+18% markup)</option>
                    <option value="STANDARD">Standard Travel (+25% markup)</option>
                    <option value="LUXURY">Luxury Expeditions (+32% markup)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Preferred Mode of Transportation</label>
                  <input
                    type="text"
                    name="preferred_transport"
                    value={formData.preferred_transport}
                    onChange={handleChange}
                    placeholder="e.g. Flight, Train, Road Trip Bus, Water Launch"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Travel Style Keywords</label>
                  <input
                    type="text"
                    name="preferred_travel_style"
                    value={formData.preferred_travel_style}
                    onChange={handleChange}
                    placeholder="e.g. Adventure, Relaxing, Heritage Walk, Beaches"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Food Cuisine &amp; Dietary Preferences</label>
                  <input
                    type="text"
                    name="preferred_food"
                    value={formData.preferred_food}
                    onChange={handleChange}
                    placeholder="e.g. Halal, Vegan, Seafood, Italian, Kosher"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black py-3.5 px-6 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Saving Preferences...' : 'Save AI Configuration'}</span>
              </button>
            </form>
          )}

          {/* TAB CONTENT 4: Security & Passwords */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl max-w-xl">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-emerald-400" />
                  <span>Security &amp; Password Management</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Update your account credentials to keep your travel data secure.</p>
              </div>

              {passwordSuccessMsg && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-pulse">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}
              {passwordErrorMsg && (
                <div className="bg-rose-500/15 border border-rose-500/40 text-rose-300 p-4 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Current Password</label>
                  <input
                    type="password"
                    name="old_password"
                    value={passwordData.old_password}
                    onChange={handlePasswordChangeInput}
                    required
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">New Password (Min 6 characters)</label>
                  <input
                    type="password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChangeInput}
                    required
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChangeInput}
                    required
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black py-3.5 px-6 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                <Key className="h-4 w-4" />
                <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
