function createButton(text) {
    const button = document.createElement('button');
    // Mimic IMDb button classes
    button.className = 'ipc-btn ipc-btn--single-padding ipc-btn--center-align-content ipc-btn--default-height ipc-btn--core-accent1 ipc-btn--theme-base ipc-btn--on-accent2';
    button.innerHTML = `<span class="ipc-btn__text">${text}</span>`;
    return button;
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
                width: 70px; 
                padding: 6px; 
                box-sizing: border-box;
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
