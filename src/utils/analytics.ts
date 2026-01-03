
import analytics from '@react-native-firebase/analytics';

/**
 * Analytics Utility for Jong Court Owner App
 * Wrapper around Firebase Analytics
 */
export const Analytics = {
    /**
     * Log a screen view
     * @param screenName Name of the screen
     * @param screenClass Class name of the screen (optional)
     */
    logScreenView: async (screenName: string, screenClass?: string) => {
        try {
            await analytics().logScreenView({
                screen_name: screenName,
                screen_class: screenClass,
            });
            console.log(`[Analytics] Screen View: ${screenName}`);
        } catch (error) {
            console.warn('[Analytics] Failed to log screen view:', error);
        }
    },

    /**
     * Log a custom event
     * @param eventName Name of the event (e.g., 'booking_completed')
     * @param params Additional parameters
     */
    logEvent: async (eventName: string, params: Record<string, any> = {}) => {
        try {
            await analytics().logEvent(eventName, params);
            console.log(`[Analytics] Event: ${eventName}`, params);
        } catch (error) {
            console.warn(`[Analytics] Failed to log event ${eventName}:`, error);
        }
    },

    /**
     * Set user ID (e.g., after login)
     * @param userId User ID
     */
    setUserId: async (userId: string | null) => {
        try {
            await analytics().setUserId(userId);
        } catch (error) {
            console.warn('[Analytics] Failed to set user ID:', error);
        }
    },

    /**
     * Set user properties
     * @param props User properties object
     */
    setUserProperties: async (props: Record<string, string | null>) => {
        try {
            await analytics().setUserProperties(props);
        } catch (error) {
            console.warn('[Analytics] Failed to set user properties:', error);
        }
    }
};
