'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { 
  ShieldCheck, LogOut, ArrowRight, BookOpen, ClipboardList, 
  Layers, ToggleLeft, ToggleRight, Sparkles, Plus, X, MapPin, 
  Plane, Hotel, Utensils, Car, Train, Ship, Bus, CheckCircle2 
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

  // Form State for Registration
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
    const interval = setInterval(loadData, 4000); // Poll manager stats
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
      await api.patch(`${serviceEndpoint}/${item.id}/`, {
        is_available: !item.is_available
      });
      loadData();
    } catch (err) {
      console.error('Failed to toggle service availability.', err);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewService({
      ...newService,
      [e.target.name]: e.target.value
    });
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
      payload = {
        name: newService.name || `Flight ${newService.flight_number}`,
        flight_number: newService.flight_number || `FL-${Math.floor(100 + Math.random() * 900)}`,
        departure_city: newService.departure_city || 'Dhaka',
        destination_city: newService.destination_city || 'London',
        price: parseFloat(newService.price) || 500.00,
        is_available: true
      };
    } else if (role === 'HOTEL_MANAGER') {
      endpoint = 'tours/hotels/';
      payload = {
        name: newService.name,
        location: newService.location || 'London',
        room_type: newService.room_type,
        price_per_night: parseFloat(newService.price) || 120.00,
        is_available: true
      };
    } else if (role === 'RESTAURANT_MANAGER') {
      endpoint = 'tours/restaurants/';
      payload = {
        name: newService.name,
        location: newService.location || 'London',
        cuisine: newService.cuisine,
        price_per_meal: parseFloat(newService.price) || 25.00,
        is_available: true
      };
    } else if (role === 'RIDE_MANAGER') {
      endpoint = 'tours/rides/';
      payload = {
        vehicle_type: newService.vehicle_type,
        provider_name: newService.provider_name || 'Express Transit',
        location: newService.location || 'London',
        price_per_km: parseFloat(newService.price) || 1.50,
        is_available: true
      };
    }

    try {
      await api.post(endpoint, payload);
      setSuccessMsg(`Successfully registered new inventory service with target area: ${payload.location || payload.destination_city || 'Global'}`);
      setShowAddModal(false);
      setNewService({
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

  const getTransportIcon = (vehicleType: string = '') => {
    const vt = vehicleType.toLowerCase();
    if (vt.includes('train') || vt.includes('rail')) return <Train className="h-4 w-4 text-sky-400" />;
    if (vt.includes('launch') || vt.includes('ferry') || vt.includes('water')) return <Ship className="h-4 w-4 text-teal-400" />;
    if (vt.includes('bus') || vt.includes('road trip')) return <Bus className="h-4 w-4 text-amber-400" />;
    return <Car className="h-4 w-4 text-emerald-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-slate-400 font-medium">Calibrating service panels...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['FLIGHT_MANAGER', 'HOTEL_MANAGER', 'RESTAURANT_MANAGER', 'RIDE_MANAGER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  {getRoleDisplayName(role)}
                </h1>
                <p className="text-slate-400 text-xs">Catalog Controls &amp; Service Area Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-500/20 transform hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                <span>Register New Service</span>
              </button>
              <button 
                onClick={logout}
                className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-rose-400 hover:text-rose-300 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {successMsg && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-pulse">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Approvals Action card */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <ClipboardList className="h-4 w-4 text-emerald-400" />
                  <span>Pending Sign-offs</span>
                </div>
                <p className="text-3xl font-extrabold text-slate-100">{metrics?.assigned_requests_count}</p>
                <p className="text-slate-500 text-2xs leading-relaxed">
                  Tours waiting in your sequential checkpoint queue. Process them immediately to ensure lock updates.
                </p>
              </div>
              
              <Link 
                href="/manager/approvals" 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-500/15"
              >
                <span>View Approvals Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Managed Inventory stats */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <span>Catalog Inventory</span>
                </div>
                <p className="text-3xl font-extrabold text-slate-100">{metrics?.total_managed_services}</p>
                <p className="text-slate-500 text-2xs leading-relaxed">
                  Services items managed by you. Register new locations or toggle availability for AI recommendation matching.
                </p>
              </div>
              
              <button 
                onClick={() => setShowAddModal(true)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Add Inventory &amp; Service Area</span>
              </button>
            </div>

            {/* AI Recommendation Matching Quick tips */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>AI Location Matching</span>
                </div>
                <p className="font-bold text-sm text-slate-200 mt-2">Targeted Regional Recommendations</p>
                <p className="text-slate-500 text-2xs leading-relaxed">
                  Registering explicit service areas (e.g. London, Dubai, New York, Dhaka) allows the AI Decision Engine to match your services to traveler tour plans!
                </p>
              </div>
            </div>

          </div>

          {/* Managed Services List */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-emerald-400" />
                <span>Managed Services &amp; Service Areas</span>
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Item</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {inventory.map((item) => (
                <div key={item.id} className="bg-slate-950/80 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-800 transition-all">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        {role === 'FLIGHT_MANAGER' && <Plane className="h-4 w-4 text-emerald-400" />}
                        {role === 'HOTEL_MANAGER' && <Hotel className="h-4 w-4 text-emerald-400" />}
                        {role === 'RESTAURANT_MANAGER' && <Utensils className="h-4 w-4 text-emerald-400" />}
                        {role === 'RIDE_MANAGER' && getTransportIcon(item.name)}
                        <h4 className="font-bold text-slate-200 text-sm">{item.name}</h4>
                      </div>
                      <button 
                        onClick={() => handleToggleAvailability(item)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title={item.is_available ? "Mark service Unavailable" : "Mark service Available"}
                      >
                        {item.is_available ? (
                          <ToggleRight className="h-6 w-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-slate-600" />
                        )}
                      </button>
                    </div>
                    
                    <div className="space-y-1 text-2xs text-slate-400">
                      {item.location && (
                        <p className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span>Service Area: <strong className="text-slate-200">{item.location}</strong></span>
                        </p>
                      )}
                      {item.departure_city && item.destination_city && (
                        <p className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span>Route: <strong className="text-slate-200">{item.departure_city} → {item.destination_city}</strong></span>
                        </p>
                      )}
                      {item.provider_name && <p className="text-slate-500">Provider: {item.provider_name}</p>}
                      {item.room_type && <p className="text-slate-500">Room: {item.room_type}</p>}
                      {item.cuisine && <p className="text-slate-500">Cuisine: {item.cuisine}</p>}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-baseline pt-4 border-t border-slate-900">
                    <span className="text-2xs text-slate-500">Unit Price:</span>
                    <span className="text-sm font-black text-emerald-400">${item.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {inventory.length === 0 && (
                <div className="text-center py-8 bg-slate-950/80 border border-slate-850 rounded-2xl md:col-span-3 space-y-2">
                  <BookOpen className="h-8 w-8 text-slate-600 mx-auto opacity-40" />
                  <p className="text-xs text-slate-500">No services registered under your account yet.</p>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-emerald-500 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs inline-block mt-2"
                  >
                    + Add First Service Item
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Registration Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                    <Plus className="h-5 w-5 text-emerald-400" />
                    <span>Register Service &amp; Target Area</span>
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleRegisterService} className="space-y-4 text-xs">
                  
                  {/* Role Specific Forms */}
                  {role === 'FLIGHT_MANAGER' && (
                    <>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Airline / Flight Name</label>
                        <input
                          type="text"
                          name="name"
                          value={newService.name}
                          onChange={handleFormChange}
                          placeholder="e.g. Emirates EK-501"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Flight Number</label>
                        <input
                          type="text"
                          name="flight_number"
                          value={newService.flight_number}
                          onChange={handleFormChange}
                          placeholder="e.g. EK-501"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Departure City</label>
                          <input
                            type="text"
                            name="departure_city"
                            value={newService.departure_city}
                            onChange={handleFormChange}
                            placeholder="e.g. Dhaka"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Destination City (Area)</label>
                          <input
                            type="text"
                            name="destination_city"
                            value={newService.destination_city}
                            onChange={handleFormChange}
                            placeholder="e.g. Dubai, London"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Ticket Price ($)</label>
                        <input
                          type="number"
                          name="price"
                          value={newService.price}
                          onChange={handleFormChange}
                          placeholder="e.g. 650.00"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                    </>
                  )}

                  {role === 'HOTEL_MANAGER' && (
                    <>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Hotel / Property Name</label>
                        <input
                          type="text"
                          name="name"
                          value={newService.name}
                          onChange={handleFormChange}
                          placeholder="e.g. Ritz-Carlton Dubai"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Service Area Location (City)</label>
                        <input
                          type="text"
                          name="location"
                          value={newService.location}
                          onChange={handleFormChange}
                          placeholder="e.g. Dubai, London, New York"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Room Type</label>
                        <input
                          type="text"
                          name="room_type"
                          value={newService.room_type}
                          onChange={handleFormChange}
                          placeholder="e.g. Deluxe Sea View Suite"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Price per Night ($)</label>
                        <input
                          type="number"
                          name="price"
                          value={newService.price}
                          onChange={handleFormChange}
                          placeholder="e.g. 180.00"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                    </>
                  )}

                  {role === 'RESTAURANT_MANAGER' && (
                    <>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Restaurant / Dining Venue Name</label>
                        <input
                          type="text"
                          name="name"
                          value={newService.name}
                          onChange={handleFormChange}
                          placeholder="e.g. Royal Bengal Grill"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Service Area Location (City)</label>
                        <input
                          type="text"
                          name="location"
                          value={newService.location}
                          onChange={handleFormChange}
                          placeholder="e.g. London, Dhaka, Dubai"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Cuisine / Dining Category</label>
                        <input
                          type="text"
                          name="cuisine"
                          value={newService.cuisine}
                          onChange={handleFormChange}
                          placeholder="e.g. Halal Fine Dining, Seafood"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Price per Meal ($)</label>
                        <input
                          type="number"
                          name="price"
                          value={newService.price}
                          onChange={handleFormChange}
                          placeholder="e.g. 35.00"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                    </>
                  )}

                  {role === 'RIDE_MANAGER' && (
                    <>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Vehicle / Transportation Mode</label>
                        <select
                          name="vehicle_type"
                          value={newService.vehicle_type}
                          onChange={handleFormChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        >
                          <option value="Highway Road Trip Bus">Highway Road Trip Bus / Cruiser</option>
                          <option value="Train / Intercity Rail Express">Train / Intercity Rail Express</option>
                          <option value="Water Launch & River Cruise">Water Launch &amp; River Ferry</option>
                          <option value="Sedan Executive Cab">Sedan Executive Cab</option>
                          <option value="SUV Limo 4x4">SUV Limo 4x4</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Provider / Operator Name</label>
                        <input
                          type="text"
                          name="provider_name"
                          value={newService.provider_name}
                          onChange={handleFormChange}
                          placeholder="e.g. Bangladesh Railway, Greyhound"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Service Area Location (City)</label>
                        <input
                          type="text"
                          name="location"
                          value={newService.location}
                          onChange={handleFormChange}
                          placeholder="e.g. Dhaka, London, Dubai"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Price per KM ($)</label>
                        <input
                          type="number"
                          step="0.10"
                          name="price"
                          value={newService.price}
                          onChange={handleFormChange}
                          placeholder="e.g. 1.20"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20"
                    >
                      {submitting ? 'Registering...' : 'Confirm & Save Inventory'}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
