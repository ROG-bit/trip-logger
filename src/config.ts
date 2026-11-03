export const CONFIG = {
  // Google Apps Script Web App URL
  DEFAULT_API_URL: 'https://script.google.com/macros/s/AKfycbxE4W_vXc57G08Gs48ZWwAq4b1aFCGCgkDxFDZC0ept--wsmSoOQM1BUj-Y3gjYw2anww/exec',
  DEPLOYMENT_ID: 'AKfycbxE4W_vXc57G08Gs48ZWwAq4b1aFCGCgkDxFDZC0ept--wsmSoOQM1BUj-Y3gjYw2anww',
  
  VEHICLE: {
    model: 'Volkswagen Taigo',
    plate: 'СВ 8529 XH',
    driver: 'Мая Атанасова',
    initialKm: 12500, // Reasonable initial start km if fresh
  },

  FREQUENT_ROUTES: [
    'София',
    'София - лични',
    'София-Благоевград-София',
    'София-Плевен-София',
  ],

  STORAGE_KEYS: {
    API_URL: 'taigo_api_url',
    LAST_KM: 'taigo_last_km',
    FORM_DRAFT: 'taigo_form_draft',
    HISTORY: 'taigo_trip_history',
    PENDING_QUEUE: 'taigo_pending_queue',
  },
};

