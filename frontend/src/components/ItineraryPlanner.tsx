'use client';

import React, { useState } from 'react';
import api from '@/utils/api';
import { Sparkles, Loader2, MapPin } from 'lucide-react';

interface Activity {
  time: string;
  title: string;
  description: string;
  location: string;
}

interface DayPlan {
  day: number;
  activities: Activity[];
}

interface ItineraryResponse {
  destination: string;
  itinerary: DayPlan[];
}

export default function ItineraryPlanner({
  initialDestination = 'Tokyo',
  initialDays = 2,
  initialInterests = 'Anime & Food',
  onItineraryGenerated
}: {
  initialDestination?: string;
  initialDays?: number;
  initialInterests?: string;
  onItineraryGenerated?: (data: ItineraryResponse) => void;
}) {
  const [itineraryData, setItineraryData] = useState<ItineraryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItinerary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('tours/generate-itinerary/', {
        destination: initialDestination,
        days: initialDays,
        interests: initialInterests
      });
      setItineraryData(res.data);
      if (onItineraryGenerated) {
        onItineraryGenerated(res.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to generate itinerary with Groq AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Groq Cloud AI Itinerary Planner
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            Planning for {initialDestination} ({initialDays} days, {initialInterests})
          </p>
        </div>

        <button
          onClick={fetchItinerary}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Planning with Groq AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{itineraryData ? 'Regenerate Tour' : 'Generate Tour'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
          {error}
        </div>
      )}

      {itineraryData && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-2xl font-bold text-white">Trip to {itineraryData.destination}</h2>
            <span className="text-2xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Powered by Groq Cloud
            </span>
          </div>

          <div className="space-y-6">
            {itineraryData.itinerary?.map((dayObj) => (
              <div key={dayObj.day} className="border-l-4 border-emerald-500 pl-4 space-y-3">
                <h3 className="text-xl font-semibold text-emerald-400">Day {dayObj.day}</h3>
                <div className="space-y-2.5">
                  {dayObj.activities?.map((act, index) => (
                    <div key={index} className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-emerald-400/80 uppercase tracking-wider">{act.time}</span>
                      <h4 className="font-bold text-slate-100 text-sm">{act.title}</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">{act.description}</p>
                      <p className="text-2xs italic text-slate-500 pt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{act.location}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

