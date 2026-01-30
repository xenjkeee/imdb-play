const DEFAULT_PROVIDERS = [
    {
        name: "VidSrc.su",
        baseUrl: "https://vsrc.su",
        movieFormat: "/embed/movie/{id}",
        tvFormat: "/embed/tv/{id}/{s}-{e}",
        enabled: true
    },
    {
        name: "VidSrc.to",
        baseUrl: "https://vidsrc.to",
        movieFormat: "/embed/movie/{id}",
        tvFormat: "/embed/tv/{id}/{s}/{e}",
        enabled: true
    },
    {
        name: "AutoEmbed",
        baseUrl: "https://player.autoembed.cc",
        movieFormat: "/embed/movie/{id}",
        tvFormat: "/embed/tv/{id}/{s}/{e}",
        enabled: true
    },
    {
        name: "SuperEmbed", 
        baseUrl: "https://multiembed.mov",
        movieFormat: "/?video_id={id}",
        tvFormat: "/?video_id={id}&s={s}&e={e}",
        enabled: false // annoing ads
    },
    {
        name: "SuperEmbed VIP",
        baseUrl: "https://multiembed.mov",
        movieFormat: "/directstream.php?video_id={id}",
        tvFormat: "/directstream.php?video_id={id}&s={s}&e={e}",
        enabled: false // annoing ads
    },
    {
        name: "SmashyStream",
        baseUrl: "https://player.smashy.stream",
        movieFormat: "/movie/{id}",
        tvFormat: "/tv/{id}/{s}/{e}",
        enabled: true
    }
];

/**
 * Constructs the final URL for a given provider and metadata.
 * @param {Object} provider - The provider object.
 * @param {Object} metadata - { currentId, season, episode, type, parentId }
 * @returns {string} The formatted URL.
 */
function constructProviderUrl(provider, metadata) {
    if (!provider || !provider.baseUrl) return '';

    const baseUrl = provider.baseUrl.replace(/\/$/, '');
    let path = '';
    
    // Determine which ID to use
    // For Movies: use currentId
    // For Episodes: use parentId (the show's ID) usually, but the metadata logic 
    // in metadata.js puts the series ID in 'parentId' for Episode pages.
    // For Series pages (where we play an episode): 'currentId' is the series ID.
    
    // We need to normalize this.
    // If type is Movie -> use currentId
    // If type is TVSeries -> use currentId (as series ID)
    // If type is TVEpisode -> use parentId (as series ID)
    
    const isMovie = metadata.type === 'Movie';
    const imdbId = isMovie ? metadata.currentId : (metadata.parentId || metadata.currentId);
    
    // Safety check
    if (!imdbId) return '';

    if (isMovie) {
        path = provider.movieFormat || '/embed/movie/{id}';
    } else {
        path = provider.tvFormat || '/embed/tv/{id}/{s}/{e}';
    }

    // Replace placeholders
    // {id} -> IMDb ID
    // {s} -> Season
    // {e} -> Episode
    
    path = path.replace('{id}', imdbId);
    
    if (!isMovie) {
        path = path.replace('{s}', metadata.season || 1);
        path = path.replace('{e}', metadata.episode || 1);
    }

    return `${baseUrl}${path}`;
}

/**
 * Loads providers from storage, returning defaults if empty.
 * @param {Function} callback - Called with { providers, defaultIndex }
 */
function loadProviders(callback) {
    chrome.storage.sync.get(['providers', 'defaultProviderIndex'], (items) => {
        let providers = items.providers;
        let defaultIndex = items.defaultProviderIndex;

        // Initialize if empty
        if (!providers || providers.length === 0) {
            providers = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
            defaultIndex = 0;
            // Optionally save immediately so next time it's there? 
            // Let's not write implicitly, just return defaults.
        }

        // Validate index
        if (typeof defaultIndex !== 'number' || defaultIndex < 0 || defaultIndex >= providers.length) {
            defaultIndex = 0;
        }

        callback({ providers, defaultIndex });
    });
}
