# GitHub Social Preview Image

## What is this?
The social preview is the image that appears when you share the OpenBench repo on Twitter, LinkedIn, or other platforms. GitHub recommends **1200×630 pixels** (1.91:1 ratio).

## How to set it
1. Go to https://github.com/truetube47-gif/openbench/settings
2. Scroll to "Social preview"
3. Upload `openbench-social.png` (create using spec below)
4. Click "Save changes"

## Design Spec

### Option A: Owl Icon (Recommended)
Use the project owl icon from `frontend/public/icon.svg`:

- **Background:** Dark gradient (#0a0a0f → #1a1a2e)
- **Center:** The OpenBench owl logo (from icon.svg)
- **Text:** 
  - "OpenBench" — large, bold, white
  - "Can I Run This LLM?" — smaller, accent color (#6366f1)
- **Tech badges:** FastAPI + Next.js logos (small, bottom right)

### Option B: Clean Minimal
- **Background:** Solid dark (#0f172a)
- **Text:** "OpenBench" in large monospace or tech font
- **Tagline:** "Deployment Intelligence for Local LLMs"
- **Accent:** Indigo/purple gradient bar

## Quick Creation
1. Go to Canva or Figma
2. Create 1200×630 frame
3. Import `frontend/public/icon.svg` (the owl)
4. Add text, export as PNG
5. Upload to GitHub repo settings

## Current Status
- [ ] Social preview image created
- [ ] Uploaded to GitHub settings

> **Note:** The owl icon (`frontend/public/icon.svg`) is 17MB — too large for direct use. Create a simplified 1200×630 version following the spec above.
