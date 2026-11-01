export const getFilenameFromContentDisposition = (
    contentDisposition,
    fallback = 'video.mp4',
) => {
    if (!contentDisposition || typeof contentDisposition !== 'string') {
        return fallback;
    }

    // Check RFC 5987 / RFC 6266 format: filename*=UTF-8''...
    const utf8Match = contentDisposition.match(
        /filename\*=(?:UTF-8'')?([^;]+)/i,
    );
    if (utf8Match?.[1]) {
        try {
            const raw = utf8Match[1].trim().replace(/^["']|["']$/g, '');
            const decoded = decodeURIComponent(raw);
            if (decoded) {
                return decoded;
            }
        } catch {
            // fall through to standard filename matching
        }
    }

    // Standard filename="..." or filename=...
    const standardMatch = contentDisposition.match(
        /filename=(?:"([^"]*)"|([^;\s]+))/i,
    );
    if (standardMatch) {
        const raw =
            standardMatch[1] !== undefined
                ? standardMatch[1]
                : standardMatch[2];
        const name = (raw || '').replace(/^["']|["']$/g, '').trim();
        if (name) {
            return name;
        }
    }

    return fallback;
};

export const prepareFilename = (platform, mediaItem) => {
    const service = (platform || 'unknown').toLowerCase();
    const mediaType = (mediaItem.type || 'video').toLowerCase();

    let resolution = '';
    if (mediaItem.width && mediaItem.height) {
        resolution = `${mediaItem.width}x${mediaItem.height}`;
    } else if (mediaItem.quality) {
        resolution = mediaItem.quality.replace(/[^a-z0-9]/gi, '').toLowerCase();
    }

    const alphanumId = Math.random().toString(36).substring(2, 6);
    const baseName = [service, mediaType, resolution, alphanumId]
        .filter(Boolean)
        .join('_');

    const extension = mediaItem.format
        ? `.${mediaItem.format.toLowerCase()}`
        : '';
    return `${baseName}${extension}`;
};
