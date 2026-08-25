export interface TrimSpec {
  transmission?: 'Automatic' | 'Manual' | 'CVT' | 'DCT'
  fuel_type?: 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric'
  engine_size?: string
  cylinders?: number
  seat_count?: number
  import_country?: string
}

// brand → model → trim → spec
export const CAR_SPECS: Record<string, Record<string, Record<string, TrimSpec>>> = {

  // ─── Toyota ───────────────────────────────────────────────────────────────
  Toyota: {
    Camry: {
      'GLX':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'SE':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'XSE':          { transmission: 'CVT',       fuel_type: 'Hybrid',   engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'XLE':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'XLE Hybrid':   { transmission: 'CVT',       fuel_type: 'Hybrid',   engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'LE':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'TRD':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 5, import_country: 'Japan' },
    },
    'Land Cruiser': {
      'GX-R':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 8, import_country: 'Japan' },
      'VX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 7, import_country: 'Japan' },
      'VXR':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 8, import_country: 'Japan' },
      'GR Sport':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'Japan' },
      'ZX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'Japan' },
      'Sahara':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'Japan' },
    },
    'Land Cruiser Prado': {
      'GX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 7, import_country: 'Japan' },
      'VX':           { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '3.0L', cylinders: 4, seat_count: 7, import_country: 'Japan' },
      'TXL':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 7, import_country: 'Japan' },
      'TZ-G':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 7, import_country: 'Japan' },
    },
    '4Runner': {
      'SR5':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 5, import_country: 'Japan' },
      'SR5 Premium':  { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 5, import_country: 'Japan' },
      'TRD Off-Road': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 5, import_country: 'Japan' },
      'TRD Pro':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 5, import_country: 'Japan' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 7, import_country: 'Japan' },
    },
    Fortuner: {
      'GX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.7L', cylinders: 4, seat_count: 7, import_country: 'Japan' },
      'VX':           { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.8L', cylinders: 4, seat_count: 7, import_country: 'Japan' },
      'GR Sport':     { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.8L', cylinders: 4, seat_count: 7, import_country: 'Japan' },
      'Legender':     { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.8L', cylinders: 4, seat_count: 7, import_country: 'Japan' },
    },
    Sequoia: {
      'SR5':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'TRD Pro':      { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'Capstone':     { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'USA' },
    },
    Hilux: {
      'SR':           { transmission: 'Manual',    fuel_type: 'Gasoline', engine_size: '2.7L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'SR5':          { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.8L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'Rogue':        { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.8L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
    },
    RAV4: {
      'GX':           { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'EX':           { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'XLE':          { transmission: 'CVT',       fuel_type: 'Hybrid',   engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'Adventure':    { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'TRD Off-Road': { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
    },
    Corolla: {
      'XLI':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'GLI':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.6L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'SE':           { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'XSE':          { transmission: 'CVT',       fuel_type: 'Hybrid',   engine_size: '1.8L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
    },
    Highlander: {
      'LE':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.4L', cylinders: 4, seat_count: 8, import_country: 'USA' },
      'XLE':          { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '2.5L', cylinders: 4, seat_count: 8, import_country: 'USA' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '2.5L', cylinders: 4, seat_count: 7, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '2.5L', cylinders: 4, seat_count: 7, import_country: 'USA' },
    },
    Tundra: {
      'SR5':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'TRD Pro':      { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      '1794 Edition': { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Capstone':     { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
    },
    Prius: {
      'LE':           { transmission: 'CVT', fuel_type: 'Hybrid', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'XLE':          { transmission: 'CVT', fuel_type: 'Hybrid', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'Limited':      { transmission: 'CVT', fuel_type: 'Hybrid', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
    },
    Rush: {
      'S':            { transmission: 'Manual',    fuel_type: 'Gasoline', engine_size: '1.5L', cylinders: 4, seat_count: 7, import_country: 'Indonesia' },
      'G':            { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.5L', cylinders: 4, seat_count: 7, import_country: 'Indonesia' },
    },
  },

  // ─── Kia ──────────────────────────────────────────────────────────────────
  Kia: {
    Sportage: {
      'LX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'EX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'SX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'SX Prestige':  { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'X-Line':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'Hybrid':       { transmission: 'DCT',       fuel_type: 'Hybrid',   engine_size: '1.6L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
    },
    Sorento: {
      'LX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 7, import_country: 'South Korea' },
      'EX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 7, import_country: 'South Korea' },
      'SX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 7, import_country: 'South Korea' },
      'SX Prestige':  { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 7, import_country: 'South Korea' },
      'Hybrid':       { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.6L', cylinders: 4, seat_count: 7, import_country: 'South Korea' },
    },
    Telluride: {
      'LX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'S':            { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'EX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'SX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'SX Prestige':  { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'X-Pro':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 8, import_country: 'USA' },
    },
    Carnival: {
      'LX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 8, import_country: 'South Korea' },
      'EX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 8, import_country: 'South Korea' },
      'SX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 8, import_country: 'South Korea' },
      'SX Prestige':  { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 7, import_country: 'South Korea' },
    },
    Cerato: {
      'LX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.6L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'EX':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'GT':           { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.6L Turbo', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
    },
    Mohave: {
      'EX':           { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '3.0L', cylinders: 6, seat_count: 7, import_country: 'South Korea' },
      'Gravity':      { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '3.0L', cylinders: 6, seat_count: 7, import_country: 'South Korea' },
    },
  },

  // ─── Hyundai ──────────────────────────────────────────────────────────────
  Hyundai: {
    Tucson: {
      'GLS':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'GL':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'N Line':       { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.6L Turbo', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'Hybrid':       { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.6L Turbo', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
    },
    'Santa Fe': {
      'GLS':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 7, import_country: 'South Korea' },
      'GL':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'Calligraphy':  { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.6L Turbo', cylinders: 4, seat_count: 7, import_country: 'South Korea' },
    },
    Palisade: {
      'SE':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 8, import_country: 'South Korea' },
      'SEL':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 8, import_country: 'South Korea' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 7, import_country: 'South Korea' },
      'Calligraphy':  { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.8L', cylinders: 6, seat_count: 7, import_country: 'South Korea' },
    },
    Staria: {
      'Load':         { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.2L', cylinders: 4, seat_count: 9, import_country: 'South Korea' },
      'Trend':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 9, import_country: 'South Korea' },
      'Premium':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 7, import_country: 'South Korea' },
      'Lounge':       { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.6L Turbo', cylinders: 4, seat_count: 7, import_country: 'South Korea' },
    },
    Elantra: {
      'GLS':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.6L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
      'N Line':       { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.6L Turbo', cylinders: 4, seat_count: 5, import_country: 'South Korea' },
    },
    'Grand Santa Fe': {
      'GL':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.3L', cylinders: 6, seat_count: 7, import_country: 'South Korea' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.3L', cylinders: 6, seat_count: 7, import_country: 'South Korea' },
    },
  },

  // ─── BYD ──────────────────────────────────────────────────────────────────
  BYD: {
    'Atto 3': {
      'Standard Range': { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 150kW', cylinders: 0, seat_count: 5, import_country: 'China' },
      'Extended Range': { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 150kW', cylinders: 0, seat_count: 5, import_country: 'China' },
    },
    Seal: {
      'Dynamic':      { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 150kW', cylinders: 0, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 230kW', cylinders: 0, seat_count: 5, import_country: 'China' },
      'Performance':  { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 390kW', cylinders: 0, seat_count: 5, import_country: 'China' },
    },
    Han: {
      'EV Dynamic':   { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 180kW', cylinders: 0, seat_count: 5, import_country: 'China' },
      'EV Premium':   { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 320kW', cylinders: 0, seat_count: 5, import_country: 'China' },
      'DM':           { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    Tang: {
      'EV':           { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 380kW', cylinders: 0, seat_count: 7, import_country: 'China' },
      'DM':           { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '2.0L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
    },
    'Song Plus': {
      'EV':           { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 135kW', cylinders: 0, seat_count: 5, import_country: 'China' },
      'DM Premium':   { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.5L', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    'Song Pro': {
      'DM':           { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.5L', cylinders: 4, seat_count: 5, import_country: 'China' },
      'EV':           { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 135kW', cylinders: 0, seat_count: 5, import_country: 'China' },
    },
    Dolphin: {
      'Standard':     { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 70kW', cylinders: 0, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 130kW', cylinders: 0, seat_count: 5, import_country: 'China' },
    },
    'Sea Lion 6': {
      'Premium':      { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.5L', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Excellence':   { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.5L', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    'Destroyer 05': {
      'Honor':        { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.5L', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.5L', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
  },

  // ─── Chevrolet ────────────────────────────────────────────────────────────
  Chevrolet: {
    Tahoe: {
      'LS':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'LT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'Z71':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'LTZ':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'Premier':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'High Country': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 8, import_country: 'USA' },
    },
    Suburban: {
      'LS':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 9, import_country: 'USA' },
      'LT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 9, import_country: 'USA' },
      'Z71':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 9, import_country: 'USA' },
      'LTZ':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 9, import_country: 'USA' },
      'Premier':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 9, import_country: 'USA' },
      'High Country': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 9, import_country: 'USA' },
    },
    Silverado: {
      'WT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.3L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'LT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 5, import_country: 'USA' },
      'LTZ':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 5, import_country: 'USA' },
      'High Country': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 5, import_country: 'USA' },
    },
    Trailblazer: {
      'LS':           { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.2L Turbo', cylinders: 3, seat_count: 5, import_country: 'South Korea' },
      'LT':           { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.3L Turbo', cylinders: 3, seat_count: 5, import_country: 'South Korea' },
      'RS':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.3L Turbo', cylinders: 3, seat_count: 5, import_country: 'South Korea' },
      'ACTIV':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.3L Turbo', cylinders: 3, seat_count: 5, import_country: 'South Korea' },
    },
    Colorado: {
      'WT':           { transmission: 'Manual',    fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Thailand' },
      'LT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Z71':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'ZR2':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
    },
    Traverse: {
      'LS':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 8, import_country: 'USA' },
      'LT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'RS':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'High Country': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 7, import_country: 'USA' },
    },
    Captiva: {
      'LS':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
      'LT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
      'Premier':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
    },
  },

  // ─── GMC ──────────────────────────────────────────────────────────────────
  GMC: {
    Yukon: {
      'SLE':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'SLT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'AT4':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'Denali':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'Denali Ultimate': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 7, import_country: 'USA' },
    },
    'Yukon XL': {
      'SLE':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 9, import_country: 'USA' },
      'SLT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 9, import_country: 'USA' },
      'Denali':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 9, import_country: 'USA' },
    },
    Sierra: {
      'SLE':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 5, import_country: 'USA' },
      'SLT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 5, import_country: 'USA' },
      'AT4':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.3L', cylinders: 8, seat_count: 5, import_country: 'USA' },
      'Denali':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 5, import_country: 'USA' },
    },
    Terrain: {
      'SLE':          { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'Canada' },
      'SLT':          { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'Canada' },
      'Denali':       { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Canada' },
    },
    Acadia: {
      'SLE':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 7, import_country: 'USA' },
      'SLT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'AT4':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Denali':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 7, import_country: 'USA' },
    },
  },

  // ─── Nissan ───────────────────────────────────────────────────────────────
  Nissan: {
    Patrol: {
      'XE':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 7, import_country: 'Japan' },
      'SE':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L', cylinders: 6, seat_count: 8, import_country: 'Japan' },
      'LE':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.6L', cylinders: 8, seat_count: 8, import_country: 'Japan' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.6L', cylinders: 8, seat_count: 8, import_country: 'Japan' },
      'Nismo':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.6L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
    },
    'X-Trail': {
      'S':            { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'SV':           { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 7, import_country: 'Japan' },
      'SL':           { transmission: 'CVT',       fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 7, import_country: 'Japan' },
    },
    Navara: {
      'S':            { transmission: 'Manual',    fuel_type: 'Diesel',   engine_size: '2.3L', cylinders: 4, seat_count: 5, import_country: 'Thailand' },
      'SE':           { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.3L', cylinders: 4, seat_count: 5, import_country: 'Thailand' },
      'LE':           { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Thailand' },
    },
    Altima: {
      'S':            { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'USA' },
      'SV':           { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'USA' },
      'SR':           { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'USA' },
      'SL':           { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'USA' },
      'Platinum':     { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'USA' },
    },
    Pathfinder: {
      'S':            { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'SV':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'SL':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 7, import_country: 'USA' },
    },
  },

  // ─── Lexus ────────────────────────────────────────────────────────────────
  Lexus: {
    'LX 570': {
      'Base':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 8, import_country: 'Japan' },
      'Sport':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
      'Black Edition': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
      'Inspiration':  { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
    },
    'LX 600': {
      'Standard':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'Japan' },
      'Premium':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'Japan' },
      'F Sport':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'Japan' },
      'VIP':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 4, import_country: 'Japan' },
    },
    'GX 460': {
      'Base':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.6L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
      'Premium':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.6L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
      'Luxury':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.6L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
    },
    'RX 350': {
      'Base':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 5, import_country: 'Canada' },
      'F Sport':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 5, import_country: 'Canada' },
      'Luxury':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 5, import_country: 'Canada' },
      'Black Line':   { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 5, import_country: 'Canada' },
    },
    'ES 350': {
      'Base':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 5, import_country: 'Japan' },
      'F Sport':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 5, import_country: 'Japan' },
      'Luxury':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 5, import_country: 'Japan' },
    },
    'ES 300h': {
      'Base':         { transmission: 'CVT', fuel_type: 'Hybrid', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'F Sport':      { transmission: 'CVT', fuel_type: 'Hybrid', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'Luxury':       { transmission: 'CVT', fuel_type: 'Hybrid', engine_size: '2.5L', cylinders: 4, seat_count: 5, import_country: 'Japan' },
    },
  },

  // ─── Mercedes-Benz ────────────────────────────────────────────────────────
  'Mercedes-Benz': {
    'GLE 300': {
      'AMG Line':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Germany' },
      'Business':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Germany' },
    },
    'GLE 450': {
      'AMG Line':     { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'Germany' },
      '4MATIC':       { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'Germany' },
    },
    'GLS 450': {
      'Base':         { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'AMG Line':     { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 7, import_country: 'USA' },
    },
    'GLS 580': {
      'Base':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L Bi-Turbo', cylinders: 8, seat_count: 7, import_country: 'USA' },
    },
    'E 300': {
      'Avantgarde':   { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Germany' },
      'AMG Line':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Germany' },
    },
    'S 500': {
      'Base':         { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'Germany' },
      'AMG Line':     { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'Germany' },
      'Maybach':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.0L Bi-Turbo', cylinders: 8, seat_count: 4, import_country: 'Germany' },
    },
    'GLC 300': {
      'AMG Line':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Germany' },
      '4MATIC':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Germany' },
    },
  },

  // ─── BMW ──────────────────────────────────────────────────────────────────
  BMW: {
    X5: {
      'xDrive40i':    { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'xDrive50e':    { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'M60i':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 5, import_country: 'USA' },
      'M Competition': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 5, import_country: 'USA' },
    },
    X7: {
      'xDrive40i':    { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'M60i':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 7, import_country: 'USA' },
      'M Competition': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 7, import_country: 'USA' },
    },
    '5 Series': {
      '520i':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'Germany' },
      '530i':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L', cylinders: 4, seat_count: 5, import_country: 'Germany' },
      '540i':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'Germany' },
      'M550i':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 5, import_country: 'Germany' },
    },
    '7 Series': {
      '740i':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'Germany' },
      '760i':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 5, import_country: 'Germany' },
      'M760e':        { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'Germany' },
    },
  },

  // ─── Ford ─────────────────────────────────────────────────────────────────
  Ford: {
    Explorer: {
      'XLT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.3L Turbo', cylinders: 4, seat_count: 7, import_country: 'USA' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.3L Turbo', cylinders: 4, seat_count: 7, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L Turbo', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'ST':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L Turbo', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Timberline':   { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.3L Turbo', cylinders: 4, seat_count: 7, import_country: 'USA' },
    },
    'F-150': {
      'XL':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.3L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'XLT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.7L Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Lariat':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.7L Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'King Ranch':   { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.5L Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Raptor':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Turbo', cylinders: 6, seat_count: 5, import_country: 'USA' },
    },
    Ranger: {
      'XL':           { transmission: 'Manual',    fuel_type: 'Diesel',   engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Thailand' },
      'XLT':          { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Thailand' },
      'Wildtrak':     { transmission: 'Automatic', fuel_type: 'Diesel',   engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Thailand' },
      'Raptor':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.3L Turbo', cylinders: 4, seat_count: 5, import_country: 'USA' },
    },
    Expedition: {
      'XLT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Turbo', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Turbo', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Turbo', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'Stealth':      { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.5L Turbo', cylinders: 6, seat_count: 8, import_country: 'USA' },
    },
  },

  // ─── Jeep ─────────────────────────────────────────────────────────────────
  Jeep: {
    Wrangler: {
      'Sport':        { transmission: 'Manual',    fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Sahara':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Rubicon':      { transmission: 'Manual',    fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      '4xe':          { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'USA' },
    },
    'Grand Cherokee': {
      'Laredo':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Trailhawk':    { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Overland':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 5, import_country: 'USA' },
      'Summit':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 5, import_country: 'USA' },
      'SRT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.4L', cylinders: 8, seat_count: 5, import_country: 'USA' },
    },
    'Grand Cherokee L': {
      'Laredo':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Limited':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Overland':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 7, import_country: 'USA' },
      'Summit':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 6, import_country: 'USA' },
    },
    Gladiator: {
      'Sport':        { transmission: 'Manual',    fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Mojave':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Rubicon':      { transmission: 'Manual',    fuel_type: 'Diesel',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'USA' },
    },
  },

  // ─── Dodge ────────────────────────────────────────────────────────────────
  Dodge: {
    Charger: {
      'SXT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'Canada' },
      'GT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'Canada' },
      'R/T':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 5, import_country: 'Canada' },
      'Scat Pack':    { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.4L', cylinders: 8, seat_count: 5, import_country: 'Canada' },
      'Hellcat':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L Supercharged', cylinders: 8, seat_count: 5, import_country: 'Canada' },
    },
    Durango: {
      'SXT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'GT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'R/T':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 7, import_country: 'USA' },
      'Citadel':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 7, import_country: 'USA' },
      'SRT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.4L', cylinders: 8, seat_count: 7, import_country: 'USA' },
    },
    Challenger: {
      'SXT':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'Canada' },
      'GT':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'Canada' },
      'R/T':          { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.7L', cylinders: 8, seat_count: 5, import_country: 'Canada' },
      'Scat Pack':    { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.4L', cylinders: 8, seat_count: 4, import_country: 'Canada' },
      'Hellcat':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L Supercharged', cylinders: 8, seat_count: 4, import_country: 'Canada' },
    },
  },

  // ─── Cadillac ─────────────────────────────────────────────────────────────
  Cadillac: {
    Escalade: {
      'Standard':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 7, import_country: 'USA' },
      'Luxury':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 7, import_country: 'USA' },
      'Premium Luxury': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 7, import_country: 'USA' },
      'Sport':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 7, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 7, import_country: 'USA' },
    },
    'Escalade ESV': {
      'Standard':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'Luxury':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'Premium Luxury': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 8, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '6.2L', cylinders: 8, seat_count: 8, import_country: 'USA' },
    },
    XT5: {
      'Luxury':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'USA' },
      'Premium Luxury': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Sport':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
      'Platinum':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.6L', cylinders: 6, seat_count: 5, import_country: 'USA' },
    },
  },

  // ─── Lincoln ──────────────────────────────────────────────────────────────
  Lincoln: {
    Navigator: {
      'Standard':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'Reserve':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'Black Label':  { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'USA' },
    },
    'Navigator L': {
      'Standard':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'Reserve':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 8, import_country: 'USA' },
      'Black Label':  { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'USA' },
    },
    Aviator: {
      'Standard':     { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Reserve':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Black Label':  { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L Twin Turbo', cylinders: 6, seat_count: 7, import_country: 'USA' },
    },
  },

  // ─── Infiniti ─────────────────────────────────────────────────────────────
  Infiniti: {
    QX80: {
      'Luxe':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.6L', cylinders: 8, seat_count: 8, import_country: 'Japan' },
      'Premium Select': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.6L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
      'Sensory':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.6L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
      'Autograph':    { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '5.6L', cylinders: 8, seat_count: 7, import_country: 'Japan' },
    },
    QX60: {
      'Pure':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Luxe':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Sensory':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 7, import_country: 'USA' },
      'Autograph':    { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.5L', cylinders: 6, seat_count: 7, import_country: 'USA' },
    },
    Q50: {
      'Pure':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'Japan' },
      'Luxe':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L Twin Turbo', cylinders: 6, seat_count: 5, import_country: 'Japan' },
      'Red Sport':    { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L Twin Turbo', cylinders: 6, seat_count: 5, import_country: 'Japan' },
    },
  },

  // ─── MG ───────────────────────────────────────────────────────────────────
  MG: {
    HS: {
      'Comfort':      { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Trophy':       { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Plug-in':      { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    MG5: {
      'Standard':     { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.5L', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Trophy':       { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    MG6: {
      'Standard':     { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Trophy':       { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    ZS: {
      'Standard':     { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.5L', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Trophy':       { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'EV':           { transmission: 'Automatic', fuel_type: 'Electric', engine_size: 'Electric 105kW', cylinders: 0, seat_count: 5, import_country: 'China' },
    },
  },

  // ─── Haval ────────────────────────────────────────────────────────────────
  Haval: {
    H6: {
      'Ultra':        { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Supreme':      { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Hybrid':       { transmission: 'DCT',       fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    H9: {
      'Ultra':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
      'Supreme':      { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
    },
    Jolion: {
      'Ultra':        { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Supreme':      { transmission: 'DCT',       fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    'Big Dog': {
      'Ultra':        { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
  },

  // ─── Chery ────────────────────────────────────────────────────────────────
  Chery: {
    'Tiggo 8 Pro': {
      'Comfort':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.6L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
      'Premium':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
      'Max':          { transmission: 'CVT',       fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
    },
    'Tiggo 7 Pro': {
      'Comfort':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.6L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    'Tiggo 4 Pro': {
      'Comfort':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    'Arrizo 6 Pro': {
      'Comfort':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.6L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
  },

  // ─── Geely ────────────────────────────────────────────────────────────────
  Geely: {
    Coolray: {
      'Standard':     { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 3, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 3, seat_count: 5, import_country: 'China' },
    },
    Monjaro: {
      'Comfort':      { transmission: 'DCT',       fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'DCT',       fuel_type: 'Hybrid',   engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    Tugella: {
      'Standard':     { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'DCT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
    Okavango: {
      'Standard':     { transmission: 'DCT',       fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
      'Premium':      { transmission: 'DCT',       fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
    },
  },

  // ─── Jetour ───────────────────────────────────────────────────────────────
  Jetour: {
    'X70 Plus': {
      'Comfort':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.5L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
      'Premium':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '1.6L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
    },
    'X90 Plus': {
      'Comfort':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
      'Premium':      { transmission: 'CVT',       fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 7, import_country: 'China' },
    },
    Dashing: {
      'Comfort':      { transmission: 'DCT',       fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
      'Premium':      { transmission: 'DCT',       fuel_type: 'Hybrid',   engine_size: '1.5L Turbo', cylinders: 4, seat_count: 5, import_country: 'China' },
    },
  },

  // ─── Land Rover ───────────────────────────────────────────────────────────
  'Land Rover': {
    'Range Rover': {
      'SE':           { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'UK' },
      'HSE':          { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'UK' },
      'Autobiography': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 5, import_country: 'UK' },
      'SV':           { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 4, import_country: 'UK' },
    },
    'Range Rover Sport': {
      'SE':           { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'UK' },
      'HSE':          { transmission: 'Automatic', fuel_type: 'Hybrid',   engine_size: '3.0L', cylinders: 6, seat_count: 5, import_country: 'UK' },
      'Autobiography': { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 5, import_country: 'UK' },
    },
    Defender: {
      '90 S':         { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '2.0L Turbo', cylinders: 4, seat_count: 5, import_country: 'UK' },
      '110 SE':       { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '3.0L', cylinders: 6, seat_count: 7, import_country: 'UK' },
      '110 X':        { transmission: 'Automatic', fuel_type: 'Gasoline', engine_size: '4.4L', cylinders: 8, seat_count: 7, import_country: 'UK' },
    },
  },
}

export function getTrims(brand: string, model: string): string[] {
  return Object.keys(CAR_SPECS[brand]?.[model] ?? {})
}

export function getTrimSpec(brand: string, model: string, trim: string): TrimSpec {
  return CAR_SPECS[brand]?.[model]?.[trim] ?? {}
}
