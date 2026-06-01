import { useEffect, useRef, useState } from "react";
import useMemeStealer from "../hooks/useMemeStealer";

const defaultStealingButtonLabel = 'Steal me'

const MemeField = () => {
    const [urlValue, setUrlValue] = useState('')
    const textareaRef = useRef(null)

    const {
        stealMeme,
        isStealing,
        isDownloading,
        downloadProgress,
        isIndeterminate,
        isError,
        errorMessage,
        resetErrors
    } = useMemeStealer();

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

    const handleUrlChange = (event) => {
        resetErrors();
        setUrlValue(event.target.value);
    }

    const resetForm = () => {
        setUrlValue('')
        resetErrors();
    }

    const pasteMeme = async () => {
        resetErrors();
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

    const handleSubmit = (event) => {
        event.preventDefault();
        stealMeme(urlValue);
    };

    const isFormDisabled = isStealing || isDownloading;

    return <div className='container'>
        <form action="#" onSubmit={handleSubmit} className={isError ? 'error-form' : null}>
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