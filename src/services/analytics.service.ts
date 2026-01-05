import { apiService } from './api.service';

export interface AnalyticsSummary {
    totalBookings: number;
    confirmed: number;
    noShow: number;
    cancelled: number;
    completed: number;
    totalRevenue: number;
    avgPrice: number;
}

export interface AnalyticsByDate {
    date: string;
    count: number;
    revenue: number;
    statuses: {
        PENDING: number;
        CONFIRMED: number;
        NO_SHOW: number;
        CANCELLED: number;
        COMPLETED: number;
    };
}

export interface AnalyticsByStatus {
    PENDING: number;
    CONFIRMED: number;
    NO_SHOW: number;
    CANCELLED: number;
    COMPLETED: number;
}

export interface AnalyticsResponse {
    success: boolean;
    data: {
        period: {
            from: string;
            to: string;
            granularity: string;
        };
        summary: AnalyticsSummary;
        byDate: AnalyticsByDate[];
        byStatus: AnalyticsByStatus;
    };
    responseTime: string;
}

export interface PeakHour {
    hour: number;
    bookingCount: number;
    utilization: number;
}

export interface PeakHoursResponse {
    success: boolean;
    data: PeakHour[];
}

export const analyticsService = {
    async getAnalytics(
        dateFrom: string,
        dateTo: string,
        businessId?: string,
        courtId?: string,
        granularity: string = 'daily'
    ): Promise<{ data: AnalyticsResponse['data'] | null; error: string | null }> {
        let endpoint = `/api/owner/analytics?dateFrom=${dateFrom}&dateTo=${dateTo}&granularity=${granularity}`;
        if (businessId) {
            endpoint += `&businessId=${businessId}`;
        }
        if (courtId) {
            endpoint += `&courtId=${courtId}`;
        }

        const response = await apiService.get<AnalyticsResponse>(endpoint);

        if (response.error) {
            return { data: null, error: response.error };
        }

        return { data: response.data?.data || null, error: null };
    },

    async getPeakHours(
        dateFrom: string,
        dateTo: string,
        businessId?: string,
        courtId?: string
    ): Promise<{ data: PeakHour[] | null; error: string | null }> {
        let endpoint = `/api/owner/analytics/peak-hours?dateFrom=${dateFrom}&dateTo=${dateTo}`;
        if (businessId) {
            endpoint += `&businessId=${businessId}`;
        }
        if (courtId) {
            endpoint += `&courtId=${courtId}`;
        }

        const response = await apiService.get<PeakHoursResponse>(endpoint);

        if (response.error) {
            return { data: null, error: response.error };
        }

        return { data: response.data?.data || null, error: null };
    },
};
