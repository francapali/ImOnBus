import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UserRole, ChildTripState, Trip, Notification, RouteOption, TravelDocument } from './types';

interface AppContextType {
  user: UserRole | null;
  setUser: (user: UserRole | null) => void;
  activeTrip: Trip | null;
  setActiveTrip: (trip: Trip | null) => void;
  childState: ChildTripState;
  setChildState: (state: ChildTripState) => void;
  notifications: Notification[];
  addNotification: (message: string, type?: 'ALERT' | 'INFO' | 'SUCCESS') => void;
  clearNotifications: () => void;
  assignTrip: (route: RouteOption) => void;
  // GPS tracking
  childGPSPosition: [number, number] | null;
  setChildGPSPosition: (pos: [number, number] | null) => void;
  // Travel document
  travelDocument: TravelDocument | null;
  setTravelDocument: (doc: TravelDocument | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRole | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [childState, setChildState] = useState<ChildTripState>(ChildTripState.IDLE);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [childGPSPosition, setChildGPSPosition] = useState<[number, number] | null>(null);
  const [travelDocument, setTravelDocument] = useState<TravelDocument | null>(null);

  const addNotification = useCallback((message: string, type: 'ALERT' | 'INFO' | 'SUCCESS' = 'INFO') => {
    const newNotification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const assignTrip = useCallback((route: RouteOption) => {
    const hasBus = !!(route.computedRoute?.busSegments && route.computedRoute.busSegments.length > 0);
    const initialState = hasBus ? ChildTripState.WALKING_TO_STOP : ChildTripState.WALKING_TO_DEST;

    const newTrip: Trip = {
      id: Math.random().toString(36).substr(2, 9),
      route,
      status: initialState,
      hasBus,
    };
    setActiveTrip(newTrip);
    setChildState(initialState);

    // Set initial GPS position to departure
    if (route.computedRoute?.geometry?.[0]) {
      setChildGPSPosition(route.computedRoute.geometry[0]);
    }

    addNotification(`Nuovo viaggio assegnato: ${route.departure} -> ${route.arrival}`, 'INFO');
  }, [addNotification]);

  return (
    <AppContext.Provider value={{
      user, setUser,
      activeTrip, setActiveTrip,
      childState, setChildState,
      notifications, addNotification,
      clearNotifications,
      assignTrip,
      childGPSPosition, setChildGPSPosition,
      travelDocument, setTravelDocument,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
