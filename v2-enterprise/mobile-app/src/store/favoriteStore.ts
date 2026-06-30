import AsyncStorage from '@react-native-async-storage/async-storage';

let favorites: string[] = [];
const listeners = new Set<() => void>();

export const favoriteStore = {
  getFavorites() {
    return favorites;
  },
  async load() {
    try {
      const favsStr = await AsyncStorage.getItem('customer_favorites');
      favorites = favsStr ? JSON.parse(favsStr) : [];
    } catch {
      favorites = [];
    }
    this.notify();
  },
  async toggleFavorite(vehicleId: string) {
    if (favorites.includes(vehicleId)) {
      favorites = favorites.filter(id => id !== vehicleId);
    } else {
      favorites = [...favorites, vehicleId];
    }
    await AsyncStorage.setItem('customer_favorites', JSON.stringify(favorites));
    this.notify();
  },
  isFavorite(vehicleId: string) {
    return favorites.includes(vehicleId);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  notify() {
    listeners.forEach(l => l());
  }
};
