export interface TripLogEntry {
  id: string;
  date: string;
  startKm: number;
  endKm: number;
  distance: number;
  route: string;
  personalKm: number;
  fuelLitres?: number | null;
  driver: string;
  plate: string;
  timestamp: string;
  status: 'synced' | 'pending' | 'failed';
  errorMessage?: string;
}

export interface SubmitPayload {
  action?: string;
  date: string;
  startKm: number;
  endKm: number;
  distance: number;
  route: string;
  personalKm: number;
  fuelLitres: number | null;
  driver: string;
  plate: string;
  timestamp: string;
}

export interface AppConfig {
  apiUrl: string;
  driverName: string;
  plateNumber: string;
  modelName: string;
}

