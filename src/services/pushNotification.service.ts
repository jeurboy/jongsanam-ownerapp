import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiService } from './api.service';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const pushNotificationService = {
    async registerForPushNotificationsAsync() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (!Device.isDevice) {
            console.log('Must use physical device for Push Notifications');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        // Get the token
        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;

            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId,
            });
            const token = tokenData.data;
            console.log('Expo Push Token:', token);

            // Send to backend
            await this.sendTokenToBackend(token);

            return token;
        } catch (error) {
            console.error('Error fetching push token:', error);
            return null;
        }
    },

    async sendTokenToBackend(token: string) {
        try {
            await apiService.post('/api/device-token', {
                token,
                platform: Platform.OS,
            });
        } catch (error) {
            console.error('Failed to send device token to backend:', error);
        }
    }
};
