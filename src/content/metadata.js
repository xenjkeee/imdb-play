/**
 * Analyzes the page to determine context (Movie, Series, or Specific Episode).
 * Returns a metadata object.
 */
function getPageMetadata() {
    const context = {
        type: 'Unknown',
        currentId: null,
        parentId: null,
        season: 1,
        episode: 1
    };

    // 1. Get Current ID from URL
    const match = window.location.pathname.match(/\/title\/(tt\d+)/);
    if (match && match[1]) {
        context.currentId = match[1];
    } else {
        return context; // No ID found, abort
    }

    // 2. Parse JSON-LD
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
        try {
            const data = JSON.parse(jsonLd.textContent);
            const type = data['@type'];

            if (type === 'Movie') {
                context.type = 'Movie';
            } else if (type === 'TVSeries' || type === 'TVSeason') {
                context.type = 'TVSeries';
            } else if (type === 'TVEpisode') {
                context.type = 'TVEpisode';
                
                // Try to get data from JSON-LD if available
                if (data.episodeNumber) context.episode = data.episodeNumber;
                if (data.partOfSeason?.seasonNumber) context.season = data.partOfSeason.seasonNumber;
                
                if (data.partOfSeries?.url) {
                    const seriesMatch = data.partOfSeries.url.match(/\/title\/(tt\d+)/);
                    if (seriesMatch) context.parentId = seriesMatch[1];
                }
            }
        } catch (e) {
            console.error("[imdb-play] Error parsing JSON-LD:", e);
        }
    }

    // 3. Fallback / Enhancement Scraper (DOM)
    // If we know it's an episode (or suspect it), try to fill missing gaps from the visual UI
    
    // Check for "S1.E3" text block commonly found in the hero section
    const seBlock = document.querySelector('[data-testid="hero-subnav-bar-season-episode-numbers-section"]');
    if (seBlock) {
        context.type = 'TVEpisode'; // Confirm it is an episode
        const text = seBlock.textContent.trim(); // "S1.E3"
        const match = text.match(/S(\d+)\.E(\d+)/);
        if (match) {
            context.season = match[1];
            context.episode = match[2];
        }
    }

    // Check for Parent Series Link if we are missing the ID
    if (context.type === 'TVEpisode' && !context.parentId) {
        // This link usually sits right above the episode title
        const seriesLink = document.querySelector('[data-testid="hero-title-block__series-link"]');
        if (seriesLink) {
            const href = seriesLink.getAttribute('href');
            const match = href.match(/\/title\/(tt\d+)/);
            if (match) {
                context.parentId = match[1];
            }
        }
    }

    // Fallback if JSON-LD fails or is incomplete
    if (context.type === 'Unknown') {
        if (document.querySelector('[data-testid="hero-subnav-bar-season-episode-picker-section"]')) {
            context.type = 'TVSeries';
        } else {
            // Default to movie if valid ID exists
            context.type = 'Movie';
        }
    }

    return context;
}
