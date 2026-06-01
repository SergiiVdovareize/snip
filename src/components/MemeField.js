import { useEffect, useRef, useState } from "react";
import StealingService from "../utils/StealService";
import Constants from "../utils/Constants";

const defaultStealingButtonLabel = 'Steal me'

const MemeField = () => {
    const [isStealing, setIsStealing] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isIndeterminate, setIsIndeterminate] = useState(false)
    const [isError, setIsError] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)
    const [urlValue, setUrlValue] = useState('')
    const [stealingButtonLabel, setStealingButtonLabel] = useState(defaultStealingButtonLabel)
    const textareaRef = useRef(null)

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

    const downloadMedia = async (directMediaUrl, filename, sizeMB) => {
        setIsDownloading(true);
        
        const SMALL_FILE_THRESHOLD_MB = 2;
        const isKnownSmall = sizeMB !== undefined && sizeMB !== null && sizeMB < SMALL_FILE_THRESHOLD_MB;
        if (isKnownSmall) {
            setIsIndeterminate(true);
        }

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

            const isSizeSmall = isKnownSmall || 
                (totalBytes > 0 && totalBytes < SMALL_FILE_THRESHOLD_MB * 1024 * 1024) ||
                (sizeMB === undefined && totalBytes === 0);

            if (isSizeSmall) {
                setIsIndeterminate(true);
            } else {
                setIsIndeterminate(false);
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                chunks.push(value);
                receivedLength += value.length;
                
                if (totalBytes > 0 && !isSizeSmall) {
                    const progress = Math.round((receivedLength / totalBytes) * 100);
                    setDownloadProgress((prev) => Math.max(prev, progress));
                }
            }

            setIsIndeterminate(false);
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
            console.error('Download failed:', error);
            setIsError(true);
            setErrorMessage(`Download failed: ${error.message}`);
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
            setIsIndeterminate(false);
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
        setIsIndeterminate(true)
        setDownloadProgress(0)

        let result;
        try {
            result = await StealingService.stealMeme(sanitizedSource)
        } catch (err) {
            result = { success: false, error: err.message };
        } finally {
            setIsStealing(false);
        }

        if (result.success === true && result.media && result.media.length > 0) {
            console.log('result', result)
            const bestMedia = result.media[0]
            
            const filename = prepareFilename(result.platform, bestMedia);
                
            await downloadMedia(bestMedia.url, filename, bestMedia.sizeMB)
        } else {
            setDownloadProgress(0); // Reset progress on failure
            setIsIndeterminate(false);
            const errorMsg = result.error || 'Unknown error occurred';
            setErrorMessage(errorMsg);
        }

        return false;
    }

    const validateMeme = (url) => {
        const urlPatterns = {
            tiktok: /tiktok\.com/i,
            instagram: /instagram\.com|instagr\.am/i,
            facebook: /facebook\.com|fb\.watch|\bfb\.com/i,
            twitter: /twitter\.com|\bx\.com/i,
            youtube: /youtube\.com|youtu\.be/i,
            reddit: /reddit\.com/i,
            pinterest: /pinterest\.|pin\.it/i,
            threads: /threads\.(net|com)/i,
            linkedin: /linkedin\.com|lnkd\.in/i,
            snapchat: /snapchat\.com/i,
            soundcloud: /soundcloud\.com/i,
            spotify: /spotify\.com|spotify\.link/i,
            tumblr: /tumblr\.com|tmblr\.co/i,
            douyin: /douyin\.com/i,
            kuaishou: /kuaishou\.com/i,
            dailymotion: /dailymotion\.com|dai\.ly/i,
            bluesky: /bsky\.app/i,
            capcut: /capcut\.com/i,
            terabox: /terabox\.com/i,
        };


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
        setIsError(false);
        // Focus the textarea and trigger native paste to avoid iOS Safari
        // clipboard permission prompt
        if (textareaRef.current) {
            textareaRef.current.focus();
            const pasted = document.execCommand('paste');
            if (!pasted && navigator.clipboard?.readText) {
                try {
                    const text = await navigator.clipboard.readText();
                    setUrlValue(text);
                } catch (e) {
                    console.error('Paste failed:', e);
                }
            }
        }
    }

    const isFormDisabled = isStealing || isDownloading;

    return <div className='container'>
        <form action="#" onSubmit={stealMeme} className={isError ? 'error-form' : null}>
            <div style={{ position: 'relative', marginBottom: '0.75em' }}>
                <textarea 
                    ref={textareaRef}
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
                    <div className="progress-container">
                        {isIndeterminate ? (
                            <div className="zebra-fill" />
                        ) : (
                            <div className="progress-fill" style={{ width: `${downloadProgress}%` }} />
                        )}
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