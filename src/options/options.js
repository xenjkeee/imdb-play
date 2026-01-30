// State
let providers = [];
let defaultIndex = 0;
let editingIndex = -1;

// Elements
const listContainer = document.getElementById('provider-list');
const editorOverlay = document.getElementById('editor-overlay');
const statusEl = document.getElementById('status');

// Inputs
const nameInput = document.getElementById('edit-name');
const urlInput = document.getElementById('edit-url');
const movieInput = document.getElementById('edit-movie');
const tvInput = document.getElementById('edit-tv');
const enabledInput = document.getElementById('edit-enabled');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // We do a manual load here instead of using the util function 
    // because we want to handle the one-time migration from 'baseUrl'
    chrome.storage.sync.get(['providers', 'defaultProviderIndex', 'baseUrl'], (items) => {
        if (items.providers && items.providers.length > 0) {
            // Already on new system
            providers = items.providers;
            defaultIndex = items.defaultProviderIndex || 0;
        } else {
            // New or Migration needed
            providers = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
            defaultIndex = 0;

            // Migration: If user had a custom base URL, update the default provider
            if (items.baseUrl) {
                providers[0].baseUrl = items.baseUrl;
                // Save immediately to complete migration
                saveToStorage(false); 
                // Remove old key
                chrome.storage.sync.remove('baseUrl');
            }
        }
        render();
    });
});

function render() {
    listContainer.innerHTML = '';
    
    providers.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = `provider-item ${index === defaultIndex ? 'default' : ''}`;
        if (!p.enabled && index !== defaultIndex) item.style.opacity = '0.6';

        item.innerHTML = `
            <input type="radio" name="default-provider" class="radio-default" 
                ${index === defaultIndex ? 'checked' : ''} 
                title="Set as Default">
            
            <div class="provider-info">
                <div class="provider-name">${p.name} ${!p.enabled ? '(Disabled)' : ''}</div>
                <div class="provider-url">${p.baseUrl}</div>
            </div>
            
            <div class="actions">
                <button class="btn-icon" data-action="edit" data-index="${index}" title="Edit">✎</button>
                <button class="btn-icon delete" data-action="delete" data-index="${index}" title="Delete">✕</button>
            </div>
        `;

        // Event Listeners for inside the item
        const radio = item.querySelector('input[type="radio"]');
        radio.addEventListener('change', () => {
            defaultIndex = index;
            render();
        });

        item.querySelector('[data-action="edit"]').addEventListener('click', () => openEditor(index));
        
        const deleteBtn = item.querySelector('[data-action="delete"]');
        if (providers.length <= 1) {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.3';
        } else {
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Delete ${p.name}?`)) {
                    deleteProvider(index);
                }
            });
        }

        listContainer.appendChild(item);
    });
}

function openEditor(index) {
    editingIndex = index;
    const isNew = index === -1;
    const data = isNew ? { 
        name: 'New Provider', 
        baseUrl: 'https://', 
        movieFormat: '/embed/movie/{id}', 
        tvFormat: '/embed/tv/{id}/{s}/{e}',
        enabled: true
    } : providers[index];

    nameInput.value = data.name;
    urlInput.value = data.baseUrl;
    movieInput.value = data.movieFormat;
    tvInput.value = data.tvFormat;
    enabledInput.checked = data.enabled !== false; // Default true

    editorOverlay.style.display = 'block';
}

function closeEditor() {
    editorOverlay.style.display = 'none';
    editingIndex = -1;
}

function saveEditor() {
    const newProvider = {
        name: nameInput.value.trim(),
        baseUrl: urlInput.value.trim(),
        movieFormat: movieInput.value.trim(),
        tvFormat: tvInput.value.trim(),
        enabled: enabledInput.checked
    };

    if (!newProvider.name || !newProvider.baseUrl) {
        alert("Name and URL are required.");
        return;
    }

    if (editingIndex === -1) {
        // Add new
        providers.push(newProvider);
    } else {
        // Update existing
        providers[editingIndex] = newProvider;
    }

    closeEditor();
    render();
}

function deleteProvider(index) {
    providers.splice(index, 1);
    if (defaultIndex >= providers.length) defaultIndex = providers.length - 1;
    if (defaultIndex < 0) defaultIndex = 0;
    render();
}

function saveToStorage(showStatus = true) {
    chrome.storage.sync.set({
        providers: providers,
        defaultProviderIndex: defaultIndex
    }, () => {
        if (showStatus) {
            statusEl.style.display = 'block';
            statusEl.textContent = 'Settings Saved!';
            setTimeout(() => statusEl.style.display = 'none', 2000);
        }
    });
}

// Global Buttons
document.getElementById('btn-add').addEventListener('click', () => openEditor(-1));
document.getElementById('btn-save').addEventListener('click', () => saveToStorage(true));
document.getElementById('btn-cancel-edit').addEventListener('click', closeEditor);
document.getElementById('btn-save-edit').addEventListener('click', saveEditor);

document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm("Reset all providers to default list? This cannot be undone.")) {
        providers = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
        defaultIndex = 0;
        render();
        saveToStorage(true);
    }
});
