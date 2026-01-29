// Saves options to chrome.storage
const saveOptions = () => {
  const baseUrl = document.getElementById('baseUrl').value;

  chrome.storage.sync.set(
    { baseUrl: baseUrl },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 2000);
    }
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    { baseUrl: 'https://vsrc.su/' }, // Default value
    (items) => {
      document.getElementById('baseUrl').value = items.baseUrl;
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);