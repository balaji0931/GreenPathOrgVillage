/**
 * QR Service mock — stubs QR generation and Cloudinary uploads.
 * Keeps helper functions (toFullUid, generateGeneratorCredentials) real.
 *
 * This mock is NOT auto-applied. Import it explicitly in tests that need it:
 *   jest.mock('../../server/modules/fieldwork/qr-service', () => require('../mocks/qr-service.mock'));
 */
import bcrypt from 'bcrypt';

// Stub: QR generation functions that depend on Cloudinary
export const generateHouseholdQR = jest.fn().mockResolvedValue({
    qrCodeUrl: 'https://test.cloudinary.com/qr-household.png',
    qrCodePublicId: 'test/qr-household-001',
});

export const generatePreMappedQR = jest.fn().mockResolvedValue({
    qrCodeUrl: 'https://test.cloudinary.com/qr-premapped.png',
    qrCodePublicId: 'test/qr-premapped-001',
});

export const generateBulkQRCodesPDF = jest.fn().mockResolvedValue(
    Buffer.from('fake-pdf-content')
);

export const generatePreMappedQRCodesPDF = jest.fn().mockResolvedValue(
    Buffer.from('fake-premapped-pdf-content')
);

// Real helper functions — keep actual logic
export function toFullUid(uid: string): string {
    if (uid.startsWith('GEN-')) return uid;
    return `GEN-${uid}`;
}

export function generateGeneratorCredentials(uid: string): {
    userId: string;
    password: string;
    hashedPassword: string;
} {
    const userId = uid.startsWith('GEN-') ? uid : `GEN-${uid}`;
    const password = userId;
    const hashedPassword = bcrypt.hashSync(password, Number(process.env.BCRYPT_ROUNDS) || 10);

    return {
        userId,
        password,
        hashedPassword,
    };
}
