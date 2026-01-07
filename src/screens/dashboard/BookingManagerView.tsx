import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors, fonts, spacing, borderRadius } from '../../theme/tokens';
import { Court } from '../../types/court';
import { Booking, BookingStatus } from '../../types/booking';
import { SportFilterTabs } from '../../components/common/SportFilterTabs';
import { courtService } from '../../services/court.service';
import { bookingService } from '../../services/booking.service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, parseISO, isToday } from 'date-fns';
import { th } from 'date-fns/locale';
import { translateBookingStatus } from '../../utils/statusTranslation';

// Constants for table layout
const TIME_COL_WIDTH = 60;
const MIN_COURT_COL_WIDTH = 80;
const MAX_COURT_COL_WIDTH = 200;
const HEADER_HEIGHT = 50; // Height for sport badge + court name
const ROW_HEIGHT = 60; // Height per hour slot
const START_HOUR = 0; // 00:00
const END_HOUR = 24;  // 24:00 (Midnight)

const SPORT_LABELS: Record<string, string> = {
    'badminton': 'แบดมินตัน',
    'football': 'ฟุตบอล',
    'futsal': 'ฟุตซอล',
    'tennis': 'เทนนิส',
    'basketball': 'บาสเกตบอล',
    'volleyball': 'วอลเลย์บอล',
    'swimming': 'ว่ายน้ำ',
    'fitness': 'ฟิตเนส',
    'yoga': 'โยคะ',
    'gym': 'ยิม'
};

const getSportName = (id: string) => SPORT_LABELS[id] || id;



interface BookingManagerViewProps {
    businessId?: string | null;
}

interface MergedBooking {
    id: string;
    ids: string[];
    customerName: string;
    customerPhone: string;
    timeSlotStart: string;
    timeSlotEnd: string;
    status: string;
    bookings: Booking[];
}

// Helper to safely get sport type from court object (handling various potential API structures)
const getCourtSportType = (court: Court): string | null => {
    const c = court as any;

    // 1. Try sportTypeIds (Expect Array of strings, but handle objects just in case)
    if (c.sportTypeIds && Array.isArray(c.sportTypeIds) && c.sportTypeIds.length > 0) {
        const first = c.sportTypeIds[0];
        if (typeof first === 'string') return first;
        if (typeof first === 'object' && first !== null) {
            return (first as any).name || (first as any).id || null;
        }
    }

    // 2. Try sports (Array of objects or strings)
    if (c.sports && Array.isArray(c.sports) && c.sports.length > 0) {
        const first = c.sports[0];
        if (typeof first === 'string') return first;
        if (typeof first === 'object' && first !== null) {
            return (first as any).name || (first as any).id || null;
        }
    }

    // 3. Try singular sportType (string or object)
    if (c.sportType) {
        if (typeof c.sportType === 'string') return c.sportType;
        if (typeof c.sportType === 'object' && c.sportType !== null) {
            return (c.sportType as any).name || (c.sportType as any).id || null;
        }
    }

    return null;
};

const CAPACITY_SPORTS = ['fitness', 'swimming', 'gym', 'yoga', 'boxing'];

const getCourtCapacity = (court: Court): number => {
    const c = court as any;
    // Check both capacity and maxCapacity (API returns maxCapacity)
    if (c.maxCapacity) return c.maxCapacity;
    if (c.capacity) return c.capacity;
    if (c.isCapacity) return 20; // Default if flagged but no number

    // Fallback based on sport type
    const sport = getCourtSportType(court);
    if (sport && CAPACITY_SPORTS.some(s => sport.toLowerCase().includes(s))) {
        return 20; // Default generic capacity for these sports
    }
    return 1; // Default slot-based
};



export const BookingManagerView = ({ businessId }: BookingManagerViewProps) => {
    // Get window dimensions for dynamic column width
    const { width: windowWidth } = useWindowDimensions();

    // State
    const [loading, setLoading] = useState(true);
    const [courts, setCourts] = useState<Court[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSport, setSelectedSport] = useState<string>('ALL'); // New State
    const [capacitySearchQuery, setCapacitySearchQuery] = useState(''); // Search state for capacity bookings

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
    const [editingBookingIds, setEditingBookingIds] = useState<string[]>([]); // For bulk editing merged bookings
    const [editingIsCapacity, setEditingIsCapacity] = useState<boolean>(false);
    const [expandedFacilityId, setExpandedFacilityId] = useState<string | null>(null);
    const [relatedBookingIds, setRelatedBookingIds] = useState<string[]>([]); // Track related merged booking IDs
    const [managementMode, setManagementMode] = useState<'SLOT' | 'CAPACITY'>('SLOT');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // Calculate current time indicator position
    const currentTimeIndicator = useMemo(() => {
        if (!isToday(selectedDate)) return null;

        const now = currentTime;
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Only show if within visible time range
        if (currentHour < START_HOUR || currentHour >= END_HOUR) return null;

        const topOffset = ((currentHour - START_HOUR) * ROW_HEIGHT) + ((currentMinute / 60) * ROW_HEIGHT);
        return {
            top: topOffset,
            time: format(now, 'HH:mm'),
        };
    }, [selectedDate, currentTime]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch courts and capacity facilities
            const [courtsData, facilitiesData] = await Promise.all([
                courtService.getAllOwnerCourts(),
                courtService.getCapacityFacilities()
            ]);

            const allCourts = [...courtsData, ...facilitiesData];

            // Log structure for debugging
            if (allCourts.length > 0) {
                console.log('First court structure:', JSON.stringify(allCourts[0], null, 2));
            }

            // Filter by businessId if provided
            let filteredCourts = allCourts;
            if (businessId) {
                filteredCourts = allCourts.filter(c => c.businessId === businessId);
            }

            // Filter to show only approved courts (or courts without approvalStatus for backwards compatibility)
            filteredCourts = filteredCourts.filter(c => !c.approvalStatus || c.approvalStatus === 'approved');

            console.log(`Courts: ${courtsData.length}, Facilities: ${facilitiesData.length}, Display: ${filteredCourts.length}`);
            setCourts(filteredCourts);

            // 2. Fetch bookings for the date
            // API expects ISO timestamp in UTC
            // toISOString() automatically converts local time to UTC
            // For Bangkok (UTC+7): local 00:00 → UTC 17:00 previous day
            const dateFrom = new Date(selectedDate);
            dateFrom.setHours(0, 0, 0, 0);

            const dateTo = new Date(selectedDate);
            dateTo.setHours(23, 59, 59, 999);

            // Adjust for timezone offset manually if needed, or rely on toISOString()
            // toISOString() gives UTC.
            const payload = {
                startTime: dateFrom.toISOString(),
                endTime: dateTo.toISOString()
            };

            console.log('Fetching bookings:', payload);

            // Fetch from ownerBookingService
            // Note: Currently we don't filter bookings by businessId in API call?
            // If getBookings returns ALL bookings for owner, we might need to filter manually or API supports filtering.
            // Assuming getBookings handles owner context.
            // Fetch both regular and capacity bookings
            const [regularBookings, capacityBookings] = await Promise.all([
                bookingService.getBookings(payload.startTime, payload.endTime),
                bookingService.getCapacityBookings(payload.startTime, payload.endTime, businessId || '9999')
            ]);

            const bookingsData = [...regularBookings, ...capacityBookings];
            console.log('Bookings loaded:', bookingsData?.length || 0);
            setBookings(bookingsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [selectedDate, businessId]);

    useEffect(() => {
        setSelectedSport('ALL');
    }, [businessId]);

    useEffect(() => {
        loadData();
    }, [selectedDate, businessId, loadData]); // Trigger when business changes


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
            .filter(b => {
                // Must match the court ID
                if ((b.court?.id || b.courtId) !== courtId) return false;
                // Exclude capacity bookings - they should only show in capacity view
                if ((b as any).isCapacity === true) return false;
                if ((b as any).isCapacity === true) return false;
                // Show all statuses as requested
                return true;
            })
            .sort((a, b) => new Date(a.timeSlotStart).getTime() - new Date(b.timeSlotStart).getTime());

        const merged: MergedBooking[] = [];

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



    // Helper for merged booking style
    const getMergedBookingStyle = (mergedBooking: MergedBooking) => {
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
        let opacity = 1;
        const isCancelled = mergedBooking.status === BookingStatus.CANCELLED ||
            mergedBooking.status === BookingStatus.NO_SHOW;

        if (mergedBooking.status === BookingStatus.CONFIRMED) {
            backgroundColor = 'rgba(134, 239, 172, 0.7)';
            borderColor = '#22C55E';
        } else if (mergedBooking.status === BookingStatus.PENDING) {
            backgroundColor = 'rgba(253, 224, 71, 0.7)';
            borderColor = '#EAB308';
        } else if (mergedBooking.status === BookingStatus.COMPLETED) {
            backgroundColor = 'rgba(147, 197, 253, 0.7)';
            borderColor = '#3B82F6';
        } else if (mergedBooking.status === BookingStatus.CANCELLED) {
            backgroundColor = 'rgba(252, 165, 165, 0.4)';
            borderColor = '#EF4444';
            opacity = 0.5;
        } else if (mergedBooking.status === BookingStatus.NO_SHOW) {
            backgroundColor = 'rgba(209, 213, 219, 0.4)';
            borderColor = '#9CA3AF';
            opacity = 0.5;
        }

        return {
            top: topOffset,
            height: height,
            backgroundColor,
            borderColor,
            opacity,
            isCancelled,
        };
    };

    const handleBookingPress = async (bookingId: string, isCapacity: boolean = false, mergedIds?: string[]) => {
        setLoadingDetail(true);
        setModalVisible(true);
        // Clear previous selection while loading to show spinner
        setSelectedBooking(null);
        // Track related booking IDs for merged bookings
        setRelatedBookingIds(mergedIds || [bookingId]);
        try {
            if (isCapacity) {
                // For capacity bookings, use data from local state (no GET by ID endpoint)
                const localBooking = bookings.find(b => b.id === bookingId) as any;
                if (localBooking) {
                    // Use court info from booking if available, otherwise fallback to courts state
                    let courtInfo = localBooking.court;
                    if (!courtInfo?.name) {
                        const facilityId = localBooking.courtId || localBooking.court?.id;
                        const facility = courts.find(c => c.id === facilityId);
                        courtInfo = facility ? { id: facility.id, name: facility.name } : courtInfo;
                    }

                    const bookingWithCapacity = {
                        ...localBooking,
                        isCapacity: true,
                        court: courtInfo
                    };
                    setSelectedBooking(bookingWithCapacity);
                }
            } else {
                // For regular bookings, fetch full detail from API
                const detail = await bookingService.getBookingDetail(bookingId);
                setSelectedBooking(detail);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoadingDetail(false);
        }
    };



    const openAddModal = (options: Partial<typeof newBooking> = {}) => {
        setEditingBookingId(null);
        setEditingBookingIds([]);
        // Initial calculations
        let initialPrice = options.price || '';
        const initialCourtId = options.courtId || (courts.length > 0 ? courts[0].id : '');
        const initialStartTime = options.startTime || '10:00';
        const initialEndTime = options.endTime || '11:00';

        if (!initialPrice && initialCourtId) {
            const court = courts.find(c => c.id === initialCourtId);
            if (court && court.hourlyRate) {
                const [sH, sM] = initialStartTime.split(':').map(Number);
                const [eH, eM] = initialEndTime.split(':').map(Number);
                let sMin = sH * 60 + sM;
                let eMin = eH * 60 + eM;
                if (eMin <= sMin) eMin += 24 * 60;
                const durationHours = (eMin - sMin) / 60;
                if (durationHours > 0) {
                    initialPrice = Math.round(durationHours * Number(court.hourlyRate)).toString();
                }
            }
        }

        setNewBooking({
            courtId: initialCourtId,
            date: options.date || format(selectedDate, 'yyyy-MM-dd'),
            startTime: initialStartTime,
            endTime: initialEndTime,
            customerName: options.customerName || '',
            customerPhone: options.customerPhone || '',
            price: initialPrice,
            status: options.status || 'CONFIRMED'
        });
        setAddModalVisible(true);
    };

    const handleEditBooking = () => {
        if (!selectedBooking) return;

        const booking = selectedBooking as any;

        // Check if this is part of a merged booking with multiple IDs
        if (relatedBookingIds.length > 1) {
            Alert.alert(
                'แก้ไขการจอง',
                `การจองนี้เป็นส่วนหนึ่งของการจองต่อเนื่อง ${relatedBookingIds.length} รายการ ต้องการแก้ไขรายการไหน?`,
                [
                    { text: 'ยกเลิก', style: 'cancel' },
                    {
                        text: 'แก้ไขรายการเดียว',
                        onPress: () => {
                            setEditingBookingIds([booking.id]);
                            proceedToEditBooking(booking);
                        }
                    },
                    {
                        text: `แก้ไขทั้งหมด (${relatedBookingIds.length})`,
                        onPress: () => {
                            setEditingBookingIds(relatedBookingIds);
                            proceedToEditBooking(booking, relatedBookingIds);
                        }
                    }
                ]
            );
        } else {
            setEditingBookingIds([booking.id]);
            proceedToEditBooking(booking);
        }
    };

    const proceedToEditBooking = (booking: any, bulkEditIds?: string[]) => {
        setEditingBookingId(booking.id);

        // Check if this is a capacity booking
        const isCapacity = booking.isCapacity === true;
        setEditingIsCapacity(isCapacity);

        // For bulk edit, aggregate data from all related bookings
        if (bulkEditIds && bulkEditIds.length > 1) {
            // Find all bookings in the bulk edit
            const relatedBookings = bookings.filter(b => bulkEditIds.includes(b.id));
            console.log('[BulkEdit] bulkEditIds:', bulkEditIds);
            console.log('[BulkEdit] bookings count:', bookings.length);
            console.log('[BulkEdit] relatedBookings found:', relatedBookings.length);
            console.log('[BulkEdit] relatedBookings:', relatedBookings.map(b => ({ id: b.id, start: b.timeSlotStart, end: b.timeSlotEnd, price: b.totalPrice })));

            if (relatedBookings.length > 0) {
                // Calculate combined start time (earliest), end time (latest), and total price
                const sortedByStart = [...relatedBookings].sort(
                    (a, b) => new Date(a.timeSlotStart).getTime() - new Date(b.timeSlotStart).getTime()
                );
                const sortedByEnd = [...relatedBookings].sort(
                    (a, b) => new Date(b.timeSlotEnd).getTime() - new Date(a.timeSlotEnd).getTime()
                );

                const earliestStart = parseISO(sortedByStart[0].timeSlotStart);
                const latestEnd = parseISO(sortedByEnd[0].timeSlotEnd);
                const totalPrice = relatedBookings.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

                console.log('[BulkEdit] Aggregated - earliestStart:', format(earliestStart, 'HH:mm'), 'latestEnd:', format(latestEnd, 'HH:mm'), 'totalPrice:', totalPrice);

                const phone = booking.serviceUser?.phone || booking.customerPhone || '';

                const formattedStartTime = format(earliestStart, 'HH:mm');
                const formattedEndTime = format(latestEnd, 'HH:mm');
                console.log('[BulkEdit] Setting form - startTime:', formattedStartTime, 'endTime:', formattedEndTime);

                setNewBooking({
                    courtId: booking.court?.id || booking.courtId || '',
                    date: format(earliestStart, 'yyyy-MM-dd'),
                    startTime: formattedStartTime,
                    endTime: formattedEndTime,
                    customerName: booking.serviceUser?.name || booking.customerName || '',
                    customerPhone: phone,
                    price: totalPrice > 0 ? totalPrice.toString() : '',
                    status: booking.status
                });

                console.log('[BulkEdit] newBooking set with endTime:', formattedEndTime);

                setModalVisible(false);
                setAddModalVisible(true);
                return;
            }
        }

        // Single booking edit - use original logic
        const startDate = parseISO(booking.timeSlotStart);
        const endDate = parseISO(booking.timeSlotEnd);

        const phone = booking.serviceUser?.phone || booking.customerPhone || '';

        setNewBooking({
            courtId: booking.court?.id || booking.courtId || '',
            date: format(startDate, 'yyyy-MM-dd'),
            startTime: format(startDate, 'HH:mm'),
            endTime: format(endDate, 'HH:mm'),
            customerName: booking.serviceUser?.name || booking.customerName || '',
            customerPhone: phone,
            price: booking.totalPrice ? booking.totalPrice.toString() : '',
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
            // Validate
            if (!newBooking.courtId) {
                Alert.alert('กรุณาเลือกสนาม');
                setAddingBooking(false);
                return;
            }

            // Determine if capacity booking
            const selectedCourt = courts.find(c => c.id === newBooking.courtId);
            const isCapacity = selectedCourt ? getCourtCapacity(selectedCourt) > 1 : false;

            if (editingBookingId) {
                // Bulk edit: apply to all editingBookingIds
                const idsToUpdate = editingBookingIds.length > 0 ? editingBookingIds : [editingBookingId];
                const isBulkEdit = idsToUpdate.length > 1;

                // For bulk edit, divide price by number of slots to store per-slot price
                const totalPrice = newBooking.price ? parseFloat(newBooking.price) : undefined;
                const pricePerSlot = isBulkEdit && totalPrice !== undefined
                    ? Math.round((totalPrice / idsToUpdate.length) * 100) / 100
                    : totalPrice;

                for (const id of idsToUpdate) {
                    // For bulk edit, don't send time fields as each booking has different times
                    const updatePayload = isBulkEdit ? {
                        customerName: newBooking.customerName,
                        customerPhone: newBooking.customerPhone,
                        price: pricePerSlot,
                        status: newBooking.status
                    } : {
                        date: newBooking.date,
                        startTime: newBooking.startTime,
                        endTime: newBooking.endTime,
                        customerName: newBooking.customerName,
                        customerPhone: newBooking.customerPhone,
                        price: totalPrice,
                        status: newBooking.status
                    };

                    // Use appropriate update function based on booking type
                    if (editingIsCapacity) {
                        await bookingService.updateCapacityBooking(id, {
                            ...updatePayload,
                            facilityId: newBooking.courtId
                        });
                    } else {
                        await bookingService.updateBooking(id, { ...updatePayload, courtId: isBulkEdit ? undefined : newBooking.courtId });
                    }
                }

                if (idsToUpdate.length > 1) {
                    Alert.alert('สำเร็จ', `แก้ไขการจอง ${idsToUpdate.length} รายการเรียบร้อยแล้ว`);
                }
            } else {
                // Create new booking
                const createPayload = {
                    date: newBooking.date,
                    startTime: newBooking.startTime,
                    endTime: newBooking.endTime,
                    customerName: newBooking.customerName,
                    customerPhone: newBooking.customerPhone,
                    price: newBooking.price ? parseFloat(newBooking.price) : undefined,
                    status: newBooking.status
                };

                if (isCapacity) {
                    await bookingService.createCapacityBooking({
                        ...createPayload,
                        facilityId: newBooking.courtId,
                        businessId: businessId || '99999',
                        quantity: 1
                    });
                } else {
                    await bookingService.createBooking({
                        ...createPayload,
                        courtId: newBooking.courtId
                    });
                }
            }

            setAddModalVisible(false);
            setEditingBookingId(null);
            setEditingBookingIds([]);
            setEditingIsCapacity(false);
            loadData(); // Refresh bookings
        } catch (error) {
            console.error('Error saving booking:', error);
            Alert.alert('Error', 'Failed to save booking');
        } finally {
            setAddingBooking(false);
        }
    };

    const handleConfirmBooking = async () => {
        if (!selectedBooking) return;

        // Check if this is part of a merged booking with multiple IDs
        if (relatedBookingIds.length > 1) {
            Alert.alert(
                'ยืนยันการจอง',
                `การจองนี้เป็นส่วนหนึ่งของการจองต่อเนื่อง ${relatedBookingIds.length} รายการ ต้องการยืนยันรายการไหน?`,
                [
                    { text: 'ปิด', style: 'cancel' },
                    {
                        text: 'ยืนยันรายการเดียว',
                        onPress: () => executeBulkAction('confirm', [selectedBooking.id])
                    },
                    {
                        text: `ยืนยันทั้งหมด (${relatedBookingIds.length})`,
                        onPress: () => executeBulkAction('confirm', relatedBookingIds)
                    }
                ]
            );
        } else {
            Alert.alert(
                'ยืนยันการจอง',
                'ต้องการยืนยันการจองนี้ใช่หรือไม่?',
                [
                    { text: 'ยกเลิก', style: 'cancel' },
                    {
                        text: 'ยืนยัน',
                        onPress: () => executeBulkAction('confirm')
                    }
                ]
            );
        }
    };

    // Execute action for single or multiple bookings
    const executeBulkAction = async (action: 'confirm' | 'cancel' | 'noshow' | 'completed' | 'markPaid' | 'markUnpaid', targetIds?: string[]) => {
        const ids = targetIds || [selectedBooking!.id];

        setLoadingDetail(true);
        try {
            let successCount = 0;
            for (const id of ids) {
                let success = false;
                switch (action) {
                    case 'confirm':
                        success = await bookingService.confirmBooking(id);
                        break;
                    case 'cancel':
                        success = await bookingService.cancelBooking(id, "ยกเลิกโดยเจ้าของสนาม");
                        break;
                    case 'noshow':
                        success = await bookingService.markBookingNoShow(id, "ลูกค้าไม่มาใช้บริการ");
                        break;
                    case 'completed':
                        success = await bookingService.markBookingCompleted(id);
                        break;
                    case 'markPaid':
                        success = await bookingService.markAsPaid(id);
                        break;
                    case 'markUnpaid':
                        success = await bookingService.unmarkAsPaid(id);
                        break;
                }
                if (success) successCount++;
            }

            if (successCount === ids.length) {
                const actionText = action === 'confirm' ? 'ยืนยันการจอง' :
                    action === 'cancel' ? 'ยกเลิกการจอง' :
                        action === 'noshow' ? 'บันทึกสถานะไม่มาใช้บริการ' :
                            action === 'markPaid' ? 'บันทึกการชำระเงิน' :
                                action === 'markUnpaid' ? 'ยกเลิกการชำระเงิน' : 'บันทึกสถานะลูกค้ามาใช้บริการแล้ว';
                Alert.alert('สำเร็จ', ids.length > 1 ? `${actionText} ${successCount} รายการเรียบร้อยแล้ว` : `${actionText}เรียบร้อยแล้ว`);

                // Keep modal open and refresh data
                // setModalVisible(false); // Removed to keep modal open
                loadData();

                // If selected booking was updated, refresh it
                if (selectedBooking && ids.includes(selectedBooking.id)) {
                    try {
                        const updatedBooking = await bookingService.getBookingDetail(selectedBooking.id);
                        if (updatedBooking) {
                            setSelectedBooking(updatedBooking);
                        }
                    } catch (err) {
                        console.error('Failed to refresh selected booking', err);
                    }
                }
            } else {
                Alert.alert('ผิดพลาด', `ดำเนินการสำเร็จ ${successCount}/${ids.length} รายการ`);
            }
        } catch (error) {
            Alert.alert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleMarkCompleted = async () => {
        if (!selectedBooking) return;

        // Check if this is part of a merged booking with multiple IDs
        if (relatedBookingIds.length > 1) {
            Alert.alert(
                'ลูกค้ามาใช้บริการแล้ว',
                'การจองนี้เป็นส่วนหนึ่งของการจองต่อเนื่อง ${relatedBookingIds.length} รายการ ต้องการบันทึกรายการไหน?',
                [
                    { text: 'ปิด', style: 'cancel' },
                    {
                        text: 'บันทึกรายการเดียว',
                        onPress: () => executeBulkAction('completed', [selectedBooking.id])
                    },
                    {
                        text: `บันทึกทั้งหมด (${relatedBookingIds.length})`,
                        onPress: () => executeBulkAction('completed', relatedBookingIds)
                    }
                ]
            );
        } else {
            Alert.alert(
                'ลูกค้ามาใช้บริการแล้ว',
                'ต้องการบันทึกว่าลูกค้ามาใช้บริการแล้วใช่หรือไม่?',
                [
                    { text: 'ยกเลิก', style: 'cancel' },
                    {
                        text: 'ยืนยัน',
                        onPress: () => executeBulkAction('completed')
                    }
                ]
            );
        }
    };

    const handleTogglePayment = async () => {
        if (!selectedBooking) return;

        const isCurrentlyPaid = selectedBooking.isPaid;
        const action = isCurrentlyPaid ? 'markUnpaid' : 'markPaid';
        const title = isCurrentlyPaid ? 'ยกเลิกการชำระเงิน' : 'บันทึกการชำระเงิน';

        // Check if this is part of a merged booking with multiple IDs
        if (relatedBookingIds.length > 1) {
            Alert.alert(
                title,
                `การจองนี้เป็นส่วนหนึ่งของการจองต่อเนื่อง ${relatedBookingIds.length} รายการ ต้องการ${title}รายการไหน?`,
                [
                    { text: 'ปิด', style: 'cancel' },
                    {
                        text: 'บันทึกรายการเดียว',
                        onPress: () => executeBulkAction(action, [selectedBooking.id])
                    },
                    {
                        text: `บันทึกทั้งหมด (${relatedBookingIds.length})`,
                        onPress: () => executeBulkAction(action, relatedBookingIds)
                    }
                ]
            );
        } else {
            executeBulkAction(action);
        }
    };

    const handleCancelBooking = async () => {
        if (!selectedBooking) return;

        // Check if this is part of a merged booking with multiple IDs
        if (relatedBookingIds.length > 1) {
            Alert.alert(
                'ยกเลิกการจอง',
                `การจองนี้เป็นส่วนหนึ่งของการจองต่อเนื่อง ${relatedBookingIds.length} รายการ ต้องการยกเลิกรายการไหน?`,
                [
                    { text: 'ปิด', style: 'cancel' },
                    {
                        text: 'ยกเลิกรายการเดียว',
                        style: 'destructive',
                        onPress: () => executeBulkAction('cancel', [selectedBooking.id])
                    },
                    {
                        text: `ยกเลิกทั้งหมด (${relatedBookingIds.length})`,
                        style: 'destructive',
                        onPress: () => executeBulkAction('cancel', relatedBookingIds)
                    }
                ]
            );
        } else {
            Alert.alert(
                'ยกเลิกการจอง',
                'ต้องการยกเลิกการจองนี้ใช่หรือไม่?',
                [
                    { text: 'ไม่', style: 'cancel' },
                    {
                        text: 'ใช่, ยกเลิก',
                        style: 'destructive',
                        onPress: () => executeBulkAction('cancel')
                    }
                ]
            );
        }
    };

    const handleMarkNoShow = async () => {
        if (!selectedBooking) return;

        // Check if this is part of a merged booking with multiple IDs
        if (relatedBookingIds.length > 1) {
            Alert.alert(
                'ไม่มาใช้บริการ (No-Show)',
                `การจองนี้เป็นส่วนหนึ่งของการจองต่อเนื่อง ${relatedBookingIds.length} รายการ ต้องการบันทึกรายการไหน?`,
                [
                    { text: 'ปิด', style: 'cancel' },
                    {
                        text: 'บันทึกรายการเดียว',
                        onPress: () => executeBulkAction('noshow', [selectedBooking.id])
                    },
                    {
                        text: `บันทึกทั้งหมด (${relatedBookingIds.length})`,
                        onPress: () => executeBulkAction('noshow', relatedBookingIds)
                    }
                ]
            );
        } else {
            Alert.alert(
                'ไม่มาใช้บริการ (No-Show)',
                'ต้องการบันทึกว่าลูกค้าไม่มาใช้บริการใช่หรือไม่?',
                [
                    { text: 'ยกเลิก', style: 'cancel' },
                    {
                        text: 'ยืนยัน',
                        onPress: () => executeBulkAction('noshow')
                    }
                ]
            );
        }
    };

    const sportTabs = useMemo(() => {
        const sports = new Set<string>();
        courts.forEach(court => {
            const type = getCourtSportType(court); // Use helper, one primary sport per court expected usually
            if (type) sports.add(type);
        });

        const tabs = ['ALL', ...Array.from(sports)];
        console.log('Generated Sport Tabs:', tabs);
        return tabs;
    }, [courts]);

    const filteredCourts = useMemo(() => {
        let result = courts;

        if (selectedSport !== 'ALL') {
            result = courts.filter(c => getCourtSportType(c) === selectedSport);
        }

        // Sort by sport type to group them together visually
        return [...result].sort((a, b) => {
            const sportA = getCourtSportType(a) || 'zzz'; // 'zzz' to put unknown at end
            const sportB = getCourtSportType(b) || 'zzz';
            if (sportA !== sportB) return sportA.localeCompare(sportB);

            // If same sport, sort by name
            return a.name.localeCompare(b.name);
        });
    }, [courts, selectedSport]);

    // Separate courts by type for rendering
    const slotCourts = useMemo(() => filteredCourts.filter(c => getCourtCapacity(c) <= 1), [filteredCourts]);
    const capacityCourts = useMemo(() => filteredCourts.filter(c => getCourtCapacity(c) > 1), [filteredCourts]);

    // Calculate dynamic court column width based on number of courts
    const courtColumnWidth = useMemo(() => {
        const numCourts = slotCourts.length;
        if (numCourts === 0) return MIN_COURT_COL_WIDTH;

        // Available width = window width - time column - some padding
        const availableWidth = windowWidth - TIME_COL_WIDTH - 100; // 100px for padding/scrollbar
        const calculatedWidth = Math.floor(availableWidth / numCourts);

        // Clamp between min and max
        return Math.min(MAX_COURT_COL_WIDTH, Math.max(MIN_COURT_COL_WIDTH, calculatedWidth));
    }, [slotCourts.length, windowWidth]);

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
                    <View style={styles.modeSwitcher}>
                        <TouchableOpacity
                            style={[styles.modeButton, managementMode === 'SLOT' && styles.modeButtonActive]}
                            onPress={() => setManagementMode('SLOT')}
                        >
                            <MaterialCommunityIcons
                                name="grid"
                                size={18}
                                color={managementMode === 'SLOT' ? colors.white : colors.neutral[400]}
                            />
                            <Text style={[styles.modeButtonText, managementMode === 'SLOT' && styles.modeButtonTextActive]}>รายสนาม</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeButton, managementMode === 'CAPACITY' && styles.modeButtonActive]}
                            onPress={() => setManagementMode('CAPACITY')}
                        >
                            <MaterialCommunityIcons
                                name="account-group"
                                size={18}
                                color={managementMode === 'CAPACITY' ? colors.white : colors.neutral[400]}
                            />
                            <Text style={[styles.modeButtonText, managementMode === 'CAPACITY' && styles.modeButtonTextActive]}>ระบุจำนวน</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dateControls}>
                        <TouchableOpacity onPress={() => setSelectedDate(d => new Date(d.setDate(d.getDate() - 1)))}>
                            <MaterialCommunityIcons name="chevron-left" size={30} color={colors.neutral[600]} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.todayButton} onPress={() => setSelectedDate(new Date())}>
                            <Text style={styles.todayText}>{'วันนี้'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSelectedDate(d => new Date(d.setDate(d.getDate() + 1)))}>
                            <MaterialCommunityIcons name="chevron-right" size={30} color={colors.neutral[600]} />
                        </TouchableOpacity>
                    </View>
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
                <View style={[styles.tableContainer, { backgroundColor: 'transparent', borderWidth: 0 }]}>
                    {managementMode === 'SLOT' ? (
                        slotCourts.length > 0 ? (
                            <View style={[styles.tableContainer, { flex: 1 }]}>
                                <View style={styles.tableHeaderRow}>
                                    <TouchableOpacity
                                        style={styles.tableAddButton}
                                        onPress={() => openAddModal()}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialCommunityIcons name="plus-box" size={24} color={colors.primary.main} />
                                    </TouchableOpacity>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        scrollEnabled={false}
                                        ref={headerScrollRef}
                                    >
                                        {slotCourts.map(court => (
                                            <View key={court.id} style={[styles.columnHeader, { width: courtColumnWidth }]}>
                                                <View style={styles.sportBadgeSmall}>
                                                    <Text style={styles.sportBadgeTextSmall}>
                                                        {getSportName(getCourtSportType(court) || 'ทั่วไป')}
                                                    </Text>
                                                </View>
                                                <Text style={styles.columnHeaderText} numberOfLines={1}>{court.name}</Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <ScrollView style={styles.verticalScroll}>
                                        <View style={styles.bodyContainer}>
                                            <View style={styles.timeColumn}>
                                                {timeSlots.map((time, index) => (
                                                    <View key={index} style={styles.timeSlot}>
                                                        <Text style={styles.timeText}>{time}</Text>
                                                    </View>
                                                ))}
                                                {/* Current Time Indicator - Time Column */}
                                                {currentTimeIndicator && (
                                                    <View style={[styles.currentTimeLabel, { top: currentTimeIndicator.top - 8 }]}>
                                                        <Text style={styles.currentTimeLabelText}>{currentTimeIndicator.time}</Text>
                                                    </View>
                                                )}
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
                                                    {/* Current Time Line across grid */}
                                                    {currentTimeIndicator && (
                                                        <View style={[styles.currentTimeLine, { top: currentTimeIndicator.top }]} />
                                                    )}
                                                    {slotCourts.map((court) => {
                                                        return (
                                                            <View key={court.id} style={[styles.courtColumn, { width: courtColumnWidth }]}>
                                                                {/* Background Grid Cells */}
                                                                {/* Background Grid Cells */}
                                                                {timeSlots.map((time, tIndex) => {
                                                                    // Operating Hours Check
                                                                    const [h, m] = time.split(':').map(Number);
                                                                    const currentMins = h * 60 + m;

                                                                    const [openH, openM] = (court.openingHour || '06:00').split(':').map(Number);
                                                                    const openMins = openH * 60 + openM;

                                                                    // If closing is not set, assume 24:00 (or handle appropriately)
                                                                    // For now defaulting to 24:00 if not set, or 22:00? 
                                                                    // Ideally backend sets these. Using 24:00 equivalent if null for safety?
                                                                    // Default to 23:59 if undefined for Closing?
                                                                    // Or assume '00:00' implies next day start?

                                                                    // Let's use simple logic: if undefined, assume open 24h (00:00-24:00) if no data?
                                                                    // Actually, let's stick to a reasonable default like 06:00 - 00:00 if null.
                                                                    const closingStr = court.closingHour || '00:00';
                                                                    const [closeH, closeM] = closingStr.split(':').map(Number);
                                                                    const closeMins = closeH * 60 + closeM;

                                                                    let isOpen = false;
                                                                    if (closeMins < openMins) {
                                                                        // Overnight
                                                                        isOpen = currentMins >= openMins || currentMins < closeMins;
                                                                    } else {
                                                                        // Same day (e.g. 08:00 - 22:00)
                                                                        // If closeMins is 0 (00:00), treats as 24:00?
                                                                        // Usually 00:00 closing means midnight. 
                                                                        // If we want to support 08:00 - 00:00, then current < 0 is false.
                                                                        // So we need to treat 00:00 as 24h (1440) if strict same day?
                                                                        // Or just handle standard range.

                                                                        const effectiveClose = (closeMins === 0 && openMins < 1440) ? 1440 : closeMins;
                                                                        isOpen = currentMins >= openMins && currentMins < effectiveClose;
                                                                    }

                                                                    if (!isOpen) {
                                                                        return (
                                                                            <View
                                                                                key={tIndex}
                                                                                style={[styles.gridCell, { backgroundColor: '#E5E7EB', borderRightColor: '#E5E7EB', borderBottomColor: '#FFFFFF' }]}
                                                                            />
                                                                        );
                                                                    }

                                                                    return (
                                                                        <TouchableOpacity
                                                                            key={tIndex}
                                                                            style={styles.gridCell}
                                                                            activeOpacity={1}
                                                                            onPress={() => openAddModal({
                                                                                courtId: court.id,
                                                                                startTime: time,
                                                                                endTime: `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}` // Default 1 hour
                                                                            })}
                                                                        />
                                                                    );
                                                                })}

                                                                {/* Standard: Render Stacked Bookings (Merged) */}
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
                                                                                    opacity: bookingStyle.opacity,
                                                                                    // Cancelled bookings are half width and aligned to right
                                                                                    ...(bookingStyle.isCancelled && {
                                                                                        width: '50%',
                                                                                        right: 0,
                                                                                        left: undefined,
                                                                                    }),
                                                                                }
                                                                            ]}
                                                                            onPress={() => {
                                                                                console.log('[MergedBooking] Pressed:', mergedBooking.id, 'ids:', mergedBooking.ids);
                                                                                // If multiple slots, show picker to select which slot to view
                                                                                if (mergedBooking.bookings.length > 1) {
                                                                                    const totalPrice = mergedBooking.bookings.reduce((sum: number, b: any) => sum + Number(b.totalPrice || 0), 0);
                                                                                    const options = mergedBooking.bookings.map((b: any) => ({
                                                                                        text: `${format(parseISO(b.timeSlotStart), 'HH:mm')} - ${format(parseISO(b.timeSlotEnd), 'HH:mm')} (฿${Number(b.totalPrice || 0).toLocaleString()})`,
                                                                                        onPress: () => handleBookingPress(b.id, false, mergedBooking.ids)
                                                                                    }));
                                                                                    Alert.alert(
                                                                                        'เลือกช่วงเวลา',
                                                                                        `การจองนี้มี ${mergedBooking.bookings.length} ช่วงเวลา • รวม ฿${totalPrice.toLocaleString()}`,
                                                                                        [
                                                                                            ...options,
                                                                                            { text: 'ยกเลิก', style: 'cancel' }
                                                                                        ]
                                                                                    );
                                                                                } else {
                                                                                    handleBookingPress(mergedBooking.bookings[0].id, false, mergedBooking.ids);
                                                                                }
                                                                            }}
                                                                            activeOpacity={0.8}
                                                                        >
                                                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                <Text style={[styles.bookingText, { flex: 1, marginRight: 4 }]} numberOfLines={1}>
                                                                                    {mergedBooking.bookings[0].serviceUser?.name || 'ลูกค้า'}
                                                                                </Text>
                                                                                {/* Payment Status Indicator */}
                                                                                {(mergedBooking.bookings[0].isPaid) && (
                                                                                    <View style={{ backgroundColor: '#DCFCE7', borderRadius: 6, padding: 1, marginLeft: 2 }}>
                                                                                        <MaterialCommunityIcons name="check" size={12} color="#166534" />
                                                                                    </View>
                                                                                )}
                                                                            </View>
                                                                            <Text style={styles.bookingSubText} numberOfLines={1}>
                                                                                {mergedBooking.bookings[0].serviceUser?.phone || ''}
                                                                            </Text>
                                                                        </TouchableOpacity>
                                                                    );
                                                                })}
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                        </View>
                                    </ScrollView>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.emptyContent}>
                                <Text style={styles.emptyText}>ไม่พบข้อมูลสนาม</Text>
                            </View>
                        )
                    ) : (
                        capacityCourts.length > 0 ? (
                            <View style={[styles.tableContainer, { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.6)' }]}>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                                    <View style={[styles.capacityContainer, { marginTop: 0, borderTopWidth: 0, paddingTop: 10 }]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                            <Text style={[styles.sectionHeader, { marginBottom: 0 }]}>การจองแบบระบุจำนวน</Text>
                                            <TouchableOpacity
                                                style={[styles.addCapacityButton, { paddingHorizontal: 16 }]}
                                                onPress={() => openAddModal()}
                                            >
                                                <MaterialCommunityIcons name="plus" size={18} color="white" />
                                                <Text style={styles.addCapacityButtonText}>เพิ่มการจอง</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Search Input */}
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: colors.white,
                                            borderRadius: 8,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            marginBottom: 16,
                                            borderWidth: 1,
                                            borderColor: colors.neutral[200]
                                        }}>
                                            <MaterialCommunityIcons name="magnify" size={20} color={colors.neutral[400]} />
                                            <TextInput
                                                style={{ flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 14, color: colors.neutral[900], padding: 0 }}
                                                placeholder="ค้นหาชื่อ หรือ เบอร์โทร..."
                                                placeholderTextColor={colors.neutral[400]}
                                                value={capacitySearchQuery}
                                                onChangeText={setCapacitySearchQuery}
                                            />
                                            {capacitySearchQuery.length > 0 && (
                                                <TouchableOpacity onPress={() => setCapacitySearchQuery('')}>
                                                    <MaterialCommunityIcons name="close-circle" size={16} color={colors.neutral[400]} />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {capacityCourts.map(facility => {
                                            const facilityBookings = bookings.filter(b => {
                                                if ((b.courtId !== facility.id && b.court?.id !== facility.id) || b.status === 'CANCELLED') return false;

                                                if (!capacitySearchQuery) return true;
                                                const query = capacitySearchQuery.toLowerCase();
                                                const name = (b.customerName || b.serviceUser?.name || '').toLowerCase();
                                                const phone = (b.customerPhone || b.serviceUser?.phone || '');

                                                return name.includes(query) || phone.includes(query);
                                            });
                                            const uniquePhones = new Set(facilityBookings.map(b => b.customerPhone || b.serviceUser?.phone)).size;
                                            const isExpanded = expandedFacilityId === facility.id;

                                            return (
                                                <View key={facility.id} style={styles.facilityCard}>
                                                    <View style={styles.facilityHeader}>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                <Text style={styles.facilityName}>{facility.name}</Text>
                                                                <View style={styles.sportBadgeSmall}>
                                                                    <Text style={styles.sportBadgeTextSmall}>{getSportName(getCourtSportType(facility) || 'บริการ')}</Text>
                                                                </View>
                                                            </View>
                                                            <Text style={styles.facilitySubName}>
                                                                พื้นที่ใช้งาน: {uniquePhones} ท่าน | ความจุสูงสุด {getCourtCapacity(facility)} ท่าน
                                                            </Text>
                                                        </View>
                                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                                            <TouchableOpacity
                                                                style={styles.detailsButton}
                                                                onPress={() => setExpandedFacilityId(isExpanded ? null : facility.id)}
                                                            >
                                                                <MaterialCommunityIcons
                                                                    name={isExpanded ? "chevron-up" : "format-list-bulleted"}
                                                                    size={18}
                                                                    color={colors.neutral[600]}
                                                                />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={styles.addCapacityButton}
                                                                onPress={() => {
                                                                    openAddModal({
                                                                        courtId: facility.id,
                                                                        startTime: format(new Date(), 'HH:00'),
                                                                        endTime: format(new Date(new Date().setHours(new Date().getHours() + 1)), 'HH:00'),
                                                                        price: (facility.pricePerSlot || (facility as any).hourlyRate)?.toString() || '',
                                                                    });
                                                                }}
                                                            >
                                                                <MaterialCommunityIcons name="plus" size={16} color="white" />
                                                                <Text style={styles.addCapacityButtonText}>จอง</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>

                                                    {/* List of Capacity Bookings - Only show if expanded */}
                                                    {isExpanded && (
                                                        <View style={styles.bookingList}>
                                                            {facilityBookings.length > 0 ? (
                                                                facilityBookings
                                                                    .sort((a, b) => a.timeSlotStart.localeCompare(b.timeSlotStart))
                                                                    .map(booking => (
                                                                        <TouchableOpacity
                                                                            key={booking.id}
                                                                            style={styles.capacityBookingItem}
                                                                            onPress={() => handleBookingPress(booking.id, true)}
                                                                        >
                                                                            <View style={styles.checkInTime}>
                                                                                <Text style={styles.timeTextSmall}>
                                                                                    {format(parseISO(booking.timeSlotStart), 'HH:mm')} - {format(parseISO(booking.timeSlotEnd), 'HH:mm')}
                                                                                </Text>
                                                                            </View>
                                                                            <View style={styles.bookingUserInfo}>
                                                                                <Text style={styles.bookingUserName}>{booking.customerName || booking.serviceUser?.name || 'ลูกค้า'}</Text>
                                                                                <Text style={styles.bookingUserPhone}>{booking.customerPhone || booking.serviceUser?.phone}</Text>
                                                                            </View>
                                                                            <View style={[styles.statusTag, { backgroundColor: booking.status === 'CONFIRMED' ? '#DCFCE7' : '#FEF9C3' }]}>
                                                                                <Text style={styles.statusTextSmall}>{translateBookingStatus(booking.status)}</Text>
                                                                            </View>
                                                                        </TouchableOpacity>
                                                                    ))
                                                            ) : (
                                                                <Text style={styles.emptyBookingsText}>ยังไม่มีรายการจองในขณะนี้</Text>
                                                            )}
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            </View>
                        ) : (
                            <View style={styles.emptyContent}>
                                <Text style={styles.emptyText}>ไม่พบข้อมูลบริการ</Text>
                            </View>
                        )
                    )}


                    {/* Sport Tabs - Reused Component */}
                    <SportFilterTabs
                        sports={sportTabs.filter(sport => {
                            // Keep 'ALL' always visible
                            if (sport === 'ALL') return true;

                            // Check relevance based on management mode using ALL courts (not filtered)
                            const allSlotCourts = courts.filter(c => getCourtCapacity(c) <= 1);
                            const allCapacityCourts = courts.filter(c => getCourtCapacity(c) > 1);

                            if (managementMode === 'SLOT') {
                                return allSlotCourts.some(c => getCourtSportType(c) === sport);
                            } else {
                                return allCapacityCourts.some(c => getCourtSportType(c) === sport);
                            }
                        })}
                        selectedSport={selectedSport}
                        onSelectSport={setSelectedSport}
                    />
                </View >
            )
            }

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
                            <View style={styles.modalTwoColumn}>
                                {/* Left Column: Details */}
                                <View style={styles.modalLeftColumn}>
                                    <View style={styles.detailRow}>
                                        <MaterialCommunityIcons name="pound" size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.detailLabel}>รหัสการจอง</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (selectedBooking.id) {
                                                        Clipboard.setString(selectedBooking.id);
                                                        Alert.alert('คัดลอกสำเร็จ', 'รหัสการจองถูกคัดลอกแล้ว');
                                                    }
                                                }}
                                            >
                                                <View style={styles.copyableRow}>
                                                    <Text style={[styles.detailValueCopyable, { fontSize: 13 }]} numberOfLines={1} ellipsizeMode="middle">
                                                        {selectedBooking.id}
                                                    </Text>
                                                    <MaterialCommunityIcons name="content-copy" size={14} color={colors.primary.main} />
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <MaterialCommunityIcons name="account" size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                        <View>
                                            <Text style={styles.detailLabel}>ลูกค้า</Text>
                                            <Text style={styles.detailValue}>{selectedBooking.serviceUser?.name || selectedBooking.customerName || '-'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <MaterialCommunityIcons name="phone" size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.detailLabel}>เบอร์โทรศัพท์</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const phone = selectedBooking.serviceUser?.phone || selectedBooking.customerPhone;
                                                    if (phone) {
                                                        Clipboard.setString(phone);
                                                        Alert.alert('คัดลอกสำเร็จ', `เบอร์ ${phone} ถูกคัดลอกแล้ว`);
                                                    }
                                                }}
                                            >
                                                <View style={styles.copyableRow}>
                                                    <Text style={styles.detailValueCopyable}>{selectedBooking.serviceUser?.phone || selectedBooking.customerPhone || '-'}</Text>
                                                    <MaterialCommunityIcons name="content-copy" size={16} color={colors.primary.main} />
                                                </View>
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
                                        <MaterialCommunityIcons name={selectedBooking.isPaid ? "check-circle-outline" : "alert-circle-outline"} size={20} color={colors.neutral[500]} style={styles.detailIcon} />
                                        <View>
                                            <Text style={styles.detailLabel}>การชำระเงิน</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={[styles.detailValue, { color: selectedBooking.isPaid ? colors.success : colors.warning }]}>
                                                    {selectedBooking.isPaid ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
                                                </Text>
                                                {selectedBooking.paidAt && (
                                                    <Text style={{ fontSize: 12, color: colors.neutral[500] }}>
                                                        ({format(parseISO(selectedBooking.paidAt), 'd MMM HH:mm', { locale: th })})
                                                    </Text>
                                                )}
                                            </View>
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
                                                    {translateBookingStatus(selectedBooking.status)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Right Column: Action Buttons */}
                                <View style={styles.modalRightColumn}>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={handleEditBooking}
                                    >
                                        <MaterialCommunityIcons name="pencil" size={20} color={colors.white} />
                                        <Text style={styles.editButtonText}>แก้ไขการจอง</Text>
                                    </TouchableOpacity>

                                    {/* Action Buttons based on Status */}
                                    <View style={styles.actionButtonsContainer}>
                                        {selectedBooking.status === 'PENDING' && (
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.confirmButton]}
                                                onPress={handleConfirmBooking}
                                            >
                                                <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} />
                                                <Text style={styles.actionButtonText}>ยืนยันการจอง</Text>
                                            </TouchableOpacity>
                                        )}

                                        {['PENDING', 'CONFIRMED'].includes(selectedBooking.status) && (
                                            <>
                                                <TouchableOpacity
                                                    style={[styles.actionButton, styles.completedButton]}
                                                    onPress={handleMarkCompleted}
                                                >
                                                    <MaterialCommunityIcons name="account-check" size={20} color={colors.white} />
                                                    <Text style={styles.actionButtonText}>ลูกค้ามาใช้บริการแล้ว</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[styles.actionButton, styles.noShowButton]}
                                                    onPress={handleMarkNoShow}
                                                >
                                                    <MaterialCommunityIcons name="account-remove" size={20} color={colors.white} />
                                                    <Text style={styles.actionButtonText}>ไม่มาใช้บริการ (No-Show)</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[styles.actionButton, styles.cancelButtonModal]}
                                                    onPress={handleCancelBooking}
                                                >
                                                    <MaterialCommunityIcons name="close-circle" size={20} color={colors.white} />
                                                    <Text style={styles.actionButtonText}>ยกเลิกการจอง</Text>
                                                </TouchableOpacity>


                                            </>
                                        )}

                                        {/* Payment Button - Visible for PENDING, CONFIRMED, COMPLETED */}
                                        {['PENDING', 'CONFIRMED', 'COMPLETED'].includes(selectedBooking.status) && (
                                            <TouchableOpacity
                                                style={[styles.actionButton, selectedBooking.isPaid ? styles.unpaidButton : styles.paidButton]}
                                                onPress={handleTogglePayment}
                                            >
                                                <MaterialCommunityIcons name={selectedBooking.isPaid ? "cash-refund" : "cash-check"} size={20} color={selectedBooking.isPaid ? colors.neutral[700] : colors.white} />
                                                <Text style={[styles.actionButtonText, selectedBooking.isPaid && { color: colors.neutral[700] }]}>
                                                    {selectedBooking.isPaid ? 'ยกเลิกการชำระเงิน' : 'บันทึกการชำระเงิน'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ) : null}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Add Booking Modal */}
            < Modal
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
                        {/* Customer Info & Price Row - Moved to top */}
                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 2 }]}>
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

                            <View style={[styles.formGroup, { flex: 1.5 }]}>
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

                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>ราคา (บาท)</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons name="cash" size={20} color={colors.neutral[400]} />
                                    <TextInput
                                        style={styles.textInputReal}
                                        value={newBooking.price}
                                        onChangeText={(text) => setNewBooking(prev => ({ ...prev, price: text }))}
                                        placeholder="ราคา"
                                        placeholderTextColor={colors.neutral[400]}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                        {/* Court Selection */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>สนาม *</Text>
                            <View style={styles.pickerContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {courts
                                        .filter(court => {
                                            // When editing, only show courts of the same type
                                            if (editingBookingId) {
                                                const courtIsCapacity = getCourtCapacity(court) > 1;
                                                return courtIsCapacity === editingIsCapacity;
                                            }
                                            // When creating new, show based on current management mode
                                            const courtIsCapacity = getCourtCapacity(court) > 1;
                                            return managementMode === 'CAPACITY' ? courtIsCapacity : !courtIsCapacity;
                                        })
                                        .map(court => (
                                            <TouchableOpacity
                                                key={court.id}
                                                style={[
                                                    styles.pickerItem,
                                                    newBooking.courtId === court.id && styles.pickerItemSelected
                                                ]}
                                                onPress={() => {
                                                    // Calculate price for new court
                                                    let newPrice = newBooking.price;
                                                    const foundCourt = courts.find(c => c.id === court.id); // Re-find to be safe or use 'court' from map
                                                    // Note: 'court' inside map is the loop variable.

                                                    if (foundCourt && foundCourt.hourlyRate) {
                                                        const [sH, sM] = newBooking.startTime.split(':').map(Number);
                                                        const [eH, eM] = newBooking.endTime.split(':').map(Number);
                                                        let sMin = sH * 60 + sM;
                                                        let eMin = eH * 60 + eM;
                                                        if (eMin <= sMin) eMin += 24 * 60;
                                                        const durationHours = (eMin - sMin) / 60;
                                                        if (durationHours > 0) {
                                                            newPrice = Math.round(durationHours * Number(foundCourt.hourlyRate)).toString();
                                                        }
                                                    }

                                                    setNewBooking(prev => ({ ...prev, courtId: court.id, price: newPrice }));
                                                }}
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

                        {/* Time Selection Row - Read-only for bulk edit */}
                        {editingBookingIds.length > 1 ? (
                            <View style={styles.formRow}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>เวลา (รวม {editingBookingIds.length} รายการ)</Text>
                                    <View style={[styles.formValue, { backgroundColor: colors.neutral[100], padding: 12, borderRadius: 8 }]}>
                                        <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: colors.neutral[800] }}>
                                            {newBooking.startTime} - {newBooking.endTime}
                                        </Text>
                                        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.neutral[500], marginTop: 4 }}>
                                            ไม่สามารถเปลี่ยนเวลาได้เมื่อแก้ไขหลายรายการพร้อมกัน
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.formRow}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>เวลาเริ่ม *</Text>
                                    <View style={styles.timeGrid}>
                                        {timeOptions.map(time => {
                                            const selectedCourt = courts.find(c => c.id === newBooking.courtId);
                                            const capacity = selectedCourt ? getCourtCapacity(selectedCourt) : 1;
                                            const isCapacity = capacity > 1;

                                            // Count active bookings for this slot
                                            const activeBookingsAtSlot = bookings.filter(b => {
                                                // Skip all bookings being edited (for bulk edit)
                                                if (editingBookingIds.length > 0 && editingBookingIds.includes(b.id)) return false;
                                                // Skip current booking if editing
                                                if (editingBookingId && b.id === editingBookingId) return false;

                                                if ((b.court?.id || b.courtId) !== newBooking.courtId) return false;
                                                if (['CANCELLED', 'NO_SHOW'].includes(b.status)) return false;

                                                const bStart = new Date(b.timeSlotStart);
                                                const bEnd = new Date(b.timeSlotEnd);
                                                const [h, m] = time.split(':').map(Number);
                                                const slotTime = new Date(selectedDate);
                                                slotTime.setHours(h, m, 0, 0);

                                                return slotTime >= bStart && slotTime < bEnd;
                                            }).length;

                                            const isDisabled = isCapacity ? activeBookingsAtSlot >= capacity : activeBookingsAtSlot > 0;

                                            return (
                                                <TouchableOpacity
                                                    key={`start-${time}`}
                                                    style={[
                                                        styles.timeButton,
                                                        newBooking.startTime === time && styles.timeButtonSelected,
                                                        isDisabled && styles.timeButtonDisabled
                                                    ]}
                                                    onPress={() => {
                                                        if (isDisabled) return;
                                                        const [h, m] = time.split(':').map(Number);
                                                        const endH = (h + 1) % 24;
                                                        const newEndTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

                                                        // Calculate Price
                                                        let newPrice = newBooking.price;
                                                        const court = courts.find(c => c.id === newBooking.courtId);
                                                        if (court && court.hourlyRate) {
                                                            const [sH, sM] = time.split(':').map(Number);
                                                            const [eH, eM] = newEndTime.split(':').map(Number);

                                                            let sMin = sH * 60 + sM;
                                                            let eMin = eH * 60 + eM;

                                                            if (eMin <= sMin) eMin += 24 * 60; // Should handle next day/midnight

                                                            const durationHours = (eMin - sMin) / 60;
                                                            if (durationHours > 0) {
                                                                const calculated = Math.round(durationHours * Number(court.hourlyRate));
                                                                newPrice = calculated.toString();
                                                            }
                                                        }

                                                        setNewBooking(prev => ({
                                                            ...prev,
                                                            startTime: time,
                                                            endTime: newEndTime,
                                                            price: newPrice
                                                        }));
                                                    }}
                                                    disabled={isDisabled}
                                                >
                                                    <Text style={[
                                                        styles.timeButtonText,
                                                        newBooking.startTime === time && styles.timeButtonTextSelected,
                                                        isDisabled && styles.timeButtonTextDisabled
                                                    ]}>{time}</Text>
                                                    {/* Status Text for Full/Disabled */}
                                                    {isDisabled ? <Text style={styles.bookedLabel}>เต็มแล้ว</Text> : null}

                                                    {/* Capacity Counter */}
                                                    {(isCapacity && activeBookingsAtSlot > 0 && activeBookingsAtSlot < capacity) ? (
                                                        <Text style={[styles.bookedLabel, { color: colors.primary.main }]}>
                                                            {activeBookingsAtSlot}/{capacity}
                                                        </Text>
                                                    ) : null}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>เวลาสิ้นสุด *</Text>
                                    <View style={styles.timeGrid}>
                                        {timeOptions.map(time => {
                                            const [startH, startM] = newBooking.startTime.split(':').map(Number);
                                            const [endH, endM] = time.split(':').map(Number);

                                            // Construct Date objects for comparison utilizing the selectedDate
                                            const checkStart = new Date(newBooking.date);
                                            checkStart.setHours(startH, startM, 0, 0);

                                            const checkEnd = new Date(newBooking.date);
                                            checkEnd.setHours(endH, endM, 0, 0);

                                            // If End Time <= Start Time, assume it's the next day
                                            if (checkEnd.getTime() <= checkStart.getTime()) {
                                                checkEnd.setDate(checkEnd.getDate() + 1);
                                            }

                                            // Is this duration valid? (Must be > 0)
                                            // Since we added 24h if <=, it's virtually always > 0 unless exact same time prevented elsewhere or 24h limit?
                                            // Let's assume valid for now, standard logic.

                                            const selectedCourt = courts.find(c => c.id === newBooking.courtId);
                                            const capacity = selectedCourt ? getCourtCapacity(selectedCourt) : 1;
                                            const isCapacity = capacity > 1;

                                            // Check Overlap with Existing Bookings
                                            // We check if the Proposed Range (checkStart -> checkEnd) overlaps with any existing booking
                                            const hasOverlap = bookings.some(b => {
                                                // Exclude current editing bookings
                                                if (editingBookingIds.length > 0 && editingBookingIds.includes(b.id)) return false;
                                                if (editingBookingId && b.id === editingBookingId) return false;
                                                if ((b.court?.id || b.courtId) !== newBooking.courtId) return false;
                                                if (['CANCELLED', 'NO_SHOW'].includes(b.status)) return false;

                                                const bStart = new Date(b.timeSlotStart);
                                                const bEnd = new Date(b.timeSlotEnd);

                                                // Check for intersection: (StartA < EndB) && (EndA > StartB)
                                                // Proposed Range: checkStart, checkEnd
                                                // Existing Range: bStart, bEnd
                                                const overlaps = checkStart.getTime() < bEnd.getTime() && checkEnd.getTime() > bStart.getTime();

                                                if (!overlaps) return false;

                                                // If overlap found, for capacity booking we need to check if count exceeds
                                                // This `some` loop is just checking blocking.
                                                // For capacity, we essentially need to counting overlaps at this specific interval?
                                                // Actually, simpler: if ANY existing booking overlaps, it contributes to capacity usage.
                                                // But capacity is per-slot.
                                                // A robust check would be: does utilization exceed capacity at ANY point in the range?
                                                // That's complex.
                                                // For now, let's stick to the 'Slot' logic which disallows any overlap.
                                                // For 'Capacity', we relax this?
                                                // The Web UI logic iterates slots. 
                                                // If we want to support capacity properly, we need to iterate slots.

                                                // Let's rely on backend or simplified check for now?
                                                // Or better: Revert to simplified "block if overlapping" if standard court.
                                                // If Capacity court: allow overlap?

                                                if (isCapacity) return false; // Don't block capacity here via simple overlap
                                                return true;
                                            });

                                            // Capacity Check (Simplified: Check start point and maybe just allow?)
                                            // Realistically, for capacity, we should probably check if start time is full.
                                            // For end time, picking it just defines duration.

                                            const isDisabled = !isCapacity && hasOverlap;

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

                                                        // Calculate new values first
                                                        const newEndTime = time;

                                                        // Calculate price
                                                        let newPrice = newBooking.price;

                                                        const court = courts.find(c => c.id === newBooking.courtId);
                                                        if (court && court.hourlyRate) {
                                                            const [sH, sM] = newBooking.startTime.split(':').map(Number);
                                                            const [eH, eM] = newEndTime.split(':').map(Number);

                                                            let sMin = sH * 60 + sM;
                                                            let eMin = eH * 60 + eM;

                                                            if (eMin <= sMin) eMin += 24 * 60;

                                                            const durationHours = (eMin - sMin) / 60;
                                                            if (durationHours > 0) {
                                                                const calculated = Math.round(durationHours * Number(court.hourlyRate));
                                                                newPrice = calculated.toString();
                                                            }
                                                        }

                                                        setNewBooking(prev => ({
                                                            ...prev,
                                                            endTime: newEndTime,
                                                            price: newPrice
                                                        }));
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
                        )}

                        {/* Duration Summary */}
                        <View style={{
                            marginTop: spacing.sm,
                            marginBottom: spacing.md,
                            padding: spacing.sm,
                            backgroundColor: '#EFF6FF',
                            borderRadius: borderRadius.md,
                            borderWidth: 1,
                            borderColor: '#DBEAFE',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontFamily: fonts.medium, color: colors.neutral[600], fontSize: 14 }}>ระยะเวลาที่เลือก:</Text>
                            <Text style={{ fontFamily: fonts.bold, color: '#1D4ED8', fontSize: 16 }}>
                                {(() => {
                                    if (!newBooking.startTime || !newBooking.endTime) return '0 นาที';
                                    const [sH, sM] = newBooking.startTime.split(':').map(Number);
                                    const [eH, eM] = newBooking.endTime.split(':').map(Number);
                                    let sMin = sH * 60 + sM;
                                    let eMin = eH * 60 + eM;
                                    if (eMin <= sMin) eMin += 24 * 60;
                                    const diff = eMin - sMin;
                                    const hrs = Math.floor(diff / 60);
                                    const mins = diff % 60;
                                    let text = '';
                                    if (hrs > 0) text += `${hrs} ชั่วโมง `;
                                    if (mins > 0) text += `${mins} นาที`;
                                    return text || '0 นาที';
                                })()}
                            </Text>
                        </View>

                        {/* Status Row */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>สถานะ</Text>
                            <View style={[styles.statusRow, { flexWrap: 'wrap', rowGap: 8 }]}>
                                {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map(status => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.statusChip,
                                            newBooking.status === status && styles.statusChipSelected,
                                            status === 'CONFIRMED' && { borderColor: '#22C55E' },
                                            status === 'PENDING' && { borderColor: '#EAB308' },
                                            status === 'COMPLETED' && { borderColor: '#3B82F6' },
                                            status === 'CANCELLED' && { borderColor: '#EF4444' },
                                            status === 'NO_SHOW' && { borderColor: '#64748B' },
                                            newBooking.status === status && status === 'CONFIRMED' && { backgroundColor: '#DCFCE7' },
                                            newBooking.status === status && status === 'PENDING' && { backgroundColor: '#FEF9C3' },
                                            newBooking.status === status && status === 'COMPLETED' && { backgroundColor: '#DBEAFE' },
                                            newBooking.status === status && status === 'CANCELLED' && { backgroundColor: '#FEE2E2' },
                                            newBooking.status === status && status === 'NO_SHOW' && { backgroundColor: '#F1F5F9' }
                                        ]}
                                        onPress={() => setNewBooking(prev => ({ ...prev, status }))}
                                    >
                                        <Text style={[
                                            styles.statusChipText,
                                            status === 'CONFIRMED' && { color: '#166534' },
                                            status === 'PENDING' && { color: '#854D0E' },
                                            status === 'COMPLETED' && { color: '#1E40AF' },
                                            status === 'CANCELLED' && { color: '#991B1B' },
                                            status === 'NO_SHOW' && { color: '#334155' }
                                        ]}>
                                            {translateBookingStatus(status)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
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
            </Modal >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingLeft: 10,
        paddingRight: spacing.lg,
        paddingBottom: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: spacing.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.neutral[900],
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.neutral[500],
        marginTop: -2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
    },
    modeSwitcher: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 10,
        gap: 6,
    },
    modeButtonActive: {
        backgroundColor: colors.primary.main,
    },
    modeButtonText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.neutral[500],
    },
    modeButtonTextActive: {
        color: colors.white,
    },
    dateControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    todayButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        backgroundColor: colors.neutral[50],
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.neutral[200],
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
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        height: HEADER_HEIGHT,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[200],
        backgroundColor: colors.neutral[50],
    },
    columnHeader: {
        width: MIN_COURT_COL_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: colors.neutral[100],
        paddingHorizontal: 4,
    },
    columnHeaderText: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
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
        width: MIN_COURT_COL_WIDTH,
        borderRightWidth: 1,
        borderRightColor: colors.neutral[100],
        position: 'relative',
    },
    gridCell: {
        height: ROW_HEIGHT,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
        borderStyle: 'solid',
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
        width: '80%',
        maxWidth: 800,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    modalTwoColumn: {
        flexDirection: 'row',
        gap: spacing.xl,
    },
    modalLeftColumn: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: colors.neutral[100],
        paddingRight: spacing.xl,
    },
    modalRightColumn: {
        flex: 1,
        paddingLeft: spacing.md,
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
        paddingVertical: 8,
        borderRadius: borderRadius.md,
        marginLeft: spacing.md,
        gap: spacing.xs,
    },
    addButtonText: {
        fontFamily: fonts.medium,
        fontSize: 13,
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
        paddingVertical: 4,
        borderRadius: borderRadius.md,
        borderWidth: 1, // Reduced border width
        borderColor: colors.neutral[200],
        backgroundColor: colors.white,
        width: 48, // Reduced width from 65
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeButtonSelected: {
        borderColor: colors.primary.main,
        backgroundColor: colors.primary.main,
    },
    timeButtonText: {
        fontFamily: fonts.medium,
        fontSize: 12, // Reduced font size from 14
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


    sportBadgeSmall: {
        backgroundColor: colors.neutral[100],
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
        alignSelf: 'center',
    },
    sportBadgeTextSmall: {
        fontSize: 10,
        color: colors.neutral[500],
        fontFamily: fonts.regular,
    },
    tableAddButton: {
        width: TIME_COL_WIDTH,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: colors.neutral[200],
        backgroundColor: colors.white,
    },
    // Capacity Base Styles
    capacityCell: {
        width: '100%',
        height: ROW_HEIGHT,
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderColor: colors.neutral[200],
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    capacityText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.neutral[700],
        zIndex: 2,
    },
    capacityLabel: {
        fontSize: 9,
        color: colors.neutral[500],
        zIndex: 2,
    },
    capacityFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        opacity: 0.25,
    },
    // New Styles for Separated Capacity Section
    capacityContainer: {
        marginTop: 0,
        paddingTop: 16,
        paddingHorizontal: spacing.lg,
        paddingBottom: 40,
    },
    sectionHeader: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.neutral[900],
        marginBottom: spacing.sm,
    },
    facilityCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        // Soft modern shadow
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    facilityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    facilityName: {
        fontFamily: fonts.semiBold,
        fontSize: 14,
        color: colors.primary.main,
    },
    facilitySubName: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.neutral[500],
        marginTop: 2,
    },
    addCapacityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary.main,
        paddingVertical: 6,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
    },
    addCapacityButtonText: {
        fontFamily: fonts.medium,
        color: colors.white,
        fontSize: 12,
        marginLeft: 4,
    },
    detailsButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: colors.neutral[50],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    bookingList: {
        gap: spacing.sm,
    },
    capacityBookingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        backgroundColor: colors.neutral[50], // Consistent light bg
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    checkInTime: {
        backgroundColor: colors.white,
        paddingVertical: 4,
        paddingHorizontal: 6,
        borderRadius: 4,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    timeTextSmall: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.neutral[800],
    },
    bookingUserInfo: {
        flex: 1,
    },
    bookingUserName: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.neutral[900],
    },
    bookingUserPhone: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.neutral[500],
    },
    statusTag: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: borderRadius.sm,
    },
    statusTextSmall: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: colors.neutral[800],
    },
    emptyBookingsText: {
        textAlign: 'center',
        color: colors.neutral[400],
        fontSize: 14,
        fontFamily: fonts.regular,
        marginTop: spacing.sm,
    },
    emptyContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    // Current Time Indicator Styles
    currentTimeLabel: {
        position: 'absolute',
        left: 4,
        right: 4,
        backgroundColor: '#EF4444',
        paddingVertical: 2,
        paddingHorizontal: 4,
        borderRadius: 4,
        zIndex: 100,
    },
    currentTimeLabelText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: colors.white,
        textAlign: 'center',
    },
    currentTimeLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#EF4444',
        zIndex: 50,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5,
    },
    // New Action Button Styles
    actionButtonsContainer: {
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        gap: spacing.xs,
    },
    confirmButton: {
        backgroundColor: '#22C55E', // Green
    },
    noShowButton: {
        backgroundColor: '#EAB308', // Yellow/Orange
    },
    completedButton: {
        backgroundColor: '#3B82F6', // Blue
    },
    cancelButtonModal: {
        backgroundColor: '#EF4444', // Red
    },
    actionButtonText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.white,
    },
    unpaidButton: {
        backgroundColor: colors.neutral[200],
        marginBottom: spacing.sm,
    },
    paidButton: {
        backgroundColor: colors.success,
        marginBottom: spacing.sm,
    },
});
