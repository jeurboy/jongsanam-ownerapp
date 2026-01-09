import { Platform } from 'react-native';

// Try to import react-native-config safely
let Config: { API_URL?: string } = {};
try {
    Config = require('react-native-config').default || {};
} catch (e) {
    console.warn('react-native-config not available, using fallback values');
}

// Direct URL configuration (easier to change)
// Change this URL to switch between local and production
const LOCAL_DEV_URL = 'http://192.168.1.46:3000';  // Your local development server
const PRODUCTION_URL = 'https://jongsanam.online';  // Production server

// Fallback values when .env is not available
const FALLBACK_DEV_URL = Platform.select({
    ios: LOCAL_DEV_URL,
    android: LOCAL_DEV_URL,
    default: LOCAL_DEV_URL,
});

const FALLBACK_PROD_URL = PRODUCTION_URL;

// Environment configuration
// Priority: .env file > fallback values
const getEnvVars = () => {
    // Debug: Log what Config contains
    console.log('=== ENV DEBUG ===');
    console.log('Config object:', Config);
    console.log('Config.API_URL:', Config?.API_URL);
    console.log('All Config keys:', Object.keys(Config || {}));
    console.log('================');

    // Read from .env file (API_URL)
    const envApiUrl = Config?.API_URL;

    if (envApiUrl) {
        console.log('✅ Using API_URL from .env:', envApiUrl);
        return { apiUrl: envApiUrl };
    }

    // Fallback to hardcoded values
    if (__DEV__) {
        console.log('⚠️ Using fallback dev URL:', FALLBACK_DEV_URL);
        return { apiUrl: FALLBACK_DEV_URL };
    }

    console.log('📦 Using fallback prod URL:', FALLBACK_PROD_URL);
    return { apiUrl: FALLBACK_PROD_URL };
};

export default getEnvVars();
