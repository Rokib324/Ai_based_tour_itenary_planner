'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { ShieldCheck, LogOut, ArrowRight, BookOpen, ClipboardList, Layers, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
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
}

export default function ManagerDashboardPage() {
  const { logout } = useAuth();
  const [metrics, setMetrics] = useState<ManagerMetrics | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [role, setRole] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, []);

  const handleToggleAvailability = async (item: InventoryItem) => {
    // Map service types based on manager role
    let serviceEndpoint = '';
    if (role === 'FLIGHT_MANAGER') serviceEndpoint = 'tours/flights';
    else if (role === 'HOTEL_MANAGER') serviceEndpoint = 'tours/hotels';
    else if (role === 'RESTAURANT_MANAGER') serviceEndpoint = 'tours/restaurants';
    else if (role === 'RIDE_MANAGER') serviceEndpoint = 'tours/rides';

    if (!serviceEndpoint) return;

    try {
      // Send toggle update
      await api.patch(`${serviceEndpoint}/${item.id}/`, {
        is_available: !item.is_available
      });
      loadData();
    } catch (err) {
      console.error('Failed to toggle service availability.', err);
    }
  };

  const getRoleDisplayName = (r: string) => {
    if (r === 'FLIGHT_MANAGER') return 'Flight Logistics Manager';
    if (r === 'HOTEL_MANAGER') return 'Hotel Accommodation Manager';
    if (r === 'RESTAURANT_MANAGER') return 'Dining & Food Services Manager';
    if (r === 'RIDE_MANAGER') return 'Ride/Transit Services Manager';
    return r;
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
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  {getRoleDisplayName(role)}
                </h1>
                <p className="text-slate-400 text-xs">Catalog Controls & Approvals Workflow</p>
              </div>
            </div>
            
            <button 
              onClick={logout}
              className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-rose-400 hover:text-rose-300 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>

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
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all"
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
                  Services items managed by you in our catalog. Mark them offline or update booking slots dynamically.
                </p>
              </div>
              
              <button 
                disabled
                className="w-full bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 py-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 opacity-50 cursor-not-allowed"
              >
                <span>Manage Inventory (Soon)</span>
              </button>
            </div>

            {/* AI Assistant Quick tips */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>AI Assistant Tip</span>
                </div>
                <p className="font-bold text-sm text-slate-200 mt-2">Sequential checkouts unlock margins</p>
                <p className="text-slate-500 text-2xs leading-relaxed">
                  Tours are locked immediately upon matching. When you sign-off your checkpoint, the system evaluates and transitions status down the pipeline.
                </p>
              </div>
            </div>

          </div>

          {/* Managed Services list */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-emerald-400" />
              <span>Managed Services Inventory</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {inventory.map((item) => (
                <div key={item.id} className="bg-slate-950/80 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-200">{item.name}</h4>
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
                    <p className="text-xs text-slate-500">Service ID: #{item.id}</p>
                  </div>
                  
                  <div className="flex justify-between items-baseline pt-4 border-t border-slate-900">
                    <span className="text-2xs text-slate-500">Est. Price:</span>
                    <span className="text-sm font-bold text-emerald-400">${item.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {inventory.length === 0 && (
                <p className="text-xs text-slate-500 md:col-span-3">No inventory items matched under your name.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
