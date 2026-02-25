import React from 'react';
import { UserRole } from '../types';
import { useAppContext } from '../AppContext';
import { User, Baby, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const AuthView: React.FC = () => {
  const { setUser } = useAppContext();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex justify-center mb-4">
          <ShieldCheck className="w-16 h-16 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">SafeStep</h1>
        <p className="text-slate-500 mt-2">Sicurezza intelligente per piccoli viaggiatori</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 w-full max-w-md">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setUser(UserRole.PARENT)}
          className="flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-200 rounded-3xl shadow-sm hover:border-emerald-500 transition-colors group"
        >
          <div className="p-4 bg-slate-100 rounded-full group-hover:bg-emerald-100 transition-colors">
            <User className="w-10 h-10 text-slate-600 group-hover:text-emerald-600" />
          </div>
          <span className="mt-4 text-xl font-semibold text-slate-800">Accedi come Genitore</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setUser(UserRole.CHILD)}
          className="flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-200 rounded-3xl shadow-sm hover:border-indigo-500 transition-colors group"
        >
          <div className="p-4 bg-slate-100 rounded-full group-hover:bg-indigo-100 transition-colors">
            <Baby className="w-10 h-10 text-slate-600 group-hover:text-indigo-600" />
          </div>
          <span className="mt-4 text-xl font-semibold text-slate-800">Accedi come Bambino</span>
        </motion.button>
      </div>
    </div>
  );
};
