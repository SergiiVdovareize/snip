import * as Sentry from '@sentry/react';
import { useState } from 'react';
import { getFilenameFromContentDisposition } from '../utils/filename';

const useMemeDownloader = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isIndeterminate, setIsIndeterminate] = useState(false);

    const downloadMedia = async (
        responseOrUrl,
        fallbackFilename = 'video.mp4',
    ) => {
        setIsDownloading(true);

        try {
            let response = responseOrUrl;
            if (typeof responseOrUrl === 'string') {
                response = await fetch(responseOrUrl);
                if (!response.ok) {
                    if (response.status === 504 || response.status === 502) {
                        Sentry.captureMessage(
                            `Server Gateway Timeout (${response.status}) during download`,
                            {
                                level: 'error',
                                extra: {
                                    url: responseOrUrl,
                                    status: response.status,
                                },
                            },
                        );
                        throw new Error(
                            `Server Gateway Timeout (${response.status})`,
                        );
                    }
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }

            const disposition = response.headers?.get
                ? response.headers.get('content-disposition')
                : null;
            const filename = getFilenameFromContentDisposition(
                disposition,
                fallbackFilename,
            );

            const contentLength = response.headers?.get
                ? response.headers.get('content-length')
                : null;
            const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

            const smallFileThresholdMb = 2;
            const isSizeSmall =
                totalBytes === 0 ||
                totalBytes < smallFileThresholdMb * 1024 * 1024;

            if (isSizeSmall) {
                setIsIndeterminate(true);
            } else {
                setIsIndeterminate(false);
            }

            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                chunks.push(value);
                receivedLength += value.length;

                if (totalBytes > 0 && !isSizeSmall) {
                    const progress = Math.round(
                        (receivedLength / totalBytes) * 100,
                    );
                    setDownloadProgress((prev) => Math.max(prev, progress));
                }
            }

            setIsIndeterminate(false);
            setDownloadProgress(100);
            await new Promise((resolve) => setTimeout(resolve, 250)); // Briefly show 100% completion

            const blob = new Blob(chunks, { type: 'video/mp4' });
            const downloadUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(downloadUrl);
            return filename;
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
            setIsIndeterminate(false);
        }
    };

    return {
        isDownloading,
        downloadProgress,
        isIndeterminate,
        setIsDownloading,
        setIsIndeterminate,
        setDownloadProgress,
        downloadMedia,
    };
};

export default useMemeDownloader;
