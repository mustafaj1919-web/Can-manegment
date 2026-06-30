export interface VehicleImage {
  id: string;
  filename: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  mileage?: number;
  engine?: string;
  transmission?: string;
  fuel_type?: string;
  price: number;
  status: 'Available' | 'Sold' | 'Reserved';
  notes?: string;
  images: VehicleImage[];
}

export interface VehicleFilters {
  brands: string[];
  years: number[];
  fuel_types: string[];
}
