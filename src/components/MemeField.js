import { useEffect, useState } from "react";
import StealingService from "../utils/StealService";

const defaultStealingButtonLabel = 'Steal me'

const MemeField = () => {
    const [isStealing, setIsStealing] = useState(false)
    const [isError, setIsError] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)
    const [urlValue, setUrlValue] = useState('')
    const [stealingButtonLabel, setStealingButtonLabel] = useState(defaultStealingButtonLabel)

    useEffect(() => {
        if (isStealing) {
            setStealingButtonLabel('Stealing.....')
        } else {
            setStealingButtonLabel(defaultStealingButtonLabel)
        }
    }, [isStealing])

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

    const downloadURI = (uri, name) => {
        var link = document.createElement("a");
        link.href = uri;
        link.download = 'stolen-at-' + Date.now();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const downloadFile = (url, filename) => {
        fetch(url)
            .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.blob(); // Convert response to a Blob object
            })
            .then(blob => {
            // Create a temporary URL for the Blob
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename || url.split('/').pop(); // Use the provided filename or extract from URL
            document.body.appendChild(a);
            a.click();
            a.remove();
                window.URL.revokeObjectURL(downloadUrl); // Clean up the temporary URL
            })
            .catch(console.error);
    }

    // const animateStealing = () => {
    //     console.log('stealingButtonLabel', stealingButtonLabel)
    //     if (stealingButtonLabel.length > defaultStealingButtonLabel.length + 5) {
    //         setStealingButtonLabel(defaultStealingButtonLabel)
    //     } else {
    //         setStealingButtonLabel(`wefew2`)
    //         setTimeout(animateStealing, 200)
    //     }
    // }

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
        const result = await StealingService.stealMeme(sanitizedSource)
        setIsStealing(false)
        if (result.success === true && result.data) {
            console.log('result', result)
            downloadURI(result.data)
        } else {
            const errorMsg = result.error || (result.data && result.data.message) || 'Unknown error occurred';
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

    return <div className='container'>
        <form action="#" onSubmit={stealMeme} className={isError ? 'error-form' : null}>
            <textarea rows={4} name='source' className='meme-source' placeholder="Paste url here" value={urlValue} onChange={handleUrlChange}/>
            
            <div className="stealing-buttons-wrapper">
                <input type="reset" disabled={isStealing} className='stealing-button' value='Reset' onClick={resetForm}/>
                <input type="button" disabled={isStealing} className='stealing-button' value='Paste' onClick={pasteMeme}/>
                <input type="submit" disabled={isStealing} className='stealing-button meme-stealer' value={stealingButtonLabel}/>
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