function createButton(text, icon = null) {
    const button = document.createElement('button');
    // Mimic IMDb button classes
    button.className = 'ipc-btn ipc-btn--single-padding ipc-btn--center-align-content ipc-btn--default-height ipc-btn--core-accent1 ipc-btn--theme-base ipc-btn--on-accent2';
    button.style.position = 'relative'; // For dropdown positioning
    
    let html = `<span class="ipc-btn__text">${text}</span>`;
    if (icon) {
        html += `<span style="margin-left: 8px; font-size: 0.8em;">${icon}</span>`;
    }
    button.innerHTML = html;
    return button;
}

function createDropdown(providers, currentIndex, onSelect) {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.display = 'inline-block';

    // The trigger button (small arrow)
    const trigger = document.createElement('button');
    trigger.className = 'ipc-btn ipc-btn--single-padding ipc-btn--center-align-content ipc-btn--default-height ipc-btn--core-accent1 ipc-btn--theme-base ipc-btn--on-accent2';
    trigger.style.marginLeft = '2px';
    trigger.style.padding = '0 8px';
    trigger.innerHTML = '▼';
    
    // The menu (hidden by default)
    const menu = document.createElement('div');
    menu.style.display = 'none';
    menu.style.position = 'absolute';
    menu.style.top = '100%';
    menu.style.left = '0';
    menu.style.minWidth = '150px';
    menu.style.backgroundColor = '#1f1f1f';
    menu.style.border = '1px solid #333';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    menu.style.zIndex = '1000';
    menu.style.marginTop = '4px';

    // Populate menu
    providers.forEach((p, index) => {
        if (!p.enabled || index === currentIndex) return;

        const item = document.createElement('div');
        item.textContent = p.name;
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.style.color = 'white';
        item.style.fontSize = '14px';
        item.style.borderBottom = '1px solid #333';

        item.addEventListener('mouseover', () => item.style.backgroundColor = '#333');
        item.addEventListener('mouseout', () => item.style.backgroundColor = 'transparent');
        
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = 'none';
            onSelect(p);
        });

        menu.appendChild(item);
    });

    // Toggle logic
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    // Close on outside click
    document.addEventListener('click', () => {
        menu.style.display = 'none';
    });

    container.appendChild(trigger);
    container.appendChild(menu);
    
    return container;
}

function injectButton() {
    // 1. Check if it already exists.
    if (document.getElementById('imdb-play-container')) return;

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

    // Prepare Storage Keys for progress
    const progressKey = metadata.type === 'TVSeries' 
        ? `progress_${metadata.currentId}` 
        : (metadata.parentId ? `progress_${metadata.parentId}` : null);

    const keysToFetch = ['providers', 'defaultProviderIndex'];
    if (progressKey) keysToFetch.push(progressKey);

    // Using chrome.storage.sync directly here to fetch progress + config together 
    // (loadProviders wrapper is async but we need progress too, mixing them is fine)
    chrome.storage.sync.get(keysToFetch, (items) => {
        // Init Providers (logic copied from loadProviders to save a callback)
        let providers = items.providers;
        let defaultIndex = items.defaultProviderIndex;

        if (!providers || providers.length === 0) {
            providers = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
            defaultIndex = 0;
        }
        
        const defaultProvider = providers[defaultIndex] || providers[0];

        // Helper to handle playback
        const handlePlay = (provider) => {
            let finalMetadata = { ...metadata };
            
            // If on Series Page, read inputs
            if (metadata.type === 'TVSeries') {
                const s = document.getElementById('imdb-play-season').value;
                const e_val = document.getElementById('imdb-play-episode').value;
                finalMetadata.season = s;
                finalMetadata.episode = e_val;

                // Save progress
                chrome.storage.sync.set({ [progressKey]: { season: s, episode: e_val } });
            } else if (metadata.type === 'TVEpisode' && metadata.parentId) {
                // Save progress (auto-detected S/E)
                chrome.storage.sync.set({ [progressKey]: { season: metadata.season, episode: metadata.episode } });
            }

            const url = constructProviderUrl(provider, finalMetadata);
            if (url) window.open(url, '_blank');
        };

        // --- RENDER LOGIC ---

        if (metadata.type === 'TVSeries') {
            // === SERIES PAGE ===
            const savedProgress = items[progressKey] || { season: 1, episode: 1 };
            
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
                handlePlay(defaultProvider);
            });
            container.appendChild(playBtn);

        } else if (metadata.type === 'TVEpisode') {
            // === EPISODE PAGE ===
            const playBtn = createButton(`Play S${metadata.season}:E${metadata.episode}`);
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handlePlay(defaultProvider);
            });
            container.appendChild(playBtn);
        } else {
            // === MOVIE PAGE ===
            const playBtn = createButton('Play Movie');
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handlePlay(defaultProvider);
            });
            container.appendChild(playBtn);
        }

        // === DROPDOWN (If there are other enabled providers) ===
        const otherProviders = providers.filter((p, i) => p.enabled && i !== defaultIndex);
        if (otherProviders.length > 0) {
            const dropdown = createDropdown(providers, defaultIndex, (selectedProvider) => {
                handlePlay(selectedProvider);
            });
            container.appendChild(dropdown);
        }

        titleElement.after(container);
    });
}