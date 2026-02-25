import React, { useCallback } from 'react';
import { useAppContext } from '../AppContext';
import { ChildTripState } from '../types';
import { Phone, Bus, CheckCircle, AlertTriangle, Navigation, Footprints, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RouteMap } from './RouteMap';
import { formatDuration, formatDistance } from '../services/routing';
import { useGPSSimulation } from '../hooks/useGPSSimulation';

export const ChildView: React.FC = () => {
  const {
    activeTrip, childState, setChildState, addNotification, setActiveTrip,
    childGPSPosition, setChildGPSPosition,
  } = useAppContext();
  const computedRoute = activeTrip?.route?.computedRoute;
  const hasBus = activeTrip?.hasBus ?? false;

  const handleArrived = useCallback(() => {
    addNotification('Ragazzo arrivato a destinazione!', 'SUCCESS');
  }, [addNotification]);

  const [gpsState, gpsActions] = useGPSSimulation(
    computedRoute?.geometry,
    setChildGPSPosition,
    handleArrived,
  );

  const handleSOS = () => {
    alert('CHIAMATA DI EMERGENZA AVVIATA...');
    addNotification('SOS ATTIVATO DAL RAGAZZO!', 'ALERT');
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
        // This state only appears for BUS routes
        return (
          <div className="space-y-4 p-4">
            <div className="bg-white p-5 rounded-3xl shadow-lg border-4 border-indigo-500">
              <h2 className="text-2xl font-black text-indigo-900 mb-2 uppercase flex items-center gap-2">
                <Footprints className="w-6 h-6" />
                Vai alla fermata
              </h2>

              {computedRoute ? (
                <RouteMap
                  routes={[computedRoute]}
                  selectedRouteId={computedRoute.id}
                  departure={computedRoute.departure}
                  arrival={computedRoute.arrival}
                  childPosition={childGPSPosition}
                  height="250px"
                  compact
                />
              ) : (
                <div className="aspect-video bg-slate-200 rounded-2xl flex items-center justify-center">
                  <Navigation className="w-12 h-12 text-slate-400" />
                </div>
              )}

              <div className="mt-3 space-y-2">
                <p className="text-lg font-bold text-slate-700">
                  Verso: <span className="text-indigo-600">
                    {computedRoute?.busSegments?.[0]?.from.name || activeTrip?.route.departure || 'Fermata'}
                  </span>
                </p>
                {computedRoute && (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{formatDuration(computedRoute.totalDuration)}</span>
                    <span>•</span>
                    <span>{formatDistance(computedRoute.totalDistance)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Sicurezza: {computedRoute.safetyScore}/100
                    </span>
                  </div>
                )}
              </div>

              {/* Step by step directions */}
              {computedRoute && computedRoute.steps.length > 0 && (
                <div className="mt-3 bg-slate-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Indicazioni:</p>
                  {computedRoute.steps.slice(0, 5).map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs mb-1.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        step.type === 'bus' ? 'bg-amber-200 text-amber-800' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {step.type === 'bus' ? '🚌' : <span className="text-[8px] font-bold">{i + 1}</span>}
                      </div>
                      <span className="text-slate-600">{step.instruction}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GPS tracking button */}
            {!gpsState.isRunning && (
              <button
                onClick={() => gpsActions.start()}
                className="w-full bg-blue-500 text-white text-lg font-bold py-4 rounded-3xl shadow-lg active:scale-95 transition-transform"
              >
                📍 Avvia Tracciamento GPS
              </button>
            )}

            <button
              onClick={() => {
                setChildState(ChildTripState.ON_BUS);
                addNotification('Ragazzo salito sul mezzo', 'SUCCESS');
              }}
              className="w-full bg-emerald-500 text-white text-2xl font-black py-8 rounded-3xl shadow-xl active:scale-95 transition-transform uppercase"
            >
              <Bus className="w-7 h-7 inline mr-2" />
              Sono alla fermata
              <span className="block text-sm font-normal opacity-80 mt-1">(Simula Scan Biglietto)</span>
            </button>
          </div>
        );

      case ChildTripState.ON_BUS:
        return (
          <div className="space-y-4 p-4">
            <div className="bg-white p-5 rounded-3xl shadow-lg border-4 border-emerald-500">
              <h2 className="text-2xl font-black text-emerald-900 mb-4 uppercase flex items-center gap-3">
                <Bus className="w-7 h-7" />
                Sei sul Bus
              </h2>

              {computedRoute && (
                <RouteMap
                  routes={[computedRoute]}
                  selectedRouteId={computedRoute.id}
                  departure={computedRoute.departure}
                  arrival={computedRoute.arrival}
                  childPosition={childGPSPosition}
                  height="200px"
                  compact
                />
              )}

              {computedRoute?.busSegments && computedRoute.busSegments.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm font-bold text-amber-800">
                    🚌 Linea {computedRoute.busSegments[0].line} AMTAB
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {computedRoute.busSegments[0].from.name} → {computedRoute.busSegments[0].to.name}
                  </p>
                </div>
              )}

              <div className="mt-3 space-y-3">
                {['Fermata precedente', `Tua fermata: ${computedRoute?.busSegments?.[0]?.to.name || activeTrip?.route.arrival || 'Arrivo'}`, 'Fermata successiva'].map((stop, idx) => (
                  <div key={idx} className={`flex items-center gap-4 p-3 rounded-xl border-2 ${idx === 1 ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-transparent'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                      {idx + 1}
                    </div>
                    <span className={`text-lg font-bold ${idx === 1 ? 'text-emerald-900' : 'text-slate-400'}`}>
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
                addNotification('Ragazzo arrivato alla fermata di discesa', 'SUCCESS');
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
                  addNotification('Ragazzo sta camminando verso la destinazione finale', 'INFO');
                }}
                className="bg-emerald-500 text-white text-3xl font-black py-12 rounded-3xl shadow-2xl uppercase"
              >
                Tutto Bene
              </button>
              <button
                onClick={() => {
                  addNotification('IL RAGAZZO HA SEGNALATO UN PROBLEMA ALLA DISCESA!', 'ALERT');
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
          <div className="space-y-4 p-4">
            <div className="bg-white p-5 rounded-3xl shadow-lg border-4 border-orange-500">
              <h2 className="text-2xl font-black text-orange-900 mb-3 uppercase flex items-center gap-2">
                <Footprints className="w-6 h-6" />
                {hasBus ? 'Ultimo tratto!' : 'In cammino'}
              </h2>

              {computedRoute ? (
                <RouteMap
                  routes={[computedRoute]}
                  selectedRouteId={computedRoute.id}
                  departure={computedRoute.departure}
                  arrival={computedRoute.arrival}
                  childPosition={childGPSPosition}
                  height="250px"
                  compact
                />
              ) : (
                <div className="aspect-video bg-slate-200 rounded-2xl flex items-center justify-center">
                  <Navigation className="w-12 h-12 text-slate-400" />
                </div>
              )}

              <div className="mt-3 space-y-2">
                <p className="text-lg font-bold text-slate-700">
                  Destinazione: <span className="text-orange-600">{activeTrip?.route.arrival}</span>
                </p>
                {computedRoute && (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{formatDuration(computedRoute.totalDuration)}</span>
                    <span>•</span>
                    <span>{formatDistance(computedRoute.totalDistance)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Sicurezza: {computedRoute.safetyScore}/100
                    </span>
                  </div>
                )}
              </div>

              {/* Step by step */}
              {computedRoute && computedRoute.steps.length > 0 && (
                <div className="mt-3 bg-slate-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Indicazioni:</p>
                  {computedRoute.steps.filter(s => s.type === 'walk').slice(0, 6).map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs mb-1.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-orange-100 text-orange-700">
                        <span className="text-[8px] font-bold">{i + 1}</span>
                      </div>
                      <span className="text-slate-600">{step.instruction}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* GPS Progress */}
              {gpsState.isRunning && (
                <div className="mt-3 bg-blue-50 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
                    <span>📍 GPS attivo</span>
                    <span>{Math.round(gpsState.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${gpsState.progress * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GPS tracking button */}
            {!gpsState.isRunning && (
              <button
                onClick={() => gpsActions.start()}
                className="w-full bg-blue-500 text-white text-lg font-bold py-4 rounded-3xl shadow-lg active:scale-95 transition-transform"
              >
                📍 Avvia Tracciamento GPS
              </button>
            )}

            <button
              onClick={() => {
                gpsActions.stop();
                setChildState(ChildTripState.IDLE);
                setActiveTrip(null);
                setChildGPSPosition(null);
                addNotification('Ragazzo arrivato a destinazione!', 'SUCCESS');
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
          <h1 className="text-xl font-black uppercase tracking-widest">I'm on Bus</h1>
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
