import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors, fonts, spacing, borderRadius } from '../../theme/tokens';
import { Court } from '../../types/court';
import { Booking, BookingStatus } from '../../types/booking';
import { courtService } from '../../services/court.service';
import { bookingService } from '../../services/booking.service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, parseISO, isToday } from 'date-fns';
import { th } from 'date-fns/locale';

// Constants for table layout
const TIME_COL_WIDTH = 60;
const COURT_COL_WIDTH = 80;
const HEADER_HEIGHT = 50; // Height for sport badge + court name
const ROW_HEIGHT = 60; // Height per hour slot
const START_HOUR = 8; // 08:00
const END_HOUR = 24;  // 24:00 (Midnight)

const SPORT_LABELS: Record<string, string> = {
    'badminton': 'แบดมินตัน',
    'football': 'ฟุตบอล',
    'futsal': 'ฟุตซอล',
    'tennis': 'เทนนิส',
    'basketball': 'บาสเกตบอล',
    'volleyball': 'วอลเลย์บอล',
    'swimming': 'ว่ายน้ำ',
    'fitness': 'ฟิตเนส'
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
    // State
    const [loading, setLoading] = useState(true);
    const [courts, setCourts] = useState<Court[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSport, setSelectedSport] = useState<string>('ALL'); // New State

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
    const [editingIsCapacity, setEditingIsCapacity] = useState<boolean>(false);
    const [expandedFacilityId, setExpandedFacilityId] = useState<string | null>(null);
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
                // Exclude cancelled bookings
                if (b.status === BookingStatus.CANCELLED) return false;
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

    const handleBookingPress = async (bookingId: string, isCapacity: boolean = false) => {
        setLoadingDetail(true);
        setModalVisible(true);
        // Clear previous selection while loading to show spinner
        setSelectedBooking(null);
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
        setNewBooking({
            courtId: options.courtId || (courts.length > 0 ? courts[0].id : ''),
            date: options.date || format(selectedDate, 'yyyy-MM-dd'),
            startTime: options.startTime || '10:00',
            endTime: options.endTime || '11:00',
            customerName: options.customerName || '',
            customerPhone: options.customerPhone || '',
            price: options.price || '',
            status: options.status || 'CONFIRMED'
        });
        setAddModalVisible(true);
    };

    const handleEditBooking = () => {
        if (!selectedBooking) return;

        const booking = selectedBooking as any;
        setEditingBookingId(booking.id);

        // Check if this is a capacity booking
        const isCapacity = booking.isCapacity === true;
        setEditingIsCapacity(isCapacity);

        // Parse date and times
        const startDate = parseISO(booking.timeSlotStart);
        const endDate = parseISO(booking.timeSlotEnd);

        let phone = booking.serviceUser?.phone || booking.customerPhone || '';
        if (phone.startsWith('+66')) {
            phone = '0' + phone.substring(3);
        }

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

            const payload = {
                date: newBooking.date,
                startTime: newBooking.startTime,
                endTime: newBooking.endTime,
                customerName: newBooking.customerName,
                customerPhone: newBooking.customerPhone,
                price: newBooking.price ? parseFloat(newBooking.price) : undefined,
                status: newBooking.status
            };

            if (editingBookingId) {
                // Use appropriate update function based on booking type
                if (editingIsCapacity) {
                    await bookingService.updateCapacityBooking(editingBookingId, {
                        ...payload,
                        facilityId: newBooking.courtId
                    });
                } else {
                    await bookingService.updateBooking(editingBookingId, { ...payload, courtId: newBooking.courtId });
                }
            } else {
                if (isCapacity) {
                    await bookingService.createCapacityBooking({
                        ...payload,
                        facilityId: newBooking.courtId,
                        businessId: businessId || '99999',
                        quantity: 1
                    });
                } else {
                    await bookingService.createBooking({
                        ...payload,
                        courtId: newBooking.courtId
                    });
                }
            }

            setAddModalVisible(false);
            setEditingBookingId(null);
            setEditingIsCapacity(false);
            loadData(); // Refresh bookings
        } catch (error) {
            console.error('Error saving booking:', error);
            Alert.alert('Error', 'Failed to save booking');
        } finally {
            setAddingBooking(false);
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
                            <Text style={styles.todayText}>วันนี้</Text>
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
                                            <View key={court.id} style={styles.columnHeader}>
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
                                                            <View key={court.id} style={styles.courtColumn}>
                                                                {/* Background Grid Cells */}
                                                                {timeSlots.map((time, tIndex) => (
                                                                    <TouchableOpacity
                                                                        key={tIndex}
                                                                        style={styles.gridCell}
                                                                        activeOpacity={1}
                                                                        onPress={() => openAddModal({
                                                                            courtId: court.id,
                                                                            startTime: time,
                                                                            endTime: time.split(':')[0].padStart(2, '0') + ':59'
                                                                        })}
                                                                    />
                                                                ))}

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
                                                                                }
                                                                            ]}
                                                                            onPress={() => handleBookingPress(mergedBooking.bookings[0].id)}
                                                                            activeOpacity={0.8}
                                                                        >
                                                                            <Text style={styles.bookingText} numberOfLines={1}>
                                                                                {mergedBooking.bookings[0].serviceUser?.name || 'ลูกค้า'}
                                                                            </Text>
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

                                        {capacityCourts.map(facility => {
                                            const facilityBookings = bookings.filter(b => (b.courtId === facility.id || b.court?.id === facility.id) && b.status !== 'CANCELLED');
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
                                                                                <Text style={styles.statusTextSmall}>{booking.status}</Text>
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

                    {/* Sport Tabs - Moved to Bottom like Navigation */}
                    <View style={styles.tabContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
                            {sportTabs.filter(sport => {
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
                            }).map(sport => (
                                <TouchableOpacity
                                    key={sport}
                                    style={[
                                        styles.tabItem,
                                        selectedSport === sport && styles.tabItemSelected
                                    ]}
                                    onPress={() => setSelectedSport(sport)}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        selectedSport === sport && styles.tabTextSelected
                                    ]}>
                                        {sport === 'ALL' ? 'ทั้งหมด' : getSportName(sport)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
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
                            <View>
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
                                        const selectedCourt = courts.find(c => c.id === newBooking.courtId);
                                        const capacity = selectedCourt ? getCourtCapacity(selectedCourt) : 1;
                                        const isCapacity = capacity > 1;

                                        // Count active bookings for this slot
                                        const activeBookingsAtSlot = bookings.filter(b => {
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
                                                    setNewBooking(prev => ({
                                                        ...prev,
                                                        startTime: time,
                                                        endTime: `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                                                    }));
                                                }}
                                                disabled={isDisabled}
                                            >
                                                <Text style={[
                                                    styles.timeButtonText,
                                                    newBooking.startTime === time && styles.timeButtonTextSelected,
                                                    isDisabled && styles.timeButtonTextDisabled
                                                ]}>{time}</Text>
                                                {isDisabled && <Text style={styles.bookedLabel}>เต็มแล้ว</Text>}
                                                {isCapacity && activeBookingsAtSlot > 0 && activeBookingsAtSlot < capacity && (
                                                    <Text style={[styles.bookedLabel, { color: colors.primary.main }]}>
                                                        {activeBookingsAtSlot}/{capacity}
                                                    </Text>
                                                )}
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

                                        const selectedCourt = courts.find(c => c.id === newBooking.courtId);
                                        const capacity = selectedCourt ? getCourtCapacity(selectedCourt) : 1;
                                        const isCapacity = capacity > 1;

                                        // Check if range overlaps with existing bookings (for capacity, check if any slot in range is full)
                                        const hasOverlap = timeOptions.some(optTime => {
                                            const [optH, optM] = optTime.split(':').map(Number);
                                            const optTotalMinutes = optH * 60 + optM;

                                            // Only check slots within the proposed range
                                            if (optTotalMinutes < startMinutes || optTotalMinutes >= endMinutes) return false;

                                            // Count bookings at this specific slot
                                            const countAtSlot = bookings.filter(b => {
                                                if (editingBookingId && b.id === editingBookingId) return false;
                                                if ((b.court?.id || b.courtId) !== newBooking.courtId) return false;
                                                if (['CANCELLED', 'NO_SHOW'].includes(b.status)) return false;

                                                const bStart = new Date(b.timeSlotStart);
                                                const bEnd = new Date(b.timeSlotEnd);
                                                const slotTime = new Date(selectedDate);
                                                slotTime.setHours(optH, optM, 0, 0);

                                                return slotTime >= bStart && slotTime < bEnd;
                                            }).length;

                                            return isCapacity ? countAtSlot >= capacity : countAtSlot > 0;
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



                        {/* Status Row */}
                        <View style={styles.formGroup}>
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
        backgroundColor: 'transparent',
        paddingLeft: 40,
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
        width: COURT_COL_WIDTH,
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
        width: COURT_COL_WIDTH,
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
    // Tab Styles
    tabContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        marginTop: 8,
    },
    tabScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        gap: 8,
    },
    tabItem: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    tabItemSelected: {
        backgroundColor: colors.primary.main,
        borderColor: colors.primary.main,
        shadowColor: colors.primary.main,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    tabText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.neutral[600],
    },
    tabTextSelected: {
        color: colors.white,
        fontFamily: fonts.semiBold,
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
});
