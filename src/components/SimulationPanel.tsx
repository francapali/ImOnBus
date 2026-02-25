import React, { useState, useCallback } from 'react';
import { useAppContext } from '../AppContext';
import { ChildTripState } from '../types';
import {
  Settings, Zap, AlertCircle, Timer, Map as MapIcon, ChevronUp, ChevronDown,
  Play, Pause, Square, FastForward, Navigation, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGPSSimulation } from '../hooks/useGPSSimulation';
import { generateTripMessage, isGeminiAvailable } from '../services/gemini';

export const SimulationPanel: React.FC = () => {
  const {
    addNotification, activeTrip, childState, setChildState,
    setChildGPSPosition, setActiveTrip,
  } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const computedRoute = activeTrip?.route?.computedRoute;

  // Helper: fire event with AI-enhanced message
  const fireAIEvent = useCallback(async (
    event: 'speed_alert' | 'stopped_alert' | 'deviation_alert' | 'battery_low' | 'sos',
    fallbackMsg: string,
    type: 'ALERT' | 'INFO' = 'ALERT',
  ) => {
    addNotification(fallbackMsg, type);

    if (isGeminiAvailable() && computedRoute) {
      const msg = await generateTripMessage({
        event,
        departure: computedRoute.departure.name,
        arrival: computedRoute.arrival.name,
        safetyScore: computedRoute.aiAnalysis?.adjustedScore ?? computedRoute.safetyScore,
      });
      if (msg) {
        addNotification(`🤖 AI: ${msg.parentMsg}`, type);
      }
    }
  }, [addNotification, computedRoute]);

  const handleArrived = useCallback(() => {
    addNotification('📍 Simulazione GPS: ragazzo arrivato a destinazione!', 'SUCCESS');
    setChildState(ChildTripState.IDLE);
    setActiveTrip(null);
  }, [addNotification, setChildState, setActiveTrip]);

  const [gpsState, gpsActions] = useGPSSimulation(
    computedRoute?.geometry,
    setChildGPSPosition,
    handleArrived,
  );

  const simulations = [
    { 
      label: 'Velocità > 6km/h', 
      icon: <Zap className="w-4 h-4" />, 
      action: () => fireAIEvent('speed_alert', 'ALERT: Velocità anomala rilevata (> 6km/h)'),
      color: 'bg-amber-500'
    },
    { 
      label: 'Fermo da 5 minuti', 
      icon: <Timer className="w-4 h-4" />, 
      action: () => fireAIEvent('stopped_alert', 'ALERT: Il ragazzo è fermo da più di 5 minuti'),
      color: 'bg-orange-500'
    },
    { 
      label: 'Percorso Errato', 
      icon: <MapIcon className="w-4 h-4" />, 
      action: () => {
        fireAIEvent('deviation_alert', 'ALERT: Deviazione dal percorso pianificato!');
        gpsActions.deviate();
      },
      color: 'bg-red-600'
    },
    { 
      label: 'Batteria Scarica', 
      icon: <AlertCircle className="w-4 h-4" />, 
      action: () => fireAIEvent('battery_low', 'INFO: Batteria del dispositivo ragazzo al 15%', 'INFO'),
      color: 'bg-slate-600'
    },
  ];

  const speedOptions = [1, 2, 5, 10, 25];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-slate-900 text-white py-2 px-4 rounded-t-2xl flex items-center justify-between shadow-2xl border-x border-t border-slate-700"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Dev Tools / Simulatore Giuria</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="bg-slate-900 border-x border-slate-700 overflow-hidden"
            >
              {/* GPS Simulation Controls */}
              {activeTrip && computedRoute && (
                <div className="p-4 border-b border-slate-700">
                  <p className="text-xs font-bold uppercase text-emerald-400 mb-3 flex items-center gap-2">
                    <Navigation className="w-3 h-3" />
                    Simulazione GPS
                  </p>

                  {/* Transport controls */}
                  <div className="flex items-center gap-2 mb-3">
                    {!gpsState.isRunning ? (
                      <button
                        onClick={() => gpsActions.start()}
                        className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Avvia GPS
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => gpsState.isPaused ? gpsActions.resume() : gpsActions.pause()}
                          className="flex-1 bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-700 transition-colors"
                        >
                          {gpsState.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          {gpsState.isPaused ? 'Riprendi' : 'Pausa'}
                        </button>
                        <button
                          onClick={() => gpsActions.stop()}
                          className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-700 transition-colors"
                        >
                          <Square className="w-3 h-3" />
                          Stop
                        </button>
                      </>
                    )}
                  </div>

                  {/* Speed selector */}
                  <div className="flex items-center gap-2 mb-3">
                    <FastForward className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400 uppercase">Velocità:</span>
                    {speedOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => gpsActions.setSpeed(s)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                          gpsState.speed === s
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {gpsState.isRunning && (
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Progresso</span>
                        <span>{Math.round(gpsState.progress * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-200"
                          style={{ width: `${gpsState.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Event simulation buttons */}
              <div className="p-4 grid grid-cols-2 gap-3">
                {simulations.map((sim, idx) => (
                  <button
                    key={idx}
                    onClick={sim.action}
                    className={`${sim.color} text-white p-3 rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg`}
                  >
                    {sim.icon}
                    {sim.label}
                  </button>
                ))}
              </div>

              {/* Reset simulation */}
              {activeTrip && (
                <div className="px-4 pb-3">
                  <button
                    onClick={() => {
                      gpsActions.stop();
                      setChildState(ChildTripState.IDLE);
                      setActiveTrip(null);
                      setChildGPSPosition(null);
                      addNotification('Simulazione resettata', 'INFO');
                    }}
                    className="w-full bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Viaggio
                  </button>
                </div>
              )}

              <div className="bg-slate-800 p-2 text-[10px] text-slate-500 text-center uppercase tracking-tighter">
                Usa questi bottoni per simulare eventi fisici durante la demo
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
