import { apiService } from './api.service';
import { Business } from '../types/business';

export const businessService = {
    async getBusinesses(limit: number = 100): Promise<{ businesses: Business[] }> {
        const response = await apiService.get<{ data: Business[] }>(`/api/court-owner/businesses?limit=${limit}`);

        if (response.error) {
            throw new Error(response.error);
        }

        const responseData = response.data;
        return { businesses: responseData?.data || [] };
    }
};
