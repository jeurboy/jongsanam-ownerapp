import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/tokens';

export type SidebarTab = 'overview' | 'dashboard' | 'booking' | 'courts' | 'users' | 'feedback' | 'settings';

interface SidebarProps {
    activeTab: SidebarTab;
    onTabChange: (tab: SidebarTab) => void;
    isTransparent?: boolean;
}

const MENU_ITEMS: { id: SidebarTab; icon: string; label: string }[] = [
    { id: 'overview', icon: 'home', label: 'หน้าหลัก' },
    { id: 'dashboard', icon: 'chart-box', label: 'ภาพรวม' },
    { id: 'booking', icon: 'calendar-clock', label: 'จัดการการจอง' },
    { id: 'courts', icon: 'soccer-field', label: 'จัดการสนาม' },
    { id: 'users', icon: 'account-group', label: 'จัดการสมาชิก' },
    { id: 'feedback', icon: 'message-text-outline', label: 'ข้อเสนอแนะ' },
    { id: 'settings', icon: 'cog-outline', label: 'ตั้งค่า' },
];

export const Sidebar = ({ activeTab, onTabChange, isTransparent }: SidebarProps) => {
    const { width, height } = useWindowDimensions();
    const isPortrait = height > width;

    // Reduce width in portrait mode
    const sidebarWidth = isPortrait ? 80 : 100;

    return (
        <View style={[
            styles.container,
            {
                width: sidebarWidth
            }
        ]}>
            <Image
                source={require('../../assets/icon.png')}
                style={[styles.logo, { width: sidebarWidth - 20, height: sidebarWidth - 20 }]}
                resizeMode="contain"
            />
            <View style={styles.glassNav}>
                {MENU_ITEMS.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                isActive && styles.menuItemActive
                            ]}
                            onPress={() => onTabChange(item.id)}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name={isActive ? item.icon.replace('-outline', '') : (item.icon.includes('-outline') ? item.icon : `${item.icon}`)}
                                size={isPortrait ? 24 : 28}
                                color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
                            />
                            <Text style={[
                                styles.menuLabel,
                                isActive && styles.menuLabelActive,
                                { fontSize: isPortrait ? 9 : 10 }
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 100,
        height: '100%',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 60,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 8,
        borderRadius: 12,
    },
    glassNav: {
        width: '100%',
        backgroundColor: 'rgba(2, 38, 99, 0.75)', // Deep rich blue, less gray
        borderRadius: 24,
        paddingVertical: 12,
        gap: 8,
        marginTop: 10,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    menuItem: {
        width: '80%',
        aspectRatio: 1,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    menuItemActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // Light glass highlight
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    menuLabel: {
        fontFamily: 'Kanit-Regular',
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.7)', // Light text for dark bg
        marginTop: 4,
        textAlign: 'center',
    },
    menuLabelActive: {
        fontFamily: 'Kanit-SemiBold',
        color: '#FFFFFF', // Bright white for active
    },
});
