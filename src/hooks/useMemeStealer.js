import * as Sentry from '@sentry/react';
import { useEffect, useState } from 'react';
import StealingService from '../utils/StealService';
import { validateMeme } from '../utils/validation';
import useMemeDownloader from './useMemeDownloader';

const useMemeStealer = () => {
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [infoMessage, setInfoMessage] = useState(null);
    const {
        isDownloading,
        downloadProgress,
        isIndeterminate,
        setIsDownloading,
        setIsIndeterminate,
        setDownloadProgress,
        downloadMedia,
    } = useMemeDownloader();

    useEffect(() => {
        if (infoMessage) {
            const timer = setTimeout(() => {
                setInfoMessage(null);
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [infoMessage]);

    const resetErrors = () => {
        setIsError(false);
        setErrorMessage(null);
        setInfoMessage(null);
    };

    const stealMeme = async (url) => {
        resetErrors();
        const sanitizedSource = validateMeme(url);
        if (!sanitizedSource) {
            setIsError(true);
            setErrorMessage('URL is not supported');
            return false;
        }

        setIsDownloading(true);
        setIsIndeterminate(true);
        setDownloadProgress(0);

        try {
            const response = await StealingService.stealMeme(sanitizedSource);

            if (!response.ok) {
                setIsDownloading(false);
                setIsIndeterminate(false);
                setDownloadProgress(0);

                if (response.status === 400) {
                    let msg = 'Only video content is supported';
                    try {
                        const errJson = await response.json();
                        if (errJson?.message) {
                            msg = Array.isArray(errJson.message)
                                ? errJson.message.join(', ')
                                : errJson.message;
                        }
                    } catch {
                        // ignore JSON parse failure
                    }
                    setIsError(true);
                    setErrorMessage(msg);
                    return false;
                }

                if (response.status === 404) {
                    let msg = 'Video not found or unavailable';
                    try {
                        const errJson = await response.json();
                        if (errJson?.message) {
                            msg = Array.isArray(errJson.message)
                                ? errJson.message.join(', ')
                                : errJson.message;
                        }
                    } catch {
                        // ignore JSON parse failure
                    }
                    setIsError(true);
                    setErrorMessage(msg);
                    return false;
                }

                if (response.status === 504 || response.status === 502) {
                    const errorMsg = `Server Gateway Timeout (${response.status})`;
                    setIsError(true);
                    setErrorMessage(errorMsg);
                    Sentry.captureMessage(
                        `Server Gateway Timeout (${response.status}) during scraping`,
                        {
                            level: 'error',
                            extra: {
                                url: sanitizedSource,
                                status: response.status,
                                error: errorMsg,
                            },
                        },
                    );
                    return false;
                }

                if (response.status === 500) {
                    let msg = 'Failed to extract video';
                    try {
                        const errJson = await response.json();
                        if (errJson?.message) {
                            msg = Array.isArray(errJson.message)
                                ? errJson.message.join(', ')
                                : errJson.message;
                        }
                    } catch {
                        // ignore JSON parse failure
                    }
                    setIsError(true);
                    setErrorMessage(msg);
                    Sentry.captureMessage(
                        'Server error (500) during extraction',
                        {
                            level: 'error',
                            extra: {
                                url: sanitizedSource,
                                status: response.status,
                                error: msg,
                            },
                        },
                    );
                    return false;
                }

                let errorMsg = `HTTP error! Status: ${response.status}`;
                try {
                    const errJson = await response.json();
                    if (errJson?.message) {
                        errorMsg = Array.isArray(errJson.message)
                            ? errJson.message.join(', ')
                            : errJson.message;
                    }
                } catch {
                    // ignore JSON parse failure
                }
                setIsError(true);
                setErrorMessage(errorMsg);
                return false;
            }

            const filename = await downloadMedia(response);
            setInfoMessage(`File successfully downloaded: ${filename}`);
            return true;
        } catch (err) {
            setIsDownloading(false);
            setIsIndeterminate(false);
            setDownloadProgress(0);
            setIsError(true);
            setErrorMessage(`Download failed: ${err.message}`);
            return false;
        }
    };

    return {
        stealMeme,
        isStealing: false,
        isDownloading,
        downloadProgress,
        isIndeterminate,
        isError,
        errorMessage,
        infoMessage,
        resetErrors,
    };
};

export default useMemeStealer;
