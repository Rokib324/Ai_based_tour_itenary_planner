'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Compass, Sparkles, ShieldCheck, CreditCard, ArrowRight, Plane,
  MapPin, Star, ChevronDown, Menu, X, Globe, Cloud,
  CheckCircle, Zap, Users, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingHomePage() {
  const { user, role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardLink = () => {
    if (!role) return '/traveler';
    if (role === 'TRAVELER') return '/traveler';
    if (['FLIGHT_MANAGER', 'HOTEL_MANAGER', 'RESTAURANT_MANAGER', 'RIDE_MANAGER'].includes(role)) return '/manager';
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
    return '/traveler';
  };

  const destinations = [
    { title: 'Paris Art Deco Escape', location: 'Paris, France', image: '/dest_paris.jpg', price: '$1,250', rating: '4.9', tier: 'Standard', tags: ['Museums', 'Dining', 'Romantic'] },
    { title: 'Tokyo Cyberpunk Nights', location: 'Tokyo, Japan', image: '/dest_tokyo.jpg', price: '$2,890', rating: '5.0', tier: 'Luxury', tags: ['Tech Tours', 'Transit', 'Futuristic'] },
    { title: 'Swiss Alps Wellness Lodge', location: 'Geneva, Switzerland', image: '/dest_swiss.jpg', price: '$3,400', rating: '4.8', tier: 'Luxury', tags: ['Ski', 'Saunas', 'Chalet'] },
    { title: 'Bali Sacred Rice Terraces', location: 'Bali, Indonesia', image: '/dest_bali.jpg', price: '$980', rating: '4.7', tier: 'Budget', tags: ['Culture', 'Nature', 'Temples'] },
    { title: 'Santorini Sunset Escape', location: 'Santorini, Greece', image: '/dest_santorini.jpg', price: '$1,750', rating: '4.9', tier: 'Standard', tags: ['Beach', 'Sunsets', 'Wine'] },
    { title: 'Maldives Overwater Villa', location: 'Malé, Maldives', image: '/hero_beach.jpg', price: '$4,200', rating: '5.0', tier: 'Luxury', tags: ['Snorkeling', 'Resort', 'Private'] },
  ];

  const features = [
    { icon: <Sparkles className="w-6 h-6" />, title: 'AI Recommendation Engine', desc: 'Cosine-vector indexing matches your travel DNA to ideal packages with zero guesswork.', accent: 'from-violet-500 to-purple-600' },
    { icon: <ShieldCheck className="w-6 h-6" />, title: 'Sequential Approval Flow', desc: 'Tour proposals pass through Flight, Hotel, and Ride manager checkpoints in order.', accent: 'from-emerald-500 to-teal-600' },
    { icon: <CreditCard className="w-6 h-6" />, title: 'Stripe Payments & Sandbox', desc: 'Checkout via real Stripe gateways or simulate bookings in our developer sandbox instantly.', accent: 'from-amber-500 to-orange-600' },
    { icon: <Cloud className="w-6 h-6" />, title: 'Live Weather Analytics', desc: 'Real-time forecasts and risk scoring for your travel window included on every itinerary.', accent: 'from-sky-500 to-blue-600' },
    { icon: <Globe className="w-6 h-6" />, title: 'Global Destination Library', desc: 'Hundreds of curated destinations across six continents, each with custom tier pricing.', accent: 'from-rose-500 to-pink-600' },
    { icon: <Zap className="w-6 h-6" />, title: 'Instant Itinerary Builder', desc: 'Mix-and-match flights, hotels, and rides into a complete tour plan in minutes, not hours.', accent: 'from-yellow-500 to-amber-600' },
  ];

  const steps = [
    { number: '01', title: 'Select & Customize Your Blueprint', desc: 'Pick an AI-recommended preset or compile your own — choose flight class, hotel tier, and transport options to build a fully personalized itinerary.', icon: <MapPin className="w-5 h-5" /> },
    { number: '02', title: 'Manager Verification Pipeline', desc: 'Your plan routes sequentially to Flight, Hotel, and Ride managers who audit availability. Our AI runs concurrent weather risk assessments.', icon: <Users className="w-5 h-5" /> },
    { number: '03', title: 'Pay & Take Off', desc: 'Invoice totals reflect dynamic budget markups (18%–32%). Once paid via Stripe, your tour unlocks and confirmation emails dispatch automatically.', icon: <Plane className="w-5 h-5" /> },
  ];

  const stats = [
    { value: '50K+', label: 'Trips Planned' },
    { value: '120+', label: 'Destinations' },
    { value: '4.9★', label: 'Avg. Rating' },
    { value: '99%', label: 'Approval Rate' },
  ];

  const tierColor: Record<string, string> = {
    Budget: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    Standard: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Luxury: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="min-h-screen bg-[#0c0d10] text-white font-sans">

      {/* NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0c0d10]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight">Smart<span className="text-emerald-400">Travel</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#destinations" className="hover:text-white transition-colors">Destinations</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href={getDashboardLink()} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm py-2.5 px-5 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                  Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button onClick={logout} className="text-white/50 hover:text-white text-sm font-medium transition-colors py-2.5 px-4">Log Out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-white/60 hover:text-white text-sm font-medium transition-colors py-2 px-3">Log In</Link>
                <Link href="/register" className="bg-white hover:bg-white/90 text-black font-bold text-sm py-2.5 px-5 rounded-xl transition-all shadow-lg">Get Started Free</Link>
              </>
            )}
          </div>

          <button className="md:hidden text-white/70 hover:text-white transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#0c0d10]/95 backdrop-blur-xl border-t border-white/5 px-6 py-6 flex flex-col gap-5">
            <a href="#features" onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">Features</a>
            <a href="#destinations" onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">Destinations</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">How it Works</a>
            <div className="pt-2 border-t border-white/5 flex flex-col gap-3">
              {user ? (
                <>
                  <Link href={getDashboardLink()} className="bg-emerald-500 text-black font-bold text-sm py-3 px-5 rounded-xl text-center">Dashboard</Link>
                  <button onClick={logout} className="text-white/60 text-sm text-center">Log Out</button>
                </>
              ) : (
                <>
                  <Link href="/register" className="bg-white text-black font-bold text-sm py-3 px-5 rounded-xl text-center">Get Started Free</Link>
                  <Link href="/login" className="text-white/60 text-sm text-center">Log In</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-end pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/hero_beach.jpg" alt="Luxury tropical beach resort aerial view" fill priority className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-[#0c0d10]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d10]/80 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-xs font-semibold text-white/90 tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              AI-Powered Itinerary Planning · Approved by Experts
            </div>

            <div className="space-y-3">
              <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight">
                Plan smarter.<br />
                <span className="text-emerald-400">Travel better.</span>
              </h1>
              <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-xl mt-6">
                SmartTravel combines an AI recommendation engine, sequential manager approvals, and real-time weather data to build your perfect custom vacation — end to end.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={user ? getDashboardLink() : '/register'} className="group bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40">
                Start Planning Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="#destinations" className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white font-bold text-base py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-2">
                Explore Destinations
                <ChevronDown className="w-4 h-4" />
              </a>
            </div>

            <div className="flex flex-wrap gap-x-10 gap-y-3 pt-4 border-t border-white/10">
              {stats.map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="bg-emerald-500 py-3 overflow-hidden">
        <div className="flex gap-12 whitespace-nowrap" style={{ animation: 'marquee 22s linear infinite' }}>
          {Array(4).fill(['✈ Paris', '🏔 Swiss Alps', '🌏 Tokyo', '🏖 Maldives', '🌅 Santorini', '🌿 Bali', '🗽 New York', '🏯 Kyoto', '🎭 Barcelona']).flat().map((d, i) => (
            <span key={i} className="text-black font-bold text-xs tracking-widest uppercase">{d}</span>
          ))}
        </div>
      </div>

      {/* DESTINATIONS */}
      <section id="destinations" className="py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Curated Packages</p>
              <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">Where do you want<br />to go next?</h2>
            </div>
            <Link href={user ? '/traveler/create-tour' : '/register'} className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-emerald-400 transition-colors group">
              View all destinations <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {destinations.map((dest, i) => (
              <Link
                key={i}
                href={user ? '/traveler/create-tour' : '/register'}
                className="group relative overflow-hidden rounded-3xl cursor-pointer block"
                style={{ aspectRatio: i === 0 || i === 3 ? '4 / 3' : '3 / 4' }}
              >
                <Image src={dest.image} alt={dest.title} fill className="object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border backdrop-blur-md ${tierColor[dest.tier]}`}>{dest.tier}</span>
                  <span className="flex items-center gap-1 text-xs font-bold bg-black/40 backdrop-blur-md text-amber-400 px-2.5 py-1 rounded-full border border-amber-400/30">
                    <Star className="w-3 h-3 fill-amber-400" />{dest.rating}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
                  <div className="flex items-center gap-1.5 text-white/60 text-xs font-medium"><MapPin className="w-3.5 h-3.5" />{dest.location}</div>
                  <h3 className="font-black text-lg leading-snug">{dest.title}</h3>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1.5 flex-wrap">
                      {dest.tags.map((t, ti) => <span key={ti} className="text-xs bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full text-white/70">{t}</span>)}
                    </div>
                    <p className="text-emerald-400 font-black text-lg ml-2 shrink-0">{dest.price}</p>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100 shadow-xl">
                  <ArrowRight className="w-5 h-5 text-black" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Platform Features</p>
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">Everything you need for your next adventure</h2>
            <p className="text-white/50 text-base leading-relaxed">Our intelligent backend coordinates every piece of your trip — from AI matching to manager sign-offs and Stripe payments.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] rounded-3xl p-7 transition-all duration-300 overflow-hidden">
                <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`} />
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.accent} flex items-center justify-center text-white mb-5 shadow-lg`}>{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative h-[560px] hidden lg:block">
              <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
                <Image src="/dest_santorini.jpg" alt="Santorini" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0c0d10]/60 to-transparent" />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-[#161820] border border-white/10 rounded-2xl p-4 w-52 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-400" /></div>
                  <div>
                    <p className="text-xs font-bold text-white">Tour Approved</p>
                    <p className="text-xs text-white/40">All 3 managers signed off</p>
                  </div>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full">
                  <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                </div>
              </div>
              <div className="absolute -top-6 -left-6 bg-[#161820] border border-white/10 rounded-2xl p-4 w-44 shadow-2xl backdrop-blur-xl">
                <p className="text-xs text-white/40 mb-1">AI Match Score</p>
                <p className="text-2xl font-black text-white">97<span className="text-emerald-400">%</span></p>
                <div className="flex items-center gap-1 mt-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400 font-semibold">Perfect match</span></div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">How It Works</p>
                <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">From idea to<br />takeoff in 3 steps</h2>
                <p className="text-white/50 text-base mt-2">Our automated pipeline handles every step so you can focus on what matters — the adventure ahead.</p>
              </div>

              <div className="space-y-4 pt-4">
                {steps.map((step, i) => (
                  <div key={i} className="group flex gap-5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/30 rounded-2xl p-6 transition-all duration-300">
                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">{step.icon}</div>
                    <div>
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-3xl font-black text-white/10 leading-none">{step.number}</span>
                        <h3 className="font-bold text-base">{step.title}</h3>
                      </div>
                      <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href={user ? getDashboardLink() : '/register'} className="mt-4 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 px-8 rounded-2xl transition-all text-sm shadow-lg shadow-emerald-500/20 group">
                Start Your Journey <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TIERS BANNER */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[2.5rem] overflow-hidden min-h-[400px] flex items-center">
            <Image src="/dest_bali.jpg" alt="Bali rice terraces" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d10]/95 via-[#0c0d10]/80 to-transparent" />
            <div className="relative px-10 py-16 md:px-16">
              <div className="max-w-xl space-y-6">
                <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Transparent Pricing</p>
                <h2 className="text-3xl md:text-4xl font-black leading-tight">Choose your travel tier</h2>
                <p className="text-white/60 text-sm leading-relaxed">Every package is automatically priced with our transparent markup model so you always know what you pay for.</p>
                <div className="grid grid-cols-3 gap-4 pt-2">
                  {[
                    { label: 'Budget', markup: '18%', color: 'border-sky-500/40 bg-sky-500/10', text: 'text-sky-400' },
                    { label: 'Standard', markup: '25%', color: 'border-emerald-500/40 bg-emerald-500/10', text: 'text-emerald-400' },
                    { label: 'Luxury', markup: '32%', color: 'border-amber-500/40 bg-amber-500/10', text: 'text-amber-400' },
                  ].map((tier, i) => (
                    <div key={i} className={`border rounded-2xl p-4 text-center backdrop-blur-sm ${tier.color}`}>
                      <p className={`text-2xl font-black ${tier.text}`}>{tier.markup}</p>
                      <p className="text-xs text-white/50 mt-1 font-semibold">{tier.label} markup</p>
                    </div>
                  ))}
                </div>
                <Link href={user ? getDashboardLink() : '/register'} className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-black font-black py-3.5 px-7 rounded-xl transition-all text-sm group">
                  Compare All Tiers <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Get Started Today</p>
            <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
              Your next trip is<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">waiting for you.</span>
            </h2>
            <p className="text-white/50 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">Join thousands of smart travelers who plan smarter, spend less, and experience more with SmartTravel&apos;s AI-powered platform.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={user ? getDashboardLink() : '/register'} className="group bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg py-4 px-10 rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40">
              Start Planning for Free <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            {!user && <Link href="/login" className="text-white/60 hover:text-white font-semibold transition-colors text-sm py-4 px-6">Already have an account? Log in →</Link>}
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {['No credit card required', 'Free to start', 'Cancel anytime'].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-white/40 text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6 bg-[#09090c]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-base">Smart<span className="text-emerald-400">Travel</span></span>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-white/40 font-medium">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#destinations" className="hover:text-white transition-colors">Destinations</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
              <Link href="/login" className="hover:text-white transition-colors">Log In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
            <p className="text-white/25 text-xs font-medium text-center md:text-right">&copy; 2026 SmartTravel Inc. Powered by Antigravity AI.</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
