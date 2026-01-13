import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, fontSize, borderRadius } from '../theme/tokens';
import { Notification } from '../services/notification.service';

interface NotificationModalProps {
    visible: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    loading?: boolean;
    onNotificationClick: (notification: Notification) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
    visible,
    onClose,
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    loading,
    onNotificationClick
}) => {
    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                !item.isRead && styles.unreadItem
            ]}
            onPress={() => onNotificationClick(item)}
        >
            <View style={[
                styles.iconContainer,
                item.type === 'NEW_BOOKING' ? styles.bookingIcon : styles.defaultIcon
            ]}>
                <MaterialCommunityIcons
                    name={item.type === 'NEW_BOOKING' ? "calendar-check" : "bell-ring"}
                    size={24}
                    color={item.type === 'NEW_BOOKING' ? colors.success[600] : colors.neutral[500]}
                />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>
                    {item.title}
                </Text>
                <Text style={styles.message} numberOfLines={2}>
                    {item.message}
                </Text>
                <Text style={styles.time}>
                    {new Date(item.createdAt).toLocaleDateString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short'
                    })}
                </Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <MaterialCommunityIcons name="bell" size={24} color={colors.primary[600]} />
                            <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.neutral[500]} />
                        </TouchableOpacity>
                    </View>

                    {notifications.length > 0 && (
                        <View style={styles.actionsBar}>
                            <TouchableOpacity
                                onPress={onMarkAllAsRead}
                                style={styles.markAllButton}
                                disabled={loading}
                            >
                                <MaterialCommunityIcons name="check-all" size={18} color={colors.primary[600]} />
                                <Text style={styles.markAllText}>อ่านทั้งหมด</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {loading && notifications.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={colors.primary[500]} />
                        </View>
                    ) : (
                        <FlatList
                            data={notifications}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <MaterialCommunityIcons name="bell-off-outline" size={48} color={colors.neutral[300]} />
                                    <Text style={styles.emptyText}>ไม่มีการแจ้งเตือน</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerTitle: {
        fontFamily: 'Kanit-Bold',
        fontSize: fontSize.lg,
        color: colors.neutral[900],
    },
    closeButton: {
        padding: 4,
    },
    actionsBar: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[50],
        alignItems: 'flex-end',
    },
    markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    markAllText: {
        fontFamily: 'Kanit-Medium',
        fontSize: fontSize.sm,
        color: colors.primary[600],
    },
    listContent: {
        padding: spacing.md,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: '#fff',
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    unreadItem: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[100],
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    bookingIcon: {
        backgroundColor: colors.success[100],
    },
    defaultIcon: {
        backgroundColor: colors.neutral[100],
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: fontSize.md,
        color: colors.neutral[800],
        marginBottom: 2,
    },
    unreadTitle: {
        color: colors.neutral[900],
    },
    message: {
        fontFamily: 'Kanit-Regular',
        fontSize: fontSize.sm,
        color: colors.neutral[500],
        marginBottom: 4,
    },
    time: {
        fontFamily: 'Kanit-Regular',
        fontSize: fontSize.xs,
        color: colors.neutral[400],
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary[500],
        alignSelf: 'center',
        marginLeft: spacing.sm,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontFamily: 'Kanit-Regular',
        fontSize: fontSize.md,
        color: colors.neutral[400],
        marginTop: spacing.md,
    },
});
