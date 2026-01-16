
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Platform, ActionSheetIOS } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, parseISO } from 'date-fns';

interface MergedBookingSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    mergedBooking: any;
    onSelectSlot: (bookingId: string) => void;
    onEdit: () => void;
    onBulkPayment: () => void;
    onBulkStatusChange: (status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW') => void;
}

const STATUS_OPTIONS = [
    { label: 'จองสำเร็จ รอยืนยันสนาม', value: 'PENDING' },
    { label: 'ยืนยันสนาม', value: 'CONFIRMED' },
    { label: 'เจ้าของยกเลิกสนาม', value: 'CANCELLED' },
    { label: 'ลูกค้ามาใช้บริการแล้ว', value: 'COMPLETED' },
    { label: 'ไม่มาใช้บริการ', value: 'NO_SHOW' },
];

export const MergedBookingSelectionModal: React.FC<MergedBookingSelectionModalProps> = ({
    visible,
    onClose,
    mergedBooking,
    onSelectSlot,
    onEdit,
    onBulkPayment,
    onBulkStatusChange
}) => {
    const [selectedStatus, setSelectedStatus] = useState(STATUS_OPTIONS[0]);

    // Update selectedStatus when mergedBooking changes or modal opens
    useEffect(() => {
        if (mergedBooking?.status) {
            const matchedStatus = STATUS_OPTIONS.find(opt => opt.value === mergedBooking.status);
            if (matchedStatus) {
                setSelectedStatus(matchedStatus);
            }
        }
    }, [mergedBooking?.status, visible]);

    if (!mergedBooking) return null;

    const bookings = mergedBooking.bookings || [];
    const count = bookings.length;
    const allPaid = bookings.every((b: any) => b.isPaid);

    const handleStatusSelect = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [...STATUS_OPTIONS.map(o => o.label), 'ยกเลิก'],
                    cancelButtonIndex: STATUS_OPTIONS.length,
                },
                (buttonIndex) => {
                    if (buttonIndex < STATUS_OPTIONS.length) {
                        setSelectedStatus(STATUS_OPTIONS[buttonIndex]);
                    }
                }
            );
        } else {
            // Simple toggle for Android 
            // In a real app, use a Picker or a custom Modal for Android
            const currentIndex = STATUS_OPTIONS.findIndex(o => o.value === selectedStatus.value);
            const nextIndex = (currentIndex + 1) % STATUS_OPTIONS.length;
            setSelectedStatus(STATUS_OPTIONS[nextIndex]);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.overlayBackground} activeOpacity={1} onPress={onClose} />
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>รายละเอียดการจอง</Text>
                            <Text style={styles.headerSubtitle}>
                                {mergedBooking.customerName} • {count} ช่วงเวลา
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body}>
                        {/* Booking List */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>ช่วงเวลาที่จอง</Text>
                            {bookings.map((booking: any, index: number) => (
                                <TouchableOpacity
                                    key={booking.id}
                                    style={styles.listItem}
                                    onPress={() => onSelectSlot(booking.id)}
                                >
                                    <View style={styles.listIndex}>
                                        <Text style={styles.listIndexText}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.listContent}>
                                        <Text style={styles.timeText}>
                                            {format(parseISO(booking.timeSlotStart), 'HH:mm')} - {format(parseISO(booking.timeSlotEnd), 'HH:mm')}
                                        </Text>
                                        <Text style={styles.priceText}>฿{Number(booking.totalPrice || 0).toLocaleString()}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="pencil-outline" size={20} color="#9ca3af" />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionSection}>
                            {/* Payment Button */}
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: allPaid ? '#f59e0b' : '#10b981' }]}
                                onPress={onBulkPayment}
                            >
                                <MaterialCommunityIcons name={allPaid ? "cash-refund" : "cash-check"} size={20} color="white" />
                                <Text style={styles.actionButtonText}>
                                    {allPaid ? 'ยกเลิกการชำระเงิน' : `บันทึกการชำระทั้งหมด (${count} รายการ)`}
                                </Text>
                            </TouchableOpacity>

                            {/* Status Change Dropdown Section */}
                            <View>
                                <Text style={styles.statusLabel}>เปลี่ยนสถานะทั้งหมด</Text>
                                <View style={styles.statusControlRow}>
                                    <TouchableOpacity style={styles.statusSelector} onPress={handleStatusSelect}>
                                        <Text style={styles.statusSelectorText}>{selectedStatus.label}</Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color="#4b5563" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.saveStatusButton}
                                        onPress={() => onBulkStatusChange(selectedStatus.value as any)}
                                    >
                                        <Text style={styles.saveStatusButtonText}>บันทึก</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Cancel Button */}
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => onEdit()}
                            >
                                <Text style={styles.cancelButtonText}>แก้ไข</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    overlayBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '85%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    body: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    listIndex: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    listIndexText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4b5563',
    },
    listContent: {
        flex: 1,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    priceText: {
        fontSize: 12,
        color: '#6b7280',
    },
    actionSection: {
        gap: 16,
        paddingBottom: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 8,
        gap: 8,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    statusLabel: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
        marginBottom: 8,
    },
    statusControlRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statusSelector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    statusSelectorText: {
        fontSize: 16,
        color: '#111827',
    },
    saveStatusButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveStatusButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    cancelButton: {
        backgroundColor: '#e5e7eb',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#374151',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
