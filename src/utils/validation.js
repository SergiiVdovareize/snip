export const validateMeme = (url) => {
    const urlPatterns = {
        tiktok: /tiktok\.com/i,
        instagram: /instagram\.com|instagr\.am/i,
        facebook: /facebook\.com|fb\.watch|\bfb\.com/i,
        twitter: /twitter\.com|\bx\.com/i,
        youtube: /youtube\.com|youtu\.be/i,
        reddit: /reddit\.com/i,
        pinterest: /pinterest\.|pin\.it/i,
        threads: /threads\.(net|com)/i,
        linkedin: /linkedin\.com|lnkd\.in/i,
        snapchat: /snapchat\.com/i,
        soundcloud: /soundcloud\.com/i,
        spotify: /spotify\.com|spotify\.link/i,
        tumblr: /tumblr\.com|tmblr\.co/i,
        douyin: /douyin\.com/i,
        kuaishou: /kuaishou\.com/i,
        dailymotion: /dailymotion\.com|dai\.ly/i,
        bluesky: /bsky\.app/i,
        capcut: /capcut\.com/i,
        terabox: /terabox\.com/i,
    };

    const trimmedUrl = url ? url.trim() : '';
    const isValid = Object.values(urlPatterns).some((pattern) =>
        pattern.test(trimmedUrl),
    );
    return isValid ? trimmedUrl : null;
};
