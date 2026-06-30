import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerProfile } from '../types/customer';

let profile: CustomerProfile | null = null;
let token: string | null = null;
const listeners = new Set<() => void>();

export const authStore = {
  getProfile() {
    return profile;
  },
  getToken() {
    return token;
  },
  async load() {
    try {
      token = await AsyncStorage.getItem('customer_token');
      const pStr = await AsyncStorage.getItem('customer_profile');
      profile = pStr ? JSON.parse(pStr) : null;
    } catch {
      profile = null;
      token = null;
    }
    this.notify();
  },
  async setSession(t: string, p: CustomerProfile) {
    token = t;
    profile = p;
    await AsyncStorage.setItem('customer_token', t);
    await AsyncStorage.setItem('customer_profile', JSON.stringify(p));
    this.notify();
  },
  async clearSession() {
    token = null;
    profile = null;
    await AsyncStorage.removeItem('customer_token');
    await AsyncStorage.removeItem('customer_profile');
    this.notify();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  notify() {
    listeners.forEach((l) => l());
  },
};
