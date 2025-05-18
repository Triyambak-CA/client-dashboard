# YouWe Quest - Deployment Instructions

## Overview
YouWe Quest is a secure client credential dashboard that displays sensitive client information from a Google Sheet. The application features password protection, search functionality, and a clean, dark, Apple-inspired design.

## Deployment to GitHub Pages

### Step 1: Create a GitHub Repository
1. Go to [GitHub](https://github.com) and sign in to your account
2. Click on the "+" icon in the top-right corner and select "New repository"
3. Name your repository (e.g., "youwe-quest")
4. Make the repository public or private as needed
5. Click "Create repository"

### Step 2: Upload Files
1. Clone the repository to your local machine or use the GitHub web interface to upload files
2. Upload all files from the YouWe Quest package, maintaining the folder structure:
   - index.html (in the root)
   - css/ folder with styles.css
   - js/ folder with all JavaScript files
   - assets/ folder with icons

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click on "Settings"
3. Scroll down to the "GitHub Pages" section
4. Under "Source", select "main" branch
5. Click "Save"
6. GitHub will provide you with a URL where your site is published (e.g., https://yourusername.github.io/youwe-quest/)

### Step 4: Verify Deployment
1. Visit the provided GitHub Pages URL
2. Verify that the login screen appears
3. Log in with the password: `Youwe@Creds`
4. Confirm that client data loads correctly

## Security Considerations
- The password is stored in the JavaScript file (auth.js) and provides basic protection
- For higher security, consider implementing server-side authentication
- The Google Sheet is publicly accessible via its CSV link; ensure it doesn't contain extremely sensitive information
- Consider implementing HTTPS if hosting on a custom domain

## Customization
- To change the password: Edit the `CORRECT_PASSWORD` variable in js/auth.js
- To update the Google Sheet link: Edit the `CSV_URL` variable in js/data.js
- To modify the design: Edit the CSS variables in css/styles.css

## Troubleshooting
- If client data doesn't load, check the browser console for errors
- Ensure the Google Sheet is still published and accessible
- If GitHub Pages doesn't update immediately, wait a few minutes and try again

## Contact
For any questions or issues, please contact the developer.
