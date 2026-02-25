import React from 'react';
import { useAppContext } from '../AppContext';
import { ChildTripState } from '../types';
import { Phone, Map, Bus, CheckCircle, AlertTriangle, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ChildView: React.FC = () => {
  const { activeTrip, childState, setChildState, addNotification, setActiveTrip } = useAppContext();

  const handleSOS = () => {
    alert('CHIAMATA DI EMERGENZA AVVIATA...');
    addNotification('SOS ATTIVATO DAL BAMBINO!', 'ALERT');
  };

  const renderStateContent = () => {
    switch (childState) {
      case ChildTripState.IDLE:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Navigation className="w-12 h-12 text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Nessun viaggio programmato</h2>
            <p className="text-slate-500 mt-2">Aspetta che il tuo genitore ti assegni una missione!</p>
          </div>
        );

      case ChildTripState.WALKING_TO_STOP:
        return (
          <div className="space-y-6 p-4">
            <div className="bg-white p-6 rounded-3xl shadow-lg border-4 border-indigo-500">
              <h2 className="text-3xl font-black text-indigo-900 mb-4 uppercase">Vai alla fermata</h2>
              <div className="aspect-video bg-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <Map className="w-12 h-12 text-slate-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-20 h-20 bg-indigo-500 rounded-full"
                  />
                  <div className="w-4 h-4 bg-indigo-600 rounded-full relative z-10" />
                </div>
              </div>
              <p className="mt-4 text-lg font-bold text-slate-700">
                Destinazione: <span className="text-indigo-600">{activeTrip?.route.departure}</span>
              </p>
            </div>
            <button
              onClick={() => {
                setChildState(ChildTripState.ON_BUS);
                addNotification('Bambino salito sul mezzo', 'SUCCESS');
              }}
              className="w-full bg-emerald-500 text-white text-2xl font-black py-8 rounded-3xl shadow-xl active:scale-95 transition-transform uppercase"
            >
              Sono alla fermata
              <span className="block text-sm font-normal opacity-80 mt-1">(Simula Scan Biglietto)</span>
            </button>
          </div>
        );

      case ChildTripState.ON_BUS:
        return (
          <div className="space-y-6 p-4">
            <div className="bg-white p-6 rounded-3xl shadow-lg border-4 border-emerald-500">
              <h2 className="text-3xl font-black text-emerald-900 mb-6 uppercase flex items-center gap-3">
                <Bus className="w-8 h-8" />
                Sei sul Bus
              </h2>
              <div className="space-y-4">
                {['Fermata A', 'Fermata B (Tua)', 'Fermata C'].map((stop, idx) => (
                  <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${idx === 1 ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-transparent'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                      {idx + 1}
                    </div>
                    <span className={`text-xl font-bold ${idx === 1 ? 'text-emerald-900' : 'text-slate-400'}`}>
                      {stop}
                    </span>
                    {idx === 1 && <CheckCircle className="w-6 h-6 text-emerald-500 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setChildState(ChildTripState.ARRIVED_AT_STOP);
                addNotification('Bambino arrivato alla fermata di discesa', 'SUCCESS');
              }}
              className="w-full bg-indigo-600 text-white text-2xl font-black py-8 rounded-3xl shadow-xl active:scale-95 transition-transform uppercase"
            >
              Prenota Discesa
            </button>
          </div>
        );

      case ChildTripState.ARRIVED_AT_STOP:
        return (
          <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col p-6 space-y-6">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8">
                <Bus className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-4xl font-black text-white uppercase mb-4">Sei sceso?</h2>
              <p className="text-slate-400 text-xl">Conferma la tua posizione attuale</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <button
                onClick={() => {
                  setChildState(ChildTripState.WALKING_TO_DEST);
                  addNotification('Bambino sta camminando verso la destinazione finale', 'INFO');
                }}
                className="bg-emerald-500 text-white text-3xl font-black py-12 rounded-3xl shadow-2xl uppercase"
              >
                Tutto Bene
              </button>
              <button
                onClick={() => {
                  addNotification('IL BAMBINO HA SEGNALATO UN PROBLEMA ALLA DISCESA!', 'ALERT');
                  alert('Segnalazione inviata al genitore');
                }}
                className="bg-red-500 text-white text-3xl font-black py-12 rounded-3xl shadow-2xl uppercase flex items-center justify-center gap-4"
              >
                <AlertTriangle className="w-8 h-8" />
                Ho un problema
              </button>
            </div>
          </div>
        );

      case ChildTripState.WALKING_TO_DEST:
        return (
          <div className="space-y-6 p-4">
            <div className="bg-white p-6 rounded-3xl shadow-lg border-4 border-orange-500">
              <h2 className="text-3xl font-black text-orange-900 mb-4 uppercase">Ultimo tratto</h2>
              <div className="aspect-video bg-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <Map className="w-12 h-12 text-slate-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 bg-orange-600 rounded-full z-10" />
                  <motion.div 
                    animate={{ x: [0, 20, 0, -20, 0], y: [0, -10, 0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute"
                  >
                    <Navigation className="w-8 h-8 text-orange-500 rotate-45" />
                  </motion.div>
                </div>
              </div>
              <p className="mt-4 text-lg font-bold text-slate-700">
                Destinazione: <span className="text-orange-600">{activeTrip?.route.arrival}</span>
              </p>
            </div>
            <button
              onClick={() => {
                setChildState(ChildTripState.IDLE);
                setActiveTrip(null);
                addNotification('Bambino arrivato a destinazione!', 'SUCCESS');
              }}
              className="w-full bg-emerald-600 text-white text-3xl font-black py-10 rounded-3xl shadow-xl active:scale-95 transition-transform uppercase"
            >
              Sono Arrivato!
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-24 relative overflow-x-hidden">
      <header className="bg-indigo-900 text-white p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest">I'm On Bus</h1>
          <p className="text-indigo-300 text-xs font-bold">MODALITÀ BAMBINO</p>
        </div>
        {activeTrip && (
          <div className="flex items-center gap-2 bg-indigo-800 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase">In Viaggio</span>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={childState}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStateContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* SOS Button */}
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={handleSOS}
        className="fixed bottom-8 right-8 w-24 h-24 bg-red-600 text-white rounded-full shadow-2xl shadow-red-500 flex flex-col items-center justify-center z-40 border-4 border-white active:bg-red-700"
      >
        <Phone className="w-8 h-8 mb-1" />
        <span className="text-xs font-black uppercase">SOS</span>
      </motion.button>
    </div>
  );
};
