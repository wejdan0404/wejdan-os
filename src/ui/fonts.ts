// Self-hosted OFL fonts (never Thmanyah — its licence forbids hosting the files).
// The full-weight CSS keeps per-subset unicode-range, so a browser only downloads
// the Arabic/Latin files it actually draws (fontsource's single-subset CSS has no
// unicode-range and would break per-glyph fallback). Unused subsets are also kept
// out of the offline cache, and the two first-paint faces are preloaded (vite.config.ts).
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/el-messiri/500.css'
import '@fontsource/el-messiri/700.css'
