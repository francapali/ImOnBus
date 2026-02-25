export enum UserRole {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
}

export enum ChildTripState {
  IDLE = 'IDLE',
  WALKING_TO_STOP = 'WALKING_TO_STOP',
  ON_BUS = 'ON_BUS',
  ARRIVED_AT_STOP = 'ARRIVED_AT_STOP',
  WALKING_TO_DEST = 'WALKING_TO_DEST',
}

export interface RouteOption {
  id: string;
  estimatedTime: string;
  safetyScore: number;
  departure: string;
  arrival: string;
  time: string;
}

export interface Notification {
  id: string;
  type: 'ALERT' | 'INFO' | 'SUCCESS';
  message: string;
  timestamp: Date;
}

export interface Trip {
  id: string;
  route: RouteOption;
  status: ChildTripState;
}
