import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, useWindowDimensions } from 'react-native';

const SPLASH_IMAGE = require('../assets/new_splash_banner.png');

export const SplashScreen = () => {
    const { width, height } = useWindowDimensions();
    const fadeAnim = useRef(new Animated.Value(0)).current;

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
                source={SPLASH_IMAGE}
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
