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

## Auto-Deploy to Google Cloud VM (GitHub Actions)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
automatically SSHes into your GCE VM and runs `docker compose up -d --build` on every
push to `main`.

### One-time SSH Key Setup

Google Cloud's web SSH adds **temporary** keys to `~/.ssh/authorized_keys` that expire
within minutes. The GitHub Actions workflow needs a **permanent** key. Follow these steps
once:

#### Step 1 — Run the setup script on the VM

Open an SSH session to the GCE VM (via Google Cloud Console) and run:

```bash
bash setup-gce-ssh.sh
```

The script will:
- Generate an ED25519 key pair at `~/.ssh/github_actions_deploy`
- Append the public key to `~/.ssh/authorized_keys` (survives reboots)
- Print the **private key** — copy the entire output including the `-----BEGIN/END-----` lines

#### Step 2 — Add secrets to GitHub

Go to **Settings → Secrets and variables → Actions** in the repository and create three secrets:

| Secret name   | Value                                              |
|---------------|----------------------------------------------------|
| `GCE_SSH_KEY` | Private key printed by the script (full PEM block) |
| `GCE_HOST`    | External IP address of your GCE VM                |
| `GCE_USER`    | Your Linux username on the VM (e.g. `youwequest`)  |

#### Step 3 — Verify

Push any commit to `main`. The **Actions** tab should show a green deploy run within ~30 seconds.

> **Note:** If you need to re-run the script (e.g. after recreating the VM), it is safe to run
> again — it will skip key generation and adding the public key if they already exist.

## Contact
For any questions or issues, please contact the developer.
