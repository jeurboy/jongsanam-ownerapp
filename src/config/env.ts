import { Platform } from 'react-native';

// Try to import react-native-config safely
let Config: { API_URL?: string } = {};
try {
    Config = require('react-native-config').default || {};
} catch (e) {
    console.warn('react-native-config not available, using fallback values');
}

// Fallback values when .env is not available
const FALLBACK_DEV_URL = Platform.select({
    ios: 'http://localhost:3000',
    android: 'http://10.0.2.2:3000',
    default: 'http://localhost:3000',
});

const FALLBACK_PROD_URL = 'https://jongsanam.online';

// Environment configuration
// Priority: .env file > fallback values
const getEnvVars = () => {
    // Read from .env file (API_URL)
    const envApiUrl = Config?.API_URL;

    if (envApiUrl) {
        console.log('Using API_URL from .env:', envApiUrl);
        return { apiUrl: envApiUrl };
    }

    // Fallback to hardcoded values
    if (__DEV__) {
        console.log('Using fallback dev URL:', FALLBACK_DEV_URL);
        return { apiUrl: FALLBACK_DEV_URL };
    }

    console.log('Using fallback prod URL:', FALLBACK_PROD_URL);
    return { apiUrl: FALLBACK_PROD_URL };
};

export default getEnvVars();
