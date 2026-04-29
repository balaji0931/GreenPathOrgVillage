/**
 * QR Service mock - stubs QR generation (local, no Cloudinary).
 * Keeps helper functions (toFullUid, generateGeneratorCredentials) real.
 *
 * This mock is NOT auto-applied. Import it explicitly in tests that need it:
 *   jest.mock('../../server/modules/fieldwork/qr-service', () => require('../mocks/qr-service.mock'));
 */
import bcrypt from 'bcrypt';

// Stub: QR generation functions (no Cloudinary)
export const generateQRBuffer = jest.fn().mockResolvedValue(
    Buffer.from('fake-qr-png-data')
);

export const generatePreMappedQRCodesPDF = jest.fn().mockResolvedValue(
    Buffer.from('fake-premapped-pdf-content')
);

// Real helper functions - keep actual logic
export function getScannableUid(fullUid: string): string {
    return fullUid.replace(/^GEN-/, '');
}

export function toFullUid(uid: string): string {
    if (uid.startsWith('GEN-')) return uid;
    return `GEN-${uid}`;
}

export async function generateGeneratorCredentials(uid: string): Promise<{
    userId: string;
    password: string;
    hashedPassword: string;
}> {
    const userId = uid.startsWith('GEN-') ? uid : `GEN-${uid}`;
    const password = userId;
    const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 10);

    return {
        userId,
        password,
        hashedPassword,
    };
}
