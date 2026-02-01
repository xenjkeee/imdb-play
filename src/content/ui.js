function createButton(text, icon = null, isSplitLeft = false) {
    const button = document.createElement('button');
    // Mimic IMDb button classes
    button.className = 'ipc-btn ipc-btn--single-padding ipc-btn--center-align-content ipc-btn--default-height ipc-btn--core-accent1 ipc-btn--theme-base ipc-btn--on-accent2';
    button.style.position = 'relative'; 
    
    // Split button styling
    if (isSplitLeft) {
        button.style.borderTopRightRadius = '0';
        button.style.borderBottomRightRadius = '0';
        button.style.borderRight = '1px solid rgba(0,0,0,0.2)'; // Dark separator
        button.style.marginRight = '0';
    }

    let html = `<span class="ipc-btn__text">${text}</span>`;
    if (icon) {
        html += `<span style="margin-left: 8px; font-size: 0.8em;">${icon}</span>`;
    }
    button.innerHTML = html;
    return button;
}

function createDropdown(providers, currentIndex, onSelect, isSplitRight = false) {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.display = 'inline-flex'; // Ensures height matches

    // The trigger button (arrow)
    const trigger = document.createElement('button');
    trigger.className = 'ipc-btn ipc-btn--single-padding ipc-btn--center-align-content ipc-btn--default-height ipc-btn--core-accent1 ipc-btn--theme-base ipc-btn--on-accent2';
    trigger.style.padding = '0 12px'; // Tighter padding for the arrow
    
    // Split styling
    if (isSplitRight) {
        trigger.style.borderTopLeftRadius = '0';
        trigger.style.borderBottomLeftRadius = '0';
        trigger.style.marginLeft = '0';
    }

    // Icon (Chevron Down)
    trigger.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="ipc-icon ipc-icon--arrow-drop-down" style="width: 1rem; height: 1rem;">
            <path d="M7 10l5 5 5-5z"></path>
        </svg>
    `;
    
    // The menu (hidden by default)
    const menu = document.createElement('div');
    menu.style.display = 'none';
    menu.style.position = 'absolute';
    menu.style.top = '100%';
    menu.style.right = '0'; // Align to right edge of trigger
    menu.style.minWidth = '200px';
    menu.style.backgroundColor = '#1f1f1f';
    menu.style.border = '1px solid #333';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.7)';
    menu.style.zIndex = '1000';
    menu.style.marginTop = '4px';
    menu.style.overflow = 'hidden'; // For corner radius

    // Populate menu
    providers.forEach((p, index) => {
        if (!p.enabled || index === currentIndex) return;

        const item = document.createElement('div');
        item.style.padding = '12px 16px';
        item.style.cursor = 'pointer';
        item.style.color = '#e1e1e1';
        item.style.fontSize = '14px'; // Matches IMDb standard
        item.style.fontFamily = 'Roboto, Helvetica, Arial, sans-serif';
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.borderBottom = '1px solid #2a2a2a';
        item.style.transition = 'background-color 0.1s ease';

        // Content
        const nameSpan = document.createElement('span');
        nameSpan.textContent = p.name;
        nameSpan.style.fontWeight = '500';
        item.appendChild(nameSpan);

        // Hover effect
        item.addEventListener('mouseenter', () => item.style.backgroundColor = '#333');
        item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
        
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = 'none';
            onSelect(p);
        });

        menu.appendChild(item);
    });

    // Remove border from last item
    if (menu.lastChild) menu.lastChild.style.borderBottom = 'none';

    // Toggle logic
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isVisible = menu.style.display === 'block';
        
        // Hide all other open dropdowns first (if we had multiple)
        document.querySelectorAll('.imdb-play-dropdown-menu').forEach(el => el.style.display = 'none');
        
        menu.style.display = isVisible ? 'none' : 'block';
    });

    // Close on outside click
    document.addEventListener('click', () => {
        menu.style.display = 'none';
    });

    menu.className = 'imdb-play-dropdown-menu'; // Class for global closing logic
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

    chrome.storage.sync.get(keysToFetch, (items) => {
        // Init Providers
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

        const otherProviders = providers.filter((p, i) => p.enabled && i !== defaultIndex);
        const hasDropdown = otherProviders.length > 0;

        // Wrapper for the split button
        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.alignItems = 'stretch'; // Ensure equal height

        let mainBtnText = 'Play Movie';

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
                font-size: 14px;
            `;

            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 4px; color: #fff; margin-right: 4px;">
                    <span style="font-size: 0.9em; opacity: 0.8;">S:</span>
                    <input type="number" id="imdb-play-season" min="1" value="${savedProgress.season}" style="${inputStyle}">
                </div>
                <div style="display: flex; align-items: center; gap: 4px; color: #fff; margin-right: 8px;">
                    <span style="font-size: 0.9em; opacity: 0.8;">E:</span>
                    <input type="number" id="imdb-play-episode" min="1" value="${savedProgress.episode}" style="${inputStyle}">
                </div>
            `;
            mainBtnText = 'Play Episode';

        } else if (metadata.type === 'TVEpisode') {
            mainBtnText = `Play S${metadata.season}:E${metadata.episode}`;
        }

        // Create Main Button
        const playBtn = createButton(mainBtnText, null, hasDropdown);
        playBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handlePlay(defaultProvider);
        });
        buttonGroup.appendChild(playBtn);

        // Create Dropdown (if needed)
        if (hasDropdown) {
            const dropdown = createDropdown(providers, defaultIndex, (selectedProvider) => {
                handlePlay(selectedProvider);
            }, true);
            buttonGroup.appendChild(dropdown);
        }

        container.appendChild(buttonGroup);
        titleElement.after(container);
    });
}