// app.js - Main application file that initializes and coordinates all modules

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        // Fetch client data
        await window.dataModule.fetchClientData()
            .then(clients => {
                // Render client cards once data is loaded
                window.uiModule.renderClientCards(clients);
                
                // Log success message
                console.log('Client data loaded successfully');
            })
            .catch(error => {
                console.error('Failed to load client data:', error);
                // Show error message to user
                const clientCardsContainer = document.getElementById('client-cards');
                clientCardsContainer.innerHTML = `
                    <div class="error-message">
                        <p>Failed to load client data. Please try again later.</p>
                        <p>Error: ${error.message}</p>
                    </div>
                `;
            });
    } catch (error) {
        console.error('Application initialization error:', error);
    }
}

// Handle errors globally
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    return false;
});

// Add service worker for offline capabilities if needed
// if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('/service-worker.js')
//         .then(registration => {
//             console.log('Service Worker registered with scope:', registration.scope);
//         })
//         .catch(error => {
//             console.error('Service Worker registration failed:', error);
//         });
// }
