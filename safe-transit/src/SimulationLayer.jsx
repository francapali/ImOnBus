import React, { useContext, useState } from 'react';
import { AppContext } from './App';

export default function SimulationPanel() {
  const { addNotification } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-slate-800 text-white transition-transform duration-300 z-50 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
      
      {/* Handle / Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -top-10 right-4 bg-slate-800 text-white px-4 py-2 rounded-t-lg font-bold text-sm shadow-md border-t border-x border-slate-700"
      >
        {isOpen ? '↓ Nascondi' : '↑ Simulatore Giuria'}
      </button>

      <div className="p-4 space-y-3">
        <h4 className="font-bold text-slate-300 text-sm uppercase tracking-wider mb-2">Pannello Iniezione Eventi</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            onClick={() => addNotification('⚠️ ALERT: Velocità rilevata > 6km/h (A piedi)', 'warning')}
            className="bg-slate-700 hover:bg-slate-600 p-3 rounded-lg text-sm text-left border border-slate-600 transition"
          >
            🏃‍♂️ Simula: Velocità &gt; 6km/h
          </button>
          <button 
            onClick={() => addNotification('⚠️ ALERT: Il dispositivo è fermo nella stessa posizione da 5 minuti.', 'warning')}
            className="bg-slate-700 hover:bg-slate-600 p-3 rounded-lg text-sm text-left border border-slate-600 transition"
          >
            ⏳ Simula: Fermo da 5 min
          </button>
          <button 
            onClick={() => addNotification('🚨 CRITICO: Deviazione di oltre 200m dal percorso previsto!', 'warning')}
            className="bg-red-900 hover:bg-red-800 p-3 rounded-lg text-sm text-left border border-red-700 transition"
          >
            🗺️ Simula: Percorso Errato
          </button>
        </div>
      </div>
    </div>
  );
}