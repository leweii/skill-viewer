// lib/config.js
// Centralized configuration for Skill Viewer extension
// All API URLs and settings should be defined here

// Cloud API base URL - change this for different environments
var CLOUD_API_BASE = 'https://skill-viewer.vercel.app';

var CONFIG = {
  // Base URL
  CLOUD_API_URL: CLOUD_API_BASE,

  // API endpoints (plain strings, not getters - for importScripts compatibility)
  API_SUMMARIZE: CLOUD_API_BASE + '/api/summarize',
  API_USAGE: CLOUD_API_BASE + '/api/usage',
  API_COLLECT: CLOUD_API_BASE + '/api/collect',
  API_DEV_UPGRADE: CLOUD_API_BASE + '/api/dev-upgrade',
  API_CREATE_QRCODE: CLOUD_API_BASE + '/api/create-qrcode',
  API_CHECK_ORDER: CLOUD_API_BASE + '/api/check-order',

  // Supabase configuration (for OAuth)
  SUPABASE_URL: 'https://bnjukieczyexjioocrpp.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuanVraWVjenlleGppb29jcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTYyNzgsImV4cCI6MjA4NDQ3MjI3OH0.wuh9sRfCK6U-rGhJL4fcSmNpDQ6EkS395jw47zouP8A',

  // Check if Supabase is configured
  isSupabaseConfigured: function() {
    return this.SUPABASE_URL.indexOf('YOUR_PROJECT') === -1 &&
           this.SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';
  }
};
