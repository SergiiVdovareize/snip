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
