import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestApi } from './apiClient';
import { CustomerProfile } from '../types/customer';

export const authService = {
  async login(phone: string, idNumber: string) {
    const res = await requestApi<{ token: string; customer: CustomerProfile }>('customer/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password: idNumber }),
    });

    if (res.success && res.data?.token) {
      await AsyncStorage.setItem('customer_token', res.data.token);
      await AsyncStorage.setItem('customer_profile', JSON.stringify(res.data.customer));
    }
    return res;
  },

  async logout() {
    await AsyncStorage.removeItem('customer_token');
    await AsyncStorage.removeItem('customer_profile');
  },

  async getStoredProfile(): Promise<CustomerProfile | null> {
    try {
      const data = await AsyncStorage.getItem('customer_profile');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async refreshToken() {
    const res = await requestApi<{ token: string }>('customer/auth/refresh', {
      method: 'POST',
    });
    if (res.success && res.data?.token) {
      await AsyncStorage.setItem('customer_token', res.data.token);
    }
    return res;
  }
};
