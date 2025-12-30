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
    }
};
