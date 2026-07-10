import { create } from 'zustand';

export type CarColor = {
  id: string;
  nameAr: string;
  nameEn: string;
  hex: string;
  roughness: number;
  metalness: number;
};

export const AVAILABLE_COLORS: CarColor[] = [
  { id: 'black', nameAr: 'أسود كوني', nameEn: 'Cosmos Black', hex: '#0a0a0c', roughness: 0.1, metalness: 0.9 },
  { id: 'white', nameAr: 'أبيض ثلجي', nameEn: 'Snow White', hex: '#fcfcfc', roughness: 0.2, metalness: 0.6 },
  { id: 'red', nameAr: 'أحمر إمبراطوري', nameEn: 'Emperor Red', hex: '#b91c1c', roughness: 0.18, metalness: 0.8 },
  { id: 'blue', nameAr: 'أزرق اليشم', nameEn: 'Jade Blue', hex: '#1e3a8a', roughness: 0.15, metalness: 0.85 },
  { id: 'grey', nameAr: 'رمادي الزمن', nameEn: 'Time Grey', hex: '#4b5563', roughness: 0.1, metalness: 0.9 },
];

export type WheelStyle = {
  id: string;
  nameAr: string;
  nameEn: string;
  radius: number;
};

export const AVAILABLE_WHEELS: WheelStyle[] = [
  { id: 'sport', nameAr: 'جنوط سبورت رياضية 20"', nameEn: '20" Sport Alloy', radius: 0.6 },
  { id: 'classic', nameAr: 'جنوط توربين ميتاليك 19"', nameEn: '19" Metallic Turbine', radius: 0.58 },
  { id: 'offroad', nameAr: 'جنوط كهربائية مغلقة الكفاءة', nameEn: 'Aero-efficient EV', radius: 0.6 },
];

export type EnvironmentType = 'city' | 'desert' | 'mountain' | 'sea';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ShowroomStore {
  // Car config
  selectedColor: CarColor;
  selectedWheels: WheelStyle;
  lightsOn: boolean;
  doorsOpen: boolean;
  hoodOpen: boolean;
  
  // Environment settings
  environment: EnvironmentType;
  
  // Simulator settings
  isDriving: boolean;
  speed: number; // 0 to 180 km/h
  rpm: number;
  battery: number; // 0 to 100%
  soundEnabled: boolean;
  
  // Localization
  lang: 'ar' | 'en';
  
  // AI assistant chat
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  
  // Actions
  setColor: (colorId: string) => void;
  setWheels: (wheelsId: string) => void;
  toggleLights: () => void;
  toggleDoors: () => void;
  toggleHood: () => void;
  setEnvironment: (env: EnvironmentType) => void;
  setDriving: (driving: boolean) => void;
  setSpeed: (speed: number) => void;
  toggleSound: () => void;
  setLang: (lang: 'ar' | 'en') => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;
  clearChat: () => void;
}

export const useShowroomStore = create<ShowroomStore>((set) => ({
  selectedColor: AVAILABLE_COLORS[3], // Jade Blue default
  selectedWheels: AVAILABLE_WHEELS[0], // Sport alloy
  lightsOn: false,
  doorsOpen: false,
  hoodOpen: false,
  environment: 'city',
  
  isDriving: false,
  speed: 0,
  rpm: 800,
  battery: 92,
  soundEnabled: true,
  
  lang: 'ar',
  
  chatMessages: [
    {
      role: 'assistant',
      content: 'مرحباً بك في صالة عرض BYD أريج نينوى التفاعلية! أنا مصمم سيارات BYD الذكي. كيف يمكنني مساعدتك اليوم في تصميم سيارتك الكهربائية أو حجز تجربة قيادة؟\n\nWelcome to Areej Nineveh BYD Immersive Showroom! I am your AI BYD Assistant. How can I help you customize your electric BYD or book a test drive today?'
    }
  ],
  isChatLoading: false,
  
  setColor: (colorId) => {
    const color = AVAILABLE_COLORS.find(c => c.id === colorId);
    if (color) set({ selectedColor: color });
  },
  
  setWheels: (wheelsId) => {
    const wheels = AVAILABLE_WHEELS.find(w => w.id === wheelsId);
    if (wheels) set({ selectedWheels: wheels });
  },
  
  toggleLights: () => set((state) => ({ lightsOn: !state.lightsOn })),
  toggleDoors: () => set((state) => ({ doorsOpen: !state.doorsOpen })),
  toggleHood: () => set((state) => ({ hoodOpen: !state.hoodOpen })),
  
  setEnvironment: (env) => set({ environment: env }),
  
  setDriving: (driving) => set(driving ? { isDriving: true } : { isDriving: false, speed: 0, rpm: 800 }),
  
  setSpeed: (speed) => set((state) => {
    // Calculate RPM based on speed
    const rpm = state.isDriving ? 800 + Math.round((speed / 180) * 5000) : 800;
    // Calculate battery discharge slightly over time if driving
    const newBattery = state.isDriving ? Math.max(20, state.battery - 0.01) : state.battery;
    return { speed, rpm, battery: newBattery };
  }),
  
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  
  setLang: (lang) => set({ lang }),
  
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),
  
  setChatLoading: (loading) => set({ isChatLoading: loading }),
  
  clearChat: () => set((state) => ({
    chatMessages: [
      {
        role: 'assistant',
        content: state.lang === 'ar' 
          ? 'مرحباً بك! أنا مساعدك الذكي لتصميم سيارات BYD. اسألني عن الطلاء والجنوط وتعديل الطقس أو حجز موعد!' 
          : 'Welcome! I am your AI assistant. Ask me to change paint, wheels, customize weather, or book a test drive!'
      }
    ]
  }))
}));
