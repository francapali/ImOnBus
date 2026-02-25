import React, { useContext } from 'react';
import { AppContext } from './App';

export default function ChildView() {
  const { tripStatus, updateTripStatus, addNotification } = useContext(AppContext);

  const handleSOS = () => {
    addNotification('🚨 EMERGENZA SOS ATTIVATA DAL BAMBINO!', 'warning');
    alert('Chiamata di emergenza simulata in corso...');
  };

  const renderStateContent = () => {
    switch (tripStatus) {
      case 'IDLE':
      case 'COMPLETED':
        return (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-400">Nessun viaggio programmato.</h2>
          </div>
        );
      
      case 'ASSIGNED':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">Hai un nuovo viaggio!</h2>
            <button onClick={() => updateTripStatus('WALKING_TO_STOP')} className="w-full bg-green-500 text-white py-8 rounded-3xl text-3xl font-black shadow-xl">
              Inizia a camminare
            </button>
          </div>
        );

      case 'WALKING_TO_STOP':
        return (
          <div className="flex-1 flex flex-col p-4 space-y-4">
            <div className="flex-1 bg-gray-300 rounded-2xl flex items-center justify-center border-4 border-dashed border-gray-400">
              <span className="text-gray-500 font-bold">[Mappa Placeholder]</span>
            </div>
            <button onClick={() => updateTripStatus('ON_BUS')} className="w-full bg-blue-600 text-white py-8 rounded-3xl text-2xl font-black shadow-xl">
              Sono alla fermata<br/><span className="text-sm font-normal">(Simula Scan Biglietto)</span>
            </button>
          </div>
        );

      case 'ON_BUS':
        return (
          <div className="flex-1 flex flex-col p-4 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm flex-1">
              <h3 className="font-bold text-xl mb-4">Prossime Fermate</h3>
              <ul className="space-y-4 text-lg">
                <li className="text-gray-400 line-through">1. Via Roma</li>
                <li className="font-black text-blue-700 bg-blue-50 p-2 rounded-lg">2. Piazza Verdi (Attuale)</li>
                <li className="text-gray-600 font-bold">3. Scuola (Scendi qui)</li>
              </ul>
            </div>
            <button onClick={() => updateTripStatus('ARRIVED_AT_STOP')} className="w-full bg-yellow-400 text-black py-8 rounded-3xl text-2xl font-black shadow-xl">
              Prenota Fermata di Discesa
            </button>
          </div>
        );

      case 'ARRIVED_AT_STOP':
        return (
          <div className="flex-1 flex flex-col p-4 space-y-6 justify-center">
            <h2 className="text-3xl font-black text-center mb-4">Sei sceso dal bus. Come va?</h2>
            <button onClick={() => updateTripStatus('WALKING_TO_DEST')} className="w-full bg-green-500 text-white py-10 rounded-3xl text-3xl font-black shadow-xl">
              Tutto Bene 👍
            </button>
            <button onClick={() => { addNotification('Il bambino ha segnalato un problema alla discesa!', 'warning'); alert('Genitore avvisato!'); }} className="w-full bg-red-500 text-white py-10 rounded-3xl text-3xl font-black shadow-xl">
              Ho un problema 👎
            </button>
          </div>
        );

      case 'WALKING_TO_DEST':
        return (
          <div className="flex-1 flex flex-col p-4 space-y-4">
            <div className="flex-1 bg-gray-300 rounded-2xl flex items-center justify-center border-4 border-dashed border-gray-400">
              <span className="text-gray-500 font-bold">[Mappa Finale Placeholder]</span>
            </div>
            <button onClick={() => updateTripStatus('COMPLETED')} className="w-full bg-green-500 text-white py-8 rounded-3xl text-3xl font-black shadow-xl">
              Sono Arrivato! 🏁
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-yellow-50 relative">
      {renderStateContent()}
      
      {/* Bottone SOS Globale per il bambino */}
      <button 
        onClick={handleSOS}
        className="absolute bottom-4 left-4 right-4 bg-red-600 text-white font-black text-2xl py-6 rounded-full shadow-2xl border-4 border-red-800 animate-pulse"
      >
        🆘 SOS
      </button>
    </div>
  );
}