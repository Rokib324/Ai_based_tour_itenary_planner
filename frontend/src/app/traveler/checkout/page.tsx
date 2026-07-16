'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import { CreditCard, ShieldCheck, Compass, ArrowLeft, Loader2, Sparkles, Terminal } from 'lucide-react';

interface TourDetails {
  id: number;
  title: string;
  budget_tier: string;
  final_price: string;
  start_date: string;
  end_date: string;
  status: string;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tourId = searchParams.get('tourId');

  const [tour, setTour] = useState<TourDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tourId) {
      setError('Missing tour identifier. Redirecting to home...');
      setTimeout(() => router.push('/traveler'), 3000);
      return;
    }

    const fetchTour = async () => {
      try {
        const res = await api.get(`tours/tours/${tourId}/`);
        setTour(res.data);
      } catch (err) {
        setError('Failed to fetch tour details. Please return to traveler dashboard.');
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
        setError('Stripe checkout url not received.');
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
      setTimeout(() => {
        router.push('/traveler');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Mock transaction simulation failed.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin h-12 w-12 text-emerald-500" />
          <p className="text-slate-400 font-medium">Resolving locking constraints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-6 md:p-12">
      {/* Glow backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-700"></div>

      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Navigation */}
        <button onClick={() => router.push('/traveler')} className="inline-flex items-center space-x-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Traveler Dashboard</span>
        </button>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-8 rounded-3xl text-center space-y-4">
            <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto" />
            <h2 className="text-2xl font-bold">Checkout Successful!</h2>
            <p className="text-slate-400 text-sm">
              Your mock payment has been processed successfully. Your tour is now UNLOCKED.
            </p>
            <p className="text-xs text-emerald-400 animate-pulse font-semibold">
              Redirecting you to dashboard shortly...
            </p>
          </div>
        ) : tour ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Invoice card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <Compass className="h-4 w-4" />
                <span>Trip Invoice Details</span>
              </div>

              <div className="space-y-4 text-xs text-slate-400">
                <div>
                  <p className="text-slate-500 text-3xs uppercase tracking-wider font-semibold">Tour Title</p>
                  <p className="text-sm font-bold text-slate-200 mt-1">{tour.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-3xs uppercase tracking-wider font-semibold">Budget Tier</p>
                    <p className="font-semibold text-slate-300 mt-0.5">{tour.budget_tier}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-3xs uppercase tracking-wider font-semibold">Start Date</p>
                    <p className="font-semibold text-slate-300 mt-0.5">{tour.start_date}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-slate-400">Total Final Price:</span>
                  <span className="text-2xl font-extrabold text-emerald-400">${parseFloat(tour.final_price).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment triggers */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-100 flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-emerald-400" />
                  <span>Choose Gateway</span>
                </h3>
                <p className="text-slate-500 text-2xs leading-relaxed">
                  Select your payment provider. Stripe handles active cards with 3D Secure, while Dev Sandbox executes local updates immediately.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleStripeCheckout}
                  disabled={paying}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {paying ? <Loader2 className="animate-spin h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  <span>Pay with Stripe Card</span>
                </button>

                <button
                  onClick={handleMockCheckout}
                  disabled={paying}
                  className="w-full bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-850 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span>Sandbox Simulator (Dev)</span>
                </button>
              </div>
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
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <Loader2 className="animate-spin h-12 w-12 text-emerald-500" />
        </div>
      }>
        <CheckoutContent />
      </Suspense>
    </ProtectedRoute>
  );
}
