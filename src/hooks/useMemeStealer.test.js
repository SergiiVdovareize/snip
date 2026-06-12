import { act, renderHook } from '@testing-library/react';
import StealingService from '../utils/StealService';
import { validateMeme } from '../utils/validation';
import useMemeDownloader from './useMemeDownloader';
import useMemeStealer from './useMemeStealer';

jest.mock('../utils/StealService');
jest.mock('./useMemeDownloader');
jest.mock('../utils/validation');
jest.mock('../utils/filename', () => ({
    __esModule: true,
    prepareFilename: () => 'mock-filename.mp4',
}));
jest.mock('@sentry/react', () => ({
    captureMessage: jest.fn(),
}));

describe('useMemeStealer Hook', () => {
    let mockDownloadMedia;

    beforeEach(() => {
        mockDownloadMedia = jest.fn();
        useMemeDownloader.mockReturnValue({
            isDownloading: false,
            downloadProgress: 0,
            isIndeterminate: false,
            setIsIndeterminate: jest.fn(),
            setDownloadProgress: jest.fn(),
            downloadMedia: mockDownloadMedia,
        });
        jest.clearAllMocks();
    });

    test('initializes with default states', () => {
        const { result } = renderHook(() => useMemeStealer());
        expect(result.current.isStealing).toBe(false);
        expect(result.current.isDownloading).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.errorMessage).toBe(null);
    });

    test('handles unsupported URL validation error', async () => {
        validateMeme.mockReturnValue(null);

        const { result } = renderHook(() => useMemeStealer());

        let success;
        await act(async () => {
            success = await result.current.stealMeme('https://unsupported.com');
        });

        expect(success).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.errorMessage).toBe('URL is not supported');
    });

    test('steals and triggers download successfully', async () => {
        validateMeme.mockReturnValue('https://twitter.com/post/123');
        StealingService.stealMeme.mockResolvedValue({
            success: true,
            platform: 'twitter',
            media: [
                {
                    url: 'https://twitter-cdn.com/media.mp4',
                    sizeMB: 3.4,
                },
            ],
        });

        const { result } = renderHook(() => useMemeStealer());

        await act(async () => {
            await result.current.stealMeme('https://twitter.com/post/123');
        });

        expect(StealingService.stealMeme).toHaveBeenCalledWith(
            'https://twitter.com/post/123',
        );
        expect(mockDownloadMedia).toHaveBeenCalledWith(
            'https://twitter-cdn.com/media.mp4',
            'mock-filename.mp4',
            3.4,
        );
        expect(result.current.isError).toBe(false);
    });

    test('handles scraping failure response from service', async () => {
        validateMeme.mockReturnValue('https://twitter.com/post/123');
        StealingService.stealMeme.mockResolvedValue({
            success: false,
            error: 'Failed to scrape video info',
        });

        const { result } = renderHook(() => useMemeStealer());

        await act(async () => {
            await result.current.stealMeme('https://twitter.com/post/123');
        });

        expect(result.current.errorMessage).toBe('Failed to scrape video info');
    });

    test('handles download media exceptions', async () => {
        validateMeme.mockReturnValue('https://twitter.com/post/123');
        StealingService.stealMeme.mockResolvedValue({
            success: true,
            platform: 'twitter',
            media: [
                {
                    url: 'https://twitter-cdn.com/media.mp4',
                    sizeMB: 3.4,
                },
            ],
        });
        mockDownloadMedia.mockRejectedValue(new Error('Download timeout'));

        const { result } = renderHook(() => useMemeStealer());

        await act(async () => {
            await result.current.stealMeme('https://twitter.com/post/123');
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.errorMessage).toBe(
            'Download failed: Download timeout',
        );
    });
});
