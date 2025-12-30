import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Dimensions, TextInput, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors, fonts, spacing, borderRadius } from '../../theme/tokens';
import { Court } from '../../types/court';
import { Booking, BookingStatus } from '../../types/booking';
import { courtService } from '../../services/court.service';
import { bookingService } from '../../services/booking.service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, addHours, startOfDay, getHours, setHours, setMinutes, isSameDay, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

// Constants for table layout
const TIME_COL_WIDTH = 60;
const COURT_COL_WIDTH = 120;
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 60; // Height per hour slot
const START_HOUR = 8; // 08:00
const END_HOUR = 24;  // 24:00 (Midnight)

export const BookingManagerView = () => {
    // State
    const [loading, setLoading] = useState(true);
    const [courts, setCourts] = useState<Court[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Refs for synchronized scrolling
    const headerScrollRef = useRef<ScrollView>(null);

    // View Detail Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Add Booking Modal
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [addingBooking, setAddingBooking] = useState(false);
    const [newBooking, setNewBooking] = useState({
        courtId: '',
        date: '',
        startTime: '10:00',
        endTime: '11:00',
        customerName: '',
        customerPhone: '',
        price: '',
        status: 'CONFIRMED'
    });
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch courts
            const courtsData = await courtService.getAllOwnerCourts();
            console.log('Courts loaded:', courtsData?.length || 0, courtsData);
            setCourts(courtsData);

            // 2. Fetch bookings for the date
            // API expects ISO timestamp in UTC
            // toISOString() automatically converts local time to UTC
            // For Bangkok (UTC+7): local 00:00 → UTC 17:00 previous day
            const dateFrom = new Date(selectedDate);
            dateFrom.setHours(0, 0, 0, 0);

            const dateTo = new Date(selectedDate);
            dateTo.setHours(23, 59, 59, 999);

            console.log('Fetching bookings from:', dateFrom.toISOString(), 'to:', dateTo.toISOString());
            let bookingsData = await bookingService.getBookings(dateFrom.toISOString(), dateTo.toISOString(), undefined, undefined, 200);
            console.log('Bookings loaded:', bookingsData?.length || 0, bookingsData);

            setBookings(bookingsData || []);
        } catch (error) {
            console.error('Failed to load booking data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Generate time slots 08:00 - 24:00
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let i = START_HOUR; i < END_HOUR; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`);
        }
        return slots;
    }, []);

    // Merge consecutive bookings from same customer (phone number) for the same court
    const getMergedBookingsForCourt = (courtId: string) => {
        const courtBookings = bookings
            .filter(b => (b.court?.id || b.courtId) === courtId)
            .sort((a, b) => new Date(a.timeSlotStart).getTime() - new Date(b.timeSlotStart).getTime());

        const merged: Array<{
            id: string;
            ids: string[];
            customerName: string;
            customerPhone: string;
            timeSlotStart: string;
            timeSlotEnd: string;
            status: string;
            bookings: Booking[];
        }> = [];

        for (const booking of courtBookings) {
            const phone = booking.serviceUser?.phone || '';
            const lastMerged = merged[merged.length - 1];

            // Check if this booking can be merged with the last one
            // Must have same phone, same status, and consecutive times
            if (lastMerged &&
                lastMerged.customerPhone === phone &&
                lastMerged.status === booking.status &&
                phone !== '' &&
                new Date(lastMerged.timeSlotEnd).getTime() === new Date(booking.timeSlotStart).getTime()) {
                // Merge: extend the end time
                lastMerged.timeSlotEnd = booking.timeSlotEnd;
                lastMerged.ids.push(booking.id);
                lastMerged.bookings.push(booking);
            } else {
                // Start new merged group
                merged.push({
                    id: booking.id,
                    ids: [booking.id],
                    customerName: booking.serviceUser?.name || '-',
                    customerPhone: phone,
                    timeSlotStart: booking.timeSlotStart,
                    timeSlotEnd: booking.timeSlotEnd,
                    status: booking.status,
                    bookings: [booking],
                });
            }
        }

        return merged;
    };

    // Helper to position booking blocks
    const getBookingStyle = (booking: Booking) => {
        const start = parseISO(booking.timeSlotStart);
        const end = parseISO(booking.timeSlotEnd);

        // Calculate start offset from START_HOUR
        const startHour = start.getHours();
        const startMin = start.getMinutes();
        const endHour = end.getHours() === 0 ? 24 : end.getHours(); // Handle midnight as 24
        const endMin = end.getMinutes();

        const topOffset = ((startHour - START_HOUR) * ROW_HEIGHT) + ((startMin / 60) * ROW_HEIGHT);
        const durationHours = (endHour + endMin / 60) - (startHour + startMin / 60);
        const height = durationHours * ROW_HEIGHT;

        // Color based on status - transparent overlay colors (70% opacity)
        let backgroundColor = 'rgba(147, 197, 253, 0.7)'; // Default: blue-300 @ 70%
        let borderColor = '#3B82F6'; // blue-500

        if (booking.status === BookingStatus.CONFIRMED) {
            backgroundColor = 'rgba(134, 239, 172, 0.7)'; // green-300 @ 70%
            borderColor = '#22C55E'; // green-500
        } else if (booking.status === BookingStatus.PENDING) {
            backgroundColor = 'rgba(253, 224, 71, 0.7)'; // yellow-300 @ 70%
            borderColor = '#EAB308'; // yellow-500
        } else if (booking.status === BookingStatus.COMPLETED) {
            backgroundColor = 'rgba(209, 213, 219, 0.7)'; // gray-300 @ 70%
            borderColor = '#6B7280'; // gray-500
        } else if (booking.status === BookingStatus.CANCELLED) {
            backgroundColor = 'rgba(252, 165, 165, 0.7)'; // red-300 @ 70%
            borderColor = '#EF4444'; // red-500
        }

        return {
            top: topOffset,
            height: height, // Full height, no gap - adjacent bookings will touch
            backgroundColor,
            borderColor,
        };
    };

    // Helper for merged booking style
    const getMergedBookingStyle = (mergedBooking: { timeSlotStart: string; timeSlotEnd: string; status: string }) => {
        const start = parseISO(mergedBooking.timeSlotStart);
        const end = parseISO(mergedBooking.timeSlotEnd);

        const startHour = start.getHours();
        const startMin = start.getMinutes();
        const endHour = end.getHours() === 0 ? 24 : end.getHours();
        const endMin = end.getMinutes();

        const topOffset = ((startHour - START_HOUR) * ROW_HEIGHT) + ((startMin / 60) * ROW_HEIGHT);
        const durationHours = (endHour + endMin / 60) - (startHour + startMin / 60);
        const height = durationHours * ROW_HEIGHT;

        let backgroundColor = 'rgba(147, 197, 253, 0.7)';
        let borderColor = '#3B82F6';

        if (mergedBooking.status === BookingStatus.CONFIRMED) {
            backgroundColor = 'rgba(134, 239, 172, 0.7)';
            borderColor = '#22C55E';
        } else if (mergedBooking.status === BookingStatus.PENDING) {
            backgroundColor = 'rgba(253, 224, 71, 0.7)';
            borderColor = '#EAB308';
        } else if (mergedBooking.status === BookingStatus.COMPLETED) {
            backgroundColor = 'rgba(209, 213, 219, 0.7)';
            borderColor = '#6B7280';
        } else if (mergedBooking.status === BookingStatus.CANCELLED) {
            backgroundColor = 'rgba(252, 165, 165, 0.7)';
            borderColor = '#EF4444';
        }

        return {
            top: topOffset,
            height: height,
            backgroundColor,
            borderColor,
        };
    };

    const handleBookingPress = async (bookingId: string) => {
        setLoadingDetail(true);
        setModalVisible(true);
        // Clear previous selection while loading to show spinner
        setSelectedBooking(null);
        try {
            // Fetch full detail
            const detail = await bookingService.getBookingDetail(bookingId);
            setSelectedBooking(detail);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Reset and open Add Modal
    // Reset and open Add Modal
    useEffect(() => {
        if (addModalVisible && !editingBookingId) {
            setNewBooking({
                courtId: courts.length > 0 ? courts[0].id : '',
                date: format(selectedDate, 'yyyy-MM-dd'),
                startTime: '10:00',
                endTime: '11:00',
                customerName: '',
                customerPhone: '',
                price: '',
                status: 'CONFIRMED'
            });
        }
    }, [addModalVisible, courts, selectedDate, editingBookingId]);

    const handleEditBooking = () => {
        if (!selectedBooking) return;

        const booking = selectedBooking;
        setEditingBookingId(booking.id);

        // Parse date and times
        const startDate = parseISO(booking.timeSlotStart);
        const endDate = parseISO(booking.timeSlotEnd);

        let phone = booking.serviceUser?.phone || '';
        if (phone.startsWith('+66')) {
            phone = '0' + phone.substring(3);
        }

        setNewBooking({
            courtId: booking.court?.id || booking.courtId || '',
            date: format(startDate, 'yyyy-MM-dd'),
            startTime: format(startDate, 'HH:mm'),
            endTime: format(endDate, 'HH:mm'),
            customerName: booking.serviceUser?.name || '',
            customerPhone: phone,
            price: booking.price ? booking.price.toString() : '',
            status: booking.status
        });

        setModalVisible(false);
        setAddModalVisible(true);
    };

    const handleAddBooking = async () => {
        if (!newBooking.courtId || !newBooking.customerName || !newBooking.customerPhone) {
            console.error('Missing required fields');
            return;
        }

        setAddingBooking(true);
        try {
            // Format phone number
            let formattedPhone = newBooking.customerPhone.trim();
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '+66' + formattedPhone.substring(1);
            } else if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+66' + formattedPhone;
            }

            const payload = {
                courtId: newBooking.courtId,
                date: newBooking.date,
                startTime: newBooking.startTime,
                endTime: newBooking.endTime,
                customerName: newBooking.customerName,
                customerPhone: formattedPhone,
                price: newBooking.price ? parseFloat(newBooking.price) : undefined,
                status: newBooking.status
            };

            if (editingBookingId) {
                await bookingService.updateBooking(editingBookingId, payload);
            } else {
                await bookingService.createBooking(payload);
            }

            setAddModalVisible(false);
            setEditingBookingId(null);
            loadData(); // Refresh bookings
        } catch (error) {
            console.error('Error saving booking:', error);
        } finally {
            setAddingBooking(false);
        }
    };

    // Generate time options for picker
    const timeOptions = useMemo(() => {
        const times: string[] = [];
        for (let h = START_HOUR; h <= END_HOUR; h++) {
            times.push(`${String(h).padStart(2, '0')}:00`);
            if (h < END_HOUR) times.push(`${String(h).padStart(2, '0')}:30`);
        }
        return times;
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>ตารางการจอง</Text>
                    <Text style={styles.subtitle}>{format(selectedDate, 'd MMMM yyyy', { locale: th })}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => setSelectedDate(d => new Date(d.setDate(d.getDate() - 1)))}>
                        <MaterialCommunityIcons name="chevron-left" size={30} color={colors.neutral[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.todayButton} onPress={() => setSelectedDate(new Date())}>
                        <Text style={styles.todayText}>วันนี้</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSelectedDate(d => new Date(d.setDate(d.getDate() + 1)))}>
                        <MaterialCommunityIcons name="chevron-right" size={30} color={colors.neutral[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setAddModalVisible(true)}
                    >
                        <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                        <Text style={styles.addButtonText}>เพิ่มการจอง</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary.main} />
                </View>
            ) : courts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>ไม่พบข้อมูลสนาม</Text>
                </View>
            ) : (
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeaderRow}>
                        <View style={{ width: TIME_COL_WIDTH }} />
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            scrollEnabled={false}
                            ref={headerScrollRef}
                        >
                            {courts.map(court => (
                                <View key={court.id} style={styles.columnHeader}>
                                    <Text style={styles.columnHeaderText} numberOfLines={1}>{court.name}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    <ScrollView style={styles.verticalScroll}>
                        <View style={styles.bodyContainer}>
                            <View style={styles.timeColumn}>
                                {timeSlots.map((time, index) => (
                                    <View key={index} style={styles.timeSlot}>
                                        <Text style={styles.timeText}>{time}</Text>
                                    </View>
                                ))}
                            </View>

                            <ScrollView
                                horizontal
                                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                                    const x = e.nativeEvent.contentOffset.x;
                                    headerScrollRef.current?.scrollTo({ x, animated: false });
                                }}
                                scrollEventThrottle={16}
                            >
                                <View style={styles.grid}>
                                    {courts.map((court, cIndex) => (
                                        <View key={court.id} style={styles.courtColumn}>
                                            {timeSlots.map((_, tIndex) => (
                                                <View key={tIndex} style={styles.gridCell} />
                                            ))}

                                            {getMergedBookingsForCourt(court.id).map(mergedBooking => {
                                                const bookingStyle = getMergedBookingStyle(mergedBooking);
                                                return (
                                                    <TouchableOpacity
                                                        key={mergedBooking.id}
                                                        style={[
                                                            styles.bookingBlock,
                                                            {
                                                                top: bookingStyle.top,
                                                                height: bookingStyle.height,
                                                                backgroundColor: bookingStyle.backgroundColor,
                                                                borderLeftColor: bookingStyle.borderColor,
                                                            }
                                                        ]}
                                                        onPress={() => handleBookingPress(mergedBooking.bookings[0].id)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Text style={styles.bookingText} numberOfLines={1}>
                                                            {mergedBooking.customerName}
                                                        </Text>
                                                        <Text style={styles.bookingSubText}>
                                                            {format(parseISO(mergedBooking.timeSlotStart), 'HH:mm')} - {format(parseISO(mergedBooking.timeSlotEnd), 'HH:mm')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    </ScrollView>
                </View>
            )}

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
                supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>รายละเอียดการจอง</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.neutral[500]} />
                            </TouchableOpacity>
                        </View>

                        {loadingDetail ? (
                            <ActivityIndicator size="large" color={colors.primary.main} style={{ marginVertical: 20 }} />
                        ) : selectedBooking ? (
                            <View>
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="account" size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>ลูกค้า</Text>
                                        <Text style={styles.detailValue}>{selectedBooking.serviceUser?.name || '-'}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="phone" size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>เบอร์โทรศัพท์</Text>
                                        <TouchableOpacity
                                            style={styles.copyableRow}
                                            onPress={() => {
                                                const phone = selectedBooking.serviceUser?.phone;
                                                if (phone) {
                                                    Clipboard.setString(phone);
                                                    Alert.alert('คัดลอกสำเร็จ', `เบอร์ ${phone} ถูกคัดลอกแล้ว`);
                                                }
                                            }}
                                        >
                                            <Text style={styles.detailValueCopyable}>{selectedBooking.serviceUser?.phone || '-'}</Text>
                                            <MaterialCommunityIcons name="content-copy" size={16} color={colors.primary.main} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="map-marker" size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>สนาม</Text>
                                        <Text style={styles.detailValue}>{selectedBooking.court?.name || selectedBooking.courtId}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="clock-outline" size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>เวลา</Text>
                                        <Text style={styles.detailValue}>
                                            {format(parseISO(selectedBooking.timeSlotStart), 'd MMM yyyy, HH:mm', { locale: th })} - {format(parseISO(selectedBooking.timeSlotEnd), 'HH:mm')}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="cash" size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>ราคา</Text>
                                        <Text style={styles.detailValue}>{selectedBooking.totalPrice} บาท</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="list-status" size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                    <View>
                                        <Text style={styles.detailLabel}>สถานะ</Text>
                                        <View style={[styles.statusBadge, {
                                            backgroundColor: selectedBooking.status === BookingStatus.CONFIRMED ? '#DCFCE7' :
                                                selectedBooking.status === BookingStatus.PENDING ? '#FEF9C3' : colors.neutral[100]
                                        }]}>
                                            <Text style={[styles.statusText, {
                                                color: selectedBooking.status === BookingStatus.CONFIRMED ? '#166534' :
                                                    selectedBooking.status === BookingStatus.PENDING ? '#854D0E' : colors.neutral[700]
                                            }]}>
                                                {selectedBooking.status}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={handleEditBooking}
                                >
                                    <MaterialCommunityIcons name="pencil" size={20} color={colors.white} />
                                    <Text style={styles.editButtonText}>แก้ไขการจอง</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={styles.errorText}>ไม่พบข้อมูลการจอง</Text>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Add Booking Modal */}
            <Modal
                visible={addModalVisible}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setAddModalVisible(false)}
                supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
            >
                <View style={styles.addModalContent}>
                    <View style={styles.addModalHeader}>
                        <Text style={styles.addModalTitle}>
                            {editingBookingId ? 'แก้ไขข้อมูลการจอง' : 'เพิ่มการจองใหม่'}
                        </Text>
                        <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={28} color={colors.white} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.addModalBody} showsVerticalScrollIndicator={false}>
                        {/* Court Selection */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>สนาม *</Text>
                            <View style={styles.pickerContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {courts.map(court => (
                                        <TouchableOpacity
                                            key={court.id}
                                            style={[
                                                styles.pickerItem,
                                                newBooking.courtId === court.id && styles.pickerItemSelected
                                            ]}
                                            onPress={() => setNewBooking(prev => ({ ...prev, courtId: court.id }))}
                                        >
                                            <Text style={[
                                                styles.pickerItemText,
                                                newBooking.courtId === court.id && styles.pickerItemTextSelected
                                            ]}>
                                                {court.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        {/* Date & Time Row */}
                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>วันที่</Text>
                                <Text style={styles.formValue}>{newBooking.date}</Text>
                            </View>
                        </View>

                        {/* Time Selection Row */}
                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>เวลาเริ่ม *</Text>
                                <View style={styles.timeGrid}>
                                    {timeOptions.map(time => {
                                        // Check if this time slot is booked
                                        const isBooked = bookings.some(b => {
                                            // Skip current booking if editing
                                            if (editingBookingId && b.id === editingBookingId) return false;

                                            if ((b.court?.id || b.courtId) !== newBooking.courtId) return false;
                                            if (['CANCELLED', 'NO_SHOW'].includes(b.status)) return false;

                                            const bStart = new Date(b.timeSlotStart);
                                            const bEnd = new Date(b.timeSlotEnd);
                                            const [h, m] = time.split(':').map(Number);
                                            const slotTime = new Date(selectedDate);
                                            slotTime.setHours(h, m, 0, 0);

                                            // Check if slot is within booking range
                                            return slotTime >= bStart && slotTime < bEnd;
                                        });

                                        return (
                                            <TouchableOpacity
                                                key={`start-${time}`}
                                                style={[
                                                    styles.timeButton,
                                                    newBooking.startTime === time && styles.timeButtonSelected,
                                                    isBooked && styles.timeButtonDisabled
                                                ]}
                                                onPress={() => {
                                                    if (isBooked) return;
                                                    const [h, m] = time.split(':').map(Number);
                                                    const endH = (h + 1) % 24;
                                                    setNewBooking(prev => ({
                                                        ...prev,
                                                        startTime: time,
                                                        endTime: `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                                                    }));
                                                }}
                                                disabled={isBooked}
                                            >
                                                <Text style={[
                                                    styles.timeButtonText,
                                                    newBooking.startTime === time && styles.timeButtonTextSelected,
                                                    isBooked && styles.timeButtonTextDisabled
                                                ]}>{time}</Text>
                                                {isBooked && <Text style={styles.bookedLabel}>จองแล้ว</Text>}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>เวลาสิ้นสุด *</Text>
                                <View style={styles.timeGrid}>
                                    {timeOptions.map(time => {
                                        // Check if this end time would overlap with a booking
                                        const [startH, startM] = newBooking.startTime.split(':').map(Number);
                                        const [endH, endM] = time.split(':').map(Number);

                                        // End time must be after start time
                                        const startMinutes = startH * 60 + startM;
                                        const endMinutes = endH * 60 + endM;
                                        const isInvalid = endMinutes <= startMinutes;

                                        // Check if range overlaps with existing bookings
                                        const hasOverlap = bookings.some(b => {
                                            // Skip current booking if editing
                                            if (editingBookingId && b.id === editingBookingId) return false;

                                            if ((b.court?.id || b.courtId) !== newBooking.courtId) return false;
                                            if (['CANCELLED', 'NO_SHOW'].includes(b.status)) return false;

                                            const bStart = new Date(b.timeSlotStart);
                                            const bEnd = new Date(b.timeSlotEnd);

                                            const newStart = new Date(selectedDate);
                                            newStart.setHours(startH, startM, 0, 0);
                                            const newEnd = new Date(selectedDate);
                                            newEnd.setHours(endH, endM, 0, 0);

                                            // Check overlap: newStart < bEnd && newEnd > bStart
                                            return newStart < bEnd && newEnd > bStart;
                                        });

                                        const isDisabled = isInvalid || hasOverlap;

                                        return (
                                            <TouchableOpacity
                                                key={`end-${time}`}
                                                style={[
                                                    styles.timeButton,
                                                    newBooking.endTime === time && styles.timeButtonSelected,
                                                    isDisabled && styles.timeButtonDisabled
                                                ]}
                                                onPress={() => {
                                                    if (isDisabled) return;
                                                    setNewBooking(prev => ({ ...prev, endTime: time }));
                                                }}
                                                disabled={isDisabled}
                                            >
                                                <Text style={[
                                                    styles.timeButtonText,
                                                    newBooking.endTime === time && styles.timeButtonTextSelected,
                                                    isDisabled && styles.timeButtonTextDisabled
                                                ]}>{time}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>

                        {/* Customer Info */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>ชื่อลูกค้า *</Text>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons name="account" size={20} color={colors.neutral[400]} />
                                <TextInput
                                    style={styles.textInputReal}
                                    value={newBooking.customerName}
                                    onChangeText={(text) => setNewBooking(prev => ({ ...prev, customerName: text }))}
                                    placeholder="กรอกชื่อลูกค้า"
                                    placeholderTextColor={colors.neutral[400]}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>เบอร์โทรศัพท์ *</Text>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons name="phone" size={20} color={colors.neutral[400]} />
                                <TextInput
                                    style={styles.textInputReal}
                                    value={newBooking.customerPhone}
                                    onChangeText={(text) => setNewBooking(prev => ({ ...prev, customerPhone: text }))}
                                    placeholder="0812345678"
                                    placeholderTextColor={colors.neutral[400]}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>ราคา (บาท)</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons name="cash" size={20} color={colors.neutral[400]} />
                                    <TextInput
                                        style={styles.textInputReal}
                                        value={newBooking.price}
                                        onChangeText={(text) => setNewBooking(prev => ({ ...prev, price: text }))}
                                        placeholder="คำนวณอัตโนมัติ"
                                        placeholderTextColor={colors.neutral[400]}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>สถานะ</Text>
                                <View style={styles.statusRow}>
                                    {['CONFIRMED', 'PENDING'].map(status => (
                                        <TouchableOpacity
                                            key={status}
                                            style={[
                                                styles.statusChip,
                                                newBooking.status === status && styles.statusChipSelected,
                                                status === 'CONFIRMED' && { borderColor: '#22C55E' },
                                                status === 'PENDING' && { borderColor: '#EAB308' },
                                                newBooking.status === status && status === 'CONFIRMED' && { backgroundColor: '#DCFCE7' },
                                                newBooking.status === status && status === 'PENDING' && { backgroundColor: '#FEF9C3' }
                                            ]}
                                            onPress={() => setNewBooking(prev => ({ ...prev, status }))}
                                        >
                                            <Text style={[
                                                styles.statusChipText,
                                                status === 'CONFIRMED' && { color: '#166534' },
                                                status === 'PENDING' && { color: '#854D0E' }
                                            ]}>
                                                {status === 'CONFIRMED' ? 'ยืนยัน' : 'รอดำเนินการ'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.addModalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setAddModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, addingBooking && styles.submitButtonDisabled]}
                            onPress={handleAddBooking}
                            disabled={addingBooking}
                        >
                            {addingBooking ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name={editingBookingId ? "content-save" : "plus"} size={20} color={colors.white} />
                                    <Text style={styles.submitButtonText}>
                                        {editingBookingId ? 'บันทึกการแก้ไข' : 'สร้างการจอง'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral[50],
        padding: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        elevation: 2,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: colors.neutral[900],
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: colors.neutral[500],
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    todayButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.md,
    },
    todayText: {
        fontFamily: fonts.medium,
        color: colors.neutral[700],
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: 18,
        color: colors.neutral[400],
    },
    tableContainer: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    tableHeaderRow: {
        flexDirection: 'row',
        height: HEADER_HEIGHT,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[200],
        backgroundColor: colors.neutral[50],
    },
    columnHeader: {
        width: COURT_COL_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: colors.neutral[100],
        paddingHorizontal: 4,
    },
    columnHeaderText: {
        fontFamily: fonts.semiBold,
        fontSize: 14,
        color: colors.neutral[700],
    },
    verticalScroll: {
        flex: 1,
    },
    bodyContainer: {
        flexDirection: 'row',
    },
    timeColumn: {
        width: TIME_COL_WIDTH,
        borderRightWidth: 1,
        borderRightColor: colors.neutral[200],
    },
    timeSlot: {
        height: ROW_HEIGHT,
        justifyContent: 'center', // Align text to top of slot roughly? Usually time is on the line. 
        // Let's center it for block based.
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'transparent', // Don't show lines in time col, just spacing
    },
    timeText: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.neutral[500],
        // Centered in the 1 hour block
        transform: [{ translateY: 0 }],
    },
    grid: {
        flexDirection: 'row',
    },
    courtColumn: {
        width: COURT_COL_WIDTH,
        borderRightWidth: 1,
        borderRightColor: colors.neutral[100],
        position: 'relative',
    },
    gridCell: {
        height: ROW_HEIGHT,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
        borderStyle: 'dashed', // Optional: dashed lines for hours
    },
    bookingBlock: {
        position: 'absolute',
        left: 4,
        right: 4,
        borderRadius: 8,
        padding: 8,
        justifyContent: 'center',
        borderLeftWidth: 4,
        borderLeftColor: 'rgba(0,0,0,0.2)',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    bookingText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.neutral[800],
    },
    bookingSubText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.neutral[600],
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: 400,
        maxWidth: '90%',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
        paddingBottom: spacing.md,
    },
    modalTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: colors.neutral[900],
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    detailIcon: {
        marginTop: 2,
        marginRight: spacing.md,
        width: 24,
    },
    detailLabel: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.neutral[500],
        marginBottom: 2,
    },
    detailValue: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: colors.neutral[900],
    },
    copyableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary.light + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
    },
    detailValueCopyable: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: colors.primary.main,
    },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
    errorText: {
        fontFamily: fonts.regular,
        color: colors.error,
        textAlign: 'center',
        marginVertical: 20,
    },
    // Add Button Styles
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary.main,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        marginLeft: spacing.md,
        gap: spacing.xs,
    },
    addButtonText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.white,
    },
    // Add Modal Styles
    addModalContent: {
        backgroundColor: colors.white,
        borderRadius: 0,
        width: '100%',
        height: '100%',
        flex: 1,
    },
    addModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
        backgroundColor: colors.primary.main,
    },
    addModalTitle: {
        fontFamily: fonts.bold,
        fontSize: 22,
        color: colors.white,
    },
    addModalBody: {
        flex: 1,
        padding: spacing.xl,
    },
    addModalFooter: {
        flexDirection: 'row',
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: spacing.md,
    },
    formGroup: {
        marginBottom: spacing.md,
    },
    formRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    formLabel: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.neutral[700],
        marginBottom: spacing.xs,
    },
    formValue: {
        fontFamily: fonts.regular,
        fontSize: 16,
        color: colors.neutral[900],
        padding: spacing.sm,
        backgroundColor: colors.neutral[50],
        borderRadius: borderRadius.md,
    },
    pickerContainer: {
        flexDirection: 'row',
    },
    pickerItem: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginRight: spacing.sm,
        backgroundColor: colors.white,
    },
    pickerItemSelected: {
        borderColor: colors.primary.main,
        backgroundColor: colors.primary.light + '20',
    },
    pickerItemText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.neutral[700],
    },
    pickerItemTextSelected: {
        color: colors.primary.main,
    },
    timeChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginRight: spacing.xs,
        backgroundColor: colors.white,
    },
    timeChipSelected: {
        borderColor: colors.primary.main,
        backgroundColor: colors.primary.light + '30',
    },
    timeChipText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.neutral[600],
    },
    timeChipTextSelected: {
        color: colors.primary.main,
    },
    // New time grid styles
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    timeButton: {
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.neutral[200],
        backgroundColor: colors.white,
        width: 65,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeButtonSelected: {
        borderColor: colors.primary.main,
        backgroundColor: colors.primary.main,
    },
    timeButtonText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.neutral[700],
    },
    timeButtonTextSelected: {
        color: colors.white,
    },
    timeButtonDisabled: {
        backgroundColor: colors.neutral[100],
        borderColor: colors.neutral[200],
        opacity: 0.6,
    },
    timeButtonTextDisabled: {
        color: colors.neutral[400],
    },
    bookedLabel: {
        fontFamily: fonts.regular,
        fontSize: 9,
        color: colors.error,
        marginTop: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        backgroundColor: colors.white,
        gap: spacing.sm,
    },
    textInputWrapper: {
        flex: 1,
    },
    textInput: {
        fontFamily: fonts.regular,
        fontSize: 16,
        color: colors.neutral[900],
    },
    textInputPlaceholder: {
        color: colors.neutral[400],
    },
    textInputReal: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 16,
        color: colors.neutral[900],
        padding: 0,
    },
    statusRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    statusChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    statusChipSelected: {
        // backgroundColor set dynamically
    },
    statusChipText: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.neutral[300],
        alignItems: 'center',
    },
    cancelButtonText: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: colors.neutral[700],
    },
    submitButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.primary.main,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: colors.white,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary.main, // same as submit
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    editButtonText: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: colors.white,
    },
});
