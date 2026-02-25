import React from 'react';
import { AppProvider, useAppContext } from './AppContext';
import { AuthView } from './components/AuthView';
import { ParentView } from './components/ParentView';
import { ChildView } from './components/ChildView';
import { SimulationPanel } from './components/SimulationPanel';
import { UserRole } from './types';
import { LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, setUser } = useAppContext();

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="relative min-h-screen">
      {/* Logout Button (Top Right) */}
      <button 
        onClick={() => setUser(null)}
        className="fixed top-4 right-4 z-[60] p-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full shadow-sm hover:bg-white transition-colors"
        title="Esci"
      >
        <LogOut className="w-5 h-5 text-slate-600" />
      </button>

      {user === UserRole.PARENT ? <ParentView /> : <ChildView />}
      
      <SimulationPanel />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
