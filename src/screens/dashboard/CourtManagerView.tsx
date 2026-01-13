import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts, spacing, borderRadius, fontSize } from '../../theme/tokens';
import { courtService } from '../../services/court.service';
import { Court } from '../../types/court';
import { SportFilterTabs } from '../../components/common/SportFilterTabs';

interface CourtManagerViewProps {
    businessId?: string | null;
}

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

// Helper to safely get sport type from court object
const getCourtSportType = (court: Court): string | null => {
    const c = court as any;
    if (c.sportTypeIds && Array.isArray(c.sportTypeIds) && c.sportTypeIds.length > 0) {
        const first = c.sportTypeIds[0];
        if (typeof first === 'string') return first;
        if (typeof first === 'object' && first !== null) return (first as any).name || (first as any).id || null;
    }
    if (c.sports && Array.isArray(c.sports) && c.sports.length > 0) {
        const first = c.sports[0];
        if (typeof first === 'string') return first;
        if (typeof first === 'object' && first !== null) return (first as any).name || (first as any).id || null;
    }
    if (c.sportType) {
        if (typeof c.sportType === 'string') return c.sportType;
        if (typeof c.sportType === 'object' && c.sportType !== null) return (c.sportType as any).name || (c.sportType as any).id || null;
    }
    return null;
};

// Helper to check court capacity
const getCourtCapacity = (court: Court): number => {
    // Check various fields where capacity might be stored
    const c = court as any;
    if (c.maximumCapacity) return Number(c.maximumCapacity);
    if (c.capacity) return Number(c.capacity);
    if (c.maxPlayers) return Number(c.maxPlayers);
    return 1; // Default to 1 (Slot booking)
};

export const CourtManagerView = ({ businessId }: CourtManagerViewProps) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [courts, setCourts] = useState<Court[]>([]);
    const [filteredCourts, setFilteredCourts] = useState<Court[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>('ALL');
    const [availableSports, setAvailableSports] = useState<string[]>([]);
    const [managementMode, setManagementMode] = useState<'SLOT' | 'CAPACITY'>('SLOT');

    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    // iPhone/Mobile Portrait (< 600) -> 1 column
    // Tablet Portrait -> 2 columns
    // Landscape -> 3 columns
    const numColumns = isLandscape ? 3 : (width < 600 ? 1 : 2);

    // Edit Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [editForm, setEditForm] = useState({
        openingHour: '',
        closingHour: '',
        hourlyRate: '',
    });
    const [saving, setSaving] = useState(false);

    const loadCourts = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch courts and facilities
            const [courtsData, facilitiesData] = await Promise.all([
                courtService.getAllOwnerCourts(),
                courtService.getCapacityFacilities()
            ]);
            let businessCourts = [...courtsData, ...facilitiesData];
            if (businessId) {
                businessCourts = businessCourts.filter(c => c.businessId === businessId);
            }

            // Filter only approved courts
            businessCourts = businessCourts.filter(c => !c.approvalStatus || c.approvalStatus === 'approved');

            setCourts(businessCourts);

            // Extract available sports
            const sportsSet = new Set<string>();
            businessCourts.forEach(c => {
                const sport = getCourtSportType(c);
                if (sport) sportsSet.add(sport);
            });
            setAvailableSports(Array.from(sportsSet));

        } catch (error) {
            console.error('Failed to load courts:', error);
            Alert.alert('Error', 'ไม่สามารถโหลดข้อมูลสนามได้');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [businessId]);

    useEffect(() => {
        loadCourts();
    }, [loadCourts]);

    useEffect(() => {
        let result = courts;

        // 1. Filter by Management Mode (Slot vs Capacity)
        if (managementMode === 'SLOT') {
            result = result.filter(c => getCourtCapacity(c) <= 1);
        } else {
            result = result.filter(c => getCourtCapacity(c) > 1);
        }

        // 2. Filter by Sport
        if (selectedSport !== 'ALL') {
            result = result.filter(c => {
                const sport = getCourtSportType(c);
                return sport === selectedSport;
            });
        }

        setFilteredCourts(result);
    }, [selectedSport, courts, managementMode]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadCourts();
    };

    const handleEditCourt = (court: Court) => {
        setEditingCourt(court);
        setEditForm({
            openingHour: court.openingHour || '06:00',
            closingHour: court.closingHour || '00:00',
            hourlyRate: court.hourlyRate ? court.hourlyRate.toString() : '',
        });
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!editingCourt) return;

        // Basic validation
        if (!editForm.openingHour || !editForm.closingHour || !editForm.hourlyRate) {
            Alert.alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        // Validate time format HH:mm
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(editForm.openingHour) || !timeRegex.test(editForm.closingHour)) {
            Alert.alert('รูปแบบเวลาไม่ถูกต้อง (HH:mm)');
            return;
        }

        setSaving(true);
        try {
            const updated = await courtService.updateCourt(editingCourt.id, {
                openingHour: editForm.openingHour,
                closingHour: editForm.closingHour,
                hourlyRate: Number(editForm.hourlyRate),
            });

            if (updated) {
                Alert.alert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว');
                setEditModalVisible(false);
                loadCourts(); // Reload list
            } else {
                Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
            }
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('ผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setSaving(false);
        }
    };

    const renderCourtItem = ({ item }: { item: Court }) => {
        const sportId = getCourtSportType(item);
        const sportLabel = sportId ? getSportName(sportId) : 'N/A';

        return (
            <View style={styles.courtCard}>
                <View style={styles.courtHeader}>
                    <View style={styles.courtInfo}>
                        <Text style={styles.courtName}>{item.name}</Text>
                        <View style={styles.sportBadge}>
                            <Text style={styles.sportBadgeText}>{sportLabel}</Text>
                        </View>
                    </View>
                    {/* Hide Edit button for capacity bookings for now as they have different update logic */}
                    {getCourtCapacity(item) <= 1 && (
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleEditCourt(item)}
                        >
                            <MaterialCommunityIcons name="pencil" size={18} color={colors.primary.main} />
                            <Text style={styles.editButtonText}>แก้ไข</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.courtDetails}>
                    <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color={colors.neutral[500]} />
                        <Text style={styles.detailValue} numberOfLines={1}>
                            {item.openingHour || '06:00'}-{item.closingHour || '00:00'}
                        </Text>
                    </View>
                    <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="cash" size={16} color={colors.success} />
                        <Text style={[styles.detailValue, { color: colors.success }]} numberOfLines={1}>
                            ฿{item.hourlyRate?.toLocaleString() || '-'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>จัดการสนาม</Text>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[
                                styles.toggleButton,
                                managementMode === 'SLOT' && styles.toggleButtonActive
                            ]}
                            onPress={() => setManagementMode('SLOT')}
                        >
                            <MaterialCommunityIcons
                                name="grid"
                                size={20}
                                color={managementMode === 'SLOT' ? colors.white : colors.neutral[500]}
                            />
                            {managementMode === 'SLOT' && (
                                <Text style={styles.toggleTextActive}>รายสนาม</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.toggleButton,
                                managementMode === 'CAPACITY' && styles.toggleButtonActive
                            ]}
                            onPress={() => setManagementMode('CAPACITY')}
                        >
                            <MaterialCommunityIcons
                                name="account-group"
                                size={20}
                                color={managementMode === 'CAPACITY' ? colors.white : colors.neutral[500]}
                            />
                            {managementMode === 'CAPACITY' && (
                                <Text style={styles.toggleTextActive}>ระบุจำนวน</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.headerSubtitle}>ตั้งค่าเวลาเปิด-ปิด และราคา ({filteredCourts.length} สนาม)</Text>
            </View>

            {/* Loading / List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary.main} />
                    <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredCourts}
                    renderItem={renderCourtItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    key={numColumns} // Force re-render when columns change
                    numColumns={numColumns}
                    columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary.main]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="stadium-variant" size={48} color={colors.neutral[300]} />
                            <Text style={styles.emptyText}>ไม่พบข้อมูลสนาม</Text>
                        </View>
                    }
                />
            )}

            {/* Sport Filter Tabs - Sticky Bottom */}
            <SportFilterTabs
                sports={['ALL', ...availableSports].filter(sport => {
                    if (sport === 'ALL') return true;

                    // Filter available sports based on current mode
                    if (managementMode === 'SLOT') {
                        return courts.some(c => getCourtCapacity(c) <= 1 && getCourtSportType(c) === sport);
                    } else {
                        return courts.some(c => getCourtCapacity(c) > 1 && getCourtSportType(c) === sport);
                    }
                })}
                selectedSport={selectedSport}
                onSelectSport={setSelectedSport}
            />

            {/* Edit Modal */}
            <Modal
                visible={editModalVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setEditModalVisible(false)}
                supportedOrientations={['portrait', 'landscape']}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>แก้ไขข้อมูลสนาม</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.neutral[500]} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.modalCourtName}>{editingCourt?.name}</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>เวลาเปิด (HH:mm)</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.openingHour}
                                        onChangeText={(text) => setEditForm({ ...editForm, openingHour: text })}
                                        placeholder="06:00"
                                        keyboardType="numbers-and-punctuation"
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>เวลาปิด (HH:mm)</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.closingHour}
                                        onChangeText={(text) => setEditForm({ ...editForm, closingHour: text })}
                                        placeholder="00:00"
                                        keyboardType="numbers-and-punctuation"
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>ราคาต่อชั่วโมง (บาท)</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.hourlyRate}
                                        onChangeText={(text) => setEditForm({ ...editForm, hourlyRate: text })}
                                        placeholder="0"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setEditModalVisible(false)}
                                disabled={saving}
                            >
                                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={handleSaveEdit}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <Text style={styles.saveButtonText}>บันทึก</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
        marginBottom: spacing.md,
        paddingTop: spacing.lg,
    },
    headerTitle: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: colors.neutral[900],
    },
    headerSubtitle: {
        fontFamily: fonts.regular,
        fontSize: fontSize.sm,
        color: colors.neutral[500],
        marginTop: 4,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: borderRadius.full,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: borderRadius.full,
        gap: 6,
    },
    toggleButtonActive: {
        backgroundColor: colors.primary.main,
    },
    toggleTextActive: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.sm,
        color: colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontFamily: fonts.regular,
        fontSize: fontSize.md,
        color: colors.neutral[500],
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: spacing.md,
        fontFamily: fonts.regular,
        fontSize: fontSize.md,
        color: colors.neutral[400],
    },
    listContent: {
        paddingBottom: 150, // Increase space to scroll above sticky filter bar
        paddingHorizontal: 2, // Tiny padding to prevent shadow cutoff
    },
    columnWrapper: {
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    courtCard: {
        flex: 1, // Allow card to grow to fill column width
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    courtHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    courtInfo: {
        flex: 1,
    },
    courtName: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.lg,
        color: colors.neutral[900],
        marginBottom: 4,
    },
    sportBadge: {
        backgroundColor: colors.primary[50],
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
    },
    sportBadgeText: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: colors.primary.main,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary[50],
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: borderRadius.md,
        gap: 4,
    },
    editButtonText: {
        fontFamily: fonts.medium,
        fontSize: fontSize.sm,
        color: colors.primary.main,
    },
    courtDetails: {
        flexDirection: 'column',
        gap: 4,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailLabel: {
        // remove, simpler layout for grid
        display: 'none',
    },
    detailValue: {
        fontFamily: fonts.medium,
        fontSize: fontSize.sm, // Smaller font for grid
        color: colors.neutral[800],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontFamily: fonts.bold,
        fontSize: fontSize.xl,
        color: colors.neutral[900],
    },
    modalBody: {
        marginBottom: spacing.lg,
    },
    modalCourtName: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.lg,
        color: colors.primary.main,
        marginBottom: spacing.lg,
    },
    formGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontFamily: fonts.medium,
        fontSize: fontSize.sm,
        color: colors.neutral[700],
        marginBottom: spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.neutral[300],
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.neutral[50],
    },
    input: {
        flex: 1,
        paddingVertical: spacing.sm,
        fontFamily: fonts.regular,
        fontSize: fontSize.md,
        color: colors.neutral[900],
    },
    modalFooter: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    button: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: colors.neutral[100],
    },
    cancelButtonText: {
        fontFamily: fonts.medium,
        color: colors.neutral[600],
        fontSize: fontSize.md,
    },
    saveButton: {
        backgroundColor: 'rgba(2, 38, 99, 0.9)', // Deep Blue
    },
    saveButtonText: {
        fontFamily: fonts.semiBold,
        color: colors.white,
        fontSize: fontSize.md,
    },
});
