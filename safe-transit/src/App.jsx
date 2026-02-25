import React, { createContext, useState } from 'react';
import ParentView from './ParentView';
import ChildView from './ChildView';
import SimulationPanel from './SimulationLayer';

// Esportiamo il Context per usarlo nei componenti
export const AppContext = createContext();

export default function App() {
  const [userRole, setUserRole] = useState(null); // 'PARENT' | 'CHILD' | null
  const [tripStatus, setTripStatus] = useState('IDLE'); 
  // Stati: IDLE, ASSIGNED, WALKING_TO_STOP, ON_BUS, ARRIVED_AT_STOP, WALKING_TO_DEST, COMPLETED
  const [currentTrip, setCurrentTrip] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const login = (role) => setUserRole(role);
  const logout = () => setUserRole(null);

  const assignTrip = (trip) => {
    setCurrentTrip(trip);
    setTripStatus('ASSIGNED');
    addNotification('Nuovo viaggio assegnato al bambino.', 'info');
  };

  const updateTripStatus = (newStatus) => {
    setTripStatus(newStatus);
    addNotification(`Il bambino ha aggiornato lo stato: ${newStatus}`, 'success');
  };

  const addNotification = (message, type = 'warning') => {
    const newNotif = { id: Date.now(), message, type, time: new Date().toLocaleTimeString() };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  return (
    <AppContext.Provider value={{
      userRole, tripStatus, currentTrip, notifications,
      login, logout, assignTrip, updateTripStatus, addNotification
    }}>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative pb-20">
        
        {/* Mock Auth View */}
        {!userRole && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
            <h1 className="text-3xl font-bold text-center mb-8">SafeTransit MVP</h1>
            <button 
              onClick={() => login('PARENT')}
              className="w-full max-w-md bg-blue-600 text-white py-6 rounded-2xl text-2xl font-bold shadow-lg active:scale-95 transition"
            >
              👨‍👩‍👧 Accedi come Genitore
            </button>
            <button 
              onClick={() => login('CHILD')}
              className="w-full max-w-md bg-yellow-400 text-black py-6 rounded-2xl text-2xl font-bold shadow-lg active:scale-95 transition"
            >
              🎒 Accedi come Bambino
            </button>
          </div>
        )}

        {/* Header condensato se loggati */}
        {userRole && (
          <header className="bg-white shadow p-4 flex justify-between items-center z-10">
            <h2 className="font-bold text-lg">
              {userRole === 'PARENT' ? 'Dashboard Genitore' : 'In Viaggio'}
            </h2>
            <button onClick={logout} className="text-sm text-gray-500 underline">Esci</button>
          </header>
        )}

        {/* Viste Principali */}
        <main className="flex-1 overflow-y-auto">
          {userRole === 'PARENT' && <ParentView />}
          {userRole === 'CHILD' && <ChildView />}
        </main>

        {/* Pannello Simulazione (Visibile in Demo) */}
        {userRole && <SimulationPanel />}
      </div>
    </AppContext.Provider>
  );
}