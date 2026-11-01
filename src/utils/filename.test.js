import { getFilenameFromContentDisposition, prepareFilename } from './filename';

describe('getFilenameFromContentDisposition', () => {
    test('returns fallback when header is missing or null', () => {
        expect(getFilenameFromContentDisposition(null)).toBe('video.mp4');
        expect(getFilenameFromContentDisposition(undefined)).toBe('video.mp4');
        expect(getFilenameFromContentDisposition(undefined, 'custom.mp4')).toBe(
            'custom.mp4',
        );
    });

    test('extracts filename from standard double-quoted format', () => {
        const header = 'attachment; filename="my_video.mp4"';
        expect(getFilenameFromContentDisposition(header)).toBe('my_video.mp4');
    });

    test('extracts filename from unquoted format', () => {
        const header = 'attachment; filename=my_video.mp4';
        expect(getFilenameFromContentDisposition(header)).toBe('my_video.mp4');
    });

    test('extracts filename from RFC 5987 / RFC 6266 UTF-8 encoded format', () => {
        const header =
            "attachment; filename*=UTF-8''%D0%BA%D1%96%D1%82%20%D0%BC%D0%B5%D0%BC.mp4";
        expect(getFilenameFromContentDisposition(header)).toBe('кіт мем.mp4');
    });

    test('prefers UTF-8 encoded filename* over standard filename', () => {
        const header =
            'attachment; filename="fallback.mp4"; filename*=UTF-8\'\'preferred.mp4';
        expect(getFilenameFromContentDisposition(header)).toBe('preferred.mp4');
    });

    test('falls back when filename attribute is empty', () => {
        const header = 'attachment; filename=""';
        expect(getFilenameFromContentDisposition(header, 'default.mp4')).toBe(
            'default.mp4',
        );
    });
});

describe('prepareFilename', () => {
    test('should format filename with platform, mediaType, resolution, alphanumId and extension', () => {
        const mediaItem = {
            type: 'video',
            width: 1280,
            height: 720,
            format: 'mp4',
        };
        const filename = prepareFilename('TikTok', mediaItem);
        // Format: tiktok_video_1280x720_[4-character-id].mp4
        expect(filename).toMatch(/^tiktok_video_1280x720_[a-z0-9]{4}\.mp4$/);
    });

    test('should fall back to unknown for platform if not provided', () => {
        const mediaItem = {
            type: 'image',
            format: 'jpg',
        };
        const filename = prepareFilename(null, mediaItem);
        expect(filename).toMatch(/^unknown_image_[a-z0-9]{4}\.jpg$/);
    });

    test('should fall back to video for mediaType if type is missing', () => {
        const mediaItem = {
            format: 'mp4',
        };
        const filename = prepareFilename('YouTube', mediaItem);
        expect(filename).toMatch(/^youtube_video_[a-z0-9]{4}\.mp4$/);
    });

    test('should use quality if width/height are missing but quality exists', () => {
        const mediaItem = {
            type: 'audio',
            quality: '128 kbps',
            format: 'mp3',
        };
        const filename = prepareFilename('SoundCloud', mediaItem);
        expect(filename).toMatch(/^soundcloud_audio_128kbps_[a-z0-9]{4}\.mp3$/);
    });

    test('should omit resolution if neither dimensions nor quality exist', () => {
        const mediaItem = {
            type: 'image',
            format: 'png',
        };
        const filename = prepareFilename('Pinterest', mediaItem);
        expect(filename).toMatch(/^pinterest_image_[a-z0-9]{4}\.png$/);
    });
});
