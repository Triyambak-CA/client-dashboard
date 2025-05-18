# YouWe Quest Dashboard - Design Plan

## Overall Design Aesthetic
- Dark, minimalistic design inspired by Apple's design philosophy
- High contrast elements with clean typography
- Subtle animations and transitions for a polished feel
- Focus on usability and information hierarchy

## Color Palette
- Background: Dark gray/black (#121212)
- Primary accent: Apple blue (#0071e3)
- Secondary accent: Light gray (#f5f5f7)
- Text: White (#ffffff) and light gray (#8e8e93)
- Card backgrounds: Slightly lighter than main background (#1e1e1e)
- Success/copy indicator: Green (#34c759)

## Typography
- System fonts: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
- Font sizes: 
  - Headings: 24px, 20px, 18px
  - Body text: 16px, 14px
  - Small text/labels: 12px
- Font weights: 300 (light), 400 (regular), 600 (semibold)

## Layout Structure

### 1. Login Overlay
- Full-screen overlay with centered content
- Blurred background effect
- Apple-style input field for password
- Subtle animation when showing/hiding
- Error message for incorrect password attempts

### 2. Landing Page
- Centered "Welcome to YouWe Quest" message with subtle animation
- "Client Creds" button in top-right corner
- Clean, minimal interface with ample whitespace

### 3. Client Dashboard
- Search bar at the top with real-time filtering
- Grid layout for client cards (3 columns on desktop, 2 on tablet, 1 on mobile)
- Each card displays:
  - Client Name (prominent)
  - PAN (with partial masking for security)
  - GSTIN (with partial masking for security)
  - "View More" button with subtle hover effect

### 4. "View More" Modal
- Based on the provided image reference
- Modal overlay with semi-transparent background
- Three distinct sections as shown in the image:
  - Basic Data (top section, blue accent)
  - GST Data (bottom left, light gray gradient)
  - Income Tax Data (bottom right, light gray gradient)
- Each field has a copy icon (📋) that changes color on hover
- Close button in the top-right corner
- Subtle entrance/exit animations

## Responsive Design Considerations
- Desktop: Full layout with 3-column grid for client cards
- Tablet: 2-column grid, slightly larger touch targets
- Mobile: 
  - Single column layout
  - Stacked sections in the modal view
  - Larger touch targets for better usability
  - Simplified header with collapsible search

## Data Structure Mapping

### Basic Data Fields
- Client Name
- Legal Name
- Constitution
- GST Reg Type
- GSTIN
- PAN
- Father's Name
- DOB
- Aadhaar No.
- TAN
- Auth. Signatory

### GST Fields
- GST User ID
- GST Password
- EWB Portal ID
- EWB Pass
- EWB API ID
- EWB API Pass

### Income Tax Fields
- IT Login Pass
- TRACES User ID (Deductor)
- TRACES Password (Deductor)
- TRACES User ID (Tax Payer)
- TRACES Password (Tax Payer)
- Income Tax P/w for TDS Filing

## Interactive Elements
- Password input field with show/hide toggle
- Search bar with real-time filtering
- Client cards with hover effects
- "View More" buttons with hover state
- Copy icons with hover and click feedback
- Modal close button
- Responsive navigation elements

## Security Considerations
- Password protection for initial access
- No storage of credentials in browser localStorage/sessionStorage
- Partial masking of sensitive information in the dashboard view
- Copy functionality without exposing data in the clipboard until explicitly requested
