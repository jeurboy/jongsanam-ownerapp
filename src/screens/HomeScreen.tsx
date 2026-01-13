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
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, borderRadius } from '../theme/tokens';
import { BusinessSelector } from '../components/BusinessSelector';
import { businessService } from '../services/business.service';
import { Business } from '../types/business';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { SidebarTab } from '../components/Sidebar';
import { BookingManagerView } from './dashboard/BookingManagerView';
import { CourtManagerView } from './dashboard/CourtManagerView';
import { UserManagerView } from './dashboard/UserManagerView';
import { DashboardView } from './dashboard/DashboardView';
import { SettingsView } from './dashboard/SettingsView';
import { QRScannerScreen } from './QRScannerScreen';
import { NotificationModal } from '../components/NotificationModal';
import { Notification, notificationService } from '../services/notification.service';


const MENU_ITEMS = [
    {
        id: 'overview',
        title: 'หน้าหลัก',
        image: require('../assets/launcher/icon_home.png'),
        accent: '#6366F1',
    },
    {
        id: 'dashboard',
        title: 'ภาพรวม',
        image: require('../assets/launcher/icon_dashboard.png'),
        accent: '#3B82F6',
    },
    {
        id: 'booking',
        title: 'จัดการการจอง',
        image: require('../assets/launcher/icon_booking.png'),
        accent: '#10B981',
    },
    {
        id: 'courts',
        title: 'จัดการสนาม',
        image: require('../assets/launcher/icon_court.png'),
        accent: '#EF4444',
    },
    {
        id: 'customer',
        title: 'จัดการสมาชิก',
        image: require('../assets/launcher/icon_users.png'),
        accent: '#F59E0B',
    },
    {
        id: 'settings',
        title: 'ตั้งค่า',
        image: require('../assets/launcher/icon_settings.png'),
        accent: '#64748B',
    },
];

export const HomeScreen = () => {
    const { user, logout } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<SidebarTab>('overview');
    const [showQRScanner, setShowQRScanner] = useState(false);

    // Notification State
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead([id]);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            setLoadingNotifications(true);
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setLoadingNotifications(false);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification.id);
        }
        setShowNotifications(false);

        if (notification.type === 'NEW_BOOKING') {
            setActiveTab('booking');
        }
    };

    useEffect(() => {
        // Orientation is now handled in AppNavigator
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            const result = await businessService.getBusinesses();
            setBusinesses(result.businesses);

            const savedId = await AsyncStorage.getItem('SELECTED_BUSINESS_ID');

            if (savedId && result.businesses.some(b => b.id === savedId)) {
                setSelectedBusinessId(savedId);
            } else if (result.businesses.length > 0 && !selectedBusinessId) {
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
                {/* QR Scanner Button */}
                <TouchableOpacity style={styles.scannerButton} onPress={() => setShowQRScanner(true)}>
                    <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.primary[600]} />
                </TouchableOpacity>

                {/* Notification Button */}
                {(() => {
                    const hasUnread = unreadCount > 0 || notifications.some(n => !n.isRead);
                    const displayCount = unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : notifications.filter(n => !n.isRead).length;

                    return (
                        <TouchableOpacity
                            style={[
                                styles.notificationButton,
                                hasUnread && styles.notificationButtonActive
                            ]}
                            onPress={() => setShowNotifications(true)}
                        >
                            <MaterialCommunityIcons
                                name={hasUnread ? "bell-ring" : "bell-outline"}
                                size={24}
                                color={hasUnread ? "#fff" : colors.neutral[600]}
                            />
                            {hasUnread && (
                                <View style={styles.badgeOnRed}>
                                    <Text style={styles.badgeTextOnRed}>{displayCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })()}

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color={colors.neutral[500]} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderLauncherItem = (item: typeof MENU_ITEMS[0]) => (
        <TouchableOpacity
            key={item.id}
            style={styles.launcherCard}
            activeOpacity={0.7}
            onPress={() => {
                if (item.id === 'booking') setActiveTab('booking');
                else if (item.id === 'customer') setActiveTab('users');
                else if (item.id === 'overview') setActiveTab('overview');
                else if (item.id === 'dashboard') setActiveTab('dashboard');
                else if (item.id === 'courts') setActiveTab('courts');
                else if (item.id === 'settings') setActiveTab('settings');
            }}
        >
            <View style={styles.imageContainer}>
                <Image source={item.image} style={styles.launcherImage} resizeMode="contain" />
            </View>
            <Text style={styles.launcherLabel}>{item.title}</Text>
        </TouchableOpacity>
    );

    const renderOverview = () => (
        <View style={styles.launcherContainer}>
            <ScrollView contentContainerStyle={styles.launcherContent} showsVerticalScrollIndicator={false}>
                <View style={styles.launcherHeader}>
                    <Text style={styles.welcomeText}>สวัสดีครับ,</Text>
                    <Text style={styles.ownerName}>{user?.username || 'Owner'}</Text>
                </View>

                <View style={styles.launcherGrid}>
                    {MENU_ITEMS.map(renderLauncherItem)}
                </View>

                {/* Bottom Status Card */}
                <View style={styles.statusFooter}>
                    <View style={styles.statusCard}>
                        <View style={styles.statusIndicator} />
                        <Text style={styles.statusText}>ระบบจองสนามของคุณ พร้อมใช้งานปกติ</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardView businessId={selectedBusinessId || '9999'} />;
            case 'booking':
                return <BookingManagerView businessId={selectedBusinessId || '9999'} />;
            case 'courts':
                return <CourtManagerView businessId={selectedBusinessId || '9999'} />;
            case 'users':
                return <UserManagerView businessId={selectedBusinessId || '9999'} />;
            case 'settings':
                return <SettingsView businessId={selectedBusinessId || '9999'} />;
            case 'overview':
            default:
                return renderOverview();
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <DashboardLayout
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isTransparent={true}
            >
                <View style={{ flex: 1 }}>
                    {(activeTab !== 'overview') && <StickyHeader />}
                    {renderContent()}
                </View>
            </DashboardLayout>

            {/* QR Scanner Modal */}
            <QRScannerScreen
                visible={showQRScanner}
                onClose={() => setShowQRScanner(false)}
                businessId={selectedBusinessId || undefined}
            />

            {/* Notification Modal */}
            <NotificationModal
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                loading={loadingNotifications}
                onNotificationClick={handleNotificationClick}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    stickyHeader: {
        backgroundColor: 'transparent',
        paddingLeft: 10,
        paddingRight: spacing.lg,
        paddingTop: 0,
        paddingBottom: 8,
        zIndex: 10,
        borderBottomWidth: 0,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    businessSelectorContainer: {
        flex: 1,
    },
    logoutButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    scannerButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    notificationButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.neutral[200],
        position: 'relative',
    },
    notificationButtonActive: {
        backgroundColor: colors.error,
        borderColor: colors.error,
    },
    badgeOnRed: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#fff',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: colors.error,
        zIndex: 10,
        elevation: 5,
    },
    badgeTextOnRed: {
        color: colors.error,
        fontSize: 10,
        fontFamily: 'Kanit-Bold',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: colors.error[500],
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#fff',
        zIndex: 10,
        elevation: 5,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Kanit-Bold',
    },
    launcherContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    launcherContent: {
        flexGrow: 1,
        padding: 24, // Reduced overall padding
        paddingLeft: 10, // Explicitly reduce left padding
        justifyContent: 'center',
    },
    launcherHeader: {
        marginBottom: 40,
    },
    welcomeText: {
        fontFamily: 'Kanit-Regular',
        fontSize: 26,
        color: colors.neutral[500],
    },
    ownerName: {
        fontFamily: 'Kanit-Bold',
        fontSize: 52,
        color: colors.neutral[900],
        marginTop: -5,
    },
    launcherGrid: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 16, // Reduced gap
        paddingHorizontal: 10, // Reduced padding
    },
    launcherCard: {
        width: '45%', // Change to 2 columns for mobile portrait
        aspectRatio: 1.1, // Slightly taller
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 20,
        padding: 12,
        // Soft Claymorphism shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    imageContainer: {
        width: '100%',
        height: '65%', // Reduced height from 80% to give text space
        alignItems: 'center',
        justifyContent: 'center',
    },
    launcherImage: {
        width: '70%', // Reduced image size
        height: '70%',
        borderRadius: 16,
    },
    vectorIconWrapper: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    launcherLabel: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16, // Keep readable size
        color: colors.neutral[700],
        marginTop: 8,
        textAlign: 'center',
    },
    statusFooter: {
        marginTop: 40,
        alignItems: 'center',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        gap: 12,
    },
    statusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
    },
    statusText: {
        fontFamily: 'Kanit-Medium',
        fontSize: 15,
        color: colors.neutral[500],
    },
});
