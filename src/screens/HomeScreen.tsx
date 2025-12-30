import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    StatusBar,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, borderRadius } from '../theme/tokens';
import { responsive } from '../utils/responsive';
import { BusinessSelector } from '../components/BusinessSelector';
import { businessService } from '../services/business.service';
import { Business } from '../types/business';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { SidebarTab } from '../components/Sidebar';
import { BookingManagerView } from './dashboard/BookingManagerView';
import { UserManagerView } from './dashboard/UserManagerView';

// Placeholder for the background image
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
    const [activeTab, setActiveTab] = useState<SidebarTab>('overview');

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            const result = await businessService.getBusinesses();
            setBusinesses(result.businesses);

            // Check for saved selection
            const savedId = await AsyncStorage.getItem('SELECTED_BUSINESS_ID');

            if (savedId && result.businesses.some(b => b.id === savedId)) {
                setSelectedBusinessId(savedId);
            } else if (result.businesses.length > 0 && !selectedBusinessId) {
                // Auto-select first if no saved or saved not found
                setSelectedBusinessId(result.businesses[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch businesses:', error);
        }
    };

    const handleBusinessSelect = async (business: Business) => {
        setSelectedBusinessId(business.id);
        await AsyncStorage.setItem('SELECTED_BUSINESS_ID', business.id);
    };

    const handleLogout = () => {
        Alert.alert(
            'ยืนยันการออกจากระบบ',
            'คุณต้องการออกจากระบบใช่หรือไม่?',
            [
                { text: 'ยกเลิก', style: 'cancel' },
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
                    onSelect={handleBusinessSelect}
                    containerStyle={styles.businessSelectorContainer}
                />
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color={colors.error} />
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
            onPress={() => {
                // Map legacy menu items to tabs if possible
                if (item.id === 'booking') setActiveTab('booking');
                else if (item.id === 'customer') setActiveTab('users');
                else if (item.id === 'overview') setActiveTab('overview');
            }}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                <MaterialCommunityIcons name={item.iconName} size={32} color={item.accent} />
            </View>
            <Text style={styles.menuCardTitle}>{item.title}</Text>
            <View style={[styles.indicator, { backgroundColor: item.accent }]} />
        </TouchableOpacity>
    );

    const renderOverview = () => (
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
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'booking':
                return <BookingManagerView businessId={selectedBusinessId || '9999'} />;
            case 'users':
                return <UserManagerView businessId={selectedBusinessId || '9999'} />;
            case 'overview':
            default:
                return renderOverview();
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
            {/* SafeAreaView wrapped inside DashboardLayout or used as container?
                 Since we have a full screen sidebar, we want the Safe Area to apply mainly to the content or the sidebar independently.
                 Actually, SafeAreaProvider is at root.
                 DashboardLayout is a flex-row container. 
                 Sidebar needs padding top/bottom for safe area.
                 Content needs safe area.
                 Let's wrap the whole thing in SafeAreaView for now, but `edges` prop might be needed for sidebar vs content.
                 Alternatively, use SafeAreaView as the root container.
            */}
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
                    <View style={{ flex: 1 }}>
                        <StickyHeader />
                        {renderContent()}
                    </View>
                </DashboardLayout>
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
        backgroundColor: '#1E1E2E', // Match sidebar color to avoid safe area white bars on left
    },
    content: {
        padding: responsive.spacing.lg,
        paddingBottom: responsive.spacing.xxl,
    },
    stickyHeader: {
        backgroundColor: colors.neutral[50],
        paddingHorizontal: responsive.spacing.lg,
        paddingTop: 8,
        paddingBottom: 4,
        zIndex: 10,
    },
    headerContainer: {
        marginBottom: spacing.xl,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        backgroundColor: colors.primary.main,
        position: 'relative',
    },
    headerBackground: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    headerContentOverlay: {
        padding: responsive.spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.85)',
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
        width: 42,
        height: 42,
        borderRadius: borderRadius.md,
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
        width: '48%',
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
});
