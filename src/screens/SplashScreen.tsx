import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, useWindowDimensions, Platform } from 'react-native';

const SPLASH_IMAGE_PORTRAIT = require('../assets/splash_banner_portrait.png');
const SPLASH_IMAGE_LANDSCAPE = require('../assets/splash_banner_landscape.png');

export const SplashScreen = () => {
    const { width, height } = useWindowDimensions();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Determine if device is in portrait mode or is a phone
    const isPortrait = height > width;
    const isPhone = width < 768; // iPad typically has width >= 768

    // Use portrait image for phones or portrait orientation, landscape for tablets in landscape
    const splashImage = (isPhone || isPortrait) ? SPLASH_IMAGE_PORTRAIT : SPLASH_IMAGE_LANDSCAPE;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    return (
        <View style={styles.container}>
            <Animated.Image
                source={splashImage}
                style={[
                    styles.image,
                    {
                        width: width,
                        height: height,
                        opacity: fadeAnim
                    }
                ]}
                resizeMode="cover"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        ...StyleSheet.absoluteFillObject,
    },
});
