// ui.js - Handles UI interactions and rendering

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const clientDashboard = document.getElementById('client-dashboard');
const clientCardsContainer = document.getElementById('client-cards');
const searchInput = document.getElementById('search-input');
const clientCredsButton = document.getElementById('client-creds-button');
const viewMoreModal = document.getElementById('view-more-modal');
const modalClientName = document.getElementById('modal-client-name');
const basicDataGrid = document.getElementById('basic-data-grid');
const gstDataGrid = document.getElementById('gst-data-grid');
const incomeTaxDataGrid = document.getElementById('income-tax-data-grid');
const closeButton = document.querySelector('.close-button');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const loadingIndicator = document.getElementById('loading-indicator');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Client Creds button click
    clientCredsButton.addEventListener('click', toggleDashboard);
    
    // Search input with debounce for better performance
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(handleSearch, 300); // 300ms debounce
    });
    
    // Clear search button
    const searchContainer = document.querySelector('.search-container');
    const clearSearchButton = document.createElement('i');
    clearSearchButton.className = 'fas fa-times clear-search-icon';
    clearSearchButton.style.display = 'none';
    clearSearchButton.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchButton.style.display = 'none';
        handleSearch();
        searchInput.focus();
    });
    searchContainer.appendChild(clearSearchButton);
    
    // Show/hide clear button based on search input
    searchInput.addEventListener('input', () => {
        clearSearchButton.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    });
    
    // Close modal button
    closeButton.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    viewMoreModal.addEventListener('click', (e) => {
        if (e.target === viewMoreModal) {
            closeModal();
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !viewMoreModal.classList.contains('hidden')) {
            closeModal();
        }
    });
});

// Functions
function toggleDashboard() {
    if (clientDashboard.classList.contains('hidden')) {
        // Show dashboard with animation
        welcomeScreen.style.opacity = '0';
        setTimeout(() => {
            welcomeScreen.classList.add('hidden');
            clientDashboard.classList.remove('hidden');
            
            // Trigger fade-in animation
            setTimeout(() => {
                clientDashboard.style.opacity = '1';
                
                // If data is not loaded yet, fetch it
                if (!window.dataModule.isDataReady()) {
                    window.dataModule.fetchClientData()
                        .then(clients => {
                            renderClientCards(clients);
                        })
                        .catch(error => {
                            showError("Failed to load client data. Please try again later.");
                            console.error('Error loading client data:', error);
                        });
                }
            }, 50);
        }, 300);
    } else {
        // Show welcome screen with animation
        clientDashboard.style.opacity = '0';
        setTimeout(() => {
            clientDashboard.classList.add('hidden');
            welcomeScreen.classList.remove('hidden');
            
            // Trigger fade-in animation
            setTimeout(() => {
                welcomeScreen.style.opacity = '1';
            }, 50);
        }, 300);
    }
}

function handleSearch() {
    const query = searchInput.value.trim();
    const filteredClients = window.dataModule.searchClients(query);
    renderClientCards(filteredClients);
    
    // Update UI to show search results count
    const resultsCount = document.createElement('div');
    resultsCount.className = 'results-count';
    resultsCount.textContent = query ? 
        `Found ${filteredClients.length} client${filteredClients.length !== 1 ? 's' : ''} matching "${query}"` : 
        `Showing all ${filteredClients.length} clients`;
    
    // Remove any existing results count
    const existingCount = document.querySelector('.results-count');
    if (existingCount) {
        existingCount.remove();
    }
    
    // Add results count before client cards
    clientCardsContainer.parentNode.insertBefore(resultsCount, clientCardsContainer);
}

function renderClientCards(clients) {
    clientCardsContainer.innerHTML = '';
    
    if (clients.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <i class="fas fa-search-minus"></i>
            <p>No clients found matching your search.</p>
            <p>Try a different search term or clear the search.</p>
        `;
        clientCardsContainer.appendChild(noResults);
        return;
    }
    
    // Create and append client cards with animation
    clients.forEach((client, index) => {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        // Mask sensitive data
        const maskedPAN = maskData(client["PAN"]);
        const maskedGSTIN = maskData(client["GSTIN"]);
        
        card.innerHTML = `
            <h3>${client["Client Name"] || 'Unnamed Client'}</h3>
            <p><span class="label">PAN:</span> ${maskedPAN || 'N/A'}</p>
            <p><span class="label">GSTIN:</span> ${maskedGSTIN || 'N/A'}</p>
            <button class="view-more-btn">View More</button>
        `;
        
        // Add event listener to View More button
        const viewMoreBtn = card.querySelector('.view-more-btn');
        viewMoreBtn.addEventListener('click', () => {
            openClientModal(client["Client Name"]);
        });
        
        clientCardsContainer.appendChild(card);
        
        // Staggered animation for cards
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 50 * index);
    });
}

function openClientModal(clientName) {
    const client = window.dataModule.getClientByName(clientName);
    if (!client) return;
    
    // Set client name in modal header
    modalClientName.textContent = client["Client Name"];
    
    // Clear previous data
    basicDataGrid.innerHTML = '';
    gstDataGrid.innerHTML = '';
    incomeTaxDataGrid.innerHTML = '';
    
    // Get field groups
    const fieldGroups = window.dataModule.getFieldGroups();
    
    // Render Basic Data
    renderDataGroup(basicDataGrid, client, fieldGroups.basicData);
    
    // Render GST Data
    renderDataGroup(gstDataGrid, client, fieldGroups.gstData);
    
    // Render Income Tax Data
    renderDataGroup(incomeTaxDataGrid, client, fieldGroups.incomeTaxData);
    
    // Show modal with animation
    viewMoreModal.classList.remove('hidden');
    setTimeout(() => {
        viewMoreModal.classList.add('active');
    }, 10);
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
}

function renderDataGroup(container, client, fields) {
    fields.forEach(field => {
        const value = client[field] || 'N/A';
        
        const dataItem = document.createElement('div');
        dataItem.className = 'data-item';
        
        dataItem.innerHTML = `
            <div class="data-label">${field}</div>
            <div class="data-value">
                <span>${value}</span>
                <i class="fas fa-clipboard copy-icon" data-value="${value}"></i>
            </div>
        `;
        
        // Add event listener to copy icon
        const copyIcon = dataItem.querySelector('.copy-icon');
        copyIcon.addEventListener('click', () => {
            copyToClipboard(value, field);
        });
        
        container.appendChild(dataItem);
    });
}

function closeModal() {
    viewMoreModal.classList.remove('active');
    setTimeout(() => {
        viewMoreModal.classList.add('hidden');
    }, 300);
    
    // Re-enable body scrolling
    document.body.style.overflow = '';
}

function copyToClipboard(text, fieldName) {
    navigator.clipboard.writeText(text)
        .then(() => {
            // Show toast notification
            showToast(`${fieldName} copied to clipboard!`);
            
            // Add visual feedback to the copy icon
            const copyIcons = document.querySelectorAll('.copy-icon');
            copyIcons.forEach(icon => {
                if (icon.dataset.value === text) {
                    icon.classList.add('copied');
                    icon.classList.remove('fa-clipboard');
                    icon.classList.add('fa-check');
                    
                    // Reset icon after animation
                    setTimeout(() => {
                        icon.classList.remove('copied');
                        icon.classList.remove('fa-check');
                        icon.classList.add('fa-clipboard');
                    }, 1500);
                }
            });
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('Failed to copy to clipboard');
        });
}

function showToast(message) {
    toastMessage.textContent = message;
    toast.innerHTML = `<i class="fas fa-check-circle"></i><span id="toast-message">${message}</span>`;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 2000);
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
    `;
    
    // Replace loading indicator with error message
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
    
    clientCardsContainer.innerHTML = '';
    clientCardsContainer.appendChild(errorElement);
}

function maskData(data) {
    if (!data) return 'N/A';
    
    // Show only first 2 and last 2 characters
    const length = data.length;
    if (length <= 4) return data;
    
    return data.substring(0, 2) + '•'.repeat(length - 4) + data.substring(length - 2);
}

// Hide loading indicator
function hideLoading() {
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
}

// Expose functions for other modules
window.uiModule = {
    renderClientCards,
    toggleDashboard,
    handleSearch,
    showError,
    hideLoading
};
