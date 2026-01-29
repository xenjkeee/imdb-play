# imdb-play Extension

A Chrome extension that injects movie and TV show playback links directly into IMDb pages. It provides a seamless way to navigate from a title's metadata to an external viewer using a configurable provider URL.

## Core Features

### 1. Context-Aware Injection
The extension intelligently identifies the type of IMDb page you are on and adapts its interface accordingly:

*   **Movie Pages:** Injects a "Play Movie" button.
*   **TV Series Pages:** Injects a "Play Episode" button alongside Season and Episode number inputs.
*   **TV Episode Pages:** Identifies the specific season and episode number automatically and provides a targeted "Play S{X}:E{Y}" button.

### 2. Progress Tracking
For TV Series, the extension automatically remembers your last watched position.
*   If you play an episode from the main Series page, it saves those numbers.
*   If you play from a specific Episode page, it updates the progress for the parent series.
*   When you return to a show's main page, your last watched Season and Episode are pre-filled.

### 3. Configurable Provider
Users can define their preferred base URL for playback via the Extension Options page.
*   **Default:** `https://vsrc.su/`
*   **Access:** Right-click the extension icon and select "Options".

## Technical Implementation

### Metadata Extraction
The extension uses a multi-layered approach to understand page content:
*   **JSON-LD Parsing:** Primary method for extracting media type, IDs, and episode data from IMDb's structured metadata.
*   **DOM Scraping:** Fallback method that targets specific IMDb data attributes (e.g., `data-testid`) to extract breadcrumbs and episode markers when JSON-LD is incomplete.

### Performance & Stability
*   **SPA Support:** Since IMDb is a Single Page Application (SPA), the extension uses a `MutationObserver` to detect navigation without page reloads.
*   **Debouncing:** The observer logic is debounced (500ms) to ensure it doesn't impact browser performance during page hydration.
*   **Manifest V3:** Built using the latest Chrome Extension standards.

## File Structure

```text
imdb-play/
├── icons/              # Extension icons
├── manifest.json       # Extension configuration and permissions
├── content.js          # Core logic for DOM injection and metadata scraping
├── options.html        # Settings UI HTML
├── options.js          # Settings UI logic
└── GEMINI.md           # Documentation of functionality and architecture
```
