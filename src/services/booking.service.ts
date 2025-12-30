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
        return response.data;
    },

    async createCapacityBooking(payload: {
        facilityId: string;
        businessId?: string;
        date: string;
        startTime: string;
        endTime: string;
        customerName: string;
        customerPhone: string;
        price?: number;
        status?: string;
        quantity?: number;
    }): Promise<Booking | null> {
        // Payload Mapping: 
        // 1. Combine date + time -> entryTime/exitTime (ISO)
        // 2. Map fields to API expectations

        // Construct Local Date Object then convert to ISO (UTC)
        // Note: new Date('YYYY-MM-DDTHH:mm') uses local timezone
        const entryTime = new Date(`${payload.date}T${payload.startTime}:00`).toISOString();
        let exitTimeStr = payload.endTime;
        if (exitTimeStr.length === 5) exitTimeStr += ':00';
        const exitTime = new Date(`${payload.date}T${exitTimeStr}`).toISOString();

        const apiPayload = {
            facilityId: payload.facilityId,
            entryTime: entryTime,
            exitTime: exitTime,
            customerName: payload.customerName,
            customerPhone: payload.customerPhone,
            totalPrice: payload.price, // Map price to totalPrice
            status: payload.status
        };

        const response = await apiService.post<Booking>('/api/owner/capacity-bookings/create', apiPayload);

        if (response.error) {
            console.error('Error creating capacity booking:', response.error);
            throw new Error(response.error);
        }

        return response.data;
    },


    async getCapacityBookings(
        dateFrom: string, // ISO string
        dateTo: string, // ISO string
        businessId?: string
    ): Promise<Booking[]> {
        let query = `/api/owner/capacity-bookings?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
        if (businessId) query += `&businessId=${businessId}`;

        const response = await apiService.get<{ items: any[] }>(query);

        if (response.error) {
            console.error('Error fetching capacity bookings:', response.error);
            return [];
        }

        // Normalize to Booking interface
        return (response.data?.items || []).map(item => {
            const start = new Date(item.entryTime);
            const end = new Date(item.exitTime);
            // Format YYYY-MM-DD
            const dateStr = start.toISOString().split('T')[0];
            // Format HH:mm
            const startTimeStr = start.toISOString().split('T')[1].substring(0, 5); // Assumes UTC ISO, might need local conversion if UI expects local string
            const endTimeStr = end.toISOString().split('T')[1].substring(0, 5);

            // NOTE: Converting UTC ISO time '10:00Z' to Local Time String for UI?
            // The UI uses date string comparisons. If API returns UTC, we should probably keep as ISO or convert to local.
            // But existing code uses `parseISO(booking.startTime)` which handles full ISO string fine.
            // If `booking.startTime` is strictly HH:mm in some places, it might break.
            // Let's check existing `getBookings`. It maps directly.

            // However, `booking.startTime` in `Booking` interface seems to serve as both Full ISO sometimes OR HH:mm?
            // Let's use Full ISO from entryTime/exitTime as startTime/endTime to be safe and consistent with modern app.
            // BUT wait, existing getBookings returns `startTime` (ISO) too?
            // Let's assume full ISO is best.

            return {
                id: item.id,
                courtId: item.facilityId,
                date: dateStr,
                timeSlotStart: item.entryTime, // Use full ISO
                timeSlotEnd: item.exitTime,     // Use full ISO
                customerName: item.customerName,
                customerPhone: item.customerPhone,
                status: item.status,
                totalPrice: item.totalPrice, // Map price to totalPrice
                paymentStatus: 'PENDING', // Default
                // Add specific flag
                isCapacity: true,
                capacityBookingId: item.capacityBookingId
            } as any; // Cast as any if some fields missing from strict Booking type
        });
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
