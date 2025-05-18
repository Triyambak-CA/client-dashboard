// export.js - Handles exporting filtered data to PDF and Excel

document.addEventListener('DOMContentLoaded', () => {
    const exportPdfButton = document.getElementById('export-pdf');
    const exportExcelButton = document.getElementById('export-excel');
    
    // Export to PDF
    exportPdfButton.addEventListener('click', () => {
        const filteredClients = window.dataModule.getFilteredClients();
        if (filteredClients.length === 0) {
            window.uiModule.showToast('No data to export');
            return;
        }
        
        exportToPDF(filteredClients);
    });
    
    // Export to Excel (CSV)
    exportExcelButton.addEventListener('click', () => {
        const filteredClients = window.dataModule.getFilteredClients();
        if (filteredClients.length === 0) {
            window.uiModule.showToast('No data to export');
            return;
        }
        
        exportToExcel(filteredClients);
    });
    
    // Function to export data to PDF
    function exportToPDF(clients) {
        // Create a new window for the PDF content
        const printWindow = window.open('', '_blank');
        
        // Generate PDF content with styling
        let pdfContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>YouWe Quest - Client Data</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                    }
                    h1 {
                        color: #0071e3;
                        font-size: 24px;
                        margin-bottom: 20px;
                    }
                    .export-date {
                        color: #666;
                        font-size: 14px;
                        margin-bottom: 30px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    th {
                        background-color: #f5f5f7;
                        padding: 10px;
                        text-align: left;
                        font-weight: 600;
                        border-bottom: 2px solid #ddd;
                    }
                    td {
                        padding: 10px;
                        border-bottom: 1px solid #ddd;
                    }
                    .client-name {
                        font-weight: 600;
                        color: #0071e3;
                    }
                    .section-title {
                        font-size: 18px;
                        margin-top: 20px;
                        margin-bottom: 10px;
                        color: #0071e3;
                    }
                </style>
            </head>
            <body>
                <h1>YouWe Quest - Client Credentials</h1>
                <div class="export-date">Exported on: ${new Date().toLocaleString()}</div>
        `;
        
        // Add client data to the PDF content
        clients.forEach(client => {
            pdfContent += `
                <div class="section-title">${client.Client_Name || 'Unnamed Client'}</div>
                <table>
                    <tr>
                        <th>Field</th>
                        <th>Value</th>
                    </tr>
                    <tr>
                        <td>PAN</td>
                        <td>${client.PAN || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>GSTIN</td>
                        <td>${client.GSTIN || 'N/A'}</td>
                    </tr>
            `;
            
            // Add all other fields
            for (const key in client) {
                if (key !== 'Client_Name' && key !== 'PAN' && key !== 'GSTIN') {
                    pdfContent += `
                        <tr>
                            <td>${key.replace(/_/g, ' ')}</td>
                            <td>${client[key] || 'N/A'}</td>
                        </tr>
                    `;
                }
            }
            
            pdfContent += `</table>`;
        });
        
        pdfContent += `
            </body>
            </html>
        `;
        
        // Write the content to the new window
        printWindow.document.open();
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        
        // Trigger print dialog after content is loaded
        printWindow.onload = function() {
            printWindow.print();
            window.uiModule.showToast('PDF export ready');
        };
    }
    
    // Function to export data to Excel (CSV)
    function exportToExcel(clients) {
        // Create CSV content
        let csvContent = 'data:text/csv;charset=utf-8,';
        
        // Get all unique keys from clients
        const allKeys = new Set();
        clients.forEach(client => {
            Object.keys(client).forEach(key => allKeys.add(key));
        });
        
        // Convert Set to Array and create header row
        const headers = Array.from(allKeys);
        csvContent += headers.join(',') + '\r\n';
        
        // Add data rows
        clients.forEach(client => {
            const row = headers.map(header => {
                // Handle commas and quotes in the data
                const value = client[header] || '';
                const formattedValue = value.toString().replace(/"/g, '""');
                return `"${formattedValue}"`;
            });
            csvContent += row.join(',') + '\r\n';
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `youwe-quest-clients-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        document.body.removeChild(link);
        
        window.uiModule.showToast('Excel export downloaded');
    }
});
