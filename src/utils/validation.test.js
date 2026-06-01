import { validateMeme } from './validation';

describe('validateMeme', () => {
    test('should return trimmed URL for supported platforms', () => {
        const supported = [
            'https://www.tiktok.com/@user/video/1234567890',
            'https://www.instagram.com/p/CtX2Y0RJ3k-/',
            'https://twitter.com/user/status/1234567890',
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://reddit.com/r/memes/comments/xyz/',
            'https://www.pinterest.com/pin/12345/',
            'https://www.threads.net/@user/post/abc',
            'https://www.linkedin.com/posts/activity-1234',
            'https://snapchat.com/add/username',
            'https://soundcloud.com/artist/track',
            'https://open.spotify.com/track/1234',
            'https://www.tumblr.com/blog/post/1234',
            'https://www.douyin.com/video/1234',
            'https://kuaishou.com/photo/1234',
            'https://www.dailymotion.com/video/x7tg',
            'https://bsky.app/profile/user',
            'https://www.capcut.com/template/1234',
            'https://terabox.com/s/1234',
        ];

        for (const url of supported) {
            expect(validateMeme(url)).toBe(url);
            expect(validateMeme(`  ${url}  `)).toBe(url); // Should trim
        }
    });

    test('should return null for unsupported domains', () => {
        const unsupported = [
            'https://google.com',
            'https://github.com',
            'not-a-url',
            '',
        ];

        for (const url of unsupported) {
            expect(validateMeme(url)).toBeNull();
        }
    });
});
