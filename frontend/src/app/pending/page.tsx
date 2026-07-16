'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, LogOut, CheckCircle } from 'lucide-react';

export default function PendingPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4">
      {/* Glow backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-700"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 blur-sm opacity-30 animate-pulse"></div>
            <div className="relative bg-slate-950 p-4 rounded-full border border-slate-850">
              <ShieldAlert className="h-10 w-10 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Account Pending Approval
          </h1>
          <p className="text-sm text-slate-400">
            Hello, <span className="text-emerald-400 font-semibold">{user?.username || 'User'}</span>. Your email verification is completed.
          </p>
        </div>

        <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-850 text-left space-y-4">
          <div className="flex items-start space-x-3 text-sm">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-300">Email Verified</p>
              <p className="text-slate-500 text-xs mt-0.5">Your email address {user?.email} has been successfully validated.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 text-sm">
            <div className="h-5 w-5 rounded-full border border-slate-650 flex items-center justify-center shrink-0 mt-0.5 text-xs text-slate-500 font-bold animate-pulse">
              !
            </div>
            <div>
              <p className="font-semibold text-slate-300">Admin Signoff Pending</p>
              <p className="text-slate-500 text-xs mt-0.5">An administrator is currently reviewing your registration parameters. You will receive an email once approved.</p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center justify-center space-x-2 w-full bg-slate-950/80 border border-slate-850 hover:bg-slate-900 text-slate-300 hover:text-white py-3 px-4 rounded-xl transition-all duration-300 transform active:scale-95 text-sm font-semibold"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out / Log In Again</span>
        </button>
      </div>
    </div>
  );
}
