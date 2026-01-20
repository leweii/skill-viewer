// lib/config.js
// Centralized configuration for Skill Viewer extension
// All API URLs and settings should be defined here

const CONFIG = {
  // Cloud API base URL - change this for different environments
  CLOUD_API_URL: 'https://skill-viewer.vercel.app',

  // API endpoints
  get API_SUMMARIZE() { return `${this.CLOUD_API_URL}/api/summarize`; },
  get API_USAGE() { return `${this.CLOUD_API_URL}/api/usage`; },
  get API_COLLECT() { return `${this.CLOUD_API_URL}/api/collect`; },
  get API_DEV_UPGRADE() { return `${this.CLOUD_API_URL}/api/dev-upgrade`; },
  get API_CREATE_QRCODE() { return `${this.CLOUD_API_URL}/api/create-qrcode`; },
  get API_CHECK_ORDER() { return `${this.CLOUD_API_URL}/api/check-order`; },

  // Supabase configuration (for OAuth)
  SUPABASE_URL: 'https://bnjukieczyexjioocrpp.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuanVraWVjenlleGppb29jcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0NTUzNDAsImV4cCI6MjA1MzAzMTM0MH0.vS5n4V8LnPZPm3OjPNGirQh3sMj87xkJBCCKv6Razz0',

  // Check if Supabase is configured
  isSupabaseConfigured() {
    return !this.SUPABASE_URL.includes('YOUR_PROJECT') &&
           this.SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';
  },
};

// Make CONFIG immutable
Object.freeze(CONFIG);

// Export for ES modules (background.js, options.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
