import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize } from '../theme/tokens';

export type SidebarTab = 'overview' | 'dashboard' | 'booking' | 'courts' | 'users' | 'settings';

interface SidebarProps {
    activeTab: SidebarTab;
    onTabChange: (tab: SidebarTab) => void;
    isTransparent?: boolean;
}

const MENU_ITEMS: { id: SidebarTab; icon: string; label: string }[] = [
    { id: 'overview', icon: 'home', label: 'หน้าหลัก' },
    { id: 'dashboard', icon: 'chart-box', label: 'ภาพรวม' },
    { id: 'booking', icon: 'calendar-clock', label: 'จัดการการจอง' },
    { id: 'courts', icon: 'stadium-variant', label: 'จัดการสนาม' },
    { id: 'users', icon: 'account-group', label: 'จัดการสมาชิก' },
    { id: 'settings', icon: 'cog-outline', label: 'ตั้งค่า' },
];

export const Sidebar = ({ activeTab, onTabChange, isTransparent }: SidebarProps) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.container,
            { paddingTop: Math.max(insets.top, spacing.lg) }
        ]}>
            <Image
                source={require('../assets/jongsanam_logo_light.png')}
                style={styles.logo}
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
                                size={28}
                                color={isActive ? colors.primary.main : colors.neutral[400]}
                            />
                            <Text style={[
                                styles.menuLabel,
                                isActive && styles.menuLabelActive
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
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 8,
        borderRadius: 12,
    },
    glassNav: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.45)', // Even more transparent
        borderRadius: 28,
        paddingVertical: 15,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        marginTop: 10,
        // Shadow for the glass card
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    menuItem: {
        width: '88%',
        paddingVertical: 12,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    menuItemActive: {
        backgroundColor: colors.white,
        shadowColor: colors.primary.main,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    menuLabel: {
        fontFamily: 'Regular',
        fontSize: 10,
        color: colors.neutral[600],
        marginTop: 4,
        textAlign: 'center',
    },
    menuLabelActive: {
        fontFamily: 'SemiBold',
        color: colors.primary.main,
    },
});
