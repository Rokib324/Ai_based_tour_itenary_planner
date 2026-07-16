'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Compass, Sparkles, ShieldCheck, CreditCard, ArrowRight, Plane, Hotel, Check, Play, UserCheck, Star } from 'lucide-react';
import Link from 'next/link';

export default function LandingHomePage() {
  const { user, role, logout } = useAuth();

  const getDashboardLink = () => {
    if (!role) return '/traveler';
    if (role === 'TRAVELER') return '/traveler';
    if (['FLIGHT_MANAGER', 'HOTEL_MANAGER', 'RESTAURANT_MANAGER', 'RIDE_MANAGER'].includes(role)) {
      return '/manager';
    }
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
    return '/traveler';
  };

  const mockPackages = [
    {
      title: "Paris Art Deco Escape",
      destination: "Paris, France",
      budget: "Standard",
      price: "$1,250",
      rating: "4.9",
      tags: ["Museums", "Dining", "Romantic"],
      glow: "from-purple-500/20 to-indigo-500/20",
    },
    {
      title: "Tokyo Cyberpunk Nights",
      destination: "Tokyo, Japan",
      budget: "Luxury",
      price: "$2,890",
      rating: "5.0",
      tags: ["Tech Tours", "High-speed Transit", "Futuristic"],
      glow: "from-rose-500/20 to-pink-500/20",
    },
    {
      title: "Swiss Alps Wellness Lodge",
      destination: "Geneva, Switzerland",
      budget: "Luxury",
      price: "$3,400",
      rating: "4.8",
      tags: ["Ski Stays", "Saunas", "Chalet"],
      glow: "from-emerald-500/20 to-teal-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-violet-500/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:24px_24px] -z-10 pointer-events-none"></div>

      {/* Header Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Compass className="h-5 w-5 animate-spin-slow" />
            </div>
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">
              SMARTTRAVEL
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#packages" className="hover:text-emerald-400 transition-colors">AI Presets</a>
            <a href="#workflow" className="hover:text-emerald-400 transition-colors">Workflow</a>
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link 
                  href={getDashboardLink()} 
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-500/15"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button 
                  onClick={logout}
                  className="border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-slate-400 hover:text-white text-xs font-semibold py-2 px-4 transition-colors"
                >
                  Log In
                </Link>
                <Link 
                  href="/register" 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/10"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          
          {/* AI Banner Badge */}
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Next-Gen AI Recommendation Engine Enabled</span>
          </div>

          {/* Main Titles */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-none text-slate-100">
              The Intelligent Platform For <br className="hidden md:block"/>
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                Custom Vacations Planning
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-slate-400 text-sm md:text-base leading-relaxed">
              Design complete holiday itineraries, access real-time weather analytics, prediction models, and proceed with automatic manager sign-off workflows instantly.
            </p>
          </div>

          {/* Actions CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              href={user ? getDashboardLink() : "/register"} 
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold py-4 px-8 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-xl shadow-emerald-500/10"
            >
              <span>Start Planning Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a 
              href="#packages"
              className="w-full sm:w-auto bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 py-4 px-8 rounded-xl text-sm text-slate-300 font-bold flex items-center justify-center space-x-2 transition-all"
            >
              <Play className="h-4 w-4 text-emerald-400 fill-emerald-400/20" />
              <span>Explore presets</span>
            </a>
          </div>

          {/* Inline metrics */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-12 text-center border-t border-slate-900">
            <div>
              <p className="text-xl md:text-2xl font-black text-slate-200">18%</p>
              <p className="text-3xs uppercase tracking-widest text-slate-500 font-bold mt-1">Budget Markup Ratio</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black text-slate-200">25%</p>
              <p className="text-3xs uppercase tracking-widest text-slate-500 font-bold mt-1">Standard Markup Ratio</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black text-slate-200">32%</p>
              <p className="text-3xs uppercase tracking-widest text-slate-500 font-bold mt-1">Luxury Markup Ratio</p>
            </div>
          </div>

        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="py-20 bg-slate-900/30 border-t border-slate-900 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold">All-In-One Smart Travel Ecosystem</h2>
            <p className="text-slate-500 text-xs max-w-md mx-auto">
              Our backend coordinates models dynamically to provide secure operations at scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-950/80 border border-slate-850 p-8 rounded-3xl hover:border-emerald-500/30 transition-all space-y-4">
              <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 text-emerald-400 w-fit">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-100 text-lg">AI Recommendation Engine</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Calculates travel package similarities utilizing cosine vector indexing matching your personalized travel profiles.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-950/80 border border-slate-850 p-8 rounded-3xl hover:border-emerald-500/30 transition-all space-y-4">
              <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 text-emerald-400 w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-100 text-lg">Sequential Approvals Flow</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Tour proposals process through flight, hotel, and ride review checkpoints sequentially, locking states securely.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-950/80 border border-slate-850 p-8 rounded-3xl hover:border-emerald-500/30 transition-all space-y-4">
              <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 text-emerald-400 w-fit">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-100 text-lg">Stripe Payments & Sandbox</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Unlock vacation vouchers via real Stripe gateways or simulate checkout instantly using local developer simulators.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Presets Section */}
      <section id="packages" className="py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold">Stunning Pre-defined Packages</h2>
              <p className="text-slate-500 text-xs mt-1">Cloned and customized automatically matching traveler preferences</p>
            </div>
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center space-x-1">
              <span>View all AI packages</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mockPackages.map((pkg, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-6 rounded-3xl transition-all relative overflow-hidden flex flex-col justify-between h-[360px]">
                {/* Glow backdrop inside card */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${pkg.glow} rounded-full blur-2xl pointer-events-none -z-10`}></div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xs uppercase tracking-widest text-slate-500 font-bold">{pkg.destination}</span>
                    <span className="flex items-center space-x-0.5 text-2xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Star className="h-3 w-3 fill-amber-400" />
                      <span>{pkg.rating}</span>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-100 text-lg leading-snug">{pkg.title}</h3>
                  <p className="text-3xs uppercase tracking-wider bg-slate-950 px-2 py-1 rounded w-fit border border-slate-850 font-bold text-slate-400">
                    Tier: {pkg.budget}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {pkg.tags.map((t, i) => (
                      <span key={i} className="text-3xs bg-slate-900 px-2 py-0.5 rounded-md text-slate-400 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-850/80 pt-4 mt-6">
                  <div>
                    <span className="text-4xs uppercase tracking-widest text-slate-500 font-bold">Est. Total</span>
                    <p className="text-lg font-black text-emerald-400">{pkg.price}</p>
                  </div>

                  <Link 
                    href="/register" 
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white p-2.5 rounded-xl transition-all"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Timeline Section */}
      <section id="workflow" className="py-20 bg-slate-900/30 border-t border-slate-900 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold">The Core Tour Pipeline</h2>
            <p className="text-slate-500 text-xs">How it works from blueprint compilation to takeoff</p>
          </div>

          <div className="relative border-l border-slate-800 ml-4 md:ml-32 pl-8 md:pl-16 space-y-12">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute left-[-41px] md:left-[-81px] bg-slate-950 border border-slate-800 text-emerald-400 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-100">Select & Customize Blueprint</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                  Choose preset packages recommended by the AI cosine matching engine, or compile a customized schedule of flights, hotels, and vehicle classes.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute left-[-41px] md:left-[-81px] bg-slate-950 border border-slate-800 text-emerald-400 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-100">Sequential Managers Verification</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                  The plan routes to specific managers (Flight, Hotel, Transport) who audit and approve inventory slots. The AI engine runs weather risks check concurrently.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute left-[-41px] md:left-[-81px] bg-slate-950 border border-slate-800 text-emerald-400 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-100">Payment Confirmations & Takeoff</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                  Pay invoice totals containing dynamic budgets (18%, 25%, 32% markups) via Stripe. Once paid, the tour transitions to UNLOCKED and dispatches emails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 px-6 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2 text-slate-400">
            <Compass className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-widest text-slate-200">SMARTTRAVEL</span>
          </div>
          <p className="text-slate-600 text-3xs uppercase tracking-wider font-semibold">
            &copy; 2026 SmartTravel Inc. All rights reserved. Platform powered by Antigravity AI systems.
          </p>
        </div>
      </footer>

    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
