import Constants from './Constants';
import StealingService from './StealService';

describe('StealingService', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    test('stealMeme queries direct stream endpoint with encoded URL', async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            headers: new Headers({
                'content-disposition': 'attachment; filename="meme.mp4"',
            }),
        };
        global.fetch.mockResolvedValueOnce(mockResponse);

        const result = await StealingService.stealMeme('http://some-meme.com');
        expect(global.fetch).toHaveBeenCalledWith(
            `${Constants.MEME_STEALER_URL}/${encodeURIComponent('http://some-meme.com')}`,
        );
        expect(result).toBe(mockResponse);
    });

    test('stealMeme propagates rejection on network error', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(
            StealingService.stealMeme('http://some-meme.com'),
        ).rejects.toThrow('Network error');
    });
});
