import { Court } from './court';

export enum BookingStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    NO_SHOW = 'NO_SHOW',
    COMPLETED = 'COMPLETED',
    EXPIRED = 'EXPIRED'
}

export interface ServiceUser {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

export interface Booking {
    id: string;
    courtId: string;
    serviceUserId?: string;
    timeSlotStart: string; // ISO Date String
    timeSlotEnd: string; // ISO Date String
    status: BookingStatus;
    totalPrice: number;
    notes?: string;

    // Relations
    court?: Court;
    serviceUser?: ServiceUser;

    createdAt?: string;
    confirmedAt?: string;
    cancelledAt?: string;
}
