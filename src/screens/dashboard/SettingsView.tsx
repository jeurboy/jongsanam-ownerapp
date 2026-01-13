import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts, spacing, borderRadius, fontSize } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';

interface SettingsViewProps {
    businessId?: string | null;
}

export const SettingsView = ({ businessId }: SettingsViewProps) => {
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const handleChangePassword = async () => {
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        setLoading(true);
        try {
            await authService.changePassword(currentPassword, newPassword);
            Alert.alert('สำเร็จ', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
            // Clear form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
            Alert.alert('ไม่สามารถเปลี่ยนรหัสผ่านได้', message);
        } finally {
            setLoading(false);
        }
    };

    const toggleShowPassword = (field: 'current' | 'new' | 'confirm') => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>ตั้งค่าบัญชีผู้ใช้</Text>
                <Text style={styles.headerSubtitle}>จัดการข้อมูลบัญชีและความปลอดภัย</Text>
            </View>

            {/* Profile Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ข้อมูลส่วนตัว</Text>
                <View style={styles.card}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.username ? user.username[0].toUpperCase() : 'U'}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.label}>ชื่อผู้ใช้งาน (Username)</Text>
                            <Text style={styles.value}>{user?.username || '-'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Security Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ความปลอดภัย</Text>
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>เปลี่ยนรหัสผ่าน</Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.inputLabel}>รหัสผ่านปัจจุบัน</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.neutral[400]} />
                            <TextInput
                                style={styles.input}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry={!showPassword.current}
                                placeholder="ระบุรหัสผ่านเดิม"
                                placeholderTextColor={colors.neutral[400]}
                            />
                            <TouchableOpacity onPress={() => toggleShowPassword('current')}>
                                <MaterialCommunityIcons
                                    name={showPassword.current ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={colors.neutral[400]}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.inputLabel}>รหัสผ่านใหม่</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="key-variant" size={20} color={colors.neutral[400]} />
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showPassword.new}
                                placeholder="อย่างน้อย 8 ตัวอักษร"
                                placeholderTextColor={colors.neutral[400]}
                            />
                            <TouchableOpacity onPress={() => toggleShowPassword('new')}>
                                <MaterialCommunityIcons
                                    name={showPassword.new ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={colors.neutral[400]}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.inputLabel}>ยืนยันรหัสผ่านใหม่</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="key-variant" size={20} color={colors.neutral[400]} />
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword.confirm}
                                placeholder="ระบุรหัสผ่านใหม่ซ้ำอีกครั้ง"
                                placeholderTextColor={colors.neutral[400]}
                            />
                            <TouchableOpacity onPress={() => toggleShowPassword('confirm')}>
                                <MaterialCommunityIcons
                                    name={showPassword.confirm ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={colors.neutral[400]}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleChangePassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.white} />
                                <Text style={styles.buttonText}>บันทึกรหัสผ่านใหม่</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    contentContainer: {
        paddingLeft: 10,
        paddingTop: spacing.lg,
        paddingRight: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    header: {
        marginBottom: spacing.lg,
    },
    headerTitle: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: colors.neutral[900],
    },
    headerSubtitle: {
        fontFamily: fonts.regular,
        fontSize: fontSize.md,
        color: colors.neutral[500],
        marginTop: 4,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.lg,
        color: colors.neutral[800],
        marginBottom: spacing.md,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    cardHeader: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.md,
        color: colors.neutral[800],
        marginBottom: spacing.lg,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary.light + '20',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.primary.light + '40',
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 28,
        color: colors.primary.main,
    },
    profileInfo: {
        marginLeft: spacing.lg,
        flex: 1,
    },
    label: {
        fontFamily: fonts.regular,
        fontSize: fontSize.sm,
        color: colors.neutral[500],
    },
    value: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.xl,
        color: colors.neutral[900],
        marginTop: 4,
    },
    formGroup: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontFamily: fonts.medium,
        fontSize: fontSize.sm,
        color: colors.neutral[700],
        marginBottom: spacing.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.neutral[50],
        height: 48,
        gap: spacing.sm,
    },
    input: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: fontSize.md,
        color: colors.neutral[900],
    },
    button: {
        backgroundColor: 'rgba(2, 38, 99, 0.9)', // Deep Blue
        borderRadius: borderRadius.lg,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing.sm,
        shadowColor: 'rgba(2, 38, 99, 0.9)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
        backgroundColor: colors.neutral[400],
        shadowOpacity: 0,
    },
    buttonText: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.md,
        color: colors.white,
    },
});
