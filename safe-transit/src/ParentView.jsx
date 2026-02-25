import React, { useState, useContext } from 'react';
import { AppContext } from './App';

export default function ParentView() {
  const { assignTrip, notifications } = useContext(AppContext);
  const [showRoutes, setShowRoutes] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setShowRoutes(true);
  };

  const routesMock = [
    { id: 1, time: '25 min', score: 95, path: 'Linea Rossa -> Linea Blu' },
    { id: 2, time: '35 min', score: 98, path: 'Linea Verde Diretta' },
    { id: 3, time: '20 min', score: 80, path: 'A piedi -> Linea Gialla' }
  ];

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Form Pianificazione */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-xl font-bold mb-4 text-blue-800">Pianifica Viaggio</h3>
        <form onSubmit={handleSearch} className="space-y-4">
          <input type="text" placeholder="Partenza (es. Casa)" className="w-full p-3 rounded-lg border bg-gray-50" required />
          <input type="text" placeholder="Arrivo (es. Scuola)" className="w-full p-3 rounded-lg border bg-gray-50" required />
          <input type="time" className="w-full p-3 rounded-lg border bg-gray-50" required />
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Cerca Percorsi</button>
        </form>
      </div>

      {/* Card Percorsi */}
      {showRoutes && (
        <div className="space-y-3">
          <h4 className="font-bold text-gray-700">Percorsi Consigliati</h4>
          {routesMock.map((route) => (
            <div key={route.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-bold">{route.time}</p>
                <p className="text-sm text-gray-500">{route.path}</p>
                <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                  Safety Score: {route.score}/100
                </span>
              </div>
              <button 
                onClick={() => assignTrip(route)}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200"
              >
                Assegna
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Centro Notifiche */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mt-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🔔</span> Centro Notifiche
        </h3>
        {notifications.length === 0 ? (
          <p className="text-gray-500 italic">Nessun alert attivo.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className={`p-3 rounded-lg border ${n.type === 'warning' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                <span className="text-xs opacity-70 block mb-1">{n.time}</span>
                <strong>{n.message}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}