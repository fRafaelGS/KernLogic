/**
 * Feature Flags Configuration
 * 
 * This file defines feature flags used throughout the application.
 * To enable or disable a feature, change the value to true or false.
 */

// Product Management
export const ENABLE_PRODUCT_VARIANTS = true;
export const ENABLE_ADVANCED_PRICING = true;
export const ENABLE_DIGITAL_ASSETS = true;

// Attribute Management
export const ENABLE_CUSTOM_ATTRIBUTES = true;
export const ENABLE_ATTRIBUTE_GROUPS = true;
export const ENABLE_ATTRIBUTE_VALIDATION = false; // Coming in future release
export const ENABLE_AI_ATTRIBUTE_SUGGESTIONS = false; // Coming in future release

// User & Organization
export const ENABLE_SSO = false;
export const ENABLE_MFA = false;
export const ENABLE_TEAM_MANAGEMENT = true;

// Localization
export const ENABLE_LANGUAGE_SWITCHING = true;
export const ENABLE_AUTOMATIC_TRANSLATION = false;

// Integrations
export const ENABLE_SHOPIFY_INTEGRATION = false;
export const ENABLE_AMAZON_INTEGRATION = false;
export const ENABLE_API_KEY_MANAGEMENT = true;

// UI Features
export const ENABLE_DARK_MODE = true;
export const ENABLE_GRID_VIEW = true;
export const ENABLE_KANBAN_VIEW = false;

// Advanced Features
export const ENABLE_BULK_OPERATIONS = true;
export const ENABLE_EXPORT_IMPORT = true;
export const ENABLE_WORKFLOW = false; 