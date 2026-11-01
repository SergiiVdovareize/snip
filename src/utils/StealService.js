import Constants from './Constants';

const StealingService = {
    async stealMeme(memeUrl) {
        return await fetch(
            `${Constants.MEME_STEALER_URL}/${encodeURIComponent(memeUrl)}`,
        );
    },
};

export default StealingService;
