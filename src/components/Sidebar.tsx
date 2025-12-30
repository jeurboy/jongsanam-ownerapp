import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize } from '../theme/tokens';

export type SidebarTab = 'overview' | 'booking' | 'users' | 'settings';

interface SidebarProps {
    activeTab: SidebarTab;
    onTabChange: (tab: SidebarTab) => void;
}

const MENU_ITEMS: { id: SidebarTab; icon: string; label: string }[] = [
    { id: 'overview', icon: 'view-dashboard', label: 'ภาพรวม' },
    { id: 'booking', icon: 'calendar-check', label: 'การจอง' },
    { id: 'users', icon: 'account-group', label: 'ผู้ใช้งาน' },
];

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
            {/* Logo Area */}
            <View style={styles.logoContainer}>
                <View style={styles.logoBadge}>
                    <MaterialCommunityIcons name="trophy-variant" size={24} color={colors.white} />
                </View>
                <Text style={styles.appName}>JongSan</Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuContainer}>
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
                            activeOpacity={0.8}
                        >
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons
                                    name={item.icon}
                                    size={24}
                                    color={isActive ? colors.primary.main : colors.neutral[400]}
                                />
                            </View>
                            {/* Optional: Add Label if user wants expanded sidebar later.
                                For now, design implies icons or compact mode, but let's add text for clarity 
                                and hide it or style it minimally if needed. 
                                Based on the image, it's a narrow bar with icons. 
                                Let's keep it icon-centric but maybe show tooltip or keep it simple.
                            */}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity style={styles.menuItem}>
                    <MaterialCommunityIcons name="cog" size={24} color={colors.neutral[400]} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, { marginTop: spacing.sm }]}>
                    <View style={styles.avatarPlaceholder}>
                        <Image
                            source={{ uri: 'https://ui-avatars.com/api/?name=Admin&background=random' }}
                            style={styles.avatar}
                        />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 80, // Collapsed style width
        backgroundColor: '#1E1E2E', // Dark Navy background
        height: '100%',
        paddingVertical: spacing.xl,
        alignItems: 'center',
        // borderTopRightRadius: 20, // Removed for full height edge-to-edge
        // borderBottomRightRadius: 20, // Removed for full height edge-to-edge
    },
    logoContainer: {
        marginBottom: spacing.xxl,
        alignItems: 'center',
        gap: spacing.xs,
    },
    logoBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primary.main,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appName: {
        color: colors.white,
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
        display: 'none', // Hide for compact sidebar
    },
    menuContainer: {
        flex: 1,
        width: '100%',
        gap: spacing.md,
    },
    menuItem: {
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        borderRadius: 16,
    },
    menuItemActive: {
        backgroundColor: colors.white,
        // Add curve effect hack if needed, or just clean white rounded square
        // The image shows a complex curve. A simple rounded rect is a good start.
        shadowColor: colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    iconContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomContainer: {
        marginTop: 'auto',
        gap: spacing.sm,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.white,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
});
