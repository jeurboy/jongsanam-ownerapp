import { View, StyleSheet, Image, SafeAreaView } from 'react-native';
import { Sidebar, SidebarTab } from '../Sidebar';
import { colors } from '../../theme/tokens';

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeTab: SidebarTab;
    onTabChange: (tab: SidebarTab) => void;
    isTransparent?: boolean;
}

export const DashboardLayout = ({ children, activeTab, onTabChange, isTransparent }: DashboardLayoutProps) => {
    return (
        <View style={styles.container}>
            {/* Absolute Root Background - Stretches to entire device screen */}
            <View style={StyleSheet.absoluteFill}>
                <Image
                    source={require('../../assets/launcher/bg_light.png')}
                    style={styles.backgroundImage}
                    resizeMode="stretch"
                />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.4)' }]} />
            </View>

            <View style={styles.layoutWrapper}>
                <Sidebar activeTab={activeTab} onTabChange={onTabChange} isTransparent={isTransparent} />
                <View style={styles.contentContainer}>
                    {children}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backgroundImage: {
        width: '100%',
        height: '100%',
    },
    layoutWrapper: {
        flex: 1,
        flexDirection: 'row',
    },
    contentContainer: {
        flex: 1,
    },
});
