/**
 * Cloudinary mock - returns fake URLs for all upload operations.
 * Used via Jest moduleNameMapper to intercept real cloudinary imports.
 */

export interface UploadResult {
    url: string;
    public_id: string;
    secure_url: string;
}

export const uploadToCloudinary = async (
    _buffer: Buffer,
    _options: any = {}
): Promise<UploadResult> => {
    return {
        url: 'https://test.cloudinary.com/fake-image.jpg',
        public_id: 'test/fake-image',
        secure_url: 'https://test.cloudinary.com/fake-image.jpg',
    };
};

export const v2 = {
    config: () => { },
    uploader: {
        upload: async () => ({
            secure_url: 'https://test.cloudinary.com/fake-image.jpg',
            public_id: 'test/fake-image',
            format: 'jpg',
            width: 200,
            height: 200,
        }),
        upload_stream: (_options: any, callback: any) => {
            const fakeResult = {
                secure_url: 'https://test.cloudinary.com/fake-stream-image.jpg',
                public_id: 'test/fake-stream-image',
            };
            if (callback) callback(null, fakeResult);
            return { end: () => { }, write: () => { } };
        },
        destroy: async () => ({ result: 'ok' }),
    },
};

export default { v2 };
