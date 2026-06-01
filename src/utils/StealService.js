import Constants from './Constants';

const getResult = async (url) => {
    try {
        const data = await fetch(url);
        if (!data.ok) {
            return {
                success: false,
                status: data.status,
                error: `HTTP error! Status: ${data.status}`,
            };
        }
        const json = await data.json();
        return json;

        // if (json.type === 'sync') {
        //     return json.data;
        // }

        // if (json.type === 'async') {
        //     return await getAsyncResult(`${Constants.RESULT_URL}/${json.data}`)
        // }

        // return {
        //     success: false,
        //     error: json.error || json.message || 'unknown issue',
        // }
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
};

const getAsyncResult = async (url) => {
    try {
        const data = await fetch(url);
        if (!data.ok) {
            return {
                success: false,
                status: data.status,
                error: `HTTP error! Status: ${data.status}`,
            };
        }
        const json = await data.json();

        if (json.success) {
            return json;
        }

        if (!json.success && json.status === 2) {
            return await getAsyncResult(url);
        }

        return {
            success: false,
            error: json.error || json.message || 'unknown issue',
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
};

const StealingService = {
    async stealMeme(memeUrl) {
        return await getResult(
            `${Constants.MEME_STEALER_URL}/${encodeURIComponent(memeUrl)}`,
        );
    },
};

export default StealingService;
