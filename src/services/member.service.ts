import { apiService } from './api.service';

export interface Member {
    id: string;
    name: string | null;
    phone: string | null;
    totalBookings?: number;
    bookingsPerWeek?: number;
    favoriteSport?: string;
    mostVisitedBusiness?: string;
    totalSpent?: number;
    firstBookingDate?: string;
    lastBookingDate?: string;
}

export interface MemberDetail {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    createdAt: string;
    lastBookingAt: string | null;
}

export interface MemberBooking {
    id: string;
    facilityName: string;
    businessName: string;
    startTime: string;
    endTime: string;
    status: string;
    totalPrice: number;
    createdAt: string;
    confirmedAt: string | null;
    cancelledAt: string | null;
    notes: string | null;
}

export interface MemberStatistics {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    noShowBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    totalSpent: number;
    averageBookingValue: number;
    totalHours: number;
    mostVisitedFacility: string;
}

export interface MembersResponse {
    success: boolean;
    members: Member[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    businesses: { id: string; name: string }[];
}

export interface MemberDetailResponse {
    success: boolean;
    member: MemberDetail;
    statistics: MemberStatistics;
    bookingHistory: MemberBooking[];
}

export const memberService = {
    async getMembers(params: {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        search?: string;
        businessId?: string;
    }): Promise<MembersResponse> {
        const queryParams = new URLSearchParams({
            page: (params.page || 1).toString(),
            limit: (params.limit || 10).toString(),
            sortBy: params.sortBy || 'name',
            sortOrder: params.sortOrder || 'asc',
            search: params.search || '',
        });

        if (params.businessId) {
            queryParams.append('businessId', params.businessId);
        }

        const response = await apiService.get<MembersResponse>(
            `/api/court-owner/members?${queryParams.toString()}`
        );

        if (response.error) {
            console.error('Error fetching members:', response.error);
            return {
                success: false,
                members: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
                businesses: [],
            };
        }

        return response.data || {
            success: false,
            members: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
            businesses: [],
        };
    },

    async getMemberDetail(memberId: string): Promise<MemberDetailResponse | null> {
        const response = await apiService.get<MemberDetailResponse>(
            `/api/court-owner/members/${memberId}`
        );

        if (response.error) {
            console.error('Error fetching member detail:', response.error);
            return null;
        }

        return response.data || null;
    },
};
