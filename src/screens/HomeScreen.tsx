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
import { QRScannerScreen } from './QRScannerScreen';
import Orientation from 'react-native-orientation-locker'; // Import Orientation Locker

// Placeholder for the background image
const HOME_BG_IMAGE = require('../assets/images/home_bg.png');

const MENU_ITEMS = [
    {
        id: 'overview',
        title: 'หน้าหลัก',
        image: require('../assets/launcher/dashboard_flat.png'),
        accent: '#6366F1',
    },
    {
        id: 'booking',
        title: 'จัดการการจอง',
        image: require('../assets/launcher/booking_flat.png'),
        accent: '#10B981',
    },
    {
        id: 'customer',
        title: 'จัดการสมาชิก',
        isVector: true,
        iconName: 'account-group',
        accent: '#F59E0B',
    },
];

export const HomeScreen = () => {
    const { user, logout } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<SidebarTab>('overview');
    const [showQRScanner, setShowQRScanner] = useState(false);

    useEffect(() => {
        Orientation.lockToLandscape();
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
            }}
        >
            <View style={styles.imageContainer}>
                {item.isVector ? (
                    <View style={styles.vectorIconWrapper}>
                        <MaterialCommunityIcons name={item.iconName as any} size={80} color={item.accent} />
                    </View>
                ) : (
                    <Image source={item.image} style={styles.launcherImage} resizeMode="contain" />
                )}
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
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <DashboardLayout
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isTransparent={true}
            >
                <View style={{ flex: 1 }}>
                    {activeTab !== 'overview' && <StickyHeader />}
                    {renderContent()}
                </View>
            </DashboardLayout>

            {/* QR Scanner Modal */}
            <QRScannerScreen
                visible={showQRScanner}
                onClose={() => setShowQRScanner(false)}
                businessId={selectedBusinessId || undefined}
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
        paddingLeft: 40, // Increased to align with content below
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
    launcherContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    launcherContent: {
        flexGrow: 1,
        padding: 40,
        justifyContent: 'center',
    },
    launcherHeader: {
        marginBottom: 80,
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
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 32,
    },
    launcherCard: {
        width: '22%',
        aspectRatio: 0.9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 24,
        padding: 16,
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
        height: '75%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    launcherImage: {
        width: '70%',
        height: '70%',
    },
    vectorIconWrapper: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    launcherLabel: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: colors.neutral[700],
        marginTop: 8,
    },
    statusFooter: {
        marginTop: 100,
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
