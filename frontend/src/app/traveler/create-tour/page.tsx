'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import { useRouter } from 'next/navigation';
import {
  Plane, Hotel, Utensils, Car, Sparkles, MapPin, ArrowLeft,
  ArrowRight, Send, ShieldAlert, Train, Ship, Bus, Check,
  Compass, CalendarDays, Loader2, AlertCircle, CheckCircle2,
  Tag, Users, Info, ChevronDown, ChevronUp, Clock, Sun, Moon,
  CloudSun, DollarSign, RefreshCw, BookmarkCheck, Lightbulb,
  Camera, Landmark, Coffee, Umbrella, Eye, Layers
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */
interface CatalogItem {
  id: number;
  name?: string;
  vehicle_type?: string;
  provider_name?: string;
  departure_city?: string;
  destination_city?: string;
  location?: string;
  cuisine?: string;
  room_type?: string;
  price?: string;
  price_per_night?: string;
  price_per_meal?: string;
  price_per_km?: string;
}

interface ValidationErrors {
  destination?: string;
  tourTitle?: string;
  startDate?: string;
  endDate?: string;
  services?: string;
}

/* ─── Constants ──────────────────────────────────────────────────── */
const POPULAR_DESTINATIONS = [
  "Cox's Bazar", 'Dhaka', 'Sylhet', 'Chittagong',
  'London', 'Dubai', 'Bangkok', 'Singapore',
];

const BUDGET_TIERS = [
  {
    value: 'BUDGET',
    label: 'Budget',
    markup: 18,
    activeBorder: 'border-sky-500',
    activeBg: 'bg-sky-500/10',
    textColor: 'text-sky-400',
    desc: 'Economical choices, best value for backpackers',
  },
  {
    value: 'STANDARD',
    label: 'Standard',
    markup: 25,
    activeBorder: 'border-emerald-500',
    activeBg: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    desc: 'Comfortable balance of quality and cost',
  },
  {
    value: 'LUXURY',
    label: 'Luxury',
    markup: 32,
    activeBorder: 'border-amber-500',
    activeBg: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    desc: 'First-class stays, premium rides & fine dining',
  },
];

const TRAVELERS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/* ─── Helpers ────────────────────────────────────────────────────── */
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(d: string): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function calculateDuration(start: string, end: string): { nights: number; days: number; text: string } {
  if (!start || !end) return { nights: 0, days: 0, text: '' };
  const a = new Date(start + 'T00:00:00').getTime();
  const b = new Date(end + 'T00:00:00').getTime();
  if (b < a) return { nights: 0, days: 0, text: 'Invalid Date Range' };

  const nights = Math.round((b - a) / 86400000);
  const days = nights === 0 ? 1 : nights + 1;

  if (nights === 0) {
    return { nights: 0, days: 1, text: '1 Day (Same-Day Tour)' };
  }
  return {
    nights,
    days,
    text: `${days} Days / ${nights} Night${nights > 1 ? 's' : ''}`,
  };
}

function getTransportIcon(vehicleType = '') {
  const vt = vehicleType.toLowerCase();
  if (vt.includes('train') || vt.includes('rail')) return <Train className="h-4 w-4 text-sky-400" />;
  if (vt.includes('launch') || vt.includes('ferry') || vt.includes('boat')) return <Ship className="h-4 w-4 text-teal-400" />;
  if (vt.includes('bus')) return <Bus className="h-4 w-4 text-amber-400" />;
  if (vt.includes('plane') || vt.includes('air')) return <Plane className="h-4 w-4 text-violet-400" />;
  return <Car className="h-4 w-4 text-emerald-400" />;
}

/* ─── Step Progress Badge ────────────────────────────────────────── */
function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-200
      ${done  ? 'bg-emerald-500 border-emerald-500 text-black shadow-md shadow-emerald-500/20' :
        active ? 'bg-slate-900 border-emerald-400 text-emerald-400 ring-2 ring-emerald-500/20' :
                 'bg-slate-900 border-slate-700 text-slate-500'}`}>
      {done ? <Check className="w-4 h-4 stroke-[3]" /> : n}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-400 font-medium animate-fadeIn">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{msg}</span>
    </p>
  );
}

/* ─── Service Card Component ─────────────────────────────────────── */
function ServiceCard({
  item,
  selected,
  onToggle,
  subtitle,
  price,
  icon,
}: {
  item: CatalogItem;
  selected: boolean;
  onToggle: () => void;
  subtitle: React.ReactNode;
  price: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      onClick={onToggle}
      className={`relative p-4 rounded-2xl border text-xs cursor-pointer transition-all duration-200 select-none group
        ${selected
          ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {icon && <div className="mt-0.5 shrink-0 text-slate-400 group-hover:text-slate-200">{icon}</div>}
          <div className="min-w-0">
            <p className="font-bold text-slate-100 truncate text-sm">
              {item.name || item.vehicle_type || item.provider_name}
            </p>
            <div className="text-slate-400 text-xs mt-1 leading-relaxed">{subtitle}</div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all
              ${selected
                ? 'bg-emerald-500 border-emerald-500 text-black'
                : 'border-slate-700 group-hover:border-slate-500'}`}
          >
            {selected && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <span className="font-extrabold text-emerald-400 text-xs mt-1">{price}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Quantity Stepper ───────────────────────────────────────────── */
function Stepper({
  label, value, min, max, onChange, unit, icon,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-slate-300">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400
                     hover:border-emerald-500 hover:text-emerald-400 transition-all font-bold text-base active:scale-95"
        >
          −
        </button>
        <span className="w-16 text-center font-black text-emerald-400 text-sm">
          {value} <span className="text-slate-500 font-medium text-xs">{unit}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400
                     hover:border-emerald-500 hover:text-emerald-400 transition-all font-bold text-base active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Create Tour Page
═══════════════════════════════════════════════════════════════════ */
export default function CreateTourPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const today = useMemo(() => getTodayString(), []);

  /* ── Step 1 Form Fields ── */
  const [destination, setDestination] = useState('');
  const [tourTitle, setTourTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetTier, setBudgetTier] = useState('STANDARD');
  const [travelers, setTravelers] = useState(1);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  /* ── Catalogs ── */
  const [flights, setFlights] = useState<CatalogItem[]>([]);
  const [hotels, setHotels] = useState<CatalogItem[]>([]);
  const [restaurants, setRestaurants] = useState<CatalogItem[]>([]);
  const [rides, setRides] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  /* ── AI Tour Planner State ── */
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [aiError, setAiError] = useState('');
  const [selectedDayTab, setSelectedDayTab] = useState(1);
  const [aiActiveSection, setAiActiveSection] = useState<'itinerary' | 'highlights' | 'budget' | 'weather'>('itinerary');
  const [aiStepNotice, setAiStepNotice] = useState('Analyzing destination landmarks and activities...');

  /* ── Selections ── */
  const [selectedFlight, setSelectedFlight] = useState<CatalogItem | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<CatalogItem | null>(null);
  const [selectedRest, setSelectedRest] = useState<CatalogItem | null>(null);
  const [selectedRide, setSelectedRide] = useState<CatalogItem | null>(null);
  const [hotelNights, setHotelNights] = useState(3);
  const [restMeals, setRestMeals] = useState(4);
  const [rideKm, setRideKm] = useState(25);

  /* ── Submission ── */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  /* ── Service Section Collapsibles ── */
  const [showFlights, setShowFlights] = useState(true);
  const [showRides, setShowRides] = useState(true);
  const [showHotels, setShowHotels] = useState(true);
  const [showRests, setShowRests] = useState(true);

  /* ── Fetch Catalogs on Mount ── */
  useEffect(() => {
    (async () => {
      try {
        const [fR, hR, rR, riR] = await Promise.all([
          api.get('tours/flights/'),
          api.get('tours/hotels/'),
          api.get('tours/restaurants/'),
          api.get('tours/rides/'),
        ]);
        setFlights(fR.data || []);
        setHotels(hR.data || []);
        setRestaurants(rR.data || []);
        setRides(riR.data || []);
      } catch (err) {
        console.error('Failed to load tour catalog items', err);
      } finally {
        setCatalogLoading(false);
      }
    })();
  }, []);

  /* ── Auto-generate Tour Title when Destination changes ── */
  useEffect(() => {
    if (destination.trim() && (!tourTitle || tourTitle.startsWith('My Trip to '))) {
      setTourTitle(`My Trip to ${destination.trim()}`);
    }
  }, [destination]);

  /* ── Trip Duration calculation ── */
  const duration = useMemo(() => calculateDuration(startDate, endDate), [startDate, endDate]);

  /* ── Auto-sync hotel nights when dates are selected ── */
  useEffect(() => {
    if (duration.nights > 0) {
      setHotelNights(duration.nights);
    }
  }, [duration.nights]);

  /* ── Destination Filter matching helper ── */
  const matchesLocation = (loc = '') => {
    if (!destination.trim()) return true;
    const dest = destination.toLowerCase().trim();
    const target = loc.toLowerCase().trim();
    return target.includes(dest) || dest.includes(target);
  };

  const filteredFlights = flights.filter(f => matchesLocation(f.destination_city) || matchesLocation(f.departure_city));
  const filteredHotels = hotels.filter(h => matchesLocation(h.location));
  const filteredRides = rides.filter(r => matchesLocation(r.location));
  const filteredRests = restaurants.filter(r => matchesLocation(r.location));

  /* ── Live Pricing Calculation ── */
  const pricing = useMemo(() => {
    let base = 0;
    if (selectedFlight) base += parseFloat(selectedFlight.price || '0');
    if (selectedHotel) base += parseFloat(selectedHotel.price_per_night || '0') * hotelNights;
    if (selectedRest) base += parseFloat(selectedRest.price_per_meal || '0') * restMeals;
    if (selectedRide) base += parseFloat(selectedRide.price_per_km || '0') * rideKm;

    const tierRates: Record<string, number> = { BUDGET: 0.18, STANDARD: 0.25, LUXURY: 0.32 };
    const rate = tierRates[budgetTier] ?? 0.25;
    const markupPerPerson = base * rate;
    const perPersonTotal = base + markupPerPerson;
    const finalTotal = perPersonTotal * travelers;

    return {
      baseTotal: (base * travelers).toFixed(2),
      markupTotal: (markupPerPerson * travelers).toFixed(2),
      final: finalTotal.toFixed(2),
      perPerson: perPersonTotal.toFixed(2),
    };
  }, [selectedFlight, selectedHotel, selectedRest, selectedRide, hotelNights, restMeals, rideKm, budgetTier, travelers]);

  /* ── Date Change Handlers with Strict Synchronization ── */
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setErrors(prev => ({ ...prev, startDate: '', endDate: '' }));

    // If endDate exists and is before the new startDate, update or clear it
    if (endDate && val && endDate < val) {
      setEndDate(val); // default end date to same day
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setErrors(prev => ({ ...prev, endDate: '' }));
  };

  /* ── Validation for Step 1 ── */
  const validateStep1 = (): boolean => {
    const errs: ValidationErrors = {};

    if (!destination.trim()) {
      errs.destination = 'Please enter or select a destination.';
    } else if (destination.trim().length < 2) {
      errs.destination = 'Destination name must be at least 2 characters.';
    }

    if (!tourTitle.trim()) {
      errs.tourTitle = 'Please give your tour itinerary a title.';
    } else if (tourTitle.length > 150) {
      errs.tourTitle = 'Title cannot exceed 150 characters.';
    }

    if (!startDate) {
      errs.startDate = 'Start date is required.';
    } else if (startDate < today) {
      errs.startDate = 'Start date cannot be in the past. Please choose today or a future date.';
    }

    if (!endDate) {
      errs.endDate = 'End date is required.';
    } else if (startDate && endDate < startDate) {
      errs.endDate = 'End date cannot be earlier than start date.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Validation for Step 3 ── */
  const validateStep3 = (): boolean => {
    const hasService = !!(selectedFlight || selectedHotel || selectedRest || selectedRide);
    if (!hasService) {
      setErrors(prev => ({
        ...prev,
        services: 'Please select at least one service (Flight, Hotel, Transport, or Dining) to proceed.',
      }));
      return false;
    }
    setErrors(prev => ({ ...prev, services: undefined }));
    return true;
  };

  /* ── AI Itinerary Generator ── */
  const generateAITourPlan = async (targetDest?: string) => {
    const dest = (targetDest || destination).trim();
    if (!dest) return;

    setAiGenerating(true);
    setAiError('');

    const notices = [
      `Analyzing top cultural landmarks in ${dest}...`,
      `Curating morning, afternoon & evening activities for ${duration.days || 3} days...`,
      `Calculating smart budget breakdown for ${budgetTier.toLowerCase()} tier...`,
      `Forecasting weather & matching verified services in ${dest}...`
    ];
    let idx = 0;
    setAiStepNotice(notices[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % notices.length;
      setAiStepNotice(notices[idx]);
    }, 1100);

    try {
      const res = await api.post('tours/generate-itinerary/', {
        destination: dest,
        start_date: startDate || today,
        end_date: endDate || today,
        budget_tier: budgetTier,
        travelers: travelers,
        notes: notes.trim(),
      });

      clearInterval(timer);
      const plan = res.data;
      setAiPlan(plan);
      if (plan.trip_title) {
        setTourTitle(plan.trip_title);
      }

      // Refresh catalog inventories to reflect any auto-provisioned services for the destination
      try {
        const [fR, hR, rR, riR] = await Promise.all([
          api.get('tours/flights/'),
          api.get('tours/hotels/'),
          api.get('tours/restaurants/'),
          api.get('tours/rides/'),
        ]);
        setFlights(fR.data || []);
        setHotels(hR.data || []);
        setRestaurants(rR.data || []);
        setRides(riR.data || []);
      } catch (e) {
        // quiet fallback
      }

    } catch (err: any) {
      clearInterval(timer);
      console.error('Failed to generate AI itinerary', err);
      setAiError(err.response?.data?.error || 'Unable to generate AI itinerary. Please try again.');
    } finally {
      clearInterval(timer);
      setAiGenerating(false);
    }
  };

  /* ── Step Navigation Handlers ── */
  const handleNextToStep2 = () => {
    if (validateStep1()) {
      setStep(2);
      if (!aiPlan || aiPlan.destination?.toLowerCase() !== destination.toLowerCase().trim()) {
        generateAITourPlan(destination);
      }
    }
  };

  const handleNextToStep3 = () => {
    setStep(3);
  };

  const handleNextToStep4 = () => {
    if (validateStep3()) setStep(4);
  };

  /* ── Quick Apply AI Plan ── */
  const handleApplyAiPlan = () => {
    if (!aiPlan) return;

    const rec = aiPlan.recommended_services || {};
    if (rec.flight) {
      const found = flights.find(f => f.id === rec.flight.id) || rec.flight;
      setSelectedFlight(found);
    }
    if (rec.hotel) {
      const found = hotels.find(h => h.id === rec.hotel.id) || rec.hotel;
      setSelectedHotel(found);
    }
    if (rec.restaurant) {
      const found = restaurants.find(r => r.id === rec.restaurant.id) || rec.restaurant;
      setSelectedRest(found);
    }
    if (rec.ride) {
      const found = rides.find(r => r.id === rec.ride.id) || rec.ride;
      setSelectedRide(found);
    }

    if (aiPlan.nights_count) {
      setHotelNights(Math.max(1, aiPlan.nights_count));
    }
    setRestMeals(Math.max(2, (aiPlan.days_count || 3) * 2));
    setRideKm(35);

    // Advance directly to Step 4 Review & Submit
    setStep(4);
  };

  /* ── Final Submit Tour ── */
  const handleSubmitTour = async () => {
    setSubmitting(true);
    setSubmitError('');

    const items = [];
    if (selectedFlight) items.push({ service_type: 'FLIGHT', flight: selectedFlight.id, quantity: 1 });
    if (selectedHotel) items.push({ service_type: 'HOTEL', hotel: selectedHotel.id, quantity: hotelNights });
    if (selectedRest) items.push({ service_type: 'RESTAURANT', restaurant: selectedRest.id, quantity: restMeals });
    if (selectedRide) items.push({ service_type: 'RIDE', ride: selectedRide.id, quantity: rideKm });

    try {
      const createRes = await api.post('tours/tours/', {
        title: tourTitle.trim(),
        start_date: startDate,
        end_date: endDate,
        budget_tier: budgetTier,
        ai_itinerary: aiPlan || null,
        items,
      });

      const tourId = createRes.data.id;
      await api.post(`tours/tours/${tourId}/submit/`);
      router.push('/traveler');
    } catch (err: any) {
      const detail = err.response?.data?.error ||
        err.response?.data?.start_date?.[0] ||
        err.response?.data?.end_date?.[0] ||
        err.response?.data?.detail ||
        'Failed to create and submit tour plan. Please review your inputs.';
      setSubmitError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTier = BUDGET_TIERS.find(t => t.value === budgetTier) || BUDGET_TIERS[1];

  return (
    <ProtectedRoute allowedRoles={['TRAVELER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100">

        {/* ── Top Navigation Bar ── */}
        <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-10 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <button
              onClick={() => router.push('/traveler')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>

            <h1 className="text-lg font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Smart Tour Planner
            </h1>

            {/* Stepper (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              {[
                { n: 1, label: 'Destination & Dates' },
                { n: 2, label: 'AI Itinerary Planner' },
                { n: 3, label: 'Services' },
                { n: 4, label: 'Review & Submit' },
              ].map((s, i) => (
                <React.Fragment key={s.n}>
                  <div className="flex items-center gap-2">
                    <StepBadge n={s.n} active={step === s.n} done={step > s.n} />
                    <span className={`text-xs font-semibold hidden lg:inline transition-colors
                      ${step === s.n ? 'text-emerald-400' : step > s.n ? 'text-slate-300' : 'text-slate-600'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className={`w-6 h-px transition-colors ${step > s.n ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Mobile Step Text */}
            <span className="md:hidden text-xs font-bold text-emerald-400">Step {step} of 4</span>
          </div>
        </header>

        {/* ── Main Container ── */}
        <main className="max-w-6xl mx-auto px-4 md:px-10 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* ── Form Steps Column ── */}
            <div className="lg:col-span-2 space-y-6">

              {submitError && (
                <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <p className="font-bold">Submission Error</p>
                    <p className="text-rose-300/80 text-xs mt-0.5">{submitError}</p>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════
                  STEP 1: Destination & Dates
              ══════════════════════════════════════════ */}
              {step === 1 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-7 shadow-xl">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                      Plan Your Tour Itinerary
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                      Pick your destination and schedule. Dates cannot be in the past and the end date must follow the start date.
                    </p>
                  </div>

                  {/* Destination Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                      Destination City / Place <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        value={destination}
                        onChange={e => {
                          setDestination(e.target.value);
                          setErrors(prev => ({ ...prev, destination: '' }));
                        }}
                        placeholder="e.g. Cox's Bazar, Sylhet, London, Dubai..."
                        className={`w-full bg-slate-950/80 border rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100
                          placeholder-slate-600 outline-none transition-all
                          ${errors.destination
                            ? 'border-rose-500/70 focus:ring-1 focus:ring-rose-500/30'
                            : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                          }`}
                      />
                    </div>
                    <FieldError msg={errors.destination} />

                    {/* Quick Pick Destinations */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-slate-500 font-medium mr-1">Quick Picks:</span>
                      {POPULAR_DESTINATIONS.map(city => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setDestination(city);
                            setErrors(prev => ({ ...prev, destination: '' }));
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all
                            ${destination.toLowerCase() === city.toLowerCase()
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                              : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                            }`}
                        >
                          📍 {city}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tour Title Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                      Tour Title <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        value={tourTitle}
                        onChange={e => {
                          setTourTitle(e.target.value);
                          setErrors(prev => ({ ...prev, tourTitle: '' }));
                        }}
                        placeholder="e.g. Summer Vacation in Cox's Bazar"
                        maxLength={150}
                        className={`w-full bg-slate-950/80 border rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100
                          placeholder-slate-600 outline-none transition-all
                          ${errors.tourTitle
                            ? 'border-rose-500/70 focus:ring-1 focus:ring-rose-500/30'
                            : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                          }`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <FieldError msg={errors.tourTitle} />
                      <span className="text-2xs text-slate-600 ml-auto">{tourTitle.length}/150</span>
                    </div>
                  </div>

                  {/* Date Pickers (STRICT CALENDAR CONSTRAINTS) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                        Start Date <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="date"
                        min={today} // Prevents selecting any previous/past date
                        value={startDate}
                        onChange={e => handleStartDateChange(e.target.value)}
                        className={`w-full bg-slate-950/80 border rounded-xl px-4 py-3 text-sm text-slate-100
                          outline-none transition-all [color-scheme:dark]
                          ${errors.startDate
                            ? 'border-rose-500/70 focus:ring-1 focus:ring-rose-500/30'
                            : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                          }`}
                      />
                      <FieldError msg={errors.startDate} />
                      {startDate && !errors.startDate && (
                        <p className="text-xs text-slate-400">{formatDate(startDate)}</p>
                      )}
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                        End Date <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="date"
                        min={startDate || today} // End date cannot be less than start date
                        value={endDate}
                        onChange={e => handleEndDateChange(e.target.value)}
                        className={`w-full bg-slate-950/80 border rounded-xl px-4 py-3 text-sm text-slate-100
                          outline-none transition-all [color-scheme:dark]
                          ${errors.endDate
                            ? 'border-rose-500/70 focus:ring-1 focus:ring-rose-500/30'
                            : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                          }`}
                      />
                      <FieldError msg={errors.endDate} />
                      {endDate && !errors.endDate && (
                        <p className="text-xs text-slate-400">{formatDate(endDate)}</p>
                      )}
                    </div>
                  </div>

                  {/* Duration Notification Pill */}
                  {startDate && endDate && duration.days > 0 && !errors.startDate && !errors.endDate && (
                    <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-300">
                      <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold">
                        Trip Duration: <strong className="text-emerald-200">{duration.text}</strong> ({formatDate(startDate)} → {formatDate(endDate)})
                      </span>
                    </div>
                  )}

                  {/* Budget Tier Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                      Budget Tier (Pricing Strategy)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {BUDGET_TIERS.map(t => {
                        const isSelected = budgetTier === t.value;
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setBudgetTier(t.value)}
                            className={`relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-200 text-left
                              ${isSelected
                                ? `${t.activeBorder} ${t.activeBg} shadow-lg shadow-emerald-500/10`
                                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                              }`}
                          >
                            {isSelected && (
                              <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                              </span>
                            )}
                            <span className={`text-xl font-black ${isSelected ? t.textColor : 'text-slate-400'}`}>
                              +{t.markup}%
                            </span>
                            <span className="text-xs font-bold text-slate-200">{t.label} Tier</span>
                            <span className="text-2xs text-slate-500 text-center leading-tight">{t.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Travelers Counter */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      Number of Travelers
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TRAVELERS_OPTIONS.map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTravelers(num)}
                          className={`w-10 h-10 rounded-xl text-xs font-black border transition-all
                            ${travelers === num
                              ? 'bg-emerald-500 border-emerald-500 text-black shadow-md shadow-emerald-500/20'
                              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Special Notes */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                      Special Requirements / Notes <span className="text-slate-600 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Vegetarian meals preferred, airport pickup required, wheelchair accessibility..."
                      rows={2}
                      maxLength={500}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100
                        placeholder-slate-600 outline-none transition-all resize-none
                        focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleNextToStep2}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500
                        hover:from-emerald-400 hover:to-teal-400 text-black font-black py-3.5 px-8 rounded-xl
                        transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate AI Itinerary</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════
                  STEP 2: True AI Itinerary & Tour Planner
              ══════════════════════════════════════════ */}
              {step === 2 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                  {/* Step Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        AI Itinerary & Tour Planner {destination && <span className="text-emerald-400">for {destination}</span>}
                      </h2>
                      <p className="text-slate-400 text-xs mt-1">
                        Generative AI customized day-by-day itinerary, authentic attractions, weather insights, and curated services.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextToStep3}
                      className="text-xs font-bold text-slate-400 hover:text-emerald-400 underline underline-offset-4 self-start sm:self-center transition-colors"
                    >
                      Skip & Pick Custom Services →
                    </button>
                  </div>

                  {/* 1. Loading State */}
                  {aiGenerating && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center animate-pulse">
                          <Sparkles className="w-8 h-8 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
                        </div>
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-extrabold text-slate-100">
                          Synthesizing Tailored AI Plan for <span className="text-emerald-400">{destination}</span>
                        </p>
                        <p className="text-xs text-slate-400 max-w-md animate-fadeIn">
                          {aiStepNotice}
                        </p>
                      </div>
                      <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* 2. Error State */}
                  {aiError && !aiGenerating && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-rose-300">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>AI Plan Generation Notice</span>
                      </div>
                      <p className="text-xs text-rose-200/80 leading-relaxed">{aiError}</p>
                      <div className="flex flex-wrap gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => generateAITourPlan(destination)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 px-5 rounded-xl text-xs transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry AI Generation</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextToStep3}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2 px-5 rounded-xl text-xs border border-slate-700 transition-all"
                        >
                          Continue with Custom Services
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. Generated Plan Showcase */}
                  {aiPlan && !aiGenerating && (
                    <div className="space-y-6">

                      {/* Hero Header Card */}
                      <div className="bg-gradient-to-br from-emerald-500/10 via-slate-950/80 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-lg">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-2xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {aiPlan.match_score}% AI Match
                              </span>
                              <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                                📍 {aiPlan.destination}
                              </span>
                              <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-slate-900 text-emerald-400 border border-slate-800 uppercase">
                                {aiPlan.budget_tier} Tier
                              </span>
                              <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                                🗓️ {aiPlan.days_count} Days / {aiPlan.nights_count} Nights
                              </span>
                            </div>
                            <h3 className="text-lg md:text-xl font-black text-white leading-tight">
                              {aiPlan.trip_title}
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                              {aiPlan.summary}
                            </p>
                          </div>

                          {/* Quick Apply CTA */}
                          <div className="shrink-0 flex flex-col items-stretch md:items-end gap-2 pt-2 md:pt-0">
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 text-right">
                              <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Estimated Budget</p>
                              <p className="text-base font-black text-emerald-400">
                                ${aiPlan.budget_breakdown?.estimated_total_usd?.toFixed?.(2) || aiPlan.budget_breakdown?.estimated_total_usd}
                              </p>
                              <p className="text-2xs text-slate-500">
                                (${aiPlan.budget_breakdown?.per_person_usd?.toFixed?.(2) || aiPlan.budget_breakdown?.per_person_usd} / person)
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleApplyAiPlan}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold py-2.5 px-5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Apply AI Plan & Review</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Section Navigation Tabs */}
                      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
                        {[
                          { id: 'itinerary', label: 'Day-by-Day Schedule', icon: <CalendarDays className="w-3.5 h-3.5" /> },
                          { id: 'highlights', label: 'Landmarks & Food Guide', icon: <Landmark className="w-3.5 h-3.5" /> },
                          { id: 'weather', label: 'Weather & Packing', icon: <CloudSun className="w-3.5 h-3.5" /> },
                          { id: 'budget', label: 'Smart Budget Breakdown', icon: <DollarSign className="w-3.5 h-3.5" /> },
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setAiActiveSection(tab.id as any)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all
                              ${aiActiveSection === tab.id
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                              }`}
                          >
                            {tab.icon}
                            <span>{tab.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* ── Tab 1: Day by Day Itinerary ── */}
                      {aiActiveSection === 'itinerary' && (
                        <div className="space-y-4">
                          {/* Day Tabs */}
                          <div className="flex flex-wrap gap-2">
                            {(aiPlan.daily_itinerary || []).map((dayItem: any) => (
                              <button
                                key={dayItem.day_number}
                                type="button"
                                onClick={() => setSelectedDayTab(dayItem.day_number)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5
                                  ${selectedDayTab === dayItem.day_number
                                    ? 'bg-emerald-500 border-emerald-500 text-black shadow-md shadow-emerald-500/20'
                                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                  }`}
                              >
                                <span>Day {dayItem.day_number}</span>
                                <span className="opacity-75 text-2xs">({formatDate(dayItem.date)})</span>
                              </button>
                            ))}
                          </div>

                          {/* Selected Day Content */}
                          {(() => {
                            const day = (aiPlan.daily_itinerary || [])[selectedDayTab - 1] || (aiPlan.daily_itinerary || [])[0];
                            if (!day) return null;

                            return (
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-850">
                                  <div>
                                    <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-400">
                                      Day {day.day_number} Focus
                                    </span>
                                    <h4 className="text-sm md:text-base font-extrabold text-white">
                                      {day.theme}
                                    </h4>
                                  </div>
                                  <span className="text-xs font-semibold text-slate-400">{formatDate(day.date)}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Morning */}
                                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5 flex flex-col justify-between">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-2xs font-extrabold text-amber-400">
                                        <span className="flex items-center gap-1.5">
                                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                                          MORNING
                                        </span>
                                        <span className="text-slate-400 font-semibold">{day.morning?.time}</span>
                                      </div>
                                      <h5 className="font-extrabold text-slate-100 text-xs">{day.morning?.title}</h5>
                                      <p className="text-2xs text-slate-400 leading-relaxed">{day.morning?.description}</p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-850/80 flex items-center justify-between text-2xs">
                                      <span className="text-slate-500 truncate">📍 {day.morning?.location}</span>
                                      {day.morning?.cost_estimate_usd > 0 && (
                                        <span className="font-bold text-emerald-400 shrink-0">~${day.morning.cost_estimate_usd}</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Afternoon */}
                                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5 flex flex-col justify-between">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-2xs font-extrabold text-sky-400">
                                        <span className="flex items-center gap-1.5">
                                          <Compass className="w-3.5 h-3.5 text-sky-400" />
                                          AFTERNOON
                                        </span>
                                        <span className="text-slate-400 font-semibold">{day.afternoon?.time}</span>
                                      </div>
                                      <h5 className="font-extrabold text-slate-100 text-xs">{day.afternoon?.title}</h5>
                                      <p className="text-2xs text-slate-400 leading-relaxed">{day.afternoon?.description}</p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-850/80 flex items-center justify-between text-2xs">
                                      <span className="text-slate-500 truncate">📍 {day.afternoon?.location}</span>
                                      {day.afternoon?.cost_estimate_usd > 0 && (
                                        <span className="font-bold text-emerald-400 shrink-0">~${day.afternoon.cost_estimate_usd}</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Evening */}
                                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5 flex flex-col justify-between">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-2xs font-extrabold text-violet-400">
                                        <span className="flex items-center gap-1.5">
                                          <Moon className="w-3.5 h-3.5 text-violet-400" />
                                          EVENING
                                        </span>
                                        <span className="text-slate-400 font-semibold">{day.evening?.time}</span>
                                      </div>
                                      <h5 className="font-extrabold text-slate-100 text-xs">{day.evening?.title}</h5>
                                      <p className="text-2xs text-slate-400 leading-relaxed">{day.evening?.description}</p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-850/80 flex items-center justify-between text-2xs">
                                      <span className="text-slate-500 truncate">📍 {day.evening?.location}</span>
                                      {day.evening?.cost_estimate_usd > 0 && (
                                        <span className="font-bold text-emerald-400 shrink-0">~${day.evening.cost_estimate_usd}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* ── Tab 2: Landmarks & Food Guide ── */}
                      {aiActiveSection === 'highlights' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Iconic Landmarks */}
                          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                              <Landmark className="w-4 h-4 text-emerald-400" />
                              Must-Visit Iconic Landmarks
                            </h4>
                            <div className="space-y-2">
                              {(aiPlan.highlights?.landmarks || []).map((lm: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-200 bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{lm}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Authentic Food Guide */}
                          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                              <Utensils className="w-4 h-4 text-amber-400" />
                              Signature Regional Delicacies
                            </h4>
                            <div className="space-y-2">
                              {(aiPlan.highlights?.food || []).map((fd: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-200 bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                                  <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <span>{fd}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Hidden Gems */}
                          {aiPlan.highlights?.hidden_gems?.length > 0 && (
                            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                              <h4 className="text-xs font-extrabold uppercase tracking-widest text-sky-400 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-sky-400" />
                                Hidden Gems & Insider Secrets
                              </h4>
                              <div className="space-y-2">
                                {(aiPlan.highlights.hidden_gems || []).map((gem: string, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-xs text-slate-200 bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                                    <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                                    <span>{gem}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Transit & Navigation */}
                          {aiPlan.highlights?.transit_tips?.length > 0 && (
                            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                              <h4 className="text-xs font-extrabold uppercase tracking-widest text-teal-400 flex items-center gap-2">
                                <Compass className="w-4 h-4 text-teal-400" />
                                Local Transit & Navigation
                              </h4>
                              <div className="space-y-2">
                                {(aiPlan.highlights.transit_tips || []).map((tip: string, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-xs text-slate-200 bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                                    <Car className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                                    <span>{tip}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Tab 3: Weather & Packing ── */}
                      {aiActiveSection === 'weather' && (
                        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                          <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                            <CloudSun className="w-4 h-4 text-emerald-400" />
                            Climate & Packing Forecast for {aiPlan.destination}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-1">
                              <span className="text-2xs font-bold text-slate-400 uppercase">Expected Temperature</span>
                              <p className="text-base font-extrabold text-emerald-400">{aiPlan.weather?.temp || '28°C'}</p>
                              <p className="text-slate-300">{aiPlan.weather?.condition}</p>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-1">
                              <span className="text-2xs font-bold text-slate-400 uppercase">Recommended Attire</span>
                              <p className="text-slate-200 leading-relaxed">{aiPlan.weather?.best_attire}</p>
                            </div>
                            {aiPlan.weather?.seasonal_tip && (
                              <div className="sm:col-span-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 space-y-1">
                                <span className="text-2xs font-extrabold uppercase tracking-wider">Seasonal Travel Tip</span>
                                <p className="leading-relaxed">{aiPlan.weather.seasonal_tip}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Tab 4: Smart Budget Breakdown ── */}
                      {aiActiveSection === 'budget' && (
                        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                          <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            AI Smart Budget Breakdown
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl space-y-1">
                              <span className="text-2xs text-slate-400 font-bold uppercase">Accommodation</span>
                              <p className="font-extrabold text-slate-100 text-sm">
                                ${aiPlan.budget_breakdown?.accommodation?.toFixed?.(2) || aiPlan.budget_breakdown?.accommodation}
                              </p>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl space-y-1">
                              <span className="text-2xs text-slate-400 font-bold uppercase">Food & Dining</span>
                              <p className="font-extrabold text-slate-100 text-sm">
                                ${aiPlan.budget_breakdown?.food_and_dining?.toFixed?.(2) || aiPlan.budget_breakdown?.food_and_dining}
                              </p>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl space-y-1">
                              <span className="text-2xs text-slate-400 font-bold uppercase">Sightseeing & Entry</span>
                              <p className="font-extrabold text-slate-100 text-sm">
                                ${aiPlan.budget_breakdown?.activities_and_entry?.toFixed?.(2) || aiPlan.budget_breakdown?.activities_and_entry}
                              </p>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl space-y-1">
                              <span className="text-2xs text-slate-400 font-bold uppercase">Local Transit</span>
                              <p className="font-extrabold text-slate-100 text-sm">
                                ${aiPlan.budget_breakdown?.local_transport?.toFixed?.(2) || aiPlan.budget_breakdown?.local_transport}
                              </p>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl space-y-1">
                              <span className="text-2xs text-slate-400 font-bold uppercase">Flights Estimate</span>
                              <p className="font-extrabold text-slate-100 text-sm">
                                ${aiPlan.budget_breakdown?.flight_estimate?.toFixed?.(2) || aiPlan.budget_breakdown?.flight_estimate}
                              </p>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl space-y-1">
                              <span className="text-2xs text-slate-400 font-bold uppercase">Contingency Buffer</span>
                              <p className="font-extrabold text-emerald-400 text-sm">
                                +${aiPlan.budget_breakdown?.buffer_contingency?.toFixed?.(2) || aiPlan.budget_breakdown?.buffer_contingency}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Matched Services Preview Pill */}
                      {aiPlan.recommended_services && (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-emerald-400" />
                              Pre-Matched Verified Services in {aiPlan.destination}
                            </span>
                            <span className="text-2xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              Auto-Linked to Booking
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {aiPlan.recommended_services.flight && (
                              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate">
                                  <Plane className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate font-semibold text-slate-200">{aiPlan.recommended_services.flight.name}</span>
                                </div>
                                <span className="font-bold text-emerald-400 shrink-0 ml-2">${aiPlan.recommended_services.flight.price}</span>
                              </div>
                            )}
                            {aiPlan.recommended_services.hotel && (
                              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate">
                                  <Hotel className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate font-semibold text-slate-200">{aiPlan.recommended_services.hotel.name}</span>
                                </div>
                                <span className="font-bold text-emerald-400 shrink-0 ml-2">${aiPlan.recommended_services.hotel.price_per_night}/n</span>
                              </div>
                            )}
                            {aiPlan.recommended_services.restaurant && (
                              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate">
                                  <Utensils className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate font-semibold text-slate-200">{aiPlan.recommended_services.restaurant.name}</span>
                                </div>
                                <span className="font-bold text-emerald-400 shrink-0 ml-2">${aiPlan.recommended_services.restaurant.price_per_meal}/m</span>
                              </div>
                            )}
                            {aiPlan.recommended_services.ride && (
                              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate">
                                  <Car className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate font-semibold text-slate-200">{aiPlan.recommended_services.ride.provider_name}</span>
                                </div>
                                <span className="font-bold text-emerald-400 shrink-0 ml-2">${aiPlan.recommended_services.ride.price_per_km}/km</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-slate-400 hover:text-white text-xs font-semibold transition-colors self-start sm:self-center"
                    >
                      ← Edit Destination & Dates
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => generateAITourPlan(destination)}
                        disabled={aiGenerating}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3 px-5 rounded-xl text-xs border border-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
                        <span>Regenerate Plan</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApplyAiPlan}
                        disabled={aiGenerating || !aiPlan}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold py-3 px-7 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Apply AI Plan & Review</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════
                  STEP 3: Select Services
              ══════════════════════════════════════════ */}
              {step === 3 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                  <div>
                    <h2 className="text-xl font-black flex items-center gap-2">
                      <Compass className="w-5 h-5 text-emerald-400" />
                      Select Services {destination && `in ${destination}`}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                      Choose at least one service. You can toggle flights, hotels, dining, and local rides.
                    </p>
                  </div>

                  {errors.services && (
                    <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{errors.services}</span>
                    </div>
                  )}

                  {catalogLoading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400 text-xs">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                      <span>Loading available services...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">

                      {/* 1. Flights */}
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowFlights(v => !v)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-300">
                            <Plane className="w-4 h-4 text-emerald-400" />
                            Flights {destination && `to/from ${destination}`}
                            {selectedFlight && (
                              <span className="text-emerald-400 text-2xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full lowercase">
                                1 selected
                              </span>
                            )}
                          </h3>
                          {showFlights ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </button>

                        {showFlights && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(filteredFlights.length > 0 ? filteredFlights : flights).map(f => (
                              <ServiceCard
                                key={f.id}
                                item={f}
                                selected={selectedFlight?.id === f.id}
                                onToggle={() => {
                                  setSelectedFlight(selectedFlight?.id === f.id ? null : f);
                                  setErrors(prev => ({ ...prev, services: '' }));
                                }}
                                subtitle={`Route: ${f.departure_city} → ${f.destination_city}`}
                                price={`$${f.price}`}
                                icon={<Plane className="w-4 h-4 text-emerald-400" />}
                              />
                            ))}
                            {(filteredFlights.length === 0 && flights.length === 0) && (
                              <p className="text-xs text-slate-500 italic sm:col-span-2">No flights currently available.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. Transport & Rides */}
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowRides(v => !v)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-300">
                            <Car className="w-4 h-4 text-emerald-400" />
                            Transport, Trains, Ferry & Rides
                            {selectedRide && (
                              <span className="text-emerald-400 text-2xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full lowercase">
                                1 selected
                              </span>
                            )}
                          </h3>
                          {showRides ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </button>

                        {showRides && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(filteredRides.length > 0 ? filteredRides : rides).map(r => (
                                <ServiceCard
                                  key={r.id}
                                  item={r}
                                  selected={selectedRide?.id === r.id}
                                  onToggle={() => {
                                    setSelectedRide(selectedRide?.id === r.id ? null : r);
                                    setErrors(prev => ({ ...prev, services: '' }));
                                  }}
                                  subtitle={`${r.provider_name} · ${r.location}`}
                                  price={`$${r.price_per_km}/km`}
                                  icon={getTransportIcon(r.vehicle_type)}
                                />
                              ))}
                            </div>
                            {selectedRide && (
                              <Stepper
                                label="Estimated Distance (KM)"
                                value={rideKm}
                                min={5}
                                max={2000}
                                onChange={setRideKm}
                                unit="km"
                                icon={<Car className="w-4 h-4 text-emerald-400" />}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* 3. Hotels & Accommodations */}
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowHotels(v => !v)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-300">
                            <Hotel className="w-4 h-4 text-emerald-400" />
                            Hotels & Accommodations
                            {selectedHotel && (
                              <span className="text-emerald-400 text-2xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full lowercase">
                                1 selected
                              </span>
                            )}
                          </h3>
                          {showHotels ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </button>

                        {showHotels && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(filteredHotels.length > 0 ? filteredHotels : hotels).map(h => (
                                <ServiceCard
                                  key={h.id}
                                  item={h}
                                  selected={selectedHotel?.id === h.id}
                                  onToggle={() => {
                                    setSelectedHotel(selectedHotel?.id === h.id ? null : h);
                                    setErrors(prev => ({ ...prev, services: '' }));
                                  }}
                                  subtitle={`${h.room_type} · ${h.location}`}
                                  price={`$${h.price_per_night}/night`}
                                  icon={<Hotel className="w-4 h-4 text-emerald-400" />}
                                />
                              ))}
                            </div>
                            {selectedHotel && (
                              <Stepper
                                label="Length of Hotel Stay"
                                value={hotelNights}
                                min={1}
                                max={180}
                                onChange={setHotelNights}
                                unit="nights"
                                icon={<Hotel className="w-4 h-4 text-emerald-400" />}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* 4. Restaurants & Dining */}
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowRests(v => !v)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-300">
                            <Utensils className="w-4 h-4 text-emerald-400" />
                            Restaurants & Dining
                            {selectedRest && (
                              <span className="text-emerald-400 text-2xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full lowercase">
                                1 selected
                              </span>
                            )}
                          </h3>
                          {showRests ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </button>

                        {showRests && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(filteredRests.length > 0 ? filteredRests : restaurants).map(r => (
                                <ServiceCard
                                  key={r.id}
                                  item={r}
                                  selected={selectedRest?.id === r.id}
                                  onToggle={() => {
                                    setSelectedRest(selectedRest?.id === r.id ? null : r);
                                    setErrors(prev => ({ ...prev, services: '' }));
                                  }}
                                  subtitle={`Cuisine: ${r.cuisine} · ${r.location}`}
                                  price={`$${r.price_per_meal}/meal`}
                                  icon={<Utensils className="w-4 h-4 text-emerald-400" />}
                                />
                              ))}
                            </div>
                            {selectedRest && (
                              <Stepper
                                label="Meals Included"
                                value={restMeals}
                                min={1}
                                max={100}
                                onChange={setRestMeals}
                                unit="meals"
                                icon={<Utensils className="w-4 h-4 text-emerald-400" />}
                              />
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNextToStep4}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500
                        hover:from-emerald-400 hover:to-teal-400 text-black font-black py-3 px-8 rounded-xl
                        transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-xs"
                    >
                      <span>Review Itinerary Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════
                  STEP 4: Review & Submit
              ══════════════════════════════════════════ */}
              {step === 4 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                  <div>
                    <h2 className="text-xl font-black text-white">Review Itinerary & Submit for Approval</h2>
                    <p className="text-slate-400 text-xs mt-1">
                      Check your dates, travelers count, selected services, and dynamic markup invoice before submitting.
                    </p>
                  </div>

                  {/* Tour Header Card */}
                  <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-black text-base md:text-lg text-white">{tourTitle}</h3>
                        <p className="text-emerald-400 text-xs font-bold flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" /> Destination: {destination}
                        </p>
                      </div>
                      <span className={`text-2xs font-bold px-3 py-1 rounded-full border ${selectedTier.activeBorder} ${selectedTier.activeBg} ${selectedTier.textColor}`}>
                        {selectedTier.label} (+{selectedTier.markup}%)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-800/80">
                      <div>
                        <p className="text-2xs text-slate-400 uppercase font-bold">Start Date</p>
                        <p className="font-bold text-slate-100">{formatDate(startDate)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xs text-slate-400 uppercase font-bold">Duration</p>
                        <p className="font-extrabold text-emerald-400">{duration.text}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xs text-slate-400 uppercase font-bold">End Date</p>
                        <p className="font-bold text-slate-100">{formatDate(endDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{travelers} traveler{travelers > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Selected Items Breakdown */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                    <p className="font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-850">
                      Attached Services
                    </p>

                    {selectedFlight && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-900">
                        <div className="flex items-center gap-2.5">
                          <Plane className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="font-bold text-slate-200">{selectedFlight.name}</p>
                            <p className="text-2xs text-slate-500">{selectedFlight.departure_city} → {selectedFlight.destination_city}</p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-200">${parseFloat(selectedFlight.price || '0').toFixed(2)}</span>
                      </div>
                    )}

                    {selectedRide && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-900">
                        <div className="flex items-center gap-2.5">
                          {getTransportIcon(selectedRide.vehicle_type)}
                          <div>
                            <p className="font-bold text-slate-200">{selectedRide.vehicle_type} ({rideKm} km)</p>
                            <p className="text-2xs text-slate-500">{selectedRide.provider_name} · ${selectedRide.price_per_km}/km</p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-200">${(parseFloat(selectedRide.price_per_km || '0') * rideKm).toFixed(2)}</span>
                      </div>
                    )}

                    {selectedHotel && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-900">
                        <div className="flex items-center gap-2.5">
                          <Hotel className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="font-bold text-slate-200">{selectedHotel.name} ({hotelNights} nights)</p>
                            <p className="text-2xs text-slate-500">{selectedHotel.room_type} · ${selectedHotel.price_per_night}/night</p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-200">${(parseFloat(selectedHotel.price_per_night || '0') * hotelNights).toFixed(2)}</span>
                      </div>
                    )}

                    {selectedRest && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-900">
                        <div className="flex items-center gap-2.5">
                          <Utensils className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="font-bold text-slate-200">{selectedRest.name} ({restMeals} meals)</p>
                            <p className="text-2xs text-slate-500">{selectedRest.cuisine} · ${selectedRest.price_per_meal}/meal</p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-200">${(parseFloat(selectedRest.price_per_meal || '0') * restMeals).toFixed(2)}</span>
                      </div>
                    )}

                    {/* Cost Calculation Rows */}
                    <div className="pt-2 space-y-1.5 border-t border-slate-800">
                      <div className="flex justify-between text-slate-400">
                        <span>Per Person Subtotal:</span>
                        <span className="font-semibold text-slate-200">${pricing.perPerson}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>All Travelers Subtotal (×{travelers}):</span>
                        <span className="font-semibold text-slate-200">${pricing.baseTotal}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Dynamic Markup (+{selectedTier.markup}%):</span>
                        <span className="text-slate-400">+${pricing.markupTotal}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-emerald-400 pt-2 border-t border-slate-800">
                        <span>Total Estimated Cost:</span>
                        <span className="text-base">${pricing.final}</span>
                      </div>
                    </div>
                  </div>

                  {notes && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs space-y-1">
                      <span className="font-bold text-slate-300">Special Notes:</span>
                      <p className="text-slate-400 leading-relaxed">{notes}</p>
                    </div>
                  )}

                  {/* Sequential Approval Notice */}
                  <div className="flex items-start gap-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 text-xs text-sky-300 leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                    <span>
                      Once submitted, this tour plan will automatically route through sequential verification by the Flight, Hotel, and Transport managers. You will be notified at every step!
                    </span>
                  </div>

                  {/* Submission Action Buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmitTour}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500
                        hover:from-emerald-400 hover:to-teal-400 text-black font-black py-3.5 px-8 rounded-xl
                        transition-all shadow-xl shadow-emerald-500/25 active:scale-95 text-xs disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting Tour...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Confirm & Submit for Approval</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* ── Sticky Live Invoice Sidebar ── */}
            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                  <span>Live Invoice Summary</span>
                  <span className="text-2xs font-bold text-emerald-400">{selectedTier.label}</span>
                </h3>

                {destination && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs text-emerald-300 font-semibold truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span className="truncate">{destination}</span>
                  </div>
                )}

                {startDate && endDate && duration.days > 0 && (
                  <div className="text-xs text-slate-400 space-y-1 bg-slate-950/60 rounded-xl p-3 border border-slate-850">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dates:</span>
                      <span className="text-slate-200 font-semibold">{formatDate(startDate)} → {formatDate(endDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="text-emerald-400 font-bold">{duration.text}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Travelers:</span>
                      <span className="text-slate-200 font-semibold">{travelers}</span>
                    </div>
                  </div>
                )}

                {/* Selected Service Breakdown */}
                <div className="space-y-2 text-xs">
                  {selectedFlight && (
                    <div className="flex justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 truncate">
                        <Plane className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">Flight</span>
                      </span>
                      <span className="font-semibold">${parseFloat(selectedFlight.price || '0').toFixed(2)}</span>
                    </div>
                  )}

                  {selectedRide && (
                    <div className="flex justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 truncate">
                        {getTransportIcon(selectedRide.vehicle_type)}
                        <span className="truncate">Ride ({rideKm}km)</span>
                      </span>
                      <span className="font-semibold">${(parseFloat(selectedRide.price_per_km || '0') * rideKm).toFixed(2)}</span>
                    </div>
                  )}

                  {selectedHotel && (
                    <div className="flex justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 truncate">
                        <Hotel className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">Hotel ({hotelNights}n)</span>
                      </span>
                      <span className="font-semibold">${(parseFloat(selectedHotel.price_per_night || '0') * hotelNights).toFixed(2)}</span>
                    </div>
                  )}

                  {selectedRest && (
                    <div className="flex justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 truncate">
                        <Utensils className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">Dining ({restMeals}m)</span>
                      </span>
                      <span className="font-semibold">${(parseFloat(selectedRest.price_per_meal || '0') * restMeals).toFixed(2)}</span>
                    </div>
                  )}

                  {!selectedFlight && !selectedHotel && !selectedRest && !selectedRide && (
                    <p className="text-slate-600 text-xs italic">No services selected yet.</p>
                  )}
                </div>

                {/* Totals */}
                <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Base (×{travelers}):</span>
                    <span className="text-slate-200 font-semibold">${pricing.baseTotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Markup (+{selectedTier.markup}%):</span>
                    <span className="text-slate-400">+${pricing.markupTotal}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-black text-sm pt-2 border-t border-slate-800">
                    <span>Final Total:</span>
                    <span className="text-base font-black">${pricing.final}</span>
                  </div>
                </div>

                {/* Service pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedFlight && (
                    <span className="text-2xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      ✈ Flight
                    </span>
                  )}
                  {selectedRide && (
                    <span className="text-2xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      🚗 Ride
                    </span>
                  )}
                  {selectedHotel && (
                    <span className="text-2xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      🏨 Hotel
                    </span>
                  )}
                  {selectedRest && (
                    <span className="text-2xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      🍽 Dining
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Guidance info */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-500 space-y-2">
                <p className="font-bold text-slate-300 text-xs">Dynamic Markup Ratios</p>
                <div className="space-y-1 text-2xs">
                  <div className="flex justify-between">
                    <span>Budget Tier</span>
                    <span className="font-bold text-sky-400">+18%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standard Tier</span>
                    <span className="font-bold text-emerald-400">+25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Luxury Tier</span>
                    <span className="font-bold text-amber-400">+32%</span>
                  </div>
                </div>
              </div>
            </aside>

          </div>
        </main>

      </div>
    </ProtectedRoute>
  );
}
