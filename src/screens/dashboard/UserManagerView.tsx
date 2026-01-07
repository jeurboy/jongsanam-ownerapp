import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Modal,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts, spacing, borderRadius, fontSize } from '../../theme/tokens';
import { memberService, Member, MemberDetail, MemberStatistics, MemberBooking } from '../../services/member.service';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface UserManagerViewProps {
    businessId?: string | null;
}

export const UserManagerView = ({ businessId }: UserManagerViewProps) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const limit = 10;

    // Sorting & Search
    const [sortBy, setSortBy] = useState('totalBookings');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [selectedBusinessFilter, setSelectedBusinessFilter] = useState('');

    // Detail Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
    const [statistics, setStatistics] = useState<MemberStatistics | null>(null);
    const [bookingHistory, setBookingHistory] = useState<MemberBooking[]>([]);

    const fetchMembers = useCallback(async () => {
        try {
            const response = await memberService.getMembers({
                page,
                limit,
                sortBy,
                sortOrder,
                search,
                businessId: selectedBusinessFilter || businessId || undefined,
            });

            setMembers(response.members || []);
            setTotal(response.total || 0);
            setTotalPages(response.totalPages || 0);
        } catch (error) {
            console.error('Failed to fetch members:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, sortBy, sortOrder, search, selectedBusinessFilter, businessId]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMembers();
    };

    const handleSearch = () => {
        setSearch(searchInput);
        setPage(1);
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
        setPage(1);
    };

    const handleViewDetails = async (memberId: string) => {
        setLoadingDetail(true);
        setModalVisible(true);
        setSelectedMember(null);
        setStatistics(null);
        setBookingHistory([]);

        try {
            const response = await memberService.getMemberDetail(memberId);
            if (response) {
                setSelectedMember(response.member);
                setStatistics(response.statistics);
                setBookingHistory(response.bookingHistory);
            }
        } catch (error) {
            console.error('Failed to fetch member details:', error);
            setModalVisible(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        try {
            return format(parseISO(dateStr), 'd MMM yy', { locale: th });
        } catch {
            return '-';
        }
    };

    const formatDateTime = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        try {
            return format(parseISO(dateStr), 'd MMM yy HH:mm', { locale: th });
        } catch {
            return '-';
        }
    };

    const formatCurrency = (amount: number) => {
        return `฿${amount.toLocaleString()}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return { bg: '#DCFCE7', text: '#15803D' };
            case 'COMPLETED': return { bg: '#E0E7FF', text: '#3730A3' };
            case 'CANCELLED': return { bg: '#FEE2E2', text: '#B91C1C' };
            case 'PENDING': return { bg: '#FEF9C3', text: '#A16207' };
            case 'NO_SHOW': return { bg: '#FED7AA', text: '#C2410C' };
            default: return { bg: '#F3F4F6', text: '#374151' };
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'ยืนยันแล้ว';
            case 'COMPLETED': return 'เสร็จสิ้น';
            case 'CANCELLED': return 'ยกเลิก';
            case 'PENDING': return 'รอยืนยัน';
            case 'NO_SHOW': return 'ไม่มา';
            default: return status;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>จัดการสมาชิก</Text>
                <Text style={styles.subtitle}>รายชื่อลูกค้าที่เคยจองสนาม ({total} คน)</Text>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.neutral[400]} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาชื่อ, เบอร์โทร..."
                        placeholderTextColor={colors.neutral[400]}
                        value={searchInput}
                        onChangeText={setSearchInput}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Text style={styles.searchButtonText}>ค้นหา</Text>
                </TouchableOpacity>
            </View>


            {/* Sort Buttons */}
            <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>เรียงตาม:</Text>
                {[
                    { key: 'totalBookings', label: 'จำนวนจอง' },
                    { key: 'totalSpent', label: 'ยอดใช้จ่าย' },
                    { key: 'lastBookingDate', label: 'ล่าสุด' },
                ].map((item) => (
                    <TouchableOpacity
                        key={item.key}
                        style={[styles.sortButton, sortBy === item.key && styles.sortButtonActive]}
                        onPress={() => handleSort(item.key)}
                    >
                        <Text style={[styles.sortButtonText, sortBy === item.key && styles.sortButtonTextActive]}>
                            {item.label}
                        </Text>
                        {sortBy === item.key && (
                            <MaterialCommunityIcons
                                name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                                size={14}
                                color={colors.primary.main}
                            />
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Members List */}
            <ScrollView
                style={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {members.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="account-group-outline" size={64} color={colors.neutral[300]} />
                        <Text style={styles.emptyText}>{search ? 'ไม่พบสมาชิกที่ตรงกับการค้นหา' : 'ยังไม่มีสมาชิก'}</Text>
                    </View>
                ) : (
                    members.map((member) => (
                        <TouchableOpacity
                            key={member.id}
                            style={styles.memberCard}
                            onPress={() => handleViewDetails(member.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.memberHeader}>
                                <View style={styles.memberAvatar}>
                                    <Text style={styles.memberAvatarText}>{(member.name || 'U')[0].toUpperCase()}</Text>
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberName}>{member.name || 'ไม่มีชื่อ'}</Text>
                                    <Text style={styles.memberPhone}>{member.phone || '-'}</Text>
                                </View>
                                <View style={styles.memberBadge}>
                                    <Text style={styles.memberBadgeText}>{member.totalBookings || 0} ครั้ง</Text>
                                </View>
                            </View>

                            <View style={styles.memberStats}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>ครั้งแรก</Text>
                                    <Text style={styles.statValue}>{formatDate(member.firstBookingDate)}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>ล่าสุด</Text>
                                    <Text style={styles.statValue}>{formatDate(member.lastBookingDate)}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>ยอดรวม</Text>
                                    <Text style={[styles.statValue, styles.statValueGreen]}>{formatCurrency(member.totalSpent || 0)}</Text>
                                </View>
                            </View>

                            {(member.favoriteSport || member.mostVisitedBusiness) && (
                                <View style={styles.memberTags}>
                                    {member.favoriteSport && (
                                        <View style={styles.tag}>
                                            <Text style={styles.tagText}>{member.favoriteSport}</Text>
                                        </View>
                                    )}
                                    {member.mostVisitedBusiness && (
                                        <View style={[styles.tag, styles.tagSecondary]}>
                                            <Text style={[styles.tagText, styles.tagTextSecondary]}>{member.mostVisitedBusiness}</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    ))
                )}

                <View style={{ height: 80 }} />
            </ScrollView>

            {/* Fixed Pagination at Bottom */}
            {totalPages >= 1 && (
                <View style={styles.paginationFixed}>
                    <TouchableOpacity
                        style={[styles.navArrow, page === 1 && styles.navArrowDisabled]}
                        onPress={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <MaterialCommunityIcons name="chevron-left" size={24} color={page === 1 ? colors.neutral[300] : colors.neutral[600]} />
                    </TouchableOpacity>

                    <View style={styles.pageSwitcher}>
                        {(() => {
                            const pages: number[] = [];
                            const maxVisible = 5;
                            let start = Math.max(1, page - Math.floor(maxVisible / 2));
                            const end = Math.min(totalPages, start + maxVisible - 1);
                            start = Math.max(1, end - maxVisible + 1);

                            for (let i = start; i <= end; i++) {
                                pages.push(i);
                            }

                            return pages.map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.pageTab, p === page && styles.pageTabActive]}
                                    onPress={() => setPage(p)}
                                >
                                    <Text style={[styles.pageTabText, p === page && styles.pageTabTextActive]}>{p}</Text>
                                </TouchableOpacity>
                            ));
                        })()}
                    </View>

                    <TouchableOpacity
                        style={[styles.navArrow, page === totalPages && styles.navArrowDisabled]}
                        onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        <MaterialCommunityIcons name="chevron-right" size={24} color={page === totalPages ? colors.neutral[300] : colors.neutral[600]} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Member Detail Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
                supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>รายละเอียดสมาชิก</Text>
                            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.neutral[600]} />
                            </TouchableOpacity>
                        </View>

                        {loadingDetail ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color={colors.primary.main} />
                            </View>
                        ) : selectedMember && statistics ? (
                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                {/* Member Info */}
                                <View style={styles.detailAvatarRow}>
                                    <View style={styles.detailAvatar}>
                                        <Text style={styles.detailAvatarText}>{(selectedMember.name || 'U')[0].toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.detailInfo}>
                                        <Text style={styles.detailName}>{selectedMember.name || 'ไม่มีชื่อ'}</Text>
                                        <Text style={styles.detailPhone}>{selectedMember.phone || '-'}</Text>
                                    </View>
                                </View>

                                {/* Statistics */}
                                <View style={styles.statsGrid}>
                                    <View style={styles.statsCard}>
                                        <Text style={styles.statsCardValue}>{statistics.totalBookings}</Text>
                                        <Text style={styles.statsCardLabel}>จองทั้งหมด</Text>
                                    </View>
                                    <View style={styles.statsCard}>
                                        <Text style={[styles.statsCardValue, { color: colors.success }]}>{statistics.confirmedBookings}</Text>
                                        <Text style={styles.statsCardLabel}>ยืนยันแล้ว</Text>
                                    </View>
                                    <View style={styles.statsCard}>
                                        <Text style={[styles.statsCardValue, { color: colors.error }]}>{statistics.cancelledBookings}</Text>
                                        <Text style={styles.statsCardLabel}>ยกเลิก</Text>
                                    </View>
                                    <View style={styles.statsCard}>
                                        <Text style={[styles.statsCardValue, { color: colors.primary.main }]}>{formatCurrency(statistics.totalSpent)}</Text>
                                        <Text style={styles.statsCardLabel}>ยอดใช้จ่าย</Text>
                                    </View>
                                </View>

                                <View style={styles.statsRow}>
                                    <View style={styles.statsItem}>
                                        <Text style={styles.statsItemLabel}>ชั่วโมงรวม</Text>
                                        <Text style={styles.statsItemValue}>{statistics.totalHours} ชม.</Text>
                                    </View>
                                    <View style={styles.statsItem}>
                                        <Text style={styles.statsItemLabel}>สนามที่ใช้บ่อย</Text>
                                        <Text style={styles.statsItemValue} numberOfLines={1}>{statistics.mostVisitedFacility}</Text>
                                    </View>
                                </View>

                                {/* Booking History */}
                                <Text style={styles.historyTitle}>ประวัติการจอง</Text>
                                {bookingHistory.length === 0 ? (
                                    <Text style={styles.historyEmpty}>ไม่มีประวัติการจอง</Text>
                                ) : (
                                    bookingHistory.slice(0, 10).map((booking) => {
                                        const statusStyle = getStatusColor(booking.status);
                                        return (
                                            <View key={booking.id} style={styles.historyItem}>
                                                <View style={styles.historyItemHeader}>
                                                    <Text style={styles.historyFacility}>{booking.facilityName}</Text>
                                                    <View style={[styles.historyStatus, { backgroundColor: statusStyle.bg }]}>
                                                        <Text style={[styles.historyStatusText, { color: statusStyle.text }]}>{getStatusLabel(booking.status)}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.historyBusiness}>{booking.businessName}</Text>
                                                <View style={styles.historyItemFooter}>
                                                    <Text style={styles.historyDate}>{formatDateTime(booking.startTime)}</Text>
                                                    <Text style={styles.historyPrice}>{formatCurrency(booking.totalPrice)}</Text>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent', paddingLeft: 10, paddingRight: spacing.lg, paddingTop: spacing.lg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.neutral[500], marginTop: spacing.sm },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: spacing.lg, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)' },
    title: { fontFamily: fonts.bold, fontSize: 14, color: colors.neutral[900] },
    subtitle: { fontFamily: fonts.medium, fontSize: 11, color: colors.neutral[500], marginTop: -2 },
    searchContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: spacing.md, gap: spacing.sm },
    searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.neutral[900], paddingVertical: spacing.sm },
    searchButton: { backgroundColor: colors.primary.main, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg, justifyContent: 'center' },
    searchButtonText: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.white },
    filterContainer: { marginBottom: spacing.md },
    filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.white, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.neutral[200], marginRight: spacing.sm },
    filterChipActive: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
    filterChipText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.neutral[600] },
    filterChipTextActive: { color: colors.white },
    sortContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    sortLabel: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.neutral[500] },
    sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.md, backgroundColor: colors.neutral[100] },
    sortButtonActive: { backgroundColor: colors.primary.light + '20' },
    sortButtonText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.neutral[600] },
    sortButtonTextActive: { color: colors.primary.main },
    listContainer: { flex: 1 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyText: { fontFamily: fonts.regular, fontSize: fontSize.lg, color: colors.neutral[400], marginTop: spacing.md },
    memberCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.neutral[100] },
    memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary.light + '30', justifyContent: 'center', alignItems: 'center' },
    memberAvatarText: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.primary.main },
    memberInfo: { flex: 1, marginLeft: spacing.sm },
    memberName: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.neutral[900] },
    memberPhone: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.neutral[500] },
    memberBadge: { backgroundColor: colors.primary.main, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
    memberBadgeText: { fontFamily: fonts.semiBold, fontSize: fontSize.xs, color: colors.white },
    memberStats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingTop: spacing.sm },
    statItem: { alignItems: 'center' },
    statLabel: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.neutral[400] },
    statValue: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.neutral[700] },
    statValueGreen: { color: colors.success },
    memberTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
    tag: { backgroundColor: colors.primary.light + '15', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
    tagSecondary: { backgroundColor: colors.neutral[100] },
    tagText: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.primary.main },
    tagTextSecondary: { color: colors.neutral[600] },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
    paginationFixed: { position: 'absolute', bottom: 0, left: 40, right: spacing.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, backgroundColor: 'transparent' },
    navArrow: { padding: spacing.xs },
    navArrowDisabled: { opacity: 0.4 },
    pageSwitcher: { flexDirection: 'row', backgroundColor: colors.white, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200] },
    pageTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    pageTabActive: { backgroundColor: colors.primary.main },
    pageTabText: { fontFamily: fonts.medium, fontSize: 14, color: colors.neutral[500] },
    pageTabTextActive: { color: colors.white },
    pageButton: { padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    pageButtonDisabled: { opacity: 0.5 },
    pageNumberButton: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200], justifyContent: 'center', alignItems: 'center' },
    pageNumberButtonActive: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
    pageNumberText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.neutral[600] },
    pageNumberTextActive: { color: colors.white },
    pageText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.neutral[600] },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', flexDirection: 'row' },
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderBottomLeftRadius: borderRadius.xl, width: '100%', height: '100%', marginLeft: 'auto' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    modalTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.lg, color: colors.neutral[900] },
    modalCloseButton: { padding: spacing.xs },
    modalLoading: { padding: spacing.xxl, alignItems: 'center' },
    modalBody: { padding: spacing.lg },
    detailAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    detailAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary.light + '30', justifyContent: 'center', alignItems: 'center' },
    detailAvatarText: { fontFamily: fonts.bold, fontSize: 24, color: colors.primary.main },
    detailInfo: { marginLeft: spacing.md },
    detailName: { fontFamily: fonts.semiBold, fontSize: fontSize.xl, color: colors.neutral[900] },
    detailPhone: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.neutral[600] },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    statsCard: { flex: 1, minWidth: '45%', backgroundColor: colors.neutral[50], borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
    statsCardValue: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.neutral[900] },
    statsCardLabel: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.neutral[500], marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
    statsItem: { flex: 1 },
    statsItemLabel: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.neutral[400] },
    statsItemValue: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.neutral[900] },
    historyTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.neutral[900], marginBottom: spacing.md },
    historyEmpty: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.neutral[400], textAlign: 'center', paddingVertical: spacing.lg },
    historyItem: { backgroundColor: colors.neutral[50], borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
    historyItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyFacility: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.neutral[900], flex: 1 },
    historyStatus: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
    historyStatusText: { fontFamily: fonts.medium, fontSize: fontSize.xs },
    historyBusiness: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.neutral[500], marginTop: 2 },
    historyItemFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
    historyDate: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.neutral[500] },
    historyPrice: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.success },
});
