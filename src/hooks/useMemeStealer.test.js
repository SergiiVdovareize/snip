import * as Sentry from '@sentry/react';
import { act, renderHook } from '@testing-library/react';
import StealingService from '../utils/StealService';
import { validateMeme } from '../utils/validation';
import useMemeDownloader from './useMemeDownloader';
import useMemeStealer from './useMemeStealer';

jest.mock('../utils/StealService');
jest.mock('./useMemeDownloader');
jest.mock('../utils/validation');
jest.mock('@sentry/react', () => ({
    captureMessage: jest.fn(),
}));

describe('useMemeStealer Hook', () => {
    let mockDownloadMedia;
    let mockSetIsDownloading;
    let mockSetIsIndeterminate;
    let mockSetDownloadProgress;

    beforeEach(() => {
        mockDownloadMedia = jest.fn();
        mockSetIsDownloading = jest.fn();
        mockSetIsIndeterminate = jest.fn();
        mockSetDownloadProgress = jest.fn();

        useMemeDownloader.mockReturnValue({
            isDownloading: false,
            downloadProgress: 0,
            isIndeterminate: false,
            setIsDownloading: mockSetIsDownloading,
            setIsIndeterminate: mockSetIsIndeterminate,
            setDownloadProgress: mockSetDownloadProgress,
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
        expect(result.current.infoMessage).toBe(null);
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

    test('steals and triggers stream download successfully', async () => {
        validateMeme.mockReturnValue('https://twitter.com/post/123');
        const mockResponse = {
            ok: true,
            status: 200,
        };
        StealingService.stealMeme.mockResolvedValue(mockResponse);
        mockDownloadMedia.mockResolvedValue('downloaded_video.mp4');

        const { result } = renderHook(() => useMemeStealer());

        let success;
        await act(async () => {
            success = await result.current.stealMeme(
                'https://twitter.com/post/123',
            );
        });

        expect(success).toBe(true);
        expect(StealingService.stealMeme).toHaveBeenCalledWith(
            'https://twitter.com/post/123',
        );
        expect(mockDownloadMedia).toHaveBeenCalledWith(mockResponse);
        expect(result.current.isError).toBe(false);
        expect(result.current.infoMessage).toBe(
            'File successfully downloaded: downloaded_video.mp4',
        );
    });

    test('handles 400 Bad Request error response (e.g. photo-only post)', async () => {
        validateMeme.mockReturnValue('https://instagram.com/p/photo123');
        const mockResponse = {
            ok: false,
            status: 400,
            json: jest.fn().mockResolvedValue({
                message: 'Only video content is supported',
            }),
        };
        StealingService.stealMeme.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useMemeStealer());

        let success;
        await act(async () => {
            success = await result.current.stealMeme(
                'https://instagram.com/p/photo123',
            );
        });

        expect(success).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.errorMessage).toBe(
            'Only video content is supported',
        );
    });

    test('handles 404 Not Found error response', async () => {
        validateMeme.mockReturnValue('https://tiktok.com/@user/video/404');
        const mockResponse = {
            ok: false,
            status: 404,
            json: jest.fn().mockResolvedValue({}),
        };
        StealingService.stealMeme.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useMemeStealer());

        let success;
        await act(async () => {
            success = await result.current.stealMeme(
                'https://tiktok.com/@user/video/404',
            );
        });

        expect(success).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.errorMessage).toBe(
            'Video not found or unavailable',
        );
    });

    test('handles 500 Internal Server Error and reports to Sentry', async () => {
        validateMeme.mockReturnValue('https://twitter.com/post/500');
        const mockResponse = {
            ok: false,
            status: 500,
            json: jest.fn().mockResolvedValue({
                message: 'Failed to extract video',
            }),
        };
        StealingService.stealMeme.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useMemeStealer());

        let success;
        await act(async () => {
            success = await result.current.stealMeme(
                'https://twitter.com/post/500',
            );
        });

        expect(success).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.errorMessage).toBe('Failed to extract video');
        expect(Sentry.captureMessage).toHaveBeenCalledWith(
            'Server error (500) during extraction',
            expect.objectContaining({
                level: 'error',
                extra: expect.objectContaining({
                    status: 500,
                    error: 'Failed to extract video',
                }),
            }),
        );
    });

    test('handles 504 Gateway Timeout and reports to Sentry', async () => {
        validateMeme.mockReturnValue('https://twitter.com/post/504');
        const mockResponse = {
            ok: false,
            status: 504,
        };
        StealingService.stealMeme.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useMemeStealer());

        let success;
        await act(async () => {
            success = await result.current.stealMeme(
                'https://twitter.com/post/504',
            );
        });

        expect(success).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.errorMessage).toBe(
            'Server Gateway Timeout (504)',
        );
        expect(Sentry.captureMessage).toHaveBeenCalledWith(
            'Server Gateway Timeout (504) during scraping',
            expect.objectContaining({
                level: 'error',
                extra: expect.objectContaining({ status: 504 }),
            }),
        );
    });

    test('handles download media exceptions', async () => {
        validateMeme.mockReturnValue('https://twitter.com/post/123');
        const mockResponse = {
            ok: true,
            status: 200,
        };
        StealingService.stealMeme.mockResolvedValue(mockResponse);
        mockDownloadMedia.mockRejectedValue(new Error('Download timeout'));

        const { result } = renderHook(() => useMemeStealer());

        let success;
        await act(async () => {
            success = await result.current.stealMeme(
                'https://twitter.com/post/123',
            );
        });

        expect(success).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.errorMessage).toBe(
            'Download failed: Download timeout',
        );
    });

    test('clears the info message automatically after 10 seconds', async () => {
        jest.useFakeTimers();
        validateMeme.mockReturnValue('https://twitter.com/post/123');
        const mockResponse = {
            ok: true,
            status: 200,
        };
        StealingService.stealMeme.mockResolvedValue(mockResponse);
        mockDownloadMedia.mockResolvedValue('mock-video.mp4');

        const { result } = renderHook(() => useMemeStealer());

        await act(async () => {
            await result.current.stealMeme('https://twitter.com/post/123');
        });

        expect(result.current.infoMessage).toBe(
            'File successfully downloaded: mock-video.mp4',
        );

        // Fast-forward 10 seconds
        act(() => {
            jest.advanceTimersByTime(10000);
        });

        expect(result.current.infoMessage).toBe(null);
        jest.useRealTimers();
    });
});
