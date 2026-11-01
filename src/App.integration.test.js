import * as Sentry from '@sentry/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@sentry/react', () => ({
    captureMessage: jest.fn(),
}));

describe('Snip Application Integration Tests', () => {
    let originalFetch;
    let clickSpy;

    beforeAll(() => {
        originalFetch = global.fetch;
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock HTMLAnchorElement.prototype.click to prevent JSDOM navigation error
        clickSpy = jest
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});
    });

    afterEach(() => {
        clickSpy.mockRestore();
    });

    test('successful end-to-end direct stream downloading flow', async () => {
        const mockReader = {
            read: jest
                .fn()
                .mockResolvedValueOnce({
                    done: false,
                    value: new Uint8Array([1, 2, 3]),
                })
                .mockResolvedValueOnce({ done: true }),
        };

        const mockStreamResponse = {
            ok: true,
            status: 200,
            headers: {
                get: (header) => {
                    if (header === 'content-length') return '3';
                    if (header === 'content-disposition')
                        return 'attachment; filename="twitter_video.mp4"';
                    return null;
                },
            },
            body: {
                getReader: () => mockReader,
            },
        };

        let resolveStream;
        const streamPromise = new Promise((resolve) => {
            resolveStream = () => resolve(mockStreamResponse);
        });

        global.fetch = jest.fn((url) => {
            if (url.includes('/memes')) {
                return streamPromise;
            }
            return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
        });

        const originalCreateObjectURL = URL.createObjectURL;
        const originalRevokeObjectURL = URL.revokeObjectURL;
        URL.createObjectURL = jest.fn(() => 'blob:mock-download-url');
        URL.revokeObjectURL = jest.fn();

        render(<App />);

        const textarea = screen.getByPlaceholderText(/paste url here/i);
        const submitButton = screen.getByRole('button', { name: /steal me/i });

        fireEvent.change(textarea, {
            target: { value: 'https://twitter.com/username/status/123456789' },
        });

        // Trigger stealing submit
        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Verify elements are disabled during download
        expect(textarea).toBeDisabled();

        // Resolve single-step stream fetch
        await act(async () => {
            resolveStream();
        });

        // Wait for short delay for 100% completion feedback
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 300));
        });

        // Verify elements are re-enabled
        expect(textarea).not.toBeDisabled();

        // Verify single fetch call to /memes/:url
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(
                '/memes/https%3A%2F%2Ftwitter.com%2Fusername%2Fstatus%2F123456789',
            ),
        );

        // Verify info message displayed with parsed filename
        expect(
            screen.getByText('File successfully downloaded: twitter_video.mp4'),
        ).toBeInTheDocument();

        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
    });

    test('validates and handles unsupported URLs locally without network calls', async () => {
        global.fetch = jest.fn();

        render(<App />);

        const textarea = screen.getByPlaceholderText(/paste url here/i);
        const submitButton = screen.getByRole('button', { name: /steal me/i });

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

    test('handles 400 Bad Request error response (photo-only post)', async () => {
        const mockErrorResponse = {
            ok: false,
            status: 400,
            json: () =>
                Promise.resolve({
                    message: 'Only video content is supported',
                }),
        };

        global.fetch = jest.fn().mockResolvedValue(mockErrorResponse);

        render(<App />);

        const textarea = screen.getByPlaceholderText(/paste url here/i);
        const submitButton = screen.getByRole('button', { name: /steal me/i });

        fireEvent.change(textarea, {
            target: { value: 'https://instagram.com/p/photo123' },
        });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        expect(
            screen.getByText('Only video content is supported'),
        ).toBeInTheDocument();
    });

    test('handles 504 Gateway Timeout error response and captures to Sentry', async () => {
        const mockErrorResponse = {
            ok: false,
            status: 504,
        };

        global.fetch = jest.fn().mockResolvedValue(mockErrorResponse);

        render(<App />);

        const textarea = screen.getByPlaceholderText(/paste url here/i);
        const submitButton = screen.getByRole('button', { name: /steal me/i });

        fireEvent.change(textarea, {
            target: { value: 'https://twitter.com/user/status/504' },
        });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        expect(
            screen.getByText('Server Gateway Timeout (504)'),
        ).toBeInTheDocument();
        expect(Sentry.captureMessage).toHaveBeenCalledWith(
            'Server Gateway Timeout (504) during scraping',
            expect.objectContaining({
                level: 'error',
                extra: expect.objectContaining({
                    status: 504,
                }),
            }),
        );
    });
});
