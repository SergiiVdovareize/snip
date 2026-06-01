import { useState } from "react";
import Constants from "../utils/Constants";

const useMemeDownloader = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isIndeterminate, setIsIndeterminate] = useState(false);

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
        setIsIndeterminate,
        setDownloadProgress,
        downloadMedia,
    };
};

export default useMemeDownloader;
