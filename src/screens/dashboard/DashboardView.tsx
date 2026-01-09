import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, fontSize, borderRadius, fonts } from '../../theme/tokens';
import { analyticsService, AnalyticsSummary, AnalyticsByStatus, PeakHour } from '../../services/analytics.service';

interface DashboardViewProps {
    businessId: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const DashboardView = ({ businessId }: DashboardViewProps) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [byStatus, setByStatus] = useState<AnalyticsByStatus | null>(null);
    const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            setError(null);

            // Get date range for last 30 days
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
            const dateTo = today.toISOString().split('T')[0];

            const [analyticsResult, peakHoursResult] = await Promise.all([
                analyticsService.getAnalytics(dateFrom, dateTo, businessId),
                analyticsService.getPeakHours(dateFrom, dateTo, businessId),
            ]);

            if (analyticsResult.error) {
                setError(analyticsResult.error);
                return;
            }

            if (analyticsResult.data) {
                setSummary(analyticsResult.data.summary);
                setByStatus(analyticsResult.data.byStatus);
            }

            if (peakHoursResult.data) {
                setPeakHours(peakHoursResult.data);
            }
        } catch (err) {
            setError('ไม่สามารถโหลดข้อมูลได้');
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [businessId]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('th-TH').format(num);
    };

    const getTop3PeakHours = () => {
        if (!peakHours || !Array.isArray(peakHours)) {
            return [];
        }
        return peakHours
            .filter(h => h.bookingCount > 0)
            .slice(0, 3)
            .map(h => ({
                ...h,
                label: `${h.hour.toString().padStart(2, '0')}:00 - ${(h.hour + 1).toString().padStart(2, '0')}:00`,
            }));
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    const topPeakHours = getTop3PeakHours();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary.main]}
                    tintColor={colors.primary.main}
                />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>ภาพรวมธุรกิจ</Text>
                <Text style={styles.headerSubtitle}>ข้อมูล 30 วันที่ผ่านมา</Text>
            </View>

            {/* Summary Cards Row */}
            <View style={styles.summaryRow}>
                {/* Total Revenue Card */}
                <View style={[styles.summaryCard, styles.revenueCard]}>
                    <View style={styles.cardIconWrapper}>
                        <MaterialCommunityIcons name="cash-multiple" size={28} color={colors.success} />
                    </View>
                    <Text style={styles.cardLabel}>รายได้รวม</Text>
                    <Text style={[styles.cardValue, styles.revenueValue]}>
                        {formatCurrency(summary?.totalRevenue || 0)}
                    </Text>
                    <Text style={styles.cardSubValue}>
                        เฉลี่ย {formatCurrency(summary?.avgPrice || 0)} / รายการ
                    </Text>
                </View>

                {/* Total Bookings Card */}
                <View style={[styles.summaryCard, styles.bookingsCard]}>
                    <View style={styles.cardIconWrapper}>
                        <MaterialCommunityIcons name="calendar-check" size={28} color={colors.primary.main} />
                    </View>
                    <Text style={styles.cardLabel}>การจองทั้งหมด</Text>
                    <Text style={[styles.cardValue, styles.bookingsValue]}>
                        {formatNumber(summary?.totalBookings || 0)}
                    </Text>
                    <Text style={styles.cardSubValue}>รายการ</Text>
                </View>

                {/* Completed Card */}
                <View style={[styles.summaryCard, styles.completedCard]}>
                    <View style={styles.cardIconWrapper}>
                        <MaterialCommunityIcons name="check-circle" size={28} color="#10B981" />
                    </View>
                    <Text style={styles.cardLabel}>ลูกค้ามาใช้บริการแล้ว</Text>
                    <Text style={[styles.cardValue, { color: '#10B981' }]}>
                        {formatNumber(summary?.completed || 0)}
                    </Text>
                    <Text style={styles.cardSubValue}>
                        {summary?.totalBookings ? Math.round((summary.completed / summary.totalBookings) * 100) : 0}%
                    </Text>
                </View>

                {/* No Show Card */}
                <View style={[styles.summaryCard, styles.noShowCard]}>
                    <View style={styles.cardIconWrapper}>
                        <MaterialCommunityIcons name="account-cancel" size={28} color={colors.error} />
                    </View>
                    <Text style={styles.cardLabel}>ไม่มาใช้บริการ</Text>
                    <Text style={[styles.cardValue, { color: colors.error }]}>
                        {formatNumber(summary?.noShow || 0)}
                    </Text>
                    <Text style={styles.cardSubValue}>
                        {summary?.totalBookings ? Math.round((summary.noShow / summary.totalBookings) * 100) : 0}%
                    </Text>
                </View>
            </View>

            {/* Second Row */}
            <View style={styles.secondRow}>
                {/* Status Breakdown */}
                <View style={styles.statusCard}>
                    <Text style={styles.sectionTitle}>สถานะการจอง</Text>
                    <View style={styles.statusGrid}>
                        <View style={styles.statusItem}>
                            <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.statusLabel}>รอยืนยัน</Text>
                            <Text style={styles.statusValue}>{byStatus?.PENDING || 0}</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <View style={[styles.statusDot, { backgroundColor: colors.primary.main }]} />
                            <Text style={styles.statusLabel}>ยืนยันแล้ว</Text>
                            <Text style={styles.statusValue}>{byStatus?.CONFIRMED || 0}</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.statusLabel}>ลูกค้ามาใช้บริการแล้ว</Text>
                            <Text style={styles.statusValue}>{byStatus?.COMPLETED || 0}</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <View style={[styles.statusDot, { backgroundColor: colors.neutral[400] }]} />
                            <Text style={styles.statusLabel}>ยกเลิก</Text>
                            <Text style={styles.statusValue}>{byStatus?.CANCELLED || 0}</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
                            <Text style={styles.statusLabel}>ไม่มา</Text>
                            <Text style={styles.statusValue}>{byStatus?.NO_SHOW || 0}</Text>
                        </View>
                    </View>
                </View>

                {/* Peak Hours */}
                <View style={styles.peakHoursCard}>
                    <Text style={styles.sectionTitle}>ช่วงเวลายอดนิยม</Text>
                    {topPeakHours.length > 0 ? (
                        <View style={styles.peakHoursList}>
                            {topPeakHours.map((peak, index) => (
                                <View key={peak.hour} style={styles.peakHourItem}>
                                    <View style={[styles.peakRank, index === 0 && styles.peakRankTop]}>
                                        <Text style={[styles.peakRankText, index === 0 && styles.peakRankTextTop]}>
                                            {index + 1}
                                        </Text>
                                    </View>
                                    <View style={styles.peakHourInfo}>
                                        <Text style={styles.peakHourLabel}>{peak.label}</Text>
                                        <Text style={styles.peakHourCount}>
                                            {peak.bookingCount} การจอง
                                        </Text>
                                    </View>
                                    <View style={styles.peakHourBar}>
                                        <View
                                            style={[
                                                styles.peakHourBarFill,
                                                {
                                                    width: `${Math.min((peak.bookingCount / (topPeakHours[0]?.bookingCount || 1)) * 100, 100)}%`,
                                                    backgroundColor: index === 0 ? colors.primary.main : colors.primary[300],
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyPeakHours}>
                            <MaterialCommunityIcons name="clock-outline" size={32} color={colors.neutral[300]} />
                            <Text style={styles.emptyText}>ยังไม่มีข้อมูล</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
                <View style={styles.quickStatItem}>
                    <MaterialCommunityIcons name="trending-up" size={20} color={colors.success} />
                    <Text style={styles.quickStatLabel}>อัตราการยืนยัน</Text>
                    <Text style={styles.quickStatValue}>
                        {summary?.totalBookings
                            ? Math.round((summary.confirmed / summary.totalBookings) * 100)
                            : 0}%
                    </Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                    <MaterialCommunityIcons name="account-check" size={20} color={colors.primary.main} />
                    <Text style={styles.quickStatLabel}>อัตราเข้าใช้บริการ</Text>
                    <Text style={styles.quickStatValue}>
                        {summary?.totalBookings
                            ? Math.round((summary.completed / summary.totalBookings) * 100)
                            : 0}%
                    </Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                    <MaterialCommunityIcons name="cancel" size={20} color={colors.error} />
                    <Text style={styles.quickStatLabel}>อัตราการยกเลิก</Text>
                    <Text style={styles.quickStatValue}>
                        {summary?.totalBookings
                            ? Math.round(((summary.cancelled + summary.noShow) / summary.totalBookings) * 100)
                            : 0}%
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    contentContainer: {
        padding: spacing.lg,
        paddingLeft: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
    },
    loadingText: {
        fontFamily: fonts.regular,
        fontSize: fontSize.md,
        color: colors.neutral[500],
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
    },
    errorText: {
        fontFamily: fonts.regular,
        fontSize: fontSize.md,
        color: colors.error,
    },
    header: {
        marginBottom: spacing.lg,
    },
    headerTitle: {
        fontFamily: fonts.semiBold, // Use SemiBold instead of Bold to match menu
        fontSize: 28,
        color: colors.neutral[900],
    },
    headerSubtitle: {
        fontFamily: fonts.regular,
        fontSize: fontSize.md,
        color: colors.neutral[500],
        marginTop: 2,
    },
    summaryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap', // Allow wrapping for mobile
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    summaryCard: {
        flex: 1, // Still allow growing
        minWidth: '45%', // Force 2 columns on mobile
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    revenueCard: {
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
    },
    bookingsCard: {
        borderLeftWidth: 4,
        borderLeftColor: colors.primary.main,
    },
    completedCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
    },
    noShowCard: {
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    cardIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.neutral[50],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    cardLabel: {
        fontFamily: fonts.regular,
        fontSize: fontSize.sm,
        color: colors.neutral[500],
    },
    cardValue: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: colors.neutral[900],
        marginTop: 4,
    },
    revenueValue: {
        color: colors.success,
    },
    bookingsValue: {
        color: colors.primary.main,
    },
    cardSubValue: {
        fontFamily: fonts.regular,
        fontSize: fontSize.xs,
        color: colors.neutral[400],
        marginTop: 2,
    },
    secondRow: {
        flexDirection: 'row',
        flexWrap: 'wrap', // Allow wrapping
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    statusCard: {
        flex: 1,
        minWidth: 300, // Stack on small screens
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    sectionTitle: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.lg,
        color: colors.neutral[800],
        marginBottom: spacing.md,
    },
    statusGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minWidth: '45%',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusLabel: {
        fontFamily: fonts.regular,
        fontSize: fontSize.sm,
        color: colors.neutral[600],
        flex: 1,
    },
    statusValue: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.md,
        color: colors.neutral[800],
    },
    peakHoursCard: {
        flex: 1,
        minWidth: 300, // Stack on small screens
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    peakHoursList: {
        gap: spacing.md,
    },
    peakHourItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    peakRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.neutral[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    peakRankTop: {
        backgroundColor: colors.primary[100],
    },
    peakRankText: {
        fontFamily: fonts.semiBold,
        fontSize: fontSize.sm,
        color: colors.neutral[600],
    },
    peakRankTextTop: {
        color: colors.primary.main,
    },
    peakHourInfo: {
        flex: 1,
    },
    peakHourLabel: {
        fontFamily: fonts.medium,
        fontSize: fontSize.md,
        color: colors.neutral[800],
    },
    peakHourCount: {
        fontFamily: fonts.regular,
        fontSize: fontSize.xs,
        color: colors.neutral[500],
    },
    peakHourBar: {
        width: 80,
        height: 8,
        backgroundColor: colors.neutral[100],
        borderRadius: 4,
        overflow: 'hidden',
    },
    peakHourBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    emptyPeakHours: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: fontSize.sm,
        color: colors.neutral[400],
    },
    quickStats: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    quickStatItem: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.xs,
    },
    quickStatLabel: {
        fontFamily: fonts.regular,
        fontSize: fontSize.sm,
        color: colors.neutral[500],
    },
    quickStatValue: {
        fontFamily: fonts.bold,
        fontSize: fontSize.xl,
        color: colors.neutral[800],
    },
    quickStatDivider: {
        width: 1,
        backgroundColor: colors.neutral[200],
        marginHorizontal: spacing.md,
    },
});
