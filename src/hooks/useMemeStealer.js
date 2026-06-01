import * as Sentry from '@sentry/react';
import { useState } from 'react';
import { prepareFilename } from '../utils/filename';
import StealingService from '../utils/StealService';
import { validateMeme } from '../utils/validation';
import useMemeDownloader from './useMemeDownloader';

const useMemeStealer = () => {
    const [isStealing, setIsStealing] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const {
        isDownloading,
        downloadProgress,
        isIndeterminate,
        setIsIndeterminate,
        setDownloadProgress,
        downloadMedia,
    } = useMemeDownloader();

    const resetErrors = () => {
        setIsError(false);
        setErrorMessage(null);
    };

    const stealMeme = async (url) => {
        resetErrors();
        const sanitizedSource = validateMeme(url);
        if (!sanitizedSource) {
            setIsError(true);
            setErrorMessage('URL is not supported');
            return false;
        }

        setIsStealing(true);
        setIsIndeterminate(true);
        setDownloadProgress(0);

        let result;
        try {
            result = await StealingService.stealMeme(sanitizedSource);
        } catch (err) {
            result = { success: false, error: err.message };
        } finally {
            setIsStealing(false);
        }

        if (
            result.success === true &&
            result.media &&
            result.media.length > 0
        ) {
            console.log('result', result);
            const bestMedia = result.media[0];

            const filename = prepareFilename(result.platform, bestMedia);

            try {
                await downloadMedia(bestMedia.url, filename, bestMedia.sizeMB);
            } catch (err) {
                setIsError(true);
                setErrorMessage(`Download failed: ${err.message}`);
            }
        } else {
            setDownloadProgress(0);
            setIsIndeterminate(false);
            const errorMsg = result.error || 'Unknown error occurred';
            setErrorMessage(errorMsg);

            if (result.status === 504 || result.status === 502) {
                Sentry.captureMessage(
                    `Server Gateway Timeout (${result.status}) during scraping`,
                    {
                        level: 'error',
                        extra: {
                            url: sanitizedSource,
                            status: result.status,
                            error: errorMsg,
                        },
                    },
                );
            }
        }

        return false;
    };

    return {
        stealMeme,
        isStealing,
        isDownloading,
        downloadProgress,
        isIndeterminate,
        isError,
        errorMessage,
        resetErrors,
    };
};

export default useMemeStealer;
