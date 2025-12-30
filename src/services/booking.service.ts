import { apiService } from './api.service';
import { Booking } from '../types/booking';

export const bookingService = {
    async getBookings(
        dateFrom: string, // ISO string
        dateTo: string,   // ISO string
        businessId?: string,
        courtId?: string,
        limit: number = 200
    ): Promise<Booking[]> {
        let query = `/api/owner/bookings?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;

        if (businessId) {
            // API doesn't support businessId directly, but filters by owner's context
        }

        if (courtId) {
            query += `&courtId=${courtId}`;
        }

        // Add limit
        query += `&limit=${limit}`;

        const response = await apiService.get<{ items: Booking[], hasMore: boolean }>(query);

        if (response.error) {
            console.error('Error fetching bookings:', response.error);
            return [];
        }

        return response.data?.items || [];
    },

    async getBookingDetail(id: string): Promise<Booking | null> {
        const response = await apiService.get<Booking>(`/api/owner/bookings/${id}`);

        if (response.error) {
            console.error('Error fetching booking detail:', response.error);
            return null;
        }

        return response.data;
    },

    async createBooking(payload: {
        courtId: string;
        date: string;
        startTime: string;
        endTime: string;
        customerName: string;
        customerPhone: string;
        price?: number;
        status?: string;
    }): Promise<Booking | null> {
        const response = await apiService.post<Booking>('/api/owner/bookings', payload);

        if (response.error) {
            console.error('Error creating booking:', response.error);
            throw new Error(response.error);
        }

        return response.data;
    },

    async updateBooking(id: string, payload: {
        courtId?: string;
        date?: string;
        startTime?: string;
        endTime?: string;
        customerName?: string;
        customerPhone?: string;
        price?: number;
        status?: string;
    }): Promise<Booking | null> {
        const response = await apiService.put<Booking>(`/api/owner/bookings/${id}`, payload);

        if (response.error) {
            console.error('Error updating booking:', response.error);
            throw new Error(response.error);
        }

        return response.data;
    }
};
