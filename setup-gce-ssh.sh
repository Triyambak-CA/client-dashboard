#!/bin/bash
# Run this ONCE on the GCE VM to create a permanent SSH key for GitHub Actions.
# After running, follow the printed instructions to add the private key to GitHub Secrets.
#
# Usage:
#   bash setup-gce-ssh.sh
#
# What it does:
#   1. Generates an ED25519 key pair at ~/.ssh/github_actions_deploy
#   2. Adds the public key to GCP instance metadata (survives guest-agent resets)
#   3. Adds the public key to ~/.ssh/authorized_keys as a fallback
#   4. Prints the private key — paste it into GitHub → Settings → Secrets → GCE_SSH_KEY

set -e

KEY_FILE="$HOME/.ssh/github_actions_deploy"
AUTH_KEYS="$HOME/.ssh/authorized_keys"

echo "=== GitHub Actions Deploy Key Setup ==="
echo ""

# Generate key pair if it doesn't exist yet
if [ -f "$KEY_FILE" ]; then
  echo "[INFO] Key already exists at $KEY_FILE — skipping generation."
else
  ssh-keygen -t ed25519 -C "github-actions-deploy@ca-dashboard" -f "$KEY_FILE" -N ""
  echo "[OK] Key pair generated."
fi

PUBLIC_KEY=$(cat "${KEY_FILE}.pub")
USERNAME=$(whoami)

# ---------------------------------------------------------------------------
# Step 1 — Add to GCP instance metadata (persistent, managed by guest-agent)
# This is the authoritative method on GCP: the guest-agent syncs metadata
# ssh-keys into authorized_keys on every boot, so this survives reboots and
# guest-agent resets.
# ---------------------------------------------------------------------------
if command -v gcloud &>/dev/null; then
  INSTANCE_NAME=$(curl -sf "http://metadata.google.internal/computeMetadata/v1/instance/name" \
    -H "Metadata-Flavor: Google" 2>/dev/null || echo "")
  ZONE=$(curl -sf "http://metadata.google.internal/computeMetadata/v1/instance/zone" \
    -H "Metadata-Flavor: Google" 2>/dev/null | awk -F/ '{print $NF}' || echo "")

  if [ -n "$INSTANCE_NAME" ] && [ -n "$ZONE" ]; then
    # Fetch current ssh-keys metadata, append ours if not already present
    EXISTING=$(gcloud compute instances describe "$INSTANCE_NAME" \
      --zone="$ZONE" \
      --format="value(metadata.ssh-keys)" 2>/dev/null || echo "")

    ENTRY="${USERNAME}:${PUBLIC_KEY}"
    if echo "$EXISTING" | grep -qF "$PUBLIC_KEY"; then
      echo "[INFO] Public key already in GCP instance metadata — skipping."
    else
      # Build updated value
      if [ -n "$EXISTING" ]; then
        NEW_VALUE="${EXISTING}
${ENTRY}"
      else
        NEW_VALUE="$ENTRY"
      fi
      printf '%s' "$NEW_VALUE" > /tmp/gcp_ssh_keys.txt
      gcloud compute instances add-metadata "$INSTANCE_NAME" \
        --zone="$ZONE" \
        --metadata-from-file ssh-keys=/tmp/gcp_ssh_keys.txt
      rm -f /tmp/gcp_ssh_keys.txt
      echo "[OK] Public key added to GCP instance metadata (zone: $ZONE)."
    fi
  else
    echo "[WARN] Could not detect instance name/zone — skipping GCP metadata step."
  fi
else
  echo "[WARN] gcloud not found — skipping GCP metadata step."
fi

# ---------------------------------------------------------------------------
# Step 2 — Also add to authorized_keys directly as a fallback
# ---------------------------------------------------------------------------
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
touch "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"

if grep -qF "$PUBLIC_KEY" "$AUTH_KEYS" 2>/dev/null; then
  echo "[INFO] Public key already in authorized_keys — skipping."
else
  echo "$PUBLIC_KEY" >> "$AUTH_KEYS"
  echo "[OK] Public key added to $AUTH_KEYS"
fi

echo ""
echo "================================================================"
echo "  NEXT STEP — Add the private key to GitHub Secrets"
echo "================================================================"
echo ""
echo "  1. Copy EVERYTHING between the dashes below (including the"
echo "     -----BEGIN/END----- lines)."
echo ""
echo "  2. Go to:"
echo "     https://github.com/Triyambak-CA/client-dashboard/settings/secrets/actions"
echo ""
echo "  3. Click 'New repository secret' and set:"
echo "       Name:  GCE_SSH_KEY"
echo "       Value: <paste the private key>"
echo ""
echo "  4. Make sure GCE_HOST and GCE_USER secrets are also set:"
echo "       GCE_HOST  — the external IP of your GCE VM"
echo "       GCE_USER  — your Linux username on the VM (e.g. youwequest)"
echo ""
echo "================================================================"
echo ""
cat "$KEY_FILE"
echo ""
echo "================================================================"
echo "  Setup complete.  Push to 'main' to trigger a deployment."
echo "================================================================"
