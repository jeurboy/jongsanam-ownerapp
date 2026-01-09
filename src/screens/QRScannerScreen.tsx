import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Alert,
    Modal,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Linking,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useCodeScanner,
} from 'react-native-vision-camera';
import { colors, spacing, fontSize, borderRadius } from '../theme/tokens';
import { bookingService } from '../services/booking.service';
import { format as dateFnsFormat, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { translateBookingStatus } from '../utils/statusTranslation';

interface BookingLookupResult {
    id: string;
    status: string;
    timeSlotStart: string;
    timeSlotEnd: string;
    totalPrice: number;
    createdAt: string;
    confirmedAt?: string;
    notes?: string;
    customer?: {
        id: string;
        name: string;
        phone: string;
        email?: string;
    };
    facility?: {
        type: 'court' | 'capacity';
        id: string;
        name: string;
        sportType?: string;
        businessName?: string;
    };
}

interface Props {
    visible: boolean;
    onClose: () => void;
    businessId?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.6;

export const QRScannerScreen: React.FC<Props> = ({ visible, onClose, businessId }) => {
    // Camera Logic
    const device = useCameraDevice('back');
    const { hasPermission, requestPermission } = useCameraPermission();
    const [isActive, setIsActive] = useState(false);

    // State
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [bookingResults, setBookingResults] = useState<BookingLookupResult[]>([]);
    const [customerInfo, setCustomerInfo] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [checkingIn, setCheckingIn] = useState<{ [key: string]: boolean }>({});
    const [manualInput, setManualInput] = useState('');
    const [useManualMode, setUseManualMode] = useState(false);

    // Initialize camera active state only when visible
    useEffect(() => {
        if (visible) {
            // Orientation is handled globally in AppNavigator
            setIsActive(true);
            setScanned(false);
            setBookingResults([]);
            setCustomerInfo(null);
            setError(null);
            setManualInput('');
        } else {
            setIsActive(false);
        }
    }, [visible]);

    // Cleanup when closing
    const handleClose = () => {
        setIsActive(false);
        onClose();
    };

    const onCodeScanned = useCallback(async (codes: any[]) => {
        if (scanned || loading || !codes.length) return;

        const code = codes[0];
        const qrData = code.value;

        if (!qrData) return;

        console.log('Scanned QR:', qrData);

        // Validate QR format
        if (!qrData.startsWith('JONGSANAM-CHECKIN:')) {
            // Only show error if we haven't scanned yet to avoid flickering
            if (!scanned) {
                setError('QR Code นี้ไม่ใช่รหัสยืนยันการจอง');
                setScanned(true); // Stop scanning momentarily
            }
            return;
        }

        setScanned(true);
        setLoading(true);
        setError(null);
        setIsActive(false); // Pause camera processing

        try {
            const result = await bookingService.lookupByQRCode(qrData);
            setBookingResults(result.bookings || []);
            setCustomerInfo(result.customer);
        } catch (err: any) {
            if (err.code === 'NOT_YOUR_BUSINESS') {
                setError('การจองนี้ไม่ได้อยู่ในธุรกิจของคุณ');
            } else {
                setError(err.message || 'ไม่พบข้อมูลการจอง');
            }
        } finally {
            setLoading(false);
        }
    }, [scanned, loading]);

    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13'],
        onCodeScanned: onCodeScanned,
    });

    const handleManualSearch = async () => {
        if (!manualInput.trim()) {
            Alert.alert('กรุณากรอกข้อมูล', 'กรุณากรอก Booking ID หรือ QR Code');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let qrCode = manualInput.trim();
            if (!qrCode.startsWith('JONGSANAM-CHECKIN:')) {
                qrCode = `JONGSANAM-CHECKIN:${qrCode}`;
            }

            const result = await bookingService.lookupByQRCode(qrCode);
            setBookingResults(result.bookings || []);
            setCustomerInfo(result.customer);
        } catch (err: any) {
            if (err.code === 'NOT_YOUR_BUSINESS') {
                setError('การจองนี้ไม่ได้อยู่ในธุรกิจของคุณ');
            } else {
                setError(err.message || 'ไม่พบข้อมูลการจอง');
            }
        } finally {
            setLoading(false);
        }
    };

    const processStatusUpdate = async (bookingId: string, action: 'check-in' | 'confirm') => {
        setCheckingIn(prev => ({ ...prev, [bookingId]: true }));
        try {
            await bookingService.updateBookingStatus(bookingId, action);
            const statusText = action === 'check-in' ? 'ลูกค้ามาใช้บริการแล้ว' : 'ยืนยันสนาม';

            // Update the booking status in the list
            setBookingResults(prev => prev.map(b =>
                b.id === bookingId ? { ...b, status: action === 'check-in' ? 'COMPLETED' : 'CONFIRMED' } : b
            ));

            Alert.alert(
                'บันทึกสำเร็จ! ✓',
                `เปลี่ยนสถานะเป็น "${statusText}" เรียบร้อยแล้ว`,
                [{ text: 'ตกลง' }]
            );
        } catch (err: any) {
            Alert.alert('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถทำรายการได้');
        } finally {
            setCheckingIn(prev => ({ ...prev, [bookingId]: false }));
        }
    };

    const handleCheckIn = (bookingId: string) => {
        Alert.alert(
            'เลือกสถานะ',
            'กรุณาเลือกสถานะที่ต้องการบันทึก',
            [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                    text: 'ยืนยันสนาม',
                    onPress: () => processStatusUpdate(bookingId, 'confirm')
                },
                {
                    text: 'ลูกค้ามาใช้บริการแล้ว',
                    onPress: () => processStatusUpdate(bookingId, 'check-in')
                }
            ]
        );
    };

    const handleNoShow = async (bookingId: string) => {
        Alert.alert(
            'ยืนยัน No-Show',
            'คุณต้องการทำเครื่องหมายว่าลูกค้าไม่มาใช่หรือไม่?',
            [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                    text: 'ยืนยัน',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await bookingService.markNoShow(bookingId);
                            // Update the booking status in the list
                            setBookingResults(prev => prev.map(b =>
                                b.id === bookingId ? { ...b, status: 'NO_SHOW' } : b
                            ));
                            Alert.alert('บันทึกแล้ว', 'ทำเครื่องหมาย No-Show เรียบร้อย');
                        } catch (err: any) {
                            Alert.alert('เกิดข้อผิดพลาด', err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleReset = () => {
        setScanned(false);
        setBookingResults([]);
        setCustomerInfo(null);
        setError(null);
        setManualInput('');
        setIsActive(true); // Create camera active again
    };

    const handlePermissionRequest = async () => {
        const result = await requestPermission();
        if (!result) {
            Alert.alert(
                'ต้องการสิทธิ์กล้อง',
                'กรุณาไปที่การตั้งค่าเพื่อเปิดสิทธิ์การใช้งานกล้อง',
                [
                    { text: 'ยกเลิก', style: 'cancel' },
                    { text: 'ไปที่การตั้งค่า', onPress: () => Linking.openSettings() }
                ]
            );
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return { bg: '#DCFCE7', text: '#166534' };
            case 'PENDING': return { bg: '#FEF9C3', text: '#854D0E' };
            case 'COMPLETED': return { bg: '#DBEAFE', text: '#1E40AF' };
            case 'CANCELLED': return { bg: '#FEE2E2', text: '#991B1B' };
            case 'NO_SHOW': return { bg: '#F1F5F9', text: '#334155' };
            case 'FAILED': return { bg: '#FEE2E2', text: '#991B1B' };
            default: return { bg: '#F1F5F9', text: '#64748B' };
        }
    };



    if (!visible) return null;

    // Render Manual Input Mode
    const renderManualInputMode = () => (
        <SafeAreaView style={styles.container}>
            <View style={styles.manualHeader}>
                <TouchableOpacity style={styles.closeButtonManual} onPress={handleClose}>
                    <MaterialCommunityIcons name="close" size={28} color={colors.neutral[900]} />
                </TouchableOpacity>
                <Text style={styles.manualTitle}>ค้นหาการจอง</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.manualContent}
            >
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="qrcode-scan" size={80} color={colors.primary[500]} />
                </View>

                <Text style={styles.manualDescription}>
                    กรอก Booking ID ที่ลูกค้าแสดงจากหน้า "การจองของฉัน"
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="กรอก Booking ID..."
                        placeholderTextColor={colors.neutral[400]}
                        value={manualInput}
                        onChangeText={setManualInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={handleManualSearch}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <MaterialCommunityIcons name="magnify" size={24} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                </View>

                {error && (
                    <View style={styles.errorBox}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.cameraModeButton}
                    onPress={() => {
                        setUseManualMode(false);
                        setIsActive(true);
                    }}
                >
                    <MaterialCommunityIcons name="camera" size={22} color={colors.primary[600]} />
                    <Text style={styles.cameraModeButtonText}>สแกน QR Code แทน</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>

            {bookingResults.length > 0 && renderBookingResult()}
        </SafeAreaView>
    );

    // Render Camera Mode
    const renderCameraMode = () => {
        if (!hasPermission) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                            <MaterialCommunityIcons name="close" size={28} color={colors.neutral[900]} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.centerContent}>
                        <MaterialCommunityIcons name="camera-off" size={80} color={colors.neutral[400]} />
                        <Text style={styles.permissionTitle}>ต้องการสิทธิ์กล้อง</Text>
                        <Text style={styles.permissionText}>
                            กรุณาอนุญาตให้แอปเข้าถึงกล้องเพื่อสแกน QR Code
                        </Text>
                        <TouchableOpacity style={styles.permissionButton} onPress={handlePermissionRequest}>
                            <Text style={styles.permissionButtonText}>อนุญาตเข้าถึงกล้อง</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.manualModeButton}
                            onPress={() => setUseManualMode(true)}
                        >
                            <Text style={styles.manualModeButtonText}>กรอก ID แทน</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        if (device == null) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                            <MaterialCommunityIcons name="close" size={28} color={colors.neutral[900]} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.centerContent}>
                        <MaterialCommunityIcons name="alert" size={80} color={colors.error} />
                        <Text style={styles.permissionTitle}>เกิดข้อผิดพลาด</Text>
                        <Text style={styles.permissionText}>ไม่พบอุปกรณ์กล้อง</Text>
                        <TouchableOpacity
                            style={styles.manualModeButton}
                            onPress={() => setUseManualMode(true)}
                        >
                            <Text style={styles.manualModeButtonText}>กรอก ID แทน</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        return (
            <View style={styles.container}>
                <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={isActive}
                    codeScanner={codeScanner}
                    enableZoomGesture={true}
                />

                <View style={styles.overlay}>
                    <SafeAreaView style={styles.overlayHeader}>
                        <TouchableOpacity
                            style={styles.closeButtonOverlay}
                            onPress={handleClose}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <MaterialCommunityIcons name="close" size={32} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.overlayTitle}>สแกน QR การจอง</Text>
                        <TouchableOpacity
                            style={styles.manualModeOverlayBtn}
                            onPress={() => {
                                setIsActive(false);
                                setUseManualMode(true);
                            }}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <MaterialCommunityIcons name="keyboard" size={28} color="#FFFFFF" />
                        </TouchableOpacity>
                    </SafeAreaView>

                    <View style={styles.scanGuideContainer}>
                        <View style={styles.scanGuide}>
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />

                            {loading && (
                                <View style={styles.scanningIndicator}>
                                    <ActivityIndicator size="large" color="#FFFFFF" />
                                    <Text style={styles.scanningText}>กำลังค้นหา...</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.scanHint}>วาง QR Code ในกรอบ</Text>
                    </View>
                </View>

                {error && renderErrorModal()}
                {bookingResults.length > 0 && renderBookingResult()}
            </View>
        );
    };

    const renderErrorModal = () => (
        <View style={styles.resultOverlay}>
            <View style={styles.resultCard}>
                <View style={styles.errorIconContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={60} color="#EF4444" />
                </View>
                <Text style={styles.errorTitle}>ไม่พบการจอง</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleReset}>
                    <MaterialCommunityIcons name="qrcode-scan" size={22} color="#FFFFFF" />
                    <Text style={styles.retryButtonText}>สแกนใหม่</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderBookingResult = () => {
        if (bookingResults.length === 0) return null;

        return (
            <View style={styles.resultOverlay}>
                <ScrollView style={styles.resultScrollView} contentContainerStyle={styles.resultScrollContent}>
                    <View style={styles.resultCard}>
                        {/* Customer Header */}
                        {customerInfo && (
                            <>
                                <View style={styles.customerSection}>
                                    <View style={styles.customerAvatar}>
                                        <Text style={styles.customerInitial}>
                                            {customerInfo.name?.charAt(0).toUpperCase() || '?'}
                                        </Text>
                                    </View>
                                    <View style={styles.customerInfo}>
                                        <Text style={styles.customerName}>
                                            {customerInfo.name || 'ไม่ระบุชื่อ'}
                                        </Text>
                                        {customerInfo.phone && (
                                            <Text style={styles.customerPhone}>
                                                {customerInfo.phone}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.divider} />
                            </>
                        )}

                        {/* Bookings Count */}
                        <Text style={styles.bookingsCountText}>
                            พบ {bookingResults.length} การจอง
                        </Text>

                        {/* Booking List */}
                        {bookingResults.map((booking, index) => (
                            <View key={booking.id} style={styles.bookingCard}>
                                {/* Status Badge */}
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: getStatusColor(booking.status).bg }
                                ]}>
                                    <MaterialCommunityIcons
                                        name={booking.status === 'CONFIRMED' ? 'check-circle' : 'information'}
                                        size={18}
                                        color={getStatusColor(booking.status).text}
                                    />
                                    <Text style={[
                                        styles.statusText,
                                        { color: getStatusColor(booking.status).text }
                                    ]}>
                                        {translateBookingStatus(booking.status)}
                                    </Text>
                                </View>

                                {/* Booking Details */}
                                <View style={styles.bookingDetailsSection}>
                                    <View style={styles.detailRow}>
                                        <MaterialCommunityIcons name="stadium" size={20} color={colors.neutral[500]} />
                                        <View style={styles.detailContent}>
                                            <Text style={styles.detailLabel}>สนาม</Text>
                                            <Text style={styles.detailValue}>
                                                {booking.facility?.name}
                                            </Text>
                                            {booking.facility?.sportType && (
                                                <Text style={styles.detailSubValue}>
                                                    {booking.facility.sportType}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.neutral[500]} />
                                        <View style={styles.detailContent}>
                                            <Text style={styles.detailLabel}>เวลา</Text>
                                            <Text style={styles.detailValue}>
                                                {dateFnsFormat(parseISO(booking.timeSlotStart), 'HH:mm')} - {dateFnsFormat(parseISO(booking.timeSlotEnd), 'HH:mm')}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <MaterialCommunityIcons name="cash" size={20} color={colors.neutral[500]} />
                                        <View style={styles.detailContent}>
                                            <Text style={styles.detailLabel}>ราคา</Text>
                                            <Text style={styles.priceValue}>
                                                ฿{booking.totalPrice?.toLocaleString() || '0'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.bookingActionsSection}>
                                    {booking.status !== 'COMPLETED' && booking.status !== 'NO_SHOW' && (
                                        <>
                                            <TouchableOpacity
                                                style={styles.checkInButton}
                                                onPress={() => handleCheckIn(booking.id)}
                                                disabled={checkingIn[booking.id]}
                                            >
                                                {checkingIn[booking.id] ? (
                                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                                ) : (
                                                    <>
                                                        <MaterialCommunityIcons name="check-bold" size={20} color="#FFFFFF" />
                                                        <Text style={styles.checkInButtonText}>Check-in</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.noShowButton}
                                                onPress={() => handleNoShow(booking.id)}
                                                disabled={checkingIn[booking.id]}
                                            >
                                                <MaterialCommunityIcons name="account-off" size={18} color="#DC2626" />
                                                <Text style={styles.noShowButtonText}>No-Show</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    {booking.status === 'COMPLETED' && (
                                        <View style={styles.completedBanner}>
                                            <MaterialCommunityIcons name="check-circle" size={20} color="#16A34A" />
                                            <Text style={styles.completedText}>Check-in แล้ว</Text>
                                        </View>
                                    )}

                                    {booking.status === 'NO_SHOW' && (
                                        <View style={styles.noShowBanner}>
                                            <MaterialCommunityIcons name="account-off" size={20} color="#9333EA" />
                                            <Text style={styles.noShowBannerText}>No-Show</Text>
                                        </View>
                                    )}
                                </View>

                                {index < bookingResults.length - 1 && <View style={styles.bookingDivider} />}
                            </View>
                        ))}

                        {/* Reset Button */}
                        <TouchableOpacity style={styles.scanAgainButton} onPress={handleReset}>
                            <MaterialCommunityIcons name="qrcode-scan" size={20} color={colors.primary[600]} />
                            <Text style={styles.scanAgainButtonText}>ค้นหาใหม่</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={handleClose}
            supportedOrientations={['landscape']}
        >
            {useManualMode ? renderManualInputMode() : renderCameraMode()}
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        fontFamily: 'Kanit-Medium',
        fontSize: 16,
        color: colors.neutral[600],
        marginTop: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.neutral[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionTitle: {
        fontFamily: 'Kanit-Bold',
        fontSize: 24,
        color: colors.neutral[900],
        marginTop: 24,
        textAlign: 'center',
    },
    permissionText: {
        fontFamily: 'Kanit-Regular',
        fontSize: 16,
        color: colors.neutral[600],
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 24,
    },
    permissionButton: {
        marginTop: 32,
        paddingHorizontal: 32,
        paddingVertical: 14,
        backgroundColor: colors.primary[500],
        borderRadius: 12,
    },
    permissionButtonText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
    },
    manualModeButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    manualModeButtonText: {
        fontFamily: 'Kanit-Medium',
        fontSize: 16,
        color: colors.primary[600],
    },
    manualHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[200],
    },
    closeButtonManual: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.neutral[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    manualTitle: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 18,
        color: colors.neutral[900],
    },
    manualContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        alignItems: 'center',
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    manualDescription: {
        fontFamily: 'Kanit-Regular',
        fontSize: 16,
        color: colors.neutral[600],
        textAlign: 'center',
        marginBottom: 32,
        maxWidth: 300,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
        maxWidth: 400,
    },
    textInput: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: colors.neutral[300],
        borderRadius: 12,
        paddingHorizontal: 16,
        fontFamily: 'Kanit-Regular',
        fontSize: 16,
        color: colors.neutral[900],
        backgroundColor: '#FFFFFF',
    },
    searchButton: {
        width: 50,
        height: 50,
        backgroundColor: colors.primary[500],
        borderRadius: 12,
        marginLeft: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEE2E2',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        maxWidth: 400,
        width: '100%',
    },
    errorText: {
        fontFamily: 'Kanit-Regular',
        fontSize: 14,
        color: '#DC2626',
        flex: 1,
    },
    cameraModeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: colors.primary[50],
        borderRadius: 12,
    },
    cameraModeButtonText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: colors.primary[600],
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    overlayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    closeButtonOverlay: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlayTitle: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 20,
        color: '#FFFFFF',
    },
    manualModeOverlayBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanGuideContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanGuide: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#FFFFFF',
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 12,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    scanningIndicator: {
        alignItems: 'center',
    },
    scanningText: {
        fontFamily: 'Kanit-Medium',
        fontSize: 16,
        color: '#FFFFFF',
        marginTop: 12,
    },
    scanHint: {
        fontFamily: 'Kanit-Regular',
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 24,
    },
    resultOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    resultScrollView: {
        flex: 1,
        width: '100%',
    },
    resultScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    resultCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
    },
    errorIconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontFamily: 'Kanit-Bold',
        fontSize: 22,
        color: colors.neutral[900],
        textAlign: 'center',
    },
    errorMessage: {
        fontFamily: 'Kanit-Regular',
        fontSize: 16,
        color: colors.neutral[600],
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 24,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 24,
        paddingVertical: 14,
        backgroundColor: colors.primary[500],
        borderRadius: 12,
    },
    retryButtonText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignSelf: 'center',
        marginBottom: 20,
    },
    statusText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
    },
    customerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    customerAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    customerInitial: {
        fontFamily: 'Kanit-Bold',
        fontSize: 24,
        color: colors.primary[600],
    },
    customerInfo: {
        flex: 1,
    },
    customerName: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 20,
        color: colors.neutral[900],
    },
    customerPhone: {
        fontFamily: 'Kanit-Regular',
        fontSize: 15,
        color: colors.neutral[500],
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral[200],
        marginVertical: 20,
    },
    detailsSection: {
        gap: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontFamily: 'Kanit-Regular',
        fontSize: 13,
        color: colors.neutral[500],
    },
    detailValue: {
        fontFamily: 'Kanit-Medium',
        fontSize: 16,
        color: colors.neutral[900],
        marginTop: 2,
    },
    detailSubValue: {
        fontFamily: 'Kanit-Regular',
        fontSize: 14,
        color: colors.neutral[500],
        marginTop: 2,
    },
    priceValue: {
        fontFamily: 'Kanit-Bold',
        fontSize: 20,
        color: colors.primary[600],
        marginTop: 2,
    },
    actionsSection: {
        gap: 12,
    },
    checkInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        backgroundColor: '#16A34A',
        borderRadius: 14,
    },
    checkInButtonText: {
        fontFamily: 'Kanit-Bold',
        fontSize: 18,
        color: '#FFFFFF',
    },
    noShowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        backgroundColor: '#FEF2F2',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    noShowButtonText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: '#DC2626',
    },
    completedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        backgroundColor: '#DCFCE7',
        borderRadius: 14,
    },
    completedText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: '#16A34A',
    },
    cancelledBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        backgroundColor: '#FEE2E2',
        borderRadius: 14,
    },
    cancelledText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: '#DC2626',
    },
    noShowBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        backgroundColor: '#F3E8FF',
        borderRadius: 14,
    },
    noShowBannerText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: '#9333EA',
    },
    bookingsCountText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: colors.neutral[700],
        marginBottom: 16,
        textAlign: 'center',
    },
    bookingCard: {
        marginBottom: 0,
    },
    bookingDetailsSection: {
        gap: 12,
        marginTop: 12,
        marginBottom: 12,
    },
    bookingActionsSection: {
        gap: 10,
        marginTop: 8,
    },
    bookingDivider: {
        height: 1,
        backgroundColor: colors.neutral[200],
        marginVertical: 16,
    },
    scanAgainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        backgroundColor: colors.primary[50],
        borderRadius: 14,
        marginTop: 16,
    },
    scanAgainButtonText: {
        fontFamily: 'Kanit-SemiBold',
        fontSize: 16,
        color: colors.primary[600],
    },
});
