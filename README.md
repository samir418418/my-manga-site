# MangaForge AI

A beginner-friendly, zero-cost-to-run manga storyboard prototype. The frontend is split into three beginner-friendly files—HTML, CSS, and JavaScript—with no build step, package install, API key, or paid service required.

## Run on your computer

1. Keep `text to manga.HTML`, `styles.css`, and `app.js` together in the same folder. Install Python if it is not already installed, or open `text to manga.HTML` directly in a modern browser.
2. For the most reliable project saving, start Python's built-in local web server in PowerShell:

   ```powershell
   python -m http.server 8000 --directory "C:\Users\samir\Downloads"
   ```

3. Open <http://localhost:8000/text%20to%20manga.HTML>.
4. Choose **Try a sample story** to create, preview, and save the complete two-page *The Starbound Letter* demo. Or enter a story and choose **Generate manga**.

If PowerShell says Python is not installed, open the HTML file directly in a browser instead. Browser storage for a directly opened file may differ from storage on `localhost`. Google Fonts need internet access; system-font fallbacks are included.

## What works in the demo

- Mobile-friendly dark interface, original CSS-drawn sample artwork, gallery, and pricing preview.
- Story and dialogue language selectors for English, Hindi, and Hinglish.
- Six manga styles, 1/2/4 pages, 3/4/6 panels per page, page layouts, and aspect ratios.
- Character details, with optional reference images read and saved locally in the browser.
- A searchable library of six original, CSS-illustrated characters. Select any to add their name and visual/personality description to the cast; the library does not use or fetch copyrighted anime characters or artwork.
- Add a separate photo to each custom or library character. A small private preview appears on that character’s storyboard panels and in page exports, and is saved with the local project.
- Optionally select your own rights-cleared MP4, WebM, or OGG background video. It loops muted behind the site for the current browser session; remove it from the header when finished. Videos up to 200 MB are supported.
- A rule-based storyboard outline from the story, with example dialogue and captions on each panel. These are starter suggestions, not AI-written translations.
- Page-by-page preview, editable dialogue/captions, sound-effect and bubble notes, panel resize/reorder, refreshable panel outlines, and undo/redo.
- Local project save, reopen, rename, duplicate, and delete.
- PNG and JPG image downloads. **PDF / Print** opens the browser's print dialog; choose **Save as PDF** for a multipage export.

## Honest demo limitations

The app does not generate AI images. The sample illustrations and canvas downloads are original, code-drawn storyboard previews, visibly labeled as demo artwork. An uploaded character photo is shown only as a **photo reference**; it is not transformed into manga art. Story breakdown and dialogue suggestions are local rules, not an AI model. No server, API, user account, database, cloud storage, shared project access, or online generation is configured. Projects and reference images stay in this browser profile and are not an account, secure storage, or backup. Clearing browser data can delete them.

The character chooser is a small original-character starter collection, not a catalog of existing anime characters. Add your own cast in the character fields. Only upload reference images that you own or have permission to use.

The background-video picker plays a selected local video in the current page; it does not upload, copy, or publish the video and the selection is not saved across reloads. Choose only video you created or have permission to use. To include a video in a published site, ensure your license allows redistribution, compress it for web use, and place the cleared video asset in your site repository.

## Publish the free static prototype

1. Create a GitHub account and a new repository, then upload `text to manga.HTML`, `styles.css`, `app.js`, and this README.
2. In the repository settings, enable **GitHub Pages** for the `main` branch and the root folder.
3. Open the Pages URL GitHub provides. Since the filename contains spaces, keep the URL-encoded name (`text%20to%20manga.HTML`) or rename the file to `index.html` in the repository so the site opens at its home URL.

GitHub Pages hosts static files; the browser-based storyboard and local downloads can run there, but data remains on each visitor's device. No account or image-generation API should be exposed to a static webpage.

## Connect real AI later

This prototype intentionally has no API integration or `.env` file. To add real model-based story analysis or image generation:

1. Add a backend or serverless function (for example, deploy an API with a provider's free tier if available). A static GitHub Pages site alone cannot safely hold API credentials. Provider free quotas and terms can change; confirm them before use.
2. Create server-side environment variables for provider credentials in the hosting dashboard. Never put secrets in frontend JavaScript, HTML, public repositories, or `VITE_*`/`NEXT_PUBLIC_*` variables.
3. Have the browser send the story and settings to your backend route. On the server, validate input, enforce per-user/IP limits, call the chosen model provider, and return explicit errors and progress.
4. Integrate image generation per panel, reuse a shared character description/reference, and render dialogue as a separate readable overlay. Only label a panel as AI-generated after a successful provider response; keep the existing demo mode available when credentials are absent.
5. Add authenticated storage and owner checks only if you need accounts and cloud projects. Recheck permissions for every read, update, and delete.

No paid service is needed to run or publish the current demo. Actual AI generation, a hosted backend, and durable cloud accounts may have costs or limited free quotas depending on the providers chosen.
