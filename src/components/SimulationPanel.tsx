import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Settings, Zap, AlertCircle, Timer, Map as MapIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SimulationPanel: React.FC = () => {
  const { addNotification } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const simulations = [
    { 
      label: 'Velocità > 6km/h', 
      icon: <Zap className="w-4 h-4" />, 
      action: () => addNotification('ALERT: Velocità anomala rilevata (> 6km/h)', 'ALERT'),
      color: 'bg-amber-500'
    },
    { 
      label: 'Fermo da 5 minuti', 
      icon: <Timer className="w-4 h-4" />, 
      action: () => addNotification('ALERT: Il bambino è fermo da più di 5 minuti', 'ALERT'),
      color: 'bg-orange-500'
    },
    { 
      label: 'Percorso Errato', 
      icon: <MapIcon className="w-4 h-4" />, 
      action: () => addNotification('ALERT: Deviazione dal percorso pianificato!', 'ALERT'),
      color: 'bg-red-600'
    },
    { 
      label: 'Batteria Scarica', 
      icon: <AlertCircle className="w-4 h-4" />, 
      action: () => addNotification('INFO: Batteria del dispositivo bambino al 15%', 'INFO'),
      color: 'bg-slate-600'
    },
  ];

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
