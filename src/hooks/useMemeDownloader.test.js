import * as Sentry from '@sentry/react';
import { act, renderHook } from '@testing-library/react';
import useMemeDownloader from './useMemeDownloader';

jest.mock('@sentry/react', () => ({
    captureMessage: jest.fn(),
}));

describe('useMemeDownloader Hook', () => {
    let originalFetch;
    let originalCreateObjectURL;
    let originalRevokeObjectURL;
    let clickSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        originalFetch = global.fetch;
        originalCreateObjectURL = global.URL.createObjectURL;
        originalRevokeObjectURL = global.URL.revokeObjectURL;

        global.fetch = jest.fn();
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();

        clickSpy = jest
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});
        consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        jest.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        global.URL.createObjectURL = originalCreateObjectURL;
        global.URL.revokeObjectURL = originalRevokeObjectURL;
        clickSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    test('initializes with default states', () => {
        const { result } = renderHook(() => useMemeDownloader());
        expect(result.current.isDownloading).toBe(false);
        expect(result.current.downloadProgress).toBe(0);
        expect(result.current.isIndeterminate).toBe(false);
    });

    test('downloads from response with content-length successfully', async () => {
        const mockStreamReader = {
            read: jest
                .fn()
                .mockResolvedValueOnce({
                    done: false,
                    value: new Uint8Array([1, 2, 3]),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
        };

        const mockResponse = {
            ok: true,
            status: 200,
            headers: {
                get: (h) => {
                    if (h === 'content-length') return '3';
                    if (h === 'content-disposition')
                        return 'attachment; filename="streamed_cat.mp4"';
                    return null;
                },
            },
            body: {
                getReader: () => mockStreamReader,
            },
        };

        const { result } = renderHook(() => useMemeDownloader());

        let filename;
        await act(async () => {
            filename = await result.current.downloadMedia(mockResponse);
        });

        expect(filename).toBe('streamed_cat.mp4');
        expect(result.current.isDownloading).toBe(false);
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(
            'blob:mock-url',
        );
    });

    test('downloads response with indeterminate progress when content-length is missing', async () => {
        const mockStreamReader = {
            read: jest
                .fn()
                .mockResolvedValueOnce({
                    done: false,
                    value: new Uint8Array([5, 6]),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
        };

        const mockResponse = {
            ok: true,
            status: 200,
            headers: {
                get: (h) => (h === 'content-length' ? null : null),
            },
            body: {
                getReader: () => mockStreamReader,
            },
        };

        const { result } = renderHook(() => useMemeDownloader());

        let filename;
        await act(async () => {
            filename = await result.current.downloadMedia(
                mockResponse,
                'fallback.mp4',
            );
        });

        expect(filename).toBe('fallback.mp4');
        expect(result.current.isDownloading).toBe(false);
    });

    test('fetches direct URL when passed string and streams download', async () => {
        const mockStreamReader = {
            read: jest
                .fn()
                .mockResolvedValueOnce({
                    done: false,
                    value: new Uint8Array([1, 2]),
                })
                .mockResolvedValueOnce({ done: true }),
        };

        const mockResponse = {
            ok: true,
            status: 200,
            headers: {
                get: (h) => (h === 'content-length' ? '2' : null),
            },
            body: {
                getReader: () => mockStreamReader,
            },
        };

        global.fetch.mockResolvedValueOnce(mockResponse);

        const { result } = renderHook(() => useMemeDownloader());

        let filename;
        await act(async () => {
            filename = await result.current.downloadMedia(
                'https://example.com/direct.mp4',
                'custom.mp4',
            );
        });

        expect(filename).toBe('custom.mp4');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.com/direct.mp4',
        );
        expect(result.current.isDownloading).toBe(false);
    });

    test('handles 504 Gateway Timeout when fetching string URL and reports to Sentry', async () => {
        const mockErrorResponse = {
            ok: false,
            status: 504,
        };
        global.fetch.mockResolvedValueOnce(mockErrorResponse);

        const { result } = renderHook(() => useMemeDownloader());

        await act(async () => {
            await expect(
                result.current.downloadMedia('https://example.com/timeout.mp4'),
            ).rejects.toThrow('Server Gateway Timeout (504)');
        });

        expect(Sentry.captureMessage).toHaveBeenCalledWith(
            'Server Gateway Timeout (504) during download',
            expect.objectContaining({
                level: 'error',
                extra: expect.objectContaining({ status: 504 }),
            }),
        );
        expect(result.current.isDownloading).toBe(false);
    });

    test('handles stream reading errors and resets downloading states', async () => {
        const mockStreamReader = {
            read: jest.fn().mockRejectedValue(new Error('Network interrupted')),
        };

        const mockResponse = {
            ok: true,
            status: 200,
            headers: {
                get: () => null,
            },
            body: {
                getReader: () => mockStreamReader,
            },
        };

        const { result } = renderHook(() => useMemeDownloader());

        await act(async () => {
            await expect(
                result.current.downloadMedia(mockResponse),
            ).rejects.toThrow('Network interrupted');
        });

        expect(result.current.isDownloading).toBe(false);
        expect(result.current.downloadProgress).toBe(0);
        expect(result.current.isIndeterminate).toBe(false);
    });
});
