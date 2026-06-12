import { act, renderHook } from '@testing-library/react';
import Constants from '../utils/Constants';
import useMemeDownloader from './useMemeDownloader';

jest.mock('@sentry/react', () => ({
    captureMessage: jest.fn(),
}));

describe('useMemeDownloader Hook', () => {
    let originalFetch;
    let originalCreateObjectURL;
    let originalRevokeObjectURL;
    let clickSpy;

    beforeEach(() => {
        originalFetch = global.fetch;
        originalCreateObjectURL = global.URL.createObjectURL;
        originalRevokeObjectURL = global.URL.revokeObjectURL;

        global.fetch = jest.fn();
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();

        // Mock HTMLAnchorElement.prototype.click to prevent JSDOM navigation error
        clickSpy = jest
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});

        jest.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        global.URL.createObjectURL = originalCreateObjectURL;
        global.URL.revokeObjectURL = originalRevokeObjectURL;
        clickSpy.mockRestore();
    });

    test('initializes with default states', () => {
        const { result } = renderHook(() => useMemeDownloader());
        expect(result.current.isDownloading).toBe(false);
        expect(result.current.downloadProgress).toBe(0);
        expect(result.current.isIndeterminate).toBe(false);
    });

    test('downloads a small file successfully', async () => {
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
                get: jest.fn().mockReturnValue('3'),
            },
            body: {
                getReader: () => mockStreamReader,
            },
        };

        global.fetch.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useMemeDownloader());

        let downloadPromise;
        await act(async () => {
            downloadPromise = result.current.downloadMedia(
                'https://test.com/media.mp4',
                'media.mp4',
                0.5,
            );
        });

        await act(async () => {
            await downloadPromise;
        });

        expect(global.fetch).toHaveBeenCalledWith(
            `${Constants.DOWNLOAD}?url=${encodeURIComponent('https://test.com/media.mp4')}&filename=${encodeURIComponent('media.mp4')}`,
        );
        expect(result.current.isDownloading).toBe(false);
    });

    test('performs direct fetch fallback on 403 proxy response', async () => {
        const mockErrorJson = {
            statusCode: 403,
            message: 'Failed to fetch media: Forbidden',
        };

        const mockProxyResponse = {
            status: 403,
            clone: () => ({
                json: () => Promise.resolve(mockErrorJson),
            }),
        };

        const mockStreamReader = {
            read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
        };

        const mockDirectResponse = {
            ok: true,
            status: 200,
            headers: {
                get: jest.fn().mockReturnValue(null),
            },
            body: {
                getReader: () => mockStreamReader,
            },
        };

        global.fetch
            .mockResolvedValueOnce(mockProxyResponse)
            .mockResolvedValueOnce(mockDirectResponse);

        const { result } = renderHook(() => useMemeDownloader());

        let downloadPromise;
        await act(async () => {
            downloadPromise = result.current.downloadMedia(
                'https://test.com/media.mp4',
                'media.mp4',
            );
        });

        await act(async () => {
            await downloadPromise;
        });

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            'https://test.com/media.mp4',
        );
    });

    test('clicks fallback link in target blank on 403 direct fetch failure', async () => {
        const mockErrorJson = {
            statusCode: 403,
            message: 'Failed to fetch media: Forbidden',
        };

        const mockProxyResponse = {
            status: 403,
            clone: () => ({
                json: () => Promise.resolve(mockErrorJson),
            }),
        };

        global.fetch
            .mockResolvedValueOnce(mockProxyResponse)
            .mockRejectedValueOnce(new Error('CORS fail'));

        const mockAnchor = document.createElement('a');
        const originalCreateElement = document.createElement.bind(document);
        const mockCreateElement = jest
            .spyOn(document, 'createElement')
            .mockImplementation((tagName) => {
                if (tagName === 'a') {
                    return mockAnchor;
                }
                return originalCreateElement(tagName);
            });

        const { result } = renderHook(() => useMemeDownloader());

        let downloadPromise;
        await act(async () => {
            downloadPromise = result.current.downloadMedia(
                'https://test.com/media.mp4',
                'media.mp4',
            );
        });

        await act(async () => {
            await downloadPromise;
        });

        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockAnchor.href).toBe('https://test.com/media.mp4');
        expect(mockAnchor.target).toBe('_blank');
        expect(clickSpy).toHaveBeenCalled();

        mockCreateElement.mockRestore();
    });
});
