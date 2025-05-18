// data.js - Handles data fetching and processing

// Configuration
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaENJvfxYFqsKRFKAIHb-nlYI9vOnLZqJ99aYxztjOXCvLXn6a4CkhbEOB5JpeXFOIZFJuvf4tPZcp/pub?gid=0&single=true&output=csv";

// Data structure
let clientsData = [];
let isDataLoaded = false;

// Field groupings
const fieldGroups = {
    basicData: [
        "Client Name", "Legal Name", "Constitution", "GST Reg Type", 
        "GSTIN", "PAN", "Father's Name", "DOB", "Aadhaar No.", 
        "TAN", "Auth. Signatory"
    ],
    gstData: [
        "GST User ID", "GST Password", "EWB Portal ID", 
        "EWB Pass", "EWB API ID", "EWB API Pass"
    ],
    incomeTaxData: [
        "IT Login Pass", "TRACES User ID (Deductor)", "TRACES Password (Deductor)",
        "TRACES User ID (Tax Payer)", "TRACES Password (Tax Payer)",
        "Income Tax P/w for TDS Filing"
    ]
};

// Functions
function fetchClientData() {
    return new Promise((resolve, reject) => {
        // Show loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
        
        // If data is already loaded, return it immediately
        if (isDataLoaded && clientsData.length > 0) {
            if (loadingIndicator) {
                loadingIndicator.classList.add('hidden');
            }
            resolve(clientsData);
            return;
        }
        
        Papa.parse(CSV_URL, {
            download: true,
            header: true,
            complete: function(results) {
                // Filter out empty rows and process data
                clientsData = results.data
                    .filter(client => client["Client Name"])
                    .map(client => {
                        // Ensure all fields exist (even if empty)
                        fieldGroups.basicData.forEach(field => {
                            if (client[field] === undefined) client[field] = '';
                        });
                        fieldGroups.gstData.forEach(field => {
                            if (client[field] === undefined) client[field] = '';
                        });
                        fieldGroups.incomeTaxData.forEach(field => {
                            if (client[field] === undefined) client[field] = '';
                        });
                        return client;
                    });
                
                isDataLoaded = true;
                
                // Hide loading indicator
                if (loadingIndicator) {
                    loadingIndicator.classList.add('hidden');
                }
                
                resolve(clientsData);
            },
            error: function(error) {
                console.error("Error fetching or parsing CSV:", error);
                
                // Hide loading indicator and show error
                if (loadingIndicator) {
                    loadingIndicator.classList.add('hidden');
                }
                
                reject(error);
            }
        });
    });
}

function getClientByName(clientName) {
    return clientsData.find(client => client["Client Name"] === clientName);
}

function searchClients(query) {
    if (!query) return clientsData;
    
    query = query.toLowerCase();
    return clientsData.filter(client => {
        return (
            (client["Client Name"] && client["Client Name"].toLowerCase().includes(query)) ||
            (client["PAN"] && client["PAN"].toLowerCase().includes(query)) ||
            (client["GSTIN"] && client["GSTIN"].toLowerCase().includes(query))
        );
    });
}

function getFieldGroups() {
    return fieldGroups;
}

function isDataReady() {
    return isDataLoaded;
}

// Expose functions for other modules
window.dataModule = {
    fetchClientData,
    getClientByName,
    searchClients,
    getFieldGroups,
    isDataReady
};
