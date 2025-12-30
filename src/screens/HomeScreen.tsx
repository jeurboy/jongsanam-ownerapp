import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
    SafeAreaView,
    StatusBar,
    Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, borderRadius } from '../theme/tokens';
import { responsive } from '../utils/responsive';
import { BusinessSelector } from '../components/BusinessSelector';
import { businessService } from '../services/business.service';
import { Business } from '../types/business';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

// Placeholder for the background image - User should save the generated image to assets or use this placeholder
const HOME_BG_IMAGE = require('../assets/images/home_bg.png');

const MENU_ITEMS = [
    {
        id: 'overview',
        title: 'ภาพรวม',
        subtitle: 'สรุปสถานะสนาม',
        iconName: 'view-dashboard',
        color: '#EEF2FF', // Light Indigo
        accent: '#4F46E5',
    },
    {
        id: 'booking',
        title: 'จัดการการจองสนาม',
        subtitle: 'ดูตารางและจัดการคิว',
        iconName: 'calendar-check',
        color: '#F0FDF4', // Light Green
        accent: '#10B981',
    },
    {
        id: 'customer',
        title: 'รายชื่อลูกค้า',
        subtitle: 'ข้อมูลผู้ใช้บริการ',
        iconName: 'account-group',
        color: '#FEFCE8', // Light Yellow
        accent: '#F59E0B',
    },
];

export const HomeScreen = () => {
    const { user, logout } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            const result = await businessService.getBusinesses();
            setBusinesses(result.businesses);

            // Auto-select first business if none selected
            if (result.businesses.length > 0 && !selectedBusinessId) {
                setSelectedBusinessId(result.businesses[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch businesses:', error);
            // Optionally show error to user
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'ยืนยันการออกจากระบบ',
            'คุณต้องการออกจากระบบใช่หรือไม่?',
            [
                {
                    text: 'ยกเลิก',
                    style: 'cancel',
                },
                {
                    text: 'ออกจากระบบ',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    },
                },
            ]
        );
    };

    const StickyHeader = () => (
        <View style={styles.stickyHeader}>
            <View style={styles.topRow}>
                <BusinessSelector
                    businesses={businesses}
                    selectedId={selectedBusinessId}
                    onSelect={(b) => setSelectedBusinessId(b.id)}
                    containerStyle={styles.businessSelectorContainer}
                />
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color={colors.error.main} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <Image
                source={HOME_BG_IMAGE}
                style={styles.headerBackground}
                resizeMode="cover"
            />
            <View style={styles.headerContentOverlay}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerSubtitle}>ยินดีต้อนรับ,</Text>
                        <Text style={styles.headerTitle}>{user?.username || 'Owner'}</Text>
                    </View>
                    <View style={styles.profileAvatar}>
                        <Text style={styles.profileInitials}>
                            {user?.username?.substring(0, 2).toUpperCase() || 'JS'}
                        </Text>
                    </View>
                </View>

                {/* Quick Stats Cards in Header */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBadge, { backgroundColor: 'rgba(59, 130, 246, 0.9)' }]}>
                        <MaterialCommunityIcons name="calendar-today" size={24} color={colors.white} style={styles.statIcon} />
                        <View>
                            <Text style={styles.statBadgeValue}>0</Text>
                            <Text style={styles.statBadgeLabel}>คิววันนี้</Text>
                        </View>
                    </View>
                    <View style={[styles.statBadge, { backgroundColor: 'rgba(139, 92, 246, 0.9)' }]}>
                        <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.white} style={styles.statIcon} />
                        <View>
                            <Text style={styles.statBadgeValue}>0</Text>
                            <Text style={styles.statBadgeLabel}>รายได้ (บาท)</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderMenuItem = (item: typeof MENU_ITEMS[0]) => (
        <TouchableOpacity
            key={item.id}
            style={[styles.menuCard, { backgroundColor: colors.white }]}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                <MaterialCommunityIcons name={item.iconName} size={32} color={item.accent} />
            </View>
            <Text style={styles.menuCardTitle}>{item.title}</Text>
            {/* Added subtitle for better context if needed, or keep it minimal */}
            {/* <Text style={styles.menuCardSubtitle}>{item.subtitle}</Text> */}
            <View style={[styles.indicator, { backgroundColor: item.accent }]} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
            <SafeAreaView style={styles.safeArea}>
                <StickyHeader />
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {renderHeader()}

                    <Text style={styles.sectionTitle}>เมนูหลัก</Text>
                    <View style={styles.gridContainer}>
                        {MENU_ITEMS.map(renderMenuItem)}
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral[50],
    },
    safeArea: {
        flex: 1,
    },
    content: {
        padding: responsive.spacing.lg,
        paddingBottom: responsive.spacing.xxl,
    },
    stickyHeader: {
        backgroundColor: colors.neutral[50], // Match screen background
        paddingHorizontal: responsive.spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        zIndex: 10,
    },
    headerContainer: {
        marginBottom: spacing.xl,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        backgroundColor: colors.primary.main, // Fallback
        position: 'relative',
    },
    headerBackground: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    headerContentOverlay: {
        padding: responsive.spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.85)', // Light overlay for readability
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    businessSelectorContainer: {
        flex: 1,
    },
    logoutButton: {
        width: 48,
        height: 48, // Match height of BusinessSelector (roughly)
        borderRadius: borderRadius.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    headerSubtitle: {
        fontSize: responsive.fontSize.sm,
        color: colors.neutral[500],
        marginBottom: 2,
        fontFamily: 'Kanit-Regular',
    },
    headerTitle: {
        fontSize: responsive.fontSize.xl,
        color: colors.neutral[900],
        fontWeight: '700',
        fontFamily: 'Kanit-Bold',
    },
    profileAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary.main,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary.main,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    profileInitials: {
        color: colors.white,
        fontSize: responsive.fontSize.lg,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    statBadge: {
        flex: 1,
        borderRadius: borderRadius.xl,
        padding: responsive.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    statIcon: {
        marginRight: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 40,
        height: 40,
        borderRadius: 20,
        textAlign: 'center',
        textAlignVertical: 'center',
        // LineHeight handles vertical centering for the icon text, but for Vector Icons we rely on container alignment or specific style
        // For Vector Icons, we might need justifyContent/alignItems in the container if textAlign doesn't work well
    },
    statBadgeValue: {
        fontSize: responsive.fontSize.lg,
        fontWeight: 'bold',
        color: colors.white,
    },
    statBadgeLabel: {
        fontSize: responsive.fontSize.xs,
        color: 'rgba(255,255,255,0.9)',
    },
    sectionTitle: {
        fontSize: responsive.fontSize.lg,
        fontWeight: '600',
        color: colors.neutral[800],
        marginBottom: spacing.md,
        fontFamily: 'Kanit-SemiBold',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    menuCard: {
        width: '48%', // Default for 2 columns
        aspectRatio: 1,
        borderRadius: borderRadius.xl,
        padding: responsive.spacing.lg,
        marginBottom: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.neutral[300],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
        position: 'relative',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    menuCardTitle: {
        fontSize: responsive.fontSize.md,
        fontWeight: '600',
        color: colors.neutral[800],
        textAlign: 'center',
        fontFamily: 'Kanit-Medium',
    },
    indicator: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    bannerContainer: {
        backgroundColor: colors.neutral[900],
        borderRadius: borderRadius.xl,
        padding: responsive.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    bannerContent: {
        flex: 1,
        marginRight: spacing.md,
    },
    bannerTitle: {
        fontSize: responsive.fontSize.md,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: 4,
    },
    bannerSubtitle: {
        fontSize: responsive.fontSize.xs,
        color: colors.neutral[400],
    },
    bannerIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
