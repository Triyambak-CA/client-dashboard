// data.js - Handles data fetching and processing

// Google Sheet CSV URL
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQaENJvfxYFqsKRFKAIHb-nlYI9vOnLZqJ99aYxztjOXCvLXn6a4CkhbEOB5JpeXFOIZFJuvf4tPZcp/pub?gid=0&single=true&output=csv';

// Data module
const dataModule = (function() {
    // Private variables
    let clientData = [];
    let filteredClients = [];
    
    // Field groupings
    const fieldGroups = {
        basicData: [
            'Client_Name', 'Legal_Name', 'Constitution', 'GST_Reg_Type', 
            'GSTIN', 'PAN', 'Fathers_Name', 'DOB', 'Aadhaar_No', 
            'TAN', 'Auth_Signatory'
        ],
        gstData: [
            'GST_User_ID', 'GST_Password', 'EWB_Portal_ID', 'EWB_Pass', 
            'EWB_API_ID', 'EWB_API_Pass'
        ],
        incomeTaxData: [
            'IT_Login_Pass', 'TRACES_User_ID_Deductor', 'TRACES_Password_Deductor',
            'TRACES_User_ID_Tax_Payer', 'TRACES_Password_Tax_Payer',
            'Income_Tax_Pw_for_TDS_Filing'
        ]
    };
    
    // Fetch client data from Google Sheet
    async function fetchClientData() {
        try {
            const response = await fetch(CSV_URL);
            const csvText = await response.text();
            
            // Parse CSV using PapaParse
            Papa.parse(csvText, {
                header: true,
                complete: function(results) {
                    clientData = results.data.filter(client => client.Client_Name); // Filter out empty rows
                    filteredClients = [...clientData]; // Initialize filtered clients with all clients
                    
                    // Notify UI to render client cards
                    window.uiModule.renderClientCards(clientData);
                    window.uiModule.hideLoading();
                },
                error: function(error) {
                    console.error('Error parsing CSV:', error);
                    window.uiModule.showError('Failed to load client data. Please try again later.');
                    window.uiModule.hideLoading();
                }
            });
        } catch (error) {
            console.error('Error fetching CSV:', error);
            window.uiModule.showError('Failed to fetch client data. Please check your internet connection.');
            window.uiModule.hideLoading();
        }
    }
    
    // Search clients by name, PAN, or GSTIN
    function searchClients(query) {
        if (!query) {
            filteredClients = [...clientData];
            return filteredClients;
        }
        
        query = query.toLowerCase();
        filteredClients = clientData.filter(client => {
            return (
                (client.Client_Name && client.Client_Name.toLowerCase().includes(query)) ||
                (client.PAN && client.PAN.toLowerCase().includes(query)) ||
                (client.GSTIN && client.GSTIN.toLowerCase().includes(query))
            );
        });
        
        return filteredClients;
    }
    
    // Get client by index
    function getClientByIndex(index) {
        return filteredClients[index];
    }
    
    // Get field groups
    function getFieldGroups() {
        return fieldGroups;
    }
    
    // Get current filtered clients (for export)
    function getFilteredClients() {
        return filteredClients;
    }
    
    // Public API
    return {
        fetchClientData,
        searchClients,
        getClientByIndex,
        getFieldGroups,
        getFilteredClients
    };
})();

// Expose module to window
window.dataModule = dataModule;
