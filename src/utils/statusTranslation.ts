export const BOOKING_STATUS_TRANSLATIONS: Record<string, string> = {
    'PENDING': 'จองสำเร็จ รอยืนยันสนาม',
    'CONFIRMED': 'ยืนยันสนาม',
    'COMPLETED': 'ลูกค้ามาใช้บริการแล้ว',
    'CANCELLED': 'ถูกยกเลิก',
    'NO_SHOW': 'ไม่มาใช้บริการ',
    'FAILED': 'การจองล้มเหลว',
};

export function translateBookingStatus(status: string): string {
    if (!status) return '';
    const upperStatus = status.toUpperCase();
    return BOOKING_STATUS_TRANSLATIONS[upperStatus] || status;
}
