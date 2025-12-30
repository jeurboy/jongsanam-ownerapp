import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Sidebar, SidebarTab } from '../Sidebar';
import { colors } from '../../theme/tokens';

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeTab: SidebarTab;
    onTabChange: (tab: SidebarTab) => void;
}

export const DashboardLayout = ({ children, activeTab, onTabChange }: DashboardLayoutProps) => {
    return (
        <View style={styles.container}>
            <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
            <View style={styles.contentContainer}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.neutral[50],
    },
    contentContainer: {
        flex: 1,
        height: '100%',
    },
});
