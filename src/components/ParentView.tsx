import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { RouteOption } from '../types';
import { MapPin, Clock, Shield, Bell, Send, Trash2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ParentView: React.FC = () => {
  const { assignTrip, notifications, clearNotifications, activeTrip } = useAppContext();
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [time, setTime] = useState('');
  const [showRoutes, setShowRoutes] = useState(false);

  const mockRoutes: RouteOption[] = [
    { id: '1', departure: departure || 'Casa', arrival: arrival || 'Scuola', time: time || '08:00', estimatedTime: '25 min', safetyScore: 98 },
    { id: '2', departure: departure || 'Casa', arrival: arrival || 'Scuola', time: time || '08:15', estimatedTime: '30 min', safetyScore: 95 },
    { id: '3', departure: departure || 'Casa', arrival: arrival || 'Scuola', time: time || '08:30', estimatedTime: '22 min', safetyScore: 92 },
  ];

  const handlePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRoutes(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Genitore</h1>
        <p className="text-slate-500 text-sm">Monitora e pianifica i viaggi di tuo figlio</p>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-8">
        {/* Trip Planning Form */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-600" />
            Pianifica Nuovo Viaggio
          </h2>
          <form onSubmit={handlePlan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Partenza"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Arrivo"
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              Cerca Percorsi
            </button>
          </form>
        </section>

        {/* Route Cards */}
        <AnimatePresence>
          {showRoutes && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold px-2">Percorsi Suggeriti</h2>
              {mockRoutes.map((route) => (
                <motion.div
                  key={route.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-slate-800">{route.estimatedTime}</span>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Safety: {route.safetyScore}/100
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm">Partenza ore {route.time}</p>
                  </div>
                  <button
                    onClick={() => {
                      assignTrip(route);
                      setShowRoutes(false);
                    }}
                    disabled={!!activeTrip}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                      activeTrip 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                    }`}
                  >
                    {activeTrip ? 'Viaggio in corso' : 'Assegna al Figlio'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Notification Center */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Centro Notifiche
            </h2>
            {notifications.length > 0 && (
              <button 
                onClick={clearNotifications}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p>Nessuna notifica recente</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 flex gap-4 ${notif.type === 'ALERT' ? 'bg-red-50' : ''}`}>
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                      notif.type === 'ALERT' ? 'bg-red-500' : 
                      notif.type === 'SUCCESS' ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm ${notif.type === 'ALERT' ? 'text-red-900 font-semibold' : 'text-slate-700'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {notif.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
