'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import {
  CreditCard, ShieldCheck, Compass, ArrowLeft, Loader2, Sparkles,
  Terminal, Plane, Hotel, Utensils, Car, Calendar, Globe,
  CheckCircle2, Lock, AlertTriangle, ChevronRight, DollarSign,
  Zap, Star, Home
} from 'lucide-react';
import Link from 'next/link';

interface TourDetails {
  id: number;
  title: string;
  budget_tier: string;
  final_price: string;
  base_cost: string;
  markup_percentage: string;
  start_date: string;
  end_date: string;
  status: string;
  items?: any[];
}

const PAYMENT_STEPS = ['Review Invoice', 'Choose Gateway', 'Confirm & Pay'];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tourId = searchParams.get('tourId');

  const [tour, setTour] = useState<TourDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'mock' | null>(null);

  useEffect(() => {
    if (!tourId) {
      setError('Missing tour identifier. Redirecting...');
      setTimeout(() => router.push('/traveler'), 3000);
      return;
    }
    const fetchTour = async () => {
      try {
        const res = await api.get(`tours/tours/${tourId}/`);
        setTour(res.data);
      } catch (err) {
        setError('Failed to fetch tour details. Please return to dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchTour();
  }, [tourId, router]);

  const handleStripeCheckout = async () => {
    if (!tour) return;
    setPaying(true);
    setError('');
    try {
      const res = await api.post('payments/checkout-session/', { tour_id: tour.id });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        setError('Stripe checkout URL not received from server.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize Stripe checkout session.');
    } finally {
      setPaying(false);
    }
  };

  const handleMockCheckout = async () => {
    if (!tour) return;
    setPaying(true);
    setError('');
    try {
      await api.post('payments/mock-pay/', { tour_id: tour.id });
      setSuccess(true);
      setTimeout(() => router.push('/traveler'), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Mock transaction simulation failed.');
    } finally {
      setPaying(false);
    }
  };

  const getTierBadge = (tier: string) => {
    if (tier === 'LUXURY') return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    if (tier === 'STANDARD') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
  };

  const getMarkupLabel = (tier: string) => {
    if (tier === 'LUXURY') return '32% luxury markup';
    if (tier === 'STANDARD') return '25% standard markup';
    if (tier === 'BUDGET') return '18% budget markup';
    return '35% custom markup';
  };

  const getItemIcon = (item: any) => {
    if (item.flight_details) return { icon: Plane, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', type: 'Flight', name: item.flight_details.name, detail: `${item.flight_details.departure_city} → ${item.flight_details.destination_city}`, price: parseFloat(item.flight_details.price) };
    if (item.hotel_details) return { icon: Hotel, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', type: 'Hotel', name: item.hotel_details.name, detail: `${item.hotel_details.room_type} · ${item.quantity} night(s)`, price: parseFloat(item.hotel_details.price_per_night) * item.quantity };
    if (item.restaurant_details) return { icon: Utensils, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', type: 'Dining', name: item.restaurant_details.name, detail: `${item.restaurant_details.cuisine} · ${item.quantity} meal(s)`, price: parseFloat(item.restaurant_details.price_per_meal) * item.quantity };
    if (item.ride_details) return { icon: Car, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', type: 'Ride', name: item.ride_details.provider_name, detail: `${item.ride_details.vehicle_type} · ~${item.quantity}km`, price: parseFloat(item.ride_details.price_per_km) * item.quantity };
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080b12] text-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin h-10 w-10 text-emerald-500" />
          <p className="text-slate-400 font-medium">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080b12] text-white p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="relative">
            <div className="w-24 h-24 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-3xl bg-emerald-400/10 blur-xl animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 rounded-full text-xs text-emerald-400 font-bold mb-4">
              <Star className="h-3.5 w-3.5" />
              Payment Confirmed!
            </div>
            <h2 className="text-3xl font-black text-white">Booking Confirmed! 🎉</h2>
            <p className="text-slate-400 mt-3 leading-relaxed">
              Your tour has been <span className="text-emerald-400 font-bold">UNLOCKED</span>. Pack your bags — adventure awaits!
            </p>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 text-left space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tour</span>
              <span className="font-bold text-white">{tour?.title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <span className="text-emerald-400 font-black">✅ UNLOCKED</span>
            </div>
          </div>
          <p className="text-emerald-400 text-xs font-semibold animate-pulse">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Ambient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* ─── HEADER ─── */}
        <header className="flex items-center justify-between gap-4 bg-white/3 backdrop-blur-xl border border-white/8 p-4 rounded-2xl">
          <div className="flex items-center space-x-3">
            <Link href="/" className="group flex items-center space-x-1.5 bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 px-3 py-2 rounded-xl transition-all" title="Home">
              <Home className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </Link>
            <button
              onClick={() => router.push('/traveler')}
              className="group flex items-center space-x-1.5 bg-white/3 hover:bg-white/8 border border-white/8 px-3 py-2 rounded-xl transition-all text-xs font-semibold text-slate-500 hover:text-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Back to Dashboard</span>
            </button>
            <div className="w-px h-7 bg-white/10" />
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              <span className="font-black text-sm text-white">Secure Checkout</span>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="hidden md:flex items-center gap-3 text-2xs text-slate-600">
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Encrypted</span>
            </div>
          </div>
        </header>

        {/* ─── PROGRESS STEPS ─── */}
        <div className="bg-white/2 border border-white/8 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            {PAYMENT_STEPS.map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border transition-all ${
                    i < step ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                    i === step ? 'bg-emerald-400 border-emerald-400 text-slate-950' :
                    'bg-white/3 border-white/10 text-slate-600'
                  }`}>
                    {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-white' : 'text-slate-600'}`}>{s}</span>
                </div>
                {i < PAYMENT_STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-emerald-500/40' : 'bg-white/8'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            {error}
          </div>
        )}

        {tour ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

            {/* ─── INVOICE PANEL (Left) ─── */}
            <div className="md:col-span-3 space-y-4">

              {/* Tour Summary */}
              <div className="bg-white/2 border border-white/8 rounded-2xl p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Compass className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Trip Invoice</span>
                    </div>
                    <h2 className="font-black text-white text-lg leading-tight">{tour.title}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-2xs px-2 py-0.5 rounded-full border font-bold ${getTierBadge(tour.budget_tier)}`}>
                        {tour.budget_tier}
                      </span>
                      <div className="flex items-center gap-1 text-2xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {tour.start_date} → {tour.end_date}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itemized Services */}
                {tour.items && tour.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Included Services</p>
                    {tour.items.map((item: any, i: number) => {
                      const cfg = getItemIcon(item);
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${cfg.bg}`}>
                              <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-200">{cfg.name}</p>
                              <p className="text-2xs text-slate-600">{cfg.detail}</p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-slate-300">${cfg.price.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="border-t border-white/8 pt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Base Cost</span>
                    <span className="text-slate-300 font-semibold">${parseFloat(tour.base_cost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      Service Markup ({getMarkupLabel(tour.budget_tier)})
                    </span>
                    <span className="text-amber-400 font-semibold">
                      +${(parseFloat(tour.final_price) - parseFloat(tour.base_cost)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-white/8">
                    <span className="font-black text-white">Total Due</span>
                    <span className="text-2xl font-black text-emerald-400">${parseFloat(tour.final_price).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Trust & Security badges */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Lock, label: '256-bit SSL' },
                  { icon: ShieldCheck, label: 'PCI Compliant' },
                  { icon: Globe, label: 'Secure Gateway' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="bg-white/2 border border-white/6 rounded-xl p-3 text-center">
                    <Icon className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                    <p className="text-2xs text-slate-600 font-semibold">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── PAYMENT PANEL (Right) ─── */}
            <div className="md:col-span-2 space-y-4">

              <div className="bg-white/2 border border-white/8 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="font-black text-white text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    Choose Payment Gateway
                  </h3>
                  <p className="text-slate-600 text-2xs mt-1">Select your preferred payment method to complete the booking.</p>
                </div>

                {/* Gateway Selection */}
                <div className="space-y-3">
                  {/* Stripe */}
                  <button
                    onClick={() => setSelectedGateway(selectedGateway === 'stripe' ? null : 'stripe')}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedGateway === 'stripe'
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-white/3 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#635BFF]/15 border border-[#635BFF]/30 rounded-xl flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-[#635BFF]" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white">Stripe Secure Payment</p>
                          <p className="text-2xs text-slate-500">Real card processing · 3D Secure</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGateway === 'stripe' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`}>
                        {selectedGateway === 'stripe' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                  </button>

                  {/* Mock/Sandbox */}
                  <button
                    onClick={() => setSelectedGateway(selectedGateway === 'mock' ? null : 'mock')}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedGateway === 'mock'
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-white/3 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                          <Terminal className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white">Dev Sandbox Simulator</p>
                          <p className="text-2xs text-slate-500">Instant mock payment · No real charge</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGateway === 'mock' ? 'border-amber-400 bg-amber-400' : 'border-slate-600'}`}>
                        {selectedGateway === 'mock' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Sandbox warning */}
                {selectedGateway === 'mock' && (
                  <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-2xs text-amber-300">
                      <span className="font-bold">Sandbox mode:</span> No real charge applied. Tour will be unlocked instantly for testing.
                    </p>
                  </div>
                )}

                {/* Summary row */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">You will pay</span>
                  <span className="text-lg font-black text-emerald-400">${parseFloat(tour.final_price).toFixed(2)}</span>
                </div>

                {/* Pay button */}
                {selectedGateway === 'stripe' && (
                  <button
                    onClick={handleStripeCheckout}
                    disabled={paying}
                    className="w-full bg-[#635BFF] hover:bg-[#4F46E5] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-xl shadow-[#635BFF]/20 hover:scale-[1.02]"
                  >
                    {paying ? <Loader2 className="animate-spin h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                    <span>Pay with Stripe — ${parseFloat(tour.final_price).toFixed(2)}</span>
                  </button>
                )}
                {selectedGateway === 'mock' && (
                  <button
                    onClick={handleMockCheckout}
                    disabled={paying}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-xl shadow-emerald-500/20 hover:scale-[1.02]"
                  >
                    {paying ? <Loader2 className="animate-spin h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    <span>Confirm Mock Payment</span>
                  </button>
                )}
                {!selectedGateway && (
                  <div className="w-full bg-white/3 border border-white/10 text-slate-600 font-black py-4 rounded-xl text-center text-sm cursor-not-allowed">
                    Select a gateway above
                  </div>
                )}
              </div>

              {/* Small help note */}
              <p className="text-2xs text-slate-700 text-center leading-relaxed">
                By completing payment, you agree to our booking terms. Cancellation policies vary by service tier.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute allowedRoles={['TRAVELER', 'ADMIN', 'SUPER_ADMIN']}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#080b12] text-white">
          <Loader2 className="animate-spin h-10 w-10 text-emerald-500" />
        </div>
      }>
        <CheckoutContent />
      </Suspense>
    </ProtectedRoute>
  );
}
