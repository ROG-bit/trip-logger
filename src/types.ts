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

export interface SheetTripEntry {
  id: string;
  row: number;
  sheetName: string;
  date: string;
  isoDate?: string;
  driver: string;
  startKm: number;
  endKm: number;
  distance: number;
  personalKm: number;
  fuelLitres?: number | null;
  route: string;
}

export interface SheetHistoryTotals {
  totalDistance: number;
  totalPersonalKm: number;
  totalFuel: number;
  tripCount: number;
}

export interface SheetHistoryResponse {
  status: 'success' | 'error';
  message?: string;
  sheetName: string;
  availableSheets: string[];
  entries: SheetTripEntry[];
  totals: SheetHistoryTotals;
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
  sheetName?: string;
  row?: number;
  isEdit?: boolean;
}

export interface AppConfig {
  apiUrl: string;
  driverName: string;
  plateNumber: string;
  modelName: string;
}

