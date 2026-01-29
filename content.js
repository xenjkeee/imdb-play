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

function injectButton() {
    // 1. Check if it already exists. If so, do nothing.
    if (document.getElementById('imdb-play-container')) {
        return;
    }

    // Target the primary hero text (the title)
    const titleElement = document.querySelector('[data-testid="hero__primary-text"]') || 
                         document.querySelector('h1[data-testid="hero__primary-text"]');
    
    if (!titleElement) return;

    // Get Page Context
    const metadata = getPageMetadata();
    if (!metadata.currentId) return;

    // Create Container
    const container = document.createElement('div');
    container.id = 'imdb-play-container';
    container.style.marginTop = '12px';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    container.style.flexWrap = 'wrap';

    // Prepare Storage Keys
    const storageKeys = ['baseUrl'];
    // For specific episodes, we need to read/write the PARENT'S progress
    if (metadata.type === 'TVSeries') {
        storageKeys.push(`progress_${metadata.currentId}`);
    } else if (metadata.type === 'TVEpisode' && metadata.parentId) {
        // No read needed for button, but we might want to check existence (optional). 
        // We mostly just need base URL here.
    }

    chrome.storage.sync.get(storageKeys, (items) => {
        const baseUrl = (items.baseUrl || 'https://vsrc.su/').replace(/\/$/, '');

        // --- RENDER LOGIC ---

        if (metadata.type === 'TVEpisode' && metadata.parentId) {
            // === EPISODE PAGE ===
            const playBtn = createButton(`Play S${metadata.season}:E${metadata.episode}`);
            
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Save progress to the PARENT series ID
                const progressKey = `progress_${metadata.parentId}`;
                const newProgress = { season: metadata.season, episode: metadata.episode };
                chrome.storage.sync.set({ [progressKey]: newProgress });

                const vidsrcUrl = `${baseUrl}/embed/tv/${metadata.parentId}/${metadata.season}-${metadata.episode}`;
                window.open(vidsrcUrl, '_blank');
            });
            container.appendChild(playBtn);

        } else if (metadata.type === 'TVSeries') {
            // === SERIES PAGE ===
            const savedProgress = items[`progress_${metadata.currentId}`] || { season: 1, episode: 1 };
            
            const inputStyle = `
                width: 50px; 
                padding: 6px; 
                border-radius: 4px; 
                border: 1px solid #333; 
                background: #1f1f1f; 
                color: white; 
                text-align: center;
                font-weight: bold;
            `;

            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 4px; color: #fff;">
                    <span style="font-size: 0.9em; opacity: 0.8;">S:</span>
                    <input type="number" id="imdb-play-season" min="1" value="${savedProgress.season}" style="${inputStyle}">
                </div>
                <div style="display: flex; align-items: center; gap: 4px; color: #fff;">
                    <span style="font-size: 0.9em; opacity: 0.8;">E:</span>
                    <input type="number" id="imdb-play-episode" min="1" value="${savedProgress.episode}" style="${inputStyle}">
                </div>
            `;

            const playBtn = createButton('Play Episode');
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const s = document.getElementById('imdb-play-season').value;
                const e_val = document.getElementById('imdb-play-episode').value;

                // Save progress
                const progressKey = `progress_${metadata.currentId}`;
                const newProgress = { season: s, episode: e_val };
                chrome.storage.sync.set({ [progressKey]: newProgress });

                // Construct URL
                const vidsrcUrl = `${baseUrl}/embed/tv/${metadata.currentId}/${s}-${e_val}`;
                window.open(vidsrcUrl, '_blank');
            });
            container.appendChild(playBtn);

        } else {
            // === MOVIE PAGE ===
            const playBtn = createButton('Play Movie');
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const vidsrcUrl = `${baseUrl}/embed/movie/${metadata.currentId}`;
                window.open(vidsrcUrl, '_blank');
            });
            container.appendChild(playBtn);
        }

        titleElement.after(container);
    });
}

function createButton(text) {
    const button = document.createElement('button');
    // Mimic IMDb button classes
    button.className = 'ipc-btn ipc-btn--single-padding ipc-btn--center-align-content ipc-btn--default-height ipc-btn--core-accent1 ipc-btn--theme-base ipc-btn--on-accent2';
    button.innerHTML = `<span class="ipc-btn__text">${text}</span>`;
    return button;
}

// Watch for changes (IMDb is an SPA)
let lastUrl = location.href;
let debounceTimer = null;

const observer = new MutationObserver(() => {
    // Clear the pending check if a new mutation comes in quickly
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        // Check for URL change
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            
            const existing = document.getElementById('imdb-play-container');
            if (existing) existing.remove();
        }
        
        // Attempt injection
        injectButton();
    }, 500); // Wait 500ms after the last DOM update before running logic
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial run
setTimeout(injectButton, 1000);