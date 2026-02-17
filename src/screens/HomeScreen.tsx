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
    ImageBackground,
    useWindowDimensions,
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
import { FeedbackModal } from '../components/FeedbackModal';
import { Notification, notificationService } from '../services/notification.service';


const MENU_ITEMS = [
    {
        id: 'overview',
        title: 'หน้าหลัก',
        iconName: 'home-variant',
        accent: '#6366F1', // Indigo
        description: 'กลับสู่หน้าเริ่มต้น'
    },
    {
        id: 'dashboard',
        title: 'ภาพรวม',
        iconName: 'chart-box',
        accent: '#3B82F6', // Blue
        description: 'สถิติและรายได้'
    },
    {
        id: 'booking',
        title: 'จัดการการจอง',
        iconName: 'calendar-clock',
        accent: '#10B981', // Emerald
        description: 'ตารางจองวันนี้'
    },
    {
        id: 'courts',
        title: 'จัดการสนาม',
        iconName: 'soccer-field',
        accent: '#EF4444', // Red
        description: 'สถานะและราคา'
    },
    {
        id: 'customer',
        title: 'จัดการสมาชิก',
        iconName: 'account-group',
        accent: '#F59E0B', // Amber
        description: 'ข้อมูลลูกค้า'
    },
    {
        id: 'feedback',
        title: 'ข้อเสนอแนะ',
        iconName: 'message-text-outline',
        accent: '#8B5CF6', // Purple
        description: 'ติดต่อทีมงาน'
    },
    {
        id: 'settings',
        title: 'ตั้งค่า',
        iconName: 'cog',
        accent: '#64748B', // Slate
        description: 'ข้อมูลระบบ'
    },
];

export const HomeScreen = () => {
    const { width } = useWindowDimensions();
    const isMobile = width < 600;

    const { user, logout } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<SidebarTab>('overview');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);

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
            <View style={[styles.topRow, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 0 }]}>
                <BusinessSelector
                    businesses={businesses}
                    selectedId={selectedBusinessId}
                    onSelect={handleBusinessSelect}
                    containerStyle={isMobile ? { width: '100%' } : styles.businessSelectorContainer}
                />

                <View style={{
                    flexDirection: 'row',
                    justifyContent: isMobile ? 'flex-end' : 'flex-start',
                    gap: 8,
                    marginTop: isMobile ? 12 : 0,
                    alignItems: 'center'
                }}>
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
        </View>
    );

    const renderLauncherItem = (item: typeof MENU_ITEMS[0]) => (
        <TouchableOpacity
            key={item.id}
            style={styles.appIconWrapper}
            activeOpacity={0.7}
            onPress={() => {
                if (item.id === 'feedback') setShowFeedback(true);
                else if (item.id === 'booking') setActiveTab('booking');
                else if (item.id === 'customer') setActiveTab('users');
                else if (item.id === 'overview') setActiveTab('overview');
                else if (item.id === 'dashboard') setActiveTab('dashboard');
                else if (item.id === 'courts') setActiveTab('courts');
                else if (item.id === 'settings') setActiveTab('settings');
            }}
        >
            <View style={[styles.appIcon, { backgroundColor: item.accent }]}>
                <MaterialCommunityIcons name={item.iconName} size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.appLabel} numberOfLines={1}>{item.title}</Text>
        </TouchableOpacity>
    );

    const renderOverview = () => (
        <View style={styles.launcherContainer}>
            <ScrollView
                contentContainerStyle={styles.launcherContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section - Minimal */}
                <View style={styles.launcherHeader}>
                    <View>
                        <Text style={styles.dateText}>
                            {new Date().toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'long',
                                weekday: 'long'
                            })}
                        </Text>
                        <Text style={styles.welcomeText}>สวัสดี, {user?.username || 'Owner'}</Text>
                    </View>
                </View>

                <View style={styles.launcherGrid}>
                    {MENU_ITEMS.map(renderLauncherItem)}
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
        <ImageBackground
            source={require('../../assets/home_bg.png')}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <DashboardLayout
                activeTab={activeTab}
                onTabChange={(tab) => {
                    if (tab === 'feedback') {
                        setShowFeedback(true);
                    } else {
                        setActiveTab(tab);
                    }
                }}
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

            {/* Feedback Modal */}
            <FeedbackModal
                visible={showFeedback}
                onClose={() => setShowFeedback(false)}
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
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: '#F3F4F6' - Removed to use ImageBackground
    },
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    stickyHeader: {
        backgroundColor: 'transparent',
        paddingLeft: 10,
        paddingRight: spacing.lg,
        paddingTop: 12,
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
        width: 54,
        height: 54,
        borderRadius: 20,
        backgroundColor: 'rgba(219, 234, 254, 0.9)', // Light blue interval
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(191, 219, 254, 0.6)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    scannerButton: {
        width: 54,
        height: 54,
        borderRadius: 20,
        backgroundColor: 'rgba(219, 234, 254, 0.9)', // Light blue interval
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(191, 219, 254, 0.6)',
        marginRight: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    notificationButton: {
        width: 54,
        height: 54,
        borderRadius: 20,
        backgroundColor: 'rgba(219, 234, 254, 0.9)', // Light blue interval
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(191, 219, 254, 0.6)',
        position: 'relative',
        marginRight: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
    launcherContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    launcherContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 40,
    },
    launcherHeader: {
        marginBottom: 32,
        padding: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Soft white glass
        borderRadius: 28,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
    },
    dateText: {
        fontFamily: 'Kanit-Medium',
        fontSize: 14,
        color: colors.neutral[500],
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    welcomeText: {
        fontFamily: 'Kanit-Bold',
        fontSize: 32,
        color: colors.neutral[900],
    },
    launcherGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start', // Align left for grid
        marginHorizontal: -8, // Negative margin to offset padding
    },
    appIconWrapper: {
        width: '33.33%', // 3 columns
        alignItems: 'center',
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    appIcon: {
        width: 68,
        height: 68,
        borderRadius: 18, // Apple-style squircle radius
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    appLabel: {
        fontFamily: 'Kanit-Medium',
        fontSize: 13,
        color: colors.neutral[800],
        textAlign: 'center',
    },
    statusFooter: {
        marginTop: 'auto', // Push to bottom if space permits
        alignItems: 'center',
        paddingBottom: 20,
    },
});
