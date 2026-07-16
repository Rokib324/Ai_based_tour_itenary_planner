'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import { useRouter } from 'next/navigation';
import { Plane, Hotel, Utensils, Car, Sparkles, Plus, Trash2, ArrowLeft, ArrowRight, Save, Thermometer, ShieldAlert } from 'lucide-react';

interface CatalogItem {
  id: number;
  name?: string;
  vehicle_type?: string;
  departure_city?: string;
  destination_city?: string;
  location?: string;
  room_type?: string;
  price?: string;
  price_per_night?: string;
  price_per_meal?: string;
  price_per_km?: string;
}

export default function CreateTourPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Form State
  const [tourTitle, setTourTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetTier, setBudgetTier] = useState('STANDARD');
  
  // Catalog lists
  const [flights, setFlights] = useState<CatalogItem[]>([]);
  const [hotels, setHotels] = useState<CatalogItem[]>([]);
  const [restaurants, setRestaurants] = useState<CatalogItem[]>([]);
  const [rides, setRides] = useState<CatalogItem[]>([]);
  const [recommendedPackages, setRecommendedPackages] = useState<any[]>([]);
  
  // Selected items (Itinerary cart)
  const [selectedItems, setSelectedItems] = useState<{
    flight?: CatalogItem | null;
    hotel?: CatalogItem | null;
    hotelNights: number;
    restaurant?: CatalogItem | null;
    restaurantMeals: number;
    ride?: CatalogItem | null;
    rideKm: number;
  }>({
    flight: null,
    hotel: null,
    hotelNights: 1,
    restaurant: null,
    restaurantMeals: 3,
    ride: null,
    rideKm: 10,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Fetch Catalogs
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [flightRes, hotelRes, restRes, rideRes, recRes] = await Promise.all([
          api.get('tours/flights/'),
          api.get('tours/hotels/'),
          api.get('tours/restaurants/'),
          api.get('tours/rides/'),
          api.get('tours/packages/ai-recommend/'),
        ]);
        setFlights(flightRes.data);
        setHotels(hotelRes.data);
        setRestaurants(restRes.data);
        setRides(rideRes.data);
        setRecommendedPackages(recRes.data);
      } catch (err) {
        console.error('Failed to load services catalogs.', err);
      }
    };
    fetchCatalogs();
  }, []);

  // Calculate live pricing
  const calculateLivePrice = () => {
    let base = 0;
    
    if (selectedItems.flight) {
      base += parseFloat(selectedItems.flight.price || '0');
    }
    if (selectedItems.hotel) {
      base += parseFloat(selectedItems.hotel.price_per_night || '0') * selectedItems.hotelNights;
    }
    if (selectedItems.restaurant) {
      base += parseFloat(selectedItems.restaurant.price_per_meal || '0') * selectedItems.restaurantMeals;
    }
    if (selectedItems.ride) {
      base += parseFloat(selectedItems.ride.price_per_km || '0') * selectedItems.rideKm;
    }

    // Markups: Budget: 18%, Standard: 25%, Luxury: 32%
    let rate = 0.25;
    if (budgetTier === 'BUDGET') rate = 0.18;
    if (budgetTier === 'LUXURY') rate = 0.32;

    const markup = base * rate;
    const final = base + markup;

    return {
      base: base.toFixed(2),
      markup: markup.toFixed(2),
      final: final.toFixed(2),
    };
  };

  const pricing = calculateLivePrice();

  const handleApplyPackage = (pkg: any) => {
    setTourTitle(`Trip to ${pkg.destination} (${pkg.title})`);
    setBudgetTier(pkg.budget_tier);
    // Find services in matching city if applicable
    const city = pkg.destination;
    const hotelMatch = hotels.find(h => h.location === city) || null;
    const flightMatch = flights.find(f => f.destination_city === city) || null;
    const restMatch = restaurants.find(r => r.location === city) || null;
    const rideMatch = rides.find(r => r.location === city) || null;
    
    setSelectedItems({
      flight: flightMatch,
      hotel: hotelMatch,
      hotelNights: 4,
      restaurant: restMatch,
      restaurantMeals: 6,
      ride: rideMatch,
      rideKm: 30
    });
    setStep(3); // Go directly to custom configuration review
  };

  const handleCreateAndSubmit = async () => {
    setLoading(true);
    setError('');
    
    const items = [];
    if (selectedItems.flight) {
      items.push({ service_type: 'FLIGHT', flight: selectedItems.flight.id, quantity: 1 });
    }
    if (selectedItems.hotel) {
      items.push({ service_type: 'HOTEL', hotel: selectedItems.hotel.id, quantity: selectedItems.hotelNights });
    }
    if (selectedItems.restaurant) {
      items.push({ service_type: 'RESTAURANT', restaurant: selectedItems.restaurant.id, quantity: selectedItems.restaurantMeals });
    }
    if (selectedItems.ride) {
      items.push({ service_type: 'RIDE', ride: selectedItems.ride.id, quantity: selectedItems.rideKm });
    }

    try {
      // 1. Create Tour
      const createRes = await api.post('tours/tours/', {
        title: tourTitle || 'Custom Vacation Plan',
        start_date: startDate || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        end_date: endDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        budget_tier: budgetTier,
        items
      });
      
      const tourId = createRes.data.id;
      
      // 2. Submit for approvals workflow sequential checks
      await api.post(`tours/tours/${tourId}/submit/`);
      
      router.push('/traveler');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit tour plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TRAVELER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/traveler')} className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Create Smart Tour Plan
            </h1>
          </div>

          {/* Stepper progress */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold tracking-wider text-slate-500">
            <div className={`pb-3 border-b-2 ${step >= 1 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}>1. Tour Parameters</div>
            <div className={`pb-3 border-b-2 ${step >= 2 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}>2. AI Packages</div>
            <div className={`pb-3 border-b-2 ${step >= 3 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}>3. Select Services</div>
            <div className={`pb-3 border-b-2 ${step >= 4 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}>4. Live Review & Submit</div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Form steps block */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* STEP 1: Basic Info */}
              {step === 1 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
                  <h2 className="text-lg font-bold">Define Trip Parameters</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Tour Title</label>
                      <input 
                        type="text" 
                        value={tourTitle}
                        onChange={(e) => setTourTitle(e.target.value)}
                        placeholder="e.g. My Dream Trip to Paris"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Start Date</label>
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">End Date</label>
                        <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Markup Tier (Quality & Budget)</label>
                      <select 
                        value={budgetTier} 
                        onChange={(e) => setBudgetTier(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="BUDGET">Budget Tier (+18% markup)</option>
                        <option value="STANDARD">Standard Tier (+25% markup)</option>
                        <option value="LUXURY">Luxury Tier (+32% markup)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={() => setStep(2)} 
                      disabled={!tourTitle}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                    >
                      <span>Choose Packages</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: AI Packages recommendations */}
              {step === 2 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-emerald-400" />
                      <span>Recommended Packages for You</span>
                    </h2>
                    <button onClick={() => setStep(3)} className="text-xs font-semibold text-slate-400 hover:text-white underline">
                      Skip Package & Build Custom
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendedPackages.map((pkg, idx) => (
                      <div key={idx} className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Score: {pkg.score}%
                            </span>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{pkg.budget_tier}</span>
                          </div>
                          <h3 className="font-bold text-slate-100">{pkg.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{pkg.description}</p>
                          <p className="text-xs font-semibold text-slate-400">Destination: {pkg.destination}</p>
                        </div>
                        <button 
                          onClick={() => handleApplyPackage(pkg)}
                          className="w-full mt-4 bg-slate-900 hover:bg-slate-850 text-emerald-400 font-bold py-2 rounded-xl text-xs border border-emerald-500/20 transition-all"
                        >
                          Use This Package
                        </button>
                      </div>
                    ))}
                    {recommendedPackages.length === 0 && (
                      <p className="text-xs text-slate-500 md:col-span-2">No recommended packages matched. You can configure from scratch.</p>
                    )}
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white text-sm font-semibold">Back</button>
                    <button onClick={() => setStep(3)} className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
                      <span>Build Custom Plan</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Selecting custom items */}
              {step === 3 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
                  <h2 className="text-lg font-bold">Select Custom Itinerary Services</h2>
                  
                  {/* Tab catalogs accordion */}
                  <div className="space-y-6">
                    {/* Flights */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                        <Plane className="h-4 w-4 text-emerald-400" />
                        <span>Available Flights</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {flights.map((f) => (
                          <div 
                            key={f.id} 
                            onClick={() => setSelectedItems({ ...selectedItems, flight: f })}
                            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${selectedItems.flight?.id === f.id ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-950/80 border-slate-850 hover:border-slate-800'}`}
                          >
                            <p className="font-bold">{f.name} ({f.departure_city} → {f.destination_city})</p>
                            <p className="text-slate-400 mt-1">Flight: {f.name}</p>
                            <p className="font-bold text-emerald-400 mt-2">${f.price}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hotels */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                        <Hotel className="h-4 w-4 text-emerald-400" />
                        <span>Hotels Accommodation</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {hotels.map((h) => (
                          <div 
                            key={h.id} 
                            onClick={() => setSelectedItems({ ...selectedItems, hotel: h })}
                            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${selectedItems.hotel?.id === h.id ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-950/80 border-slate-850 hover:border-slate-800'}`}
                          >
                            <p className="font-bold">{h.name}</p>
                            <p className="text-slate-400 mt-1">Location: {h.location} | Room: {h.room_type}</p>
                            <p className="font-bold text-emerald-400 mt-2">${h.price_per_night} / night</p>
                          </div>
                        ))}
                      </div>
                      {selectedItems.hotel && (
                        <div className="flex items-center space-x-3 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-850 w-fit">
                          <span className="text-slate-400">Nights Stay:</span>
                          <input 
                            type="number" 
                            min="1"
                            value={selectedItems.hotelNights}
                            onChange={(e) => setSelectedItems({ ...selectedItems, hotelNights: parseInt(e.target.value) || 1 })}
                            className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={() => setStep(2)} className="text-slate-400 hover:text-white text-sm font-semibold">Back</button>
                    <button 
                      onClick={() => setStep(4)} 
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-6 rounded-xl transition-all"
                    >
                      <span>Review Details</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Review and submit */}
              {step === 4 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
                  <h2 className="text-lg font-bold">Itinerary Verification & Submit</h2>
                  
                  {/* Detailed Invoice view */}
                  <div className="space-y-4 bg-slate-950/85 p-6 rounded-2xl border border-slate-850 text-xs">
                    {selectedItems.flight && (
                      <div className="flex justify-between py-2 border-b border-slate-900">
                        <div>
                          <p className="font-bold text-slate-200">Flight: {selectedItems.flight.name}</p>
                          <p className="text-slate-500 mt-0.5">{selectedItems.flight.departure_city} to {selectedItems.flight.destination_city}</p>
                        </div>
                        <p className="font-bold text-slate-300">${selectedItems.flight.price}</p>
                      </div>
                    )}
                    
                    {selectedItems.hotel && (
                      <div className="flex justify-between py-2 border-b border-slate-900">
                        <div>
                          <p className="font-bold text-slate-200">Hotel: {selectedItems.hotel.name} ({selectedItems.hotelNights} Nights)</p>
                          <p className="text-slate-500 mt-0.5">${selectedItems.hotel.price_per_night}/night in {selectedItems.hotel.location}</p>
                        </div>
                        <p className="font-bold text-slate-300">${(parseFloat(selectedItems.hotel.price_per_night || '0') * selectedItems.hotelNights).toFixed(2)}</p>
                      </div>
                    )}

                    <div className="flex justify-between pt-4 text-sm font-bold text-slate-400">
                      <span>Itinerary Subtotal:</span>
                      <span>${pricing.base}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>AI Engine Margin markup:</span>
                      <span>+${pricing.markup} ({budgetTier})</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-slate-800 text-base font-extrabold text-emerald-400">
                      <span>Total Final Cost:</span>
                      <span>${pricing.final}</span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={() => setStep(3)} className="text-slate-400 hover:text-white text-sm font-semibold">Back</button>
                    <button 
                      onClick={handleCreateAndSubmit} 
                      disabled={loading}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-6 rounded-xl transition-all"
                    >
                      <Save className="h-4 w-4" />
                      <span>{loading ? 'Submitting plan...' : 'Confirm & Submit to Managers'}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Sidebar live pricing card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 h-fit space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Live Invoice Summary</h3>
              
              <div className="space-y-3 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Base Cost:</span>
                  <span className="font-semibold text-slate-200">${pricing.base}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dynamic Markup:</span>
                  <span className="font-semibold text-slate-200">${pricing.markup}</span>
                </div>
                <hr className="border-slate-850" />
                <div className="flex justify-between text-sm font-bold text-emerald-400">
                  <span>Estimated Total:</span>
                  <span>${pricing.final}</span>
                </div>
              </div>

              {/* Quick preferences reminder */}
              <div className="bg-slate-950/85 border border-slate-850 p-4 rounded-xl space-y-2 text-xs">
                <p className="font-semibold text-slate-300">Markup Calculation Config</p>
                <p className="text-slate-500 leading-relaxed">
                  Calculated dynamically from selected tier pricing ratios. Budget uses +18%, standard uses +25%, and custom luxury plans lock in +32%.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
