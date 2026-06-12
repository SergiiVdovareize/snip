import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@sentry/react', () => ({
    captureMessage: jest.fn(),
}));

describe('Snip Application Integration Tests', () => {
    let originalFetch;

    beforeAll(() => {
        originalFetch = global.fetch;
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Spy on document.createElement to verify download trigger
        jest.spyOn(document, 'createElement');
    });

    afterEach(() => {
        document.createElement.mockRestore();
    });

    test('successful end-to-end stealing and downloading flow', async () => {
        const mockMetadata = {
            success: true,
            platform: 'twitter',
            media: [
                {
                    url: 'https://twitter-cdn.com/media.mp4',
                    sizeMB: 3.4,
                },
            ],
        };

        const mockReader = {
            read: jest
                .fn()
                .mockResolvedValueOnce({
                    done: false,
                    value: new Uint8Array([1, 2, 3]),
                })
                .mockResolvedValueOnce({ done: true }),
        };

        const mockDownloadResponse = {
            ok: true,
            status: 200,
            headers: {
                get: (header) => (header === 'content-length' ? '3' : null),
            },
            body: {
                getReader: () => mockReader,
            },
        };

        let resolveSteal;
        const stealPromise = new Promise((resolve) => {
            resolveSteal = () =>
                resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockMetadata),
                });
        });

        let resolveDownload;
        const downloadPromise = new Promise((resolve) => {
            resolveDownload = () => resolve(mockDownloadResponse);
        });

        global.fetch = jest.fn((url) => {
            if (url.includes('/memes')) {
                return stealPromise;
            }
            if (url.includes('/download')) {
                return downloadPromise;
            }
            return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
        });

        // Mock URL.createObjectURL and URL.revokeObjectURL
        const originalCreateObjectURL = URL.createObjectURL;
        const originalRevokeObjectURL = URL.revokeObjectURL;
        URL.createObjectURL = jest.fn(() => 'blob:mock-download-url');
        URL.revokeObjectURL = jest.fn();

        render(<App />);

        const textarea = screen.getByPlaceholderText(/paste url here/i);
        const submitButton = screen.getByRole('button', { name: /steal me/i });

        // Input a valid Twitter URL
        fireEvent.change(textarea, {
            target: { value: 'https://twitter.com/username/status/123456789' },
        });

        // Trigger stealing submit (does not resolve stealPromise yet)
        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Verify elements are disabled during stealing/downloading
        expect(textarea).toBeDisabled();

        // Resolve steal metadata fetch
        await act(async () => {
            resolveSteal();
        });

        // Verify elements are still disabled (now in downloading state)
        expect(textarea).toBeDisabled();

        // Resolve download media fetch
        await act(async () => {
            resolveDownload();
        });

        // Wait for state updates to finish (including the short 250ms delay for completion visual feedback)
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 300));
        });

        // Verify elements are re-enabled
        expect(textarea).not.toBeDisabled();

        // Verify fetch was called correctly
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining(
                '/memes/https%3A%2F%2Ftwitter.com%2Fusername%2Fstatus%2F123456789',
            ),
        );
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining(
                '/download?url=https%3A%2F%2Ftwitter-cdn.com%2Fmedia.mp4',
            ),
        );

        // Restore URL mocks
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
    });

    test('validates and handles unsupported URLs locally without network calls', async () => {
        global.fetch = jest.fn();

        render(<App />);

        const textarea = screen.getByPlaceholderText(/paste url here/i);
        const submitButton = screen.getByRole('button', { name: /steal me/i });

        // Input an unsupported URL
        fireEvent.change(textarea, {
            target: { value: 'https://unsupported-site.com/video/123' },
        });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Verify local validation caught it and no fetch was triggered
        expect(global.fetch).not.toHaveBeenCalled();
        expect(screen.getByText('URL is not supported')).toBeInTheDocument();
    });

    test('handles 403 Forbidden with direct link fallback in the download proxy', async () => {
        const mockMetadata = {
            success: true,
            platform: 'instagram',
            media: [
                {
                    url: 'https://instagram-cdn.com/reel.mp4',
                    sizeMB: 1.5,
                },
            ],
        };

        const mockErrorResponse = {
            ok: false,
            status: 403,
            clone: () => ({
                json: () =>
                    Promise.resolve({
                        statusCode: 403,
                        message: 'Failed to fetch media: Forbidden',
                    }),
            }),
        };

        const mockDirectReader = {
            read: jest
                .fn()
                .mockResolvedValueOnce({
                    done: false,
                    value: new Uint8Array([9, 9]),
                })
                .mockResolvedValueOnce({ done: true }),
        };

        const mockDirectResponse = {
            ok: true,
            status: 200,
            headers: {
                get: (header) => (header === 'content-length' ? '2' : null),
            },
            body: {
                getReader: () => mockDirectReader,
            },
        };

        let resolveSteal;
        const stealPromise = new Promise((resolve) => {
            resolveSteal = () =>
                resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockMetadata),
                });
        });

        let resolveDownloadError;
        const downloadErrorPromise = new Promise((resolve) => {
            resolveDownloadError = () => resolve(mockErrorResponse);
        });

        let resolveDirectDownload;
        const directDownloadPromise = new Promise((resolve) => {
            resolveDirectDownload = () => resolve(mockDirectResponse);
        });

        global.fetch = jest.fn((url) => {
            if (url.includes('/memes')) {
                return stealPromise;
            }
            if (url.includes('/download')) {
                return downloadErrorPromise;
            }
            if (url.includes('https://instagram-cdn.com/')) {
                return directDownloadPromise;
            }
            return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
        });

        // Mock URL.createObjectURL and URL.revokeObjectURL
        const originalCreateObjectURL = URL.createObjectURL;
        const originalRevokeObjectURL = URL.revokeObjectURL;
        URL.createObjectURL = jest.fn(() => 'blob:mock-direct-download-url');
        URL.revokeObjectURL = jest.fn();

        render(<App />);

        const textarea = screen.getByPlaceholderText(/paste url here/i);
        const submitButton = screen.getByRole('button', { name: /steal me/i });

        fireEvent.change(textarea, {
            target: { value: 'https://instagram.com/reel/123/' },
        });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Resolve steal metadata
        await act(async () => {
            resolveSteal();
        });

        // Resolve download proxy failure (403)
        await act(async () => {
            resolveDownloadError();
        });

        // Resolve direct link fetch
        await act(async () => {
            resolveDirectDownload();
        });

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 300));
        });

        // Verify it attempted to fetch proxy first, got 403, then fetched direct URL
        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(global.fetch).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('/memes/'),
        );
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('/download'),
        );
        expect(global.fetch).toHaveBeenNthCalledWith(
            3,
            'https://instagram-cdn.com/reel.mp4',
        );

        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
    });
});
