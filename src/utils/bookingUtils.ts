import { BookingLookupResult } from '../types/booking';

/**
 * Merges consecutive bookings for the same facility/court.
 * Implementation based on BookingManagerView logic (The Source of Truth).
 *
 * Rules:
 * 1. Same Facility/Court
 * 2. Same Status (or both are checkable statuses: PENDING/CONFIRMED)
 * 3. Consecutive Times
 * 4. Same Customer
 */
export const mergeConsecutiveBookings = (bookings: BookingLookupResult[]): BookingLookupResult[] => {
    if (bookings.length <= 1) return bookings;

    console.log('=== MERGE START ===');
    console.log('Input bookings:', bookings.length);

    // Group statuses for sorting: active bookings first, then cancelled/no-show
    const getStatusGroup = (status: string): number => {
        // Active statuses (PENDING, CONFIRMED, COMPLETED) = 0
        // Cancelled statuses (CANCELLED, NO_SHOW, EXPIRED) = 1
        const cancelledStatuses = ['CANCELLED', 'NO_SHOW', 'EXPIRED'];
        return cancelledStatuses.includes(status) ? 1 : 0;
    };

    // Sort by facility, then status group, then time
    // This ensures overlapping bookings with same status are grouped together
    const sorted = [...bookings].sort((a, b) => {
        const facilityCompare = (a.facility?.id || '').localeCompare(b.facility?.id || '');
        if (facilityCompare !== 0) return facilityCompare;

        // Sort by status group (active first, cancelled second)
        const statusGroupCompare = getStatusGroup(a.status) - getStatusGroup(b.status);
        if (statusGroupCompare !== 0) return statusGroupCompare;

        return new Date(a.timeSlotStart).getTime() - new Date(b.timeSlotStart).getTime();
    });

    console.log('Sorted bookings:');
    sorted.forEach((b, i) => {
        console.log(`  [${i}] id=${b.id}, facility=${b.facility?.id}, time=${b.timeSlotStart} - ${b.timeSlotEnd}, status=${b.status}, customer=${b.customer?.phone || 'N/A'}`);
    });

    const merged: BookingLookupResult[] = [];
    let current = { ...sorted[0] };
    current.totalPrice = Number(current.totalPrice);
    const bookingIds = [current.id];

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        // Facility check - normalize IDs for comparison
        const currentFacilityId = String(current.facility?.id || '').trim();
        const nextFacilityId = String(next.facility?.id || '').trim();
        const isSameFacility = currentFacilityId === nextFacilityId;

        // Status check - allow merging if both are checkable statuses
        const checkableStatuses = ['PENDING', 'CONFIRMED'];
        const isSameStatus = current.status === next.status;
        const areBothCheckable = checkableStatuses.includes(current.status) && checkableStatuses.includes(next.status);
        const statusOk = isSameStatus || areBothCheckable;

        // Time check - consecutive means current end equals next start
        const currentEnd = new Date(current.timeSlotEnd).getTime();
        const nextStart = new Date(next.timeSlotStart).getTime();
        const timeDiff = Math.abs(nextStart - currentEnd);
        // Allow up to 60 seconds tolerance for potential timezone/rounding issues
        const isConsecutive = timeDiff <= 60000;

        // Customer check - if both have phone numbers, they should match
        // If one or both don't have phone, consider them same customer (from same QR lookup)
        const currentPhone = current.customer?.phone || '';
        const nextPhone = next.customer?.phone || '';
        const isSameCustomer = !currentPhone || !nextPhone || currentPhone === nextPhone;

        // DEBUG LOGGING
        console.log(`--- Checking [${i-1}] -> [${i}] ---`);
        console.log(`  Facility: "${currentFacilityId}" vs "${nextFacilityId}" -> ${isSameFacility ? 'MATCH' : 'DIFF'}`);
        console.log(`  Status: ${current.status} vs ${next.status} -> ${statusOk ? 'OK' : 'FAIL'} (same=${isSameStatus}, bothCheckable=${areBothCheckable})`);
        console.log(`  Time: ${current.timeSlotEnd} -> ${next.timeSlotStart} (diff=${timeDiff}ms) -> ${isConsecutive ? 'CONSECUTIVE' : 'GAP'}`);
        console.log(`  Customer: "${currentPhone}" vs "${nextPhone}" -> ${isSameCustomer ? 'SAME' : 'DIFF'}`);

        if (isSameFacility && statusOk && isConsecutive && isSameCustomer) {
            console.log(`  >>> MERGING!`);
            // Merge
            current.timeSlotEnd = next.timeSlotEnd;
            current.totalPrice += Number(next.totalPrice);
            // Keep isPaid as true only if all are paid
            if (current.isPaid !== undefined || next.isPaid !== undefined) {
                current.isPaid = (current.isPaid ?? false) && (next.isPaid ?? false);
            }

            bookingIds.push(next.id);
            (current as any).mergedBookingIds = [...bookingIds];
        } else {
            console.log(`  >>> NOT MERGING`);
            merged.push(current);
            current = { ...next };
            current.totalPrice = Number(current.totalPrice);
            bookingIds.length = 0;
            bookingIds.push(current.id);
        }
    }

    merged.push(current);

    console.log('=== MERGE RESULT ===');
    console.log('Output bookings:', merged.length);
    merged.forEach((b, i) => {
        const mergedIds = (b as any).mergedBookingIds;
        console.log(`  [${i}] time=${b.timeSlotStart} - ${b.timeSlotEnd}, price=${b.totalPrice}, merged=${mergedIds ? mergedIds.length : 1} bookings`);
    });

    return merged;
};
