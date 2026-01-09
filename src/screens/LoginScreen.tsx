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
    Linking,
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

    const handleOpenLink = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('ไม่สามารถเปิดลิงก์ได้');
            }
        } catch (error) {
            console.error('Error opening link:', error);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar
                hidden={true}
                showHideTransition="fade"
                backgroundColor="transparent"
                translucent={true}
                barStyle="light-content"
            />
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
                            <View style={styles.linksContainer}>
                                <TouchableOpacity
                                    onPress={() => handleOpenLink('https://jongsanam.online/terms-of-service')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.linkText}>ข้อกำหนดการใช้งาน</Text>
                                </TouchableOpacity>
                                <Text style={styles.linkSeparator}>•</Text>
                                <TouchableOpacity
                                    onPress={() => handleOpenLink('https://jongsanam.online/privacy-policy')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.linkText}>นโยบายความเป็นส่วนตัว</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.footerText}>
                                © 2025 JongSanam. All rights reserved.
                            </Text>
                            {require('../config/env').default.env !== 'production' && (
                                <Text style={[styles.footerText, { marginTop: 8, fontSize: 10 }]}>
                                    {require('../config/env').default.apiUrl}
                                </Text>
                            )}
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
        padding: 24, // Optimized padding for mobile
    },
    centerContainer: {
        width: '100%',
        maxWidth: 420, // Optimized max-width for mobile
        alignItems: 'center',
    },

    // Logo Section
    logoSection: {
        alignItems: 'center',
        marginBottom: responsive.spacing.xl,
    },
    logo: {
        width: 100, // Increased size
        height: 100, // Increased size
        backgroundColor: colors.white,
        borderRadius: 20,
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
        fontSize: 52, // Increased size
        fontFamily: fonts.bold,
        color: colors.primary.main,
        letterSpacing: -1,
    },
    brandName: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: colors.white,
        marginBottom: responsive.spacing.xs,
        letterSpacing: 0.5,
    },
    tagline: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: colors.white,
        textAlign: 'center',
        opacity: 0.9,
    },

    // Form Section
    formSection: {
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 24,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    header: {
        marginBottom: 24,
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 14,
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
        marginHorizontal: responsive.spacing.md,
    },
    label: {
        fontSize: 16, // Manually increased based on feedback
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
        borderRadius: 12,
        overflow: 'hidden',
    },
    iconContainer: {
        width: 44,
        height: 48, // Reduced height (was 56)
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.neutral[100],
    },
    inputIcon: {
        fontSize: 20,
    },
    input: {
        flex: 1,
        height: 48, // Reduced height (was 56)
        fontSize: 14, // Reduced font size to balance with height
        fontFamily: fonts.regular,
        color: colors.neutral[900],
        paddingHorizontal: responsive.spacing.sm,
    },
    loginButton: {
        backgroundColor: colors.primary.main,
        height: 50, // Taller button
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
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
        fontSize: 18, // Significantly larger for visibility
        fontFamily: fonts.medium, // Bold for better emphasis
        color: colors.white,
        letterSpacing: 0.5,
    },

    // Footer
    footer: {
        marginTop: 24,
        alignItems: 'center',
    },
    linksContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 8,
    },
    linkText: {
        fontSize: 14, // Increased from xs
        fontFamily: fonts.medium,
        color: colors.primary.main,
        textDecorationLine: 'underline',
    },
    linkSeparator: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: colors.neutral[400],
        marginHorizontal: 4,
    },
    footerText: {
        fontSize: 12, // Increased slightly
        fontFamily: fonts.regular,
        color: colors.neutral[400],
    },
});
