import { requestApi } from './apiClient';
import { Vehicle, VehicleFilters } from '../types/vehicle';

export const vehicleService = {
  async getVehicles(params: {
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    year?: number;
    fuelType?: string;
    search?: string;
    page?: number;
    perPage?: number;
  } = {}) {
    const queryParts = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
    
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    
    return requestApi<{
      total: number;
      page: number;
      per_page: number;
      items: Vehicle[];
    }>(`public/vehicles${queryString}`);
  },

  async getVehicleDetails(id: string) {
    return requestApi<Vehicle>(`public/vehicles/${id}`);
  },

  async getFilters() {
    return requestApi<VehicleFilters>('public/vehicles/filters');
  },

  async submitLead(name: string, phone: string, vehicleId?: string, message?: string) {
    return requestApi('public/vehicles/leads', {
      method: 'POST',
      body: JSON.stringify({ name, phone, vehicleId, message }),
    });
  },

  async submitVisitRequest(name: string, phone: string, vehicleId?: string, visitDate?: string) {
    return requestApi('public/vehicles/visit-requests', {
      method: 'POST',
      body: JSON.stringify({ name, phone, vehicleId, visitDate }),
    });
  }
};
