'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import {
  ShieldCheck, LogOut, ArrowRight, BookOpen, ClipboardList,
  Layers, ToggleLeft, ToggleRight, Sparkles, Plus, X, MapPin,
  Plane, Hotel, Utensils, Car, Train, Ship, Bus, CheckCircle2,
  Home, Globe, TrendingUp, Zap, Star
} from 'lucide-react';
import Link from 'next/link';

interface ManagerMetrics {
  assigned_requests_count: number;
  total_managed_services: number;
}

interface InventoryItem {
  id: number;
  name: string;
  price: number;
  is_available: boolean;
  location?: string;
  departure_city?: string;
  destination_city?: string;
  provider_name?: string;
  room_type?: string;
  cuisine?: string;
}

export default function ManagerDashboardPage() {
  const { logout } = useAuth();
  const [metrics, setMetrics] = useState<ManagerMetrics | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [newService, setNewService] = useState({
    name: '',
    flight_number: '',
    departure_city: '',
    destination_city: '',
    location: '',
    room_type: 'Standard Deluxe',
    cuisine: 'International',
    vehicle_type: 'Sedan Cab',
    provider_name: '',
    price: '',
  });

  const loadData = async () => {
    try {
      const res = await api.get('analytics/dashboard/manager/');
      setMetrics(res.data.metrics);
      setInventory(res.data.recent_inventory);
      setRole(res.data.role);
    } catch (err) {
      setError('Failed to fetch manager console statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAvailability = async (item: InventoryItem) => {
    let serviceEndpoint = '';
    if (role === 'FLIGHT_MANAGER') serviceEndpoint = 'tours/flights';
    else if (role === 'HOTEL_MANAGER') serviceEndpoint = 'tours/hotels';
    else if (role === 'RESTAURANT_MANAGER') serviceEndpoint = 'tours/restaurants';
    else if (role === 'RIDE_MANAGER') serviceEndpoint = 'tours/rides';
    if (!serviceEndpoint) return;
    try {
      await api.patch(`${serviceEndpoint}/${item.id}/`, { is_available: !item.is_available });
      loadData();
    } catch (err) {
      console.error('Failed to toggle service availability.', err);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewService({ ...newService, [e.target.name]: e.target.value });
  };

  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setError('');
    let endpoint = '';
    let payload: any = {};
    if (role === 'FLIGHT_MANAGER') {
      endpoint = 'tours/flights/';
      payload = { name: newService.name || `Flight ${newService.flight_number}`, flight_number: newService.flight_number || `FL-${Math.floor(100 + Math.random() * 900)}`, departure_city: newService.departure_city || 'Dhaka', destination_city: newService.destination_city || 'London', price: parseFloat(newService.price) || 500.00, is_available: true };
    } else if (role === 'HOTEL_MANAGER') {
      endpoint = 'tours/hotels/';
      payload = { name: newService.name, location: newService.location || 'London', room_type: newService.room_type, price_per_night: parseFloat(newService.price) || 120.00, is_available: true };
    } else if (role === 'RESTAURANT_MANAGER') {
      endpoint = 'tours/restaurants/';
      payload = { name: newService.name, location: newService.location || 'London', cuisine: newService.cuisine, price_per_meal: parseFloat(newService.price) || 25.00, is_available: true };
    } else if (role === 'RIDE_MANAGER') {
      endpoint = 'tours/rides/';
      payload = { vehicle_type: newService.vehicle_type, provider_name: newService.provider_name || 'Express Transit', location: newService.location || 'London', price_per_km: parseFloat(newService.price) || 1.50, is_available: true };
    }
    try {
      await api.post(endpoint, payload);
      setSuccessMsg(`Service registered for: ${payload.location || payload.destination_city || 'Global'}`);
      setShowAddModal(false);
      setNewService({ name: '', flight_number: '', departure_city: '', destination_city: '', location: '', room_type: 'Standard Deluxe', cuisine: 'International', vehicle_type: 'Sedan Cab', provider_name: '', price: '' });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to register service inventory.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleDisplayName = (r: string) => {
    if (r === 'FLIGHT_MANAGER') return 'Flight Logistics Manager';
    if (r === 'HOTEL_MANAGER') return 'Hotel Accommodation Manager';
    if (r === 'RESTAURANT_MANAGER') return 'Dining & Food Services Manager';
    if (r === 'RIDE_MANAGER') return 'Ride/Transit Services Manager';
    return r;
  };

  const getRoleIcon = () => {
    if (role === 'FLIGHT_MANAGER') return <Plane className="h-5 w-5 text-sky-400" />;
    if (role === 'HOTEL_MANAGER') return <Hotel className="h-5 w-5 text-amber-400" />;
    if (role === 'RESTAURANT_MANAGER') return <Utensils className="h-5 w-5 text-rose-400" />;
    if (role === 'RIDE_MANAGER') return <Car className="h-5 w-5 text-violet-400" />;
    return <ShieldCheck className="h-5 w-5 text-emerald-400" />;
  };

  const getRoleAccent = () => {
    if (role === 'FLIGHT_MANAGER') return 'from-sky-500/20 to-blue-500/20 border-sky-500/30';
    if (role === 'HOTEL_MANAGER') return 'from-amber-500/20 to-orange-500/20 border-amber-500/30';
    if (role === 'RESTAURANT_MANAGER') return 'from-rose-500/20 to-pink-500/20 border-rose-500/30';
    if (role === 'RIDE_MANAGER') return 'from-violet-500/20 to-purple-500/20 border-violet-500/30';
    return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30';
  };

  const getTransportIcon = (vehicleType: string = '') => {
    const vt = vehicleType.toLowerCase();
    if (vt.includes('train') || vt.includes('rail')) return <Train className="h-4 w-4 text-sky-400" />;
    if (vt.includes('launch') || vt.includes('ferry') || vt.includes('water')) return <Ship className="h-4 w-4 text-teal-400" />;
    if (vt.includes('bus') || vt.includes('road trip')) return <Bus className="h-4 w-4 text-amber-400" />;
    return <Car className="h-4 w-4 text-emerald-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080b12] text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-slate-400 font-medium">Calibrating service panels...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['FLIGHT_MANAGER', 'HOTEL_MANAGER', 'RESTAURANT_MANAGER', 'RIDE_MANAGER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-[#080b12] text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-emerald-500/4 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-teal-500/4 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">

          {/* ─── HEADER ─── */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/3 backdrop-blur-xl border border-white/8 p-5 rounded-2xl shadow-2xl">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="group flex items-center space-x-2 bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 px-3.5 py-2 rounded-xl transition-all duration-200"
                title="Back to Home"
              >
                <Home className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-400 transition-colors hidden sm:block">Home</span>
              </Link>

              <div className="w-px h-8 bg-white/10" />

              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleAccent()} flex items-center justify-center border`}>
                  {getRoleIcon()}
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">{getRoleDisplayName(role)}</h1>
                  <p className="text-slate-500 text-xs">Catalog Controls & Service Management</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-500/20 hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                <span>Register New Service</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Log Out</span>
              </button>
            </div>
          </header>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* ─── METRIC CARDS ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Approvals Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0f1a24] to-[#0a1520] border border-emerald-500/20 p-6 rounded-2xl space-y-5 flex flex-col justify-between group hover:border-emerald-500/40 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-10 translate-x-10" />
              <div className="relative space-y-3">
                <div className="flex items-center space-x-2 text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <ClipboardList className="h-4 w-4 text-emerald-400" />
                  <span>Pending Sign-offs</span>
                </div>
                <div className="flex items-baseline space-x-2">
                  <p className="text-4xl font-black text-white">{metrics?.assigned_requests_count ?? 0}</p>
                  {(metrics?.assigned_requests_count ?? 0) > 0 && (
                    <span className="text-xs text-amber-400 font-bold animate-pulse">Action Required</span>
                  )}
                </div>
                <p className="text-slate-600 text-2xs leading-relaxed">
                  Tours waiting in your sequential checkpoint queue. Process immediately for lock updates.
                </p>
              </div>
              <Link
                href="/manager/approvals"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 py-2.5 rounded-xl text-xs font-black flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-500/15 hover:scale-[1.02]"
              >
                <span>View Approvals Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Inventory Card */}
            <div className="bg-white/3 border border-white/8 p-6 rounded-2xl space-y-5 flex flex-col justify-between hover:border-white/15 transition-all">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <span>Catalog Inventory</span>
                </div>
                <p className="text-4xl font-black text-white">{metrics?.total_managed_services ?? 0}</p>
                <p className="text-slate-600 text-2xs leading-relaxed">
                  Services managed by you. Register new areas or toggle availability for AI matching.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full bg-white/3 border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-emerald-400 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Add Inventory & Service Area</span>
              </button>
            </div>

            {/* AI Matching Tips */}
            <div className="bg-white/3 border border-white/8 p-6 rounded-2xl space-y-4 flex flex-col justify-between hover:border-white/15 transition-all">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>AI Location Matching</span>
                </div>
                <p className="font-bold text-sm text-white">Targeted Regional Recommendations</p>
                <p className="text-slate-600 text-2xs leading-relaxed">
                  Add explicit service areas (London, Dubai, New York, Dhaka) to let the AI engine match your services to traveler tour plans!
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['London', 'Dubai', 'Tokyo', 'Dhaka'].map(city => (
                  <span key={city} className="text-2xs bg-white/5 border border-white/8 px-2 py-0.5 rounded-full text-slate-400 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 text-emerald-400" />
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ─── MANAGED SERVICES LIST ─── */}
          <div className="bg-white/2 border border-white/8 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-black text-white flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-emerald-400" />
                <span>Managed Services & Areas</span>
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Item</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inventory.map((item) => (
                <div key={item.id} className="bg-white/3 border border-white/8 p-5 rounded-xl flex flex-col justify-between space-y-4 hover:border-white/15 hover:bg-white/5 transition-all group">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        {role === 'FLIGHT_MANAGER' && <Plane className="h-4 w-4 text-sky-400" />}
                        {role === 'HOTEL_MANAGER' && <Hotel className="h-4 w-4 text-amber-400" />}
                        {role === 'RESTAURANT_MANAGER' && <Utensils className="h-4 w-4 text-rose-400" />}
                        {role === 'RIDE_MANAGER' && getTransportIcon(item.name)}
                        <h4 className="font-bold text-slate-200 text-sm">{item.name}</h4>
                      </div>
                      {/* Availability Toggle */}
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold border transition-all ${
                          item.is_available
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-white/5 text-slate-500 border-white/10'
                        }`}
                        title={item.is_available ? 'Mark Unavailable' : 'Mark Available'}
                      >
                        {item.is_available ? (
                          <><ToggleRight className="h-3.5 w-3.5" /><span>Live</span></>
                        ) : (
                          <><ToggleLeft className="h-3.5 w-3.5" /><span>Off</span></>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1.5 text-2xs text-slate-500">
                      {item.location && (
                        <p className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span>Area: <strong className="text-slate-300">{item.location}</strong></span>
                        </p>
                      )}
                      {item.departure_city && item.destination_city && (
                        <p className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span>Route: <strong className="text-slate-300">{item.departure_city} → {item.destination_city}</strong></span>
                        </p>
                      )}
                      {item.provider_name && <p className="text-slate-600">Provider: {item.provider_name}</p>}
                      {item.room_type && <p className="text-slate-600">Room: {item.room_type}</p>}
                      {item.cuisine && <p className="text-slate-600">Cuisine: {item.cuisine}</p>}
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-3 border-t border-white/5">
                    <span className="text-2xs text-slate-600">Unit Price</span>
                    <span className="text-sm font-black text-emerald-400">${item.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}

              {inventory.length === 0 && (
                <div className="text-center py-12 border border-dashed border-white/8 rounded-xl md:col-span-3 space-y-3">
                  <BookOpen className="h-10 w-10 text-slate-700 mx-auto" />
                  <p className="text-sm text-slate-500">No services registered yet.</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-emerald-500 text-slate-950 font-bold py-2 px-5 rounded-xl text-xs inline-block hover:bg-emerald-400 transition-colors"
                  >
                    + Add First Service
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── REGISTRATION MODAL ─── */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0d1420] border border-white/10 rounded-2xl max-w-lg w-full p-7 space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-white/8 pb-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-emerald-400" />
                  <span>Register Service & Target Area</span>
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white p-1 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRegisterService} className="space-y-4 text-xs">
                {role === 'FLIGHT_MANAGER' && (
                  <>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Airline / Flight Name</label>
                      <input type="text" name="name" value={newService.name} onChange={handleFormChange} placeholder="e.g. Emirates EK-501" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Flight Number</label>
                      <input type="text" name="flight_number" value={newService.flight_number} onChange={handleFormChange} placeholder="e.g. EK-501" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1.5">Departure City</label>
                        <input type="text" name="departure_city" value={newService.departure_city} onChange={handleFormChange} placeholder="e.g. Dhaka" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1.5">Destination City</label>
                        <input type="text" name="destination_city" value={newService.destination_city} onChange={handleFormChange} placeholder="e.g. Dubai" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Ticket Price ($)</label>
                      <input type="number" name="price" value={newService.price} onChange={handleFormChange} placeholder="e.g. 650.00" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                  </>
                )}
                {role === 'HOTEL_MANAGER' && (
                  <>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Hotel / Property Name</label>
                      <input type="text" name="name" value={newService.name} onChange={handleFormChange} placeholder="e.g. Ritz-Carlton Dubai" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Location (City)</label>
                      <input type="text" name="location" value={newService.location} onChange={handleFormChange} placeholder="e.g. Dubai" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Room Type</label>
                      <input type="text" name="room_type" value={newService.room_type} onChange={handleFormChange} placeholder="e.g. Deluxe Sea View Suite" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Price per Night ($)</label>
                      <input type="number" name="price" value={newService.price} onChange={handleFormChange} placeholder="e.g. 180.00" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                  </>
                )}
                {role === 'RESTAURANT_MANAGER' && (
                  <>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Restaurant / Venue Name</label>
                      <input type="text" name="name" value={newService.name} onChange={handleFormChange} placeholder="e.g. Royal Bengal Grill" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Location (City)</label>
                      <input type="text" name="location" value={newService.location} onChange={handleFormChange} placeholder="e.g. London" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Cuisine Type</label>
                      <input type="text" name="cuisine" value={newService.cuisine} onChange={handleFormChange} placeholder="e.g. Halal Fine Dining" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Price per Meal ($)</label>
                      <input type="number" name="price" value={newService.price} onChange={handleFormChange} placeholder="e.g. 35.00" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                  </>
                )}
                {role === 'RIDE_MANAGER' && (
                  <>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Vehicle / Transport Mode</label>
                      <select name="vehicle_type" value={newService.vehicle_type} onChange={handleFormChange} className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors">
                        <option value="Highway Road Trip Bus">Highway Road Trip Bus / Cruiser</option>
                        <option value="Train / Intercity Rail Express">Train / Intercity Rail Express</option>
                        <option value="Water Launch & River Cruise">Water Launch & River Ferry</option>
                        <option value="Sedan Executive Cab">Sedan Executive Cab</option>
                        <option value="SUV Limo 4x4">SUV Limo 4x4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Provider / Operator Name</label>
                      <input type="text" name="provider_name" value={newService.provider_name} onChange={handleFormChange} placeholder="e.g. Bangladesh Railway" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Service Area (City)</label>
                      <input type="text" name="location" value={newService.location} onChange={handleFormChange} placeholder="e.g. Dhaka" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1.5">Price per KM ($)</label>
                      <input type="number" step="0.10" name="price" value={newService.price} onChange={handleFormChange} placeholder="e.g. 1.20" required className="w-full bg-white/3 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition-colors" />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/8">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white font-semibold transition-colors text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 text-xs disabled:opacity-50">
                    {submitting ? 'Registering...' : 'Confirm & Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
