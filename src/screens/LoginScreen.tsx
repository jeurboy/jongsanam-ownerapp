import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
    useWindowDimensions,
    StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, borderRadius, fonts } from '../theme/tokens';
import { responsive } from '../utils/responsive';

export const LoginScreen = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { width, height } = useWindowDimensions();

    // Calculate responsive values based on screen size
    const isSmallScreen = width < 768;
    const isMediumScreen = width >= 768 && width < 1024;
    const isLargeScreen = width >= 1024;

    const getSpacing = (value: number) => {
        if (isSmallScreen) return value * 0.8;
        if (isMediumScreen) return value;
        return value * 1.2;
    };

    const getFontSize = (value: number) => {
        if (isSmallScreen) return value * 0.9;
        if (isMediumScreen) return value;
        return value * 1.1;
    };

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }

        try {
            setIsSubmitting(true);
            await login({ username, password });
        } catch (error: any) {
            Alert.alert(
                'เข้าสู่ระบบไม่สำเร็จ',
                error.message || 'กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar hidden={true} showHideTransition="fade" backgroundColor="transparent" translucent={true} barStyle="light-content" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.centerContainer}>
                    {/* Logo Section */}
                    <View style={styles.logoSection}>
                        <View style={styles.logo}>
                            <Text style={styles.logoText}>JS</Text>
                        </View>
                        <Text style={styles.brandName}>JongSanam</Text>
                        <Text style={styles.tagline}>ระบบจัดการสนามกีฬา</Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.formSection}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.welcomeText}>ยินดีต้อนรับ</Text>
                            <Text style={styles.subtitle}>เข้าสู่ระบบเพื่อจัดการสนามของคุณ</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            {/* Username */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>ชื่อผู้ใช้</Text>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.iconContainer}>
                                        <Text style={styles.inputIcon}>👤</Text>
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="กรอกชื่อผู้ใช้"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!isSubmitting}
                                    />
                                </View>
                            </View>

                            {/* Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>รหัสผ่าน</Text>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.iconContainer}>
                                        <Text style={styles.inputIcon}>🔒</Text>
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="กรอกรหัสผ่าน"
                                        placeholderTextColor={colors.neutral[400]}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!isSubmitting}
                                    />
                                </View>
                            </View>

                            {/* Login Button */}
                            <TouchableOpacity
                                style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
                                onPress={handleLogin}
                                disabled={isSubmitting}
                                activeOpacity={0.8}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color={colors.white} size="small" />
                                ) : (
                                    <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                © 2025 JongSanam. All rights reserved.
                            </Text>
                            <Text style={[styles.footerText, { marginTop: 8, fontSize: 10 }]}>
                                API: {require('../config/env').default.apiUrl}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.primary.main,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
    },
    centerContainer: {
        width: '100%',
        maxWidth: 500,
        alignItems: 'center',
    },

    // Logo Section
    logoSection: {
        alignItems: 'center',
        marginBottom: responsive.spacing.xl,
    },
    logo: {
        width: 80,
        height: 80,
        backgroundColor: colors.white,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: responsive.spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    logoText: {
        fontSize: 36,
        fontFamily: fonts.bold,
        color: colors.primary.main,
        letterSpacing: -1,
    },
    brandName: {
        fontSize: responsive.fontSize.xl,
        fontFamily: fonts.bold,
        color: colors.white,
        marginBottom: responsive.spacing.xs,
        letterSpacing: 0.5,
    },
    tagline: {
        fontSize: responsive.fontSize.sm,
        fontFamily: fonts.regular,
        color: colors.white,
        textAlign: 'center',
        opacity: 0.9,
    },

    // Form Section
    formSection: {
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: responsive.spacing.xl,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    header: {
        marginBottom: responsive.spacing.lg,
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: responsive.fontSize.xl,
        fontFamily: fonts.bold,
        color: colors.neutral[900],
        marginBottom: responsive.spacing.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: responsive.fontSize.sm,
        fontFamily: fonts.regular,
        color: colors.neutral[500],
        textAlign: 'center',
    },

    // Form
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: responsive.spacing.lg,
    },
    label: {
        fontSize: responsive.fontSize.sm,
        fontFamily: fonts.medium,
        color: colors.neutral[700],
        marginBottom: responsive.spacing.sm,
        letterSpacing: 0.2,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral[50],
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        borderRadius: 10,
        overflow: 'hidden',
    },
    iconContainer: {
        width: 40,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.neutral[100],
    },
    inputIcon: {
        fontSize: 18,
    },
    input: {
        flex: 1,
        height: 44,
        fontSize: responsive.fontSize.md,
        fontFamily: fonts.regular,
        color: colors.neutral[900],
        paddingHorizontal: responsive.spacing.md,
    },
    loginButton: {
        backgroundColor: colors.primary.main,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: responsive.spacing.md,
        shadowColor: colors.primary.main,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        fontSize: responsive.fontSize.md,
        fontFamily: fonts.medium,
        color: colors.white,
        letterSpacing: 0.3,
    },

    // Footer
    footer: {
        marginTop: responsive.spacing.lg,
        alignItems: 'center',
    },
    footerText: {
        fontSize: responsive.fontSize.xs,
        fontFamily: fonts.regular,
        color: colors.neutral[400],
    },
});
