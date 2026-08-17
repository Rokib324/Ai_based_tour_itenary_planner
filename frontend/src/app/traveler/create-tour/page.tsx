'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import { useRouter } from 'next/navigation';
import { 
  Plane, Hotel, Utensils, Car, Sparkles, MapPin, ArrowLeft, 
  ArrowRight, Save, ShieldAlert, Train, Ship, Bus, Navigation, Check, Compass 
} from 'lucide-react';

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

export default function CreateTourPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Form State
  const [tourTitle, setTourTitle] = useState('');
  const [destination, setDestination] = useState('');
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
    hotelNights: 3,
    restaurant: null,
    restaurantMeals: 4,
    ride: null,
    rideKm: 25,
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

  // Helper for transport icons
  const getTransportIcon = (vehicleType: string = '') => {
    const vt = vehicleType.toLowerCase();
    if (vt.includes('train') || vt.includes('rail')) return <Train className="h-4 w-4 text-sky-400" />;
    if (vt.includes('launch') || vt.includes('ferry') || vt.includes('water') || vt.includes('boat')) return <Ship className="h-4 w-4 text-teal-400" />;
    if (vt.includes('bus') || vt.includes('road trip')) return <Bus className="h-4 w-4 text-amber-400" />;
    return <Car className="h-4 w-4 text-emerald-400" />;
  };

  // Destination filtering
  const matchesDestination = (locStr: string = '') => {
    if (!destination.trim()) return true;
    const target = destination.toLowerCase().trim();
    const loc = locStr.toLowerCase().trim();
    return loc.includes(target) || target.includes(loc);
  };

  const filteredPackages = recommendedPackages.filter(pkg => matchesDestination(pkg.destination));
  const filteredFlights = flights.filter(f => matchesDestination(f.destination_city) || matchesDestination(f.departure_city));
  const filteredHotels = hotels.filter(h => matchesDestination(h.location));
  const filteredRides = rides.filter(r => matchesDestination(r.location));
  const filteredRestaurants = restaurants.filter(r => matchesDestination(r.location));

  const handleApplyPackage = (pkg: any) => {
    const dest = pkg.destination || destination;
    setTourTitle(`Trip to ${dest} (${pkg.title})`);
    setDestination(dest);
    setBudgetTier(pkg.budget_tier);
    
    // Auto match available items for destination
    const hotelMatch = hotels.find(h => matchesDestination(h.location)) || null;
    const flightMatch = flights.find(f => matchesDestination(f.destination_city)) || null;
    const restMatch = restaurants.find(r => matchesDestination(r.location)) || null;
    const rideMatch = rides.find(r => matchesDestination(r.location)) || null;
    
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
        title: tourTitle || `Vacation Plan to ${destination || 'Custom Destination'}`,
        start_date: startDate || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        end_date: endDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        budget_tier: budgetTier,
        items
      });
      
      const tourId = createRes.data.id;
      
      // 2. Submit for approvals workflow
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
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/traveler')} className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Smart Tour Planner
            </h1>
          </div>

          {/* Stepper progress */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold tracking-wider text-slate-500">
            <div className={`pb-3 border-b-2 ${step >= 1 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}>1. Destination &amp; Details</div>
            <div className={`pb-3 border-b-2 ${step >= 2 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}>2. Regional AI Packages</div>
            <div className={`pb-3 border-b-2 ${step >= 3 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}>3. Select Services</div>
            <div className={`pb-3 border-b-2 ${step >= 4 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}>4. Invoice &amp; Submit</div>
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
              
              {/* STEP 1: Destination & Basic Info */}
              {step === 1 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">Where do you want to go?</h2>
                    <p className="text-slate-400 text-xs mt-1">Specify your destination to automatically calibrate regional packages, hotels, and transportation.</p>
                  </div>

                  <div className="space-y-5">
                    {/* Destination Input Field */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Destination City / Place</span>
                      </label>
                      <input 
                        type="text" 
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. London, New York, Dubai, Dhaka..."
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                      />
                      {/* Popular Quick Suggestions */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-2xs">
                        <span className="text-slate-500 font-medium">Quick Pick:</span>
                        {['London', 'New York', 'Dubai', 'Dhaka'].map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setDestination(loc);
                              if (!tourTitle) setTourTitle(`Vacation Trip to ${loc}`);
                            }}
                            className={`px-3 py-1 rounded-full border transition-all ${destination.toLowerCase() === loc.toLowerCase() ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold' : 'bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-700'}`}
                          >
                            📍 {loc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tour Title */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Tour Title</label>
                      <input 
                        type="text" 
                        value={tourTitle}
                        onChange={(e) => setTourTitle(e.target.value)}
                        placeholder={destination ? `e.g. My Exploration of ${destination}` : "e.g. Summer Holiday Extravaganza"}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    {/* Date Pickers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Start Date</label>
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">End Date</label>
                        <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>

                    {/* Budget Tier */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Markup Tier (Budget Ratio)</label>
                      <select 
                        value={budgetTier} 
                        onChange={(e) => setBudgetTier(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
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
                      disabled={!destination && !tourTitle}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                    >
                      <span>Find AI Packages</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Destination-Filtered AI Packages */}
              {step === 2 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold flex items-center space-x-2">
                        <Sparkles className="h-5 w-5 text-emerald-400" />
                        <span>Recommended Packages {destination ? `for ${destination}` : ''}</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Presets matched to your destination and traveler profile score.</p>
                    </div>
                    <button onClick={() => setStep(3)} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline shrink-0">
                      Skip &amp; Select Custom Services →
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPackages.map((pkg, idx) => (
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
                          <div className="flex justify-between items-center text-xs pt-1">
                            <span className="text-slate-400">Destination: <span className="text-emerald-400 font-bold">{pkg.destination}</span></span>
                            <span className="font-bold text-slate-200">${parseFloat(pkg.base_price).toFixed(2)}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleApplyPackage(pkg)}
                          className="w-full mt-4 bg-slate-900 hover:bg-slate-850 text-emerald-400 font-bold py-2.5 rounded-xl text-xs border border-emerald-500/20 transition-all flex items-center justify-center space-x-1"
                        >
                          <Check className="h-4 w-4" />
                          <span>Use {pkg.destination} Package</span>
                        </button>
                      </div>
                    ))}
                    {filteredPackages.length === 0 && (
                      <div className="text-center py-8 bg-slate-950/80 border border-slate-850 rounded-2xl md:col-span-2 space-y-2">
                        <MapPin className="h-8 w-8 text-slate-600 mx-auto opacity-40" />
                        <p className="text-xs text-slate-400">No preset packages found specifically for &quot;{destination}&quot;.</p>
                        <button 
                          onClick={() => setStep(3)} 
                          className="bg-emerald-500 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs inline-block mt-2"
                        >
                          Configure Custom Services for {destination || 'Destination'} →
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white text-sm font-semibold">Back</button>
                    <button onClick={() => setStep(3)} className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
                      <span>Select Custom Services</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Destination-Filtered Services (Flights, Transportation, Hotels, Restaurants) */}
              {step === 3 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-8 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold flex items-center space-x-2">
                      <Compass className="h-5 w-5 text-emerald-400" />
                      <span>Available Services in {destination || 'Selected Area'}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Select flights, regional transportation (road trips, trains, water launch, cabs), hotels, and dining options.</p>
                  </div>
                  
                  <div className="space-y-8">
                    
                    {/* 1. Flights */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                        <Plane className="h-4 w-4 text-emerald-400" />
                        <span>Available Flights {destination ? `to/from ${destination}` : ''}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredFlights.map((f) => (
                          <div 
                            key={f.id} 
                            onClick={() => setSelectedItems({ ...selectedItems, flight: f })}
                            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${selectedItems.flight?.id === f.id ? 'bg-emerald-500/15 border-emerald-500 shadow-md shadow-emerald-500/10' : 'bg-slate-950/80 border-slate-850 hover:border-slate-800'}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-200">{f.name}</p>
                                <p className="text-slate-400 text-2xs mt-1">Route: {f.departure_city} → <span className="text-emerald-400 font-bold">{f.destination_city}</span></p>
                              </div>
                              <p className="font-extrabold text-emerald-400">${f.price}</p>
                            </div>
                          </div>
                        ))}
                        {filteredFlights.length === 0 && (
                          <p className="text-xs text-slate-500 italic md:col-span-2">No flights listed specifically for {destination}. All flights available upon request.</p>
                        )}
                      </div>
                    </div>

                    {/* 2. Transportation & Road Trips (Train, Launch, Bus, Car) */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                        <Car className="h-4 w-4 text-emerald-400" />
                        <span>Transportation, Road Trips, Train &amp; Launch in {destination || 'Area'}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(filteredRides.length > 0 ? filteredRides : rides).map((r) => (
                          <div 
                            key={r.id} 
                            onClick={() => setSelectedItems({ ...selectedItems, ride: r })}
                            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${selectedItems.ride?.id === r.id ? 'bg-emerald-500/15 border-emerald-500 shadow-md shadow-emerald-500/10' : 'bg-slate-950/80 border-slate-850 hover:border-slate-800'}`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  {getTransportIcon(r.vehicle_type)}
                                  <p className="font-bold text-slate-200">{r.vehicle_type}</p>
                                </div>
                                <p className="text-slate-400 text-2xs">Provider: {r.provider_name} | Location: <span className="text-emerald-400 font-bold">{r.location}</span></p>
                              </div>
                              <p className="font-extrabold text-emerald-400">${r.price_per_km}/km</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedItems.ride && (
                        <div className="flex items-center space-x-3 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-850 w-fit">
                          <span className="text-slate-400 font-semibold">Travel Distance (KM):</span>
                          <input 
                            type="number" 
                            min="1"
                            value={selectedItems.rideKm}
                            onChange={(e) => setSelectedItems({ ...selectedItems, rideKm: parseInt(e.target.value) || 1 })}
                            className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center font-bold text-emerald-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* 3. Hotels */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                        <Hotel className="h-4 w-4 text-emerald-400" />
                        <span>Hotels &amp; Accommodations in {destination || 'Area'}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(filteredHotels.length > 0 ? filteredHotels : hotels).map((h) => (
                          <div 
                            key={h.id} 
                            onClick={() => setSelectedItems({ ...selectedItems, hotel: h })}
                            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${selectedItems.hotel?.id === h.id ? 'bg-emerald-500/15 border-emerald-500 shadow-md shadow-emerald-500/10' : 'bg-slate-950/80 border-slate-850 hover:border-slate-800'}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-200">{h.name}</p>
                                <p className="text-slate-400 text-2xs mt-1">Location: <span className="text-emerald-400 font-bold">{h.location}</span> | Room: {h.room_type}</p>
                              </div>
                              <p className="font-extrabold text-emerald-400">${h.price_per_night}/night</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedItems.hotel && (
                        <div className="flex items-center space-x-3 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-850 w-fit">
                          <span className="text-slate-400 font-semibold">Nights Stay:</span>
                          <input 
                            type="number" 
                            min="1"
                            value={selectedItems.hotelNights}
                            onChange={(e) => setSelectedItems({ ...selectedItems, hotelNights: parseInt(e.target.value) || 1 })}
                            className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center font-bold text-emerald-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* 4. Restaurants */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                        <Utensils className="h-4 w-4 text-emerald-400" />
                        <span>Restaurants &amp; Dining in {destination || 'Area'}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(filteredRestaurants.length > 0 ? filteredRestaurants : restaurants).map((r) => (
                          <div 
                            key={r.id} 
                            onClick={() => setSelectedItems({ ...selectedItems, restaurant: r })}
                            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${selectedItems.restaurant?.id === r.id ? 'bg-emerald-500/15 border-emerald-500 shadow-md shadow-emerald-500/10' : 'bg-slate-950/80 border-slate-850 hover:border-slate-800'}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-200">{r.name}</p>
                                <p className="text-slate-400 text-2xs mt-1">Cuisine: {r.cuisine} | Location: <span className="text-emerald-400 font-bold">{r.location}</span></p>
                              </div>
                              <p className="font-extrabold text-emerald-400">${r.price_per_meal}/meal</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedItems.restaurant && (
                        <div className="flex items-center space-x-3 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-850 w-fit">
                          <span className="text-slate-400 font-semibold">Meals Count:</span>
                          <input 
                            type="number" 
                            min="1"
                            value={selectedItems.restaurantMeals}
                            onChange={(e) => setSelectedItems({ ...selectedItems, restaurantMeals: parseInt(e.target.value) || 1 })}
                            className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center font-bold text-emerald-400"
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
                      <span>Review Invoice Details</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Review and submit */}
              {step === 4 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                  <h2 className="text-lg font-bold">Itinerary Verification &amp; Submit</h2>
                  
                  {/* Detailed Invoice view */}
                  <div className="space-y-4 bg-slate-950/85 p-6 rounded-2xl border border-slate-850 text-xs">
                    {destination && (
                      <div className="pb-3 border-b border-slate-900 flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">Destination:</span>
                        <span className="font-extrabold text-emerald-400 text-sm">📍 {destination}</span>
                      </div>
                    )}

                    {selectedItems.flight && (
                      <div className="flex justify-between py-2 border-b border-slate-900">
                        <div>
                          <p className="font-bold text-slate-200">Flight: {selectedItems.flight.name}</p>
                          <p className="text-slate-500 mt-0.5">{selectedItems.flight.departure_city} → {selectedItems.flight.destination_city}</p>
                        </div>
                        <p className="font-bold text-slate-300">${selectedItems.flight.price}</p>
                      </div>
                    )}
                    
                    {selectedItems.ride && (
                      <div className="flex justify-between py-2 border-b border-slate-900">
                        <div>
                          <p className="font-bold text-slate-200">Transport: {selectedItems.ride.vehicle_type} ({selectedItems.rideKm} KM)</p>
                          <p className="text-slate-500 mt-0.5">{selectedItems.ride.provider_name} (${selectedItems.ride.price_per_km}/km in {selectedItems.ride.location})</p>
                        </div>
                        <p className="font-bold text-slate-300">${(parseFloat(selectedItems.ride.price_per_km || '0') * selectedItems.rideKm).toFixed(2)}</p>
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

                    {selectedItems.restaurant && (
                      <div className="flex justify-between py-2 border-b border-slate-900">
                        <div>
                          <p className="font-bold text-slate-200">Dining: {selectedItems.restaurant.name} ({selectedItems.restaurantMeals} Meals)</p>
                          <p className="text-slate-500 mt-0.5">${selectedItems.restaurant.price_per_meal}/meal in {selectedItems.restaurant.location}</p>
                        </div>
                        <p className="font-bold text-slate-300">${(parseFloat(selectedItems.restaurant.price_per_meal || '0') * selectedItems.restaurantMeals).toFixed(2)}</p>
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
              
              {destination && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs flex items-center space-x-2 text-emerald-300">
                  <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">Destination: {destination}</span>
                </div>
              )}

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
