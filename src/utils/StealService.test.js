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

    test('stealMeme returns json on success', async () => {
        const mockResult = {
            success: true,
            media: [{ url: 'http://example.com/file.mp4' }],
        };
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue(mockResult),
        });

        const result = await StealingService.stealMeme('http://some-meme.com');
        expect(global.fetch).toHaveBeenCalledWith(
            `${Constants.MEME_STEALER_URL}/${encodeURIComponent('http://some-meme.com')}`,
        );
        expect(result).toEqual(mockResult);
    });

    test('stealMeme returns error info on non-ok response', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
        });

        const result = await StealingService.stealMeme('http://some-meme.com');
        expect(result).toEqual({
            success: false,
            status: 500,
            error: 'HTTP error! Status: 500',
        });
    });

    test('stealMeme returns error message on exception', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await StealingService.stealMeme('http://some-meme.com');
        expect(result).toEqual({
            success: false,
            error: 'Network error',
        });
    });
});
