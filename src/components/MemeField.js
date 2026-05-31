import { useEffect, useState } from "react";
import StealingService from "../utils/StealService";
import Constants from "../utils/Constants";

const defaultStealingButtonLabel = 'Steal me'

const MemeField = () => {
    const [isStealing, setIsStealing] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isError, setIsError] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)
    const [urlValue, setUrlValue] = useState('')
    const [stealingButtonLabel, setStealingButtonLabel] = useState(defaultStealingButtonLabel)

    useEffect(() => {
        if (isStealing) {
            setStealingButtonLabel('Stealing.....')
        } else if (isDownloading) {
            setStealingButtonLabel('Downloading...')
        } else {
            setStealingButtonLabel(defaultStealingButtonLabel)
        }
    }, [isStealing, isDownloading])

    // useEffect(() => {
    //     document.addEventListener("visibilitychange", (data) => {
    //         console.log('VISIBILITY', document.visibilityState)
    //     })
    // }, [])

    const handleUrlChange = (event) => {
        setIsError(false)
        setErrorMessage(null)
        setUrlValue(event.target.value);
    }

    const resetForm = () => {
        setUrlValue('')
        setIsError(false)
        setErrorMessage(null)
    }

    const downloadMedia = async (directMediaUrl, filename) => {
        setIsDownloading(true);
        // Do not reset downloadProgress to 0 to keep progress continuous
        let downloadInterval = null;
        try {
            const requestUrl = `${Constants.DOWNLOAD}?url=${encodeURIComponent(directMediaUrl)}&filename=${encodeURIComponent(filename)}`;
            const response = await fetch(requestUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
            
            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;

            // Start emulated progress for downloads where Content-Length is missing
            if (totalBytes === 0) {
                downloadInterval = setInterval(() => {
                    setDownloadProgress((prev) => {
                        if (prev < 10) {
                            const increment = Math.max(1, Math.round((95 - prev) * 0.01));
                            return prev + increment;
                        }
                        return prev;
                    });
                }, 1000);
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                chunks.push(value);
                receivedLength += value.length;
                
                if (totalBytes > 0) {
                    const progress = Math.round((receivedLength / totalBytes) * 100);
                    setDownloadProgress((prev) => Math.max(prev, progress));
                }
            }

            if (downloadInterval) {
                clearInterval(downloadInterval);
            }

            setDownloadProgress(100);
            await new Promise((resolve) => setTimeout(resolve, 250)); // Briefly show 100% completion

            const blob = new Blob(chunks);
            const downloadUrl = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            if (downloadInterval) {
                clearInterval(downloadInterval);
            }
            console.error('Download failed:', error);
            setIsError(true);
            setErrorMessage(`Download failed: ${error.message}`);
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };


    const prepareFilename = (platform, mediaItem) => {
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
            
        const extension = mediaItem.format ? `.${mediaItem.format.toLowerCase()}` : '';
        return `${baseName}${extension}`;
    };

    const stealMeme = async (event) => {
        event.preventDefault()

        setErrorMessage(null)
        const sanitizedSource = validateMeme(urlValue)
        if (!sanitizedSource) {
            setIsError(true)
            setErrorMessage('URL is not supported')
            return;
        }

        setIsStealing(true)
        setDownloadProgress(0)
        
        // Start emulating progress while waiting for the scraper API response
        let emulatedProgress = 0;
        const progressInterval = setInterval(() => {
            if (emulatedProgress < 90) {
                const increment = Math.max(1, Math.round((90 - emulatedProgress) * 0.03));
                emulatedProgress += increment;
                setDownloadProgress(emulatedProgress);
            }
        }, 600);

        let result;
        try {
            result = await StealingService.stealMeme(sanitizedSource)
        } catch (err) {
            result = { success: false, error: err.message };
        } finally {
            clearInterval(progressInterval);
            setIsStealing(false);
            // Do not reset downloadProgress to 0 to keep the progress bar continuous
        }

        if (result.success === true && result.media && result.media.length > 0) {
            console.log('result', result)
            const bestMedia = result.media[0]
            
            const filename = prepareFilename(result.platform, bestMedia);
                
            await downloadMedia(bestMedia.url, filename)
        } else {
            setDownloadProgress(0); // Reset progress on failure
            const errorMsg = result.error || 'Unknown error occurred';
            setErrorMessage(errorMsg);
        }

        return false;
    }

    const validateMeme = (url) => {
        const urlPatterns = {
            tiktok: /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
            instagram: /^https?:\/\/(www\.)?instagram\.com\/(reels?|p|stories)\/[\w.-]+/,
            twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/[\w.-]+\/status\/\d+/,
            youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|shorts\/)[\w-]+/,
            facebook: /^https?:\/\/(www\.)?facebook\.com\/(reel\/|.+\/posts\/|watch\/\?v=)\d+/,
            facebookShare: /^https?:\/\/(www\.)?facebook\.com\/share\/r\/[\w-]+/,
            linkedin: /^https?:\/\/(www\.)?linkedin\.com\/posts\/[\w-]+/,
            threads: /^https?:\/\/(www\.)?threads\.(net|com)\/(@[\w.-]+)\/post\/[\w-]+/,
        };

        // TODO: ADD - https://fb.watch/u_MnTouOL5/


        const trimmedUrl = url.trim();

        // Check if the URL matches any of the patterns
        const isValid = Object.values(urlPatterns).some(pattern => pattern.test(trimmedUrl));

        if (!isValid) {
            console.error('Invalid content URL')
            console.error(`You tried this. "${url}"`)
            return null
        }

        return trimmedUrl;
    }

    const pasteMeme = async () => {
        const text = await navigator.clipboard.readText();
        setUrlValue(text);
        setIsError(false);
    }

    const isFormDisabled = isStealing || isDownloading;

    return <div className='container'>
        <form action="#" onSubmit={stealMeme} className={isError ? 'error-form' : null}>
            <div style={{ position: 'relative', marginBottom: '0.75em' }}>
                <textarea 
                    disabled={isFormDisabled} 
                    rows={4} 
                    name='source' 
                    className='meme-source' 
                    placeholder="Paste url here" 
                    value={urlValue} 
                    onChange={handleUrlChange}
                    style={{ marginBottom: 0, display: 'block' }}
                />
                { (isStealing || isDownloading) && (
                    <div style={{
                        position: 'absolute',
                        bottom: '1px',
                        left: '1px',
                        right: '1px',
                        height: '6px',
                        borderBottomLeftRadius: '5px',
                        borderBottomRightRadius: '5px',
                        overflow: 'hidden',
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            width: `${downloadProgress}%`,
                            height: '100%',
                            backgroundColor: 'var(--accent)',
                            transition: 'width 150ms ease-out'
                        }} />
                    </div>
                )}
            </div>
            
            <div className="stealing-buttons-wrapper">
                <input type="reset" disabled={isFormDisabled} className='stealing-button' value='Reset' onClick={resetForm}/>
                <input type="button" disabled={isFormDisabled} className='stealing-button' value='Paste' onClick={pasteMeme}/>
                <input type="submit" disabled={isFormDisabled} className='stealing-button meme-stealer' value={stealingButtonLabel}/>
            </div>

            { errorMessage &&
                <div className="error">
                    {errorMessage}
                </div>
            }
        </form>
    </div>
}

export default MemeField;