import { apiService } from './api.service';
import { Court } from '../types/court';

export const courtService = {
    async getCourts(businessId: string): Promise<Court[]> {
        // Using the unified owner/courts endpoint which likely supports filtering generally or just returns all
        // We can filter client side if needed, or if API supports it.
        // Based on ownerBookingService, getOwnerCourts fetches all.
        const response = await apiService.get<Court[]>(`/api/owner/courts`);

        if (response.error) {
            console.error('Error fetching courts:', response.error);
            return [];
        }

        // Filter for specific business if needed
        const allCourts = response.data || [];
        return allCourts.filter(c => c.businessId === businessId);
    },

    async getAllOwnerCourts(): Promise<Court[]> {
        const response = await apiService.get<Court[]>(`/api/owner/courts`);
        if (response.error) return [];
        return response.data || [];
    },

    async getCapacityFacilities(): Promise<Court[]> {
        const response = await apiService.get<any[]>('/api/owner/capacity-facilities');
        if (response.error) {
            console.error('Error fetching capacity facilities:', response.error);
            return [];
        }

        return response.data?.map(item => ({
            ...item,
            id: item.id,
            name: item.name,
            businessId: item.businessId,
            capacity: item.capacity || item.maxCapacity || 20,
            isCapacity: true, // Mark explicit endpoint source
            // Map standard court fields for display compatibility
            openingHour: item.openTime || item.openingHoursStart || '00:00',
            closingHour: item.closeTime || item.operatingHoursEnd || '23:59',
            hourlyRate: item.pricePerSlot || item.pricePerHour || 0,
            // Ensure sportTypeIds exists if logical
            sportTypeIds: item.sportTypeIds || (item.sportType ? [item.sportType] : [])
        })) || [];
    },
    async updateCourt(id: string, data: Partial<Court>): Promise<Court | null> {
        // Map frontend fields (openingHour/closingHour) to backend expected fields (openTime/closeTime)
        const payload: any = { ...data };
        if (data.openingHour) payload.openTime = data.openingHour;
        if (data.closingHour) payload.closeTime = data.closingHour;
        if (data.hourlyRate) payload.pricePerHour = Number(data.hourlyRate);

        const response = await apiService.put<Court>(`/api/court-owner/courts/${id}`, payload);

        if (response.error) {
            console.error('Error updating court:', response.error);
            return null;
        }
        return response.data || null;
    }
};
