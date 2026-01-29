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