export interface Court {
    id: string;
    name: string;
    businessId: string;
    description?: string;
    sportTypeIds?: string[]; // IDs of sport types supported
    numberOfCourts?: number;
    hourlyRate?: number;
    openingHour?: string; // HH:mm
    closingHour?: string; // HH:mm
    approvalStatus?: 'approved' | 'pending' | 'rejected';
    capacity?: number;
    isCapacity?: boolean;
}
