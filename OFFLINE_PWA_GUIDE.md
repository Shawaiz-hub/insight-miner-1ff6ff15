# Offline Support & Progressive Web App (PWA) Guide

## Overview

SmartMine now includes complete offline support, allowing users to:
- Install the app as a native-like application on mobile devices
- View cached History and Saved Rules when offline
- Automatically sync data when connection is restored
- See their mining history and bookmarked rules without internet

---

## How It Works

### 1. **Service Worker Caching**

The app uses Workbox (via vite-plugin-pwa) to cache:

**Static Assets** (Automatic)
- JavaScript bundles
- CSS stylesheets  
- HTML pages
- Images and fonts

**API Responses** (Smart Caching)
- **Network-First Strategy**: Tries internet first, falls back to cache if offline
- **Google Fonts**: Cached for 365 days (rarely change)
- **Supabase API calls**: Cached for 1 hour with 3-second timeout
- **Images**: Cached for 7 days

### 2. **Local Data Storage (IndexedDB)**

When users fetch their History and Saved Rules, the data is automatically stored locally using IndexedDB:

```
Database: smartmine_offline
  ├── mining_history (stores past mining sessions)
  └── saved_rules (stores bookmarked association rules)
```

When offline, the app loads data from IndexedDB instead of Supabase.

### 3. **Offline Indicator**

Users see a status bar showing:
- 🟢 **Connected**: Brief green indicator when coming back online
- 🔴 **Offline**: Amber indicator showing "You're offline • Viewing cached data"

### 4. **Pull-to-Refresh**

On mobile, users can pull down on History/Saved Rules pages to refresh data (syncs when online).

---

## Installation as PWA

### On iPhone/iPad

1. Open SmartMine in Safari
2. Tap **Share** button (bottom toolbar)
3. Scroll down and tap **"Add to Home Screen"**
4. Enter a name (defaults to "SmartMine")
5. Tap **Add**

The app now appears on your home screen with a custom icon and runs full-screen like a native app.

### On Android

1. Open SmartMine in Chrome (or Firefox)
2. Tap **⋮** (three-dot menu) → **"Install app"** (or similar)
3. Tap **Install** on the prompt
4. The app is added to your home screen and app drawer

---

## Features When Offline

### ✅ Available Offline

- **View History**: See all past mining sessions with details
  - Algorithm used
  - Dataset name
  - Execution time
  - Results summary
  
- **View Saved Rules**: Browse all bookmarked association rules
  - Search saved rules
  - See confidence, support, lift metrics
  - View antecedent → consequent relationships

- **Navigation**: Full app navigation works offline
  - Bottom navigation bar
  - Dashboard (read previous results)
  - Profile page

### ❌ Limited Offline

- **Run New Mining**: Requires connection to Flask backend
- **Upload New Data**: Needs backend processing
- **Save New Rules**: Will queue locally and sync when online (future feature)

---

## Data Caching Strategy

### Automatic Caching

```typescript
// When you fetch History/Saved Rules:
1. App tries to get fresh data from Supabase
2. If successful → displays data AND caches it locally
3. If offline/failed → loads from local cache
4. Shows toast: "Showing cached history"
```

### Cache Lifecycle

| Data Type | Cache Duration | Refresh Strategy |
|-----------|----------------|------------------|
| Static assets (JS, CSS) | Until app update | Browser caches |
| Supabase API responses | 1 hour | Network-first with fallback |
| Google Fonts | 365 days | Never re-request |
| History/Saved Rules | Indefinite | Pull-to-refresh or new fetch |

### Clearing Cache

To clear offline data:

```typescript
// In browser console:
import { offlineDB } from '@/lib/offlineDB';
await offlineDB.clearAll();
```

Or clear app data in your phone's settings:
- **iPhone**: Settings → App Name → App Data → Delete
- **Android**: Settings → Apps → SmartMine → Storage → Clear Cache

---

## Developer Guide

### Using Offline Cache in Components

```typescript
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useOnline } from '@/hooks/useOnline';

function MyComponent() {
  const isOnline = useOnline();
  const { cacheHistory, getCachedHistory } = useOfflineCache();
  
  // When fetching data:
  const fetchData = async () => {
    try {
      const data = await supabase.from('table').select('*');
      await cacheHistory(data); // Cache for offline
      setData(data);
    } catch (err) {
      if (!isOnline) {
        const cached = await getCachedHistory();
        setData(cached); // Use cached data
      }
    }
  };
}
```

### Available Methods

```typescript
const {
  cacheHistory,          // Cache mining history
  cacheSavedRules,       // Cache saved rules
  getCachedHistory,      // Retrieve cached history
  getCachedSavedRules,   // Retrieve cached rules
  clearCache,            // Clear all offline data
} = useOfflineCache();
```

### Detecting Online Status

```typescript
import { useOnline } from '@/hooks/useOnline';

function Component() {
  const isOnline = useOnline();
  
  return (
    <div>
      Status: {isOnline ? '🟢 Online' : '🔴 Offline'}
    </div>
  );
}
```

---

## Service Worker Configuration

The service worker (auto-generated by vite-plugin-pwa) is configured in `vite.config.ts`:

```typescript
VitePWA({
  registerType: "autoUpdate",
  
  manifest: {
    name: "SmartMine - Data Mining Platform",
    display: "standalone",      // Full-screen app mode
    scope: "/",                 // App scope
    start_url: "/",             // Launch page
    theme_color: "#10b981",     // Status bar color
    background_color: "#0a0a0a"
  },
  
  workbox: {
    runtimeCaching: [
      // Network-first for API calls (try internet, fallback to cache)
      // Cache-first for fonts (never need to update)
      // See vite.config.ts for complete config
    ]
  }
})
```

---

## Troubleshooting

### "App not installing" on mobile
- Ensure you're viewing the production build (not localhost)
- Check browser console for errors
- Try a different browser (Safari for iPhone, Chrome for Android)

### "Offline data looks outdated"
- Pull-to-refresh on History/Saved Rules pages
- Check if you were offline when data was cached
- Clear app cache and refresh

### Service Worker not updating
- Service workers auto-update, but may take a few minutes
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache and re-open app

### IndexedDB storage quota exceeded
- Each browser allows ~50MB+ storage
- Clear app data in settings
- Delete old mining history you don't need

---

## Network Behavior Diagram

```
Online Flow:
  User Action → Supabase API → Success? → Cache data ✓ & Display
                   ↓
                Network Error → Load from cache ✓ & Show "offline" toast

Offline Flow:
  User Action → No network → Load from cache ✓ & Show "offline" indicator
                   ↓
               No cache data? → Show "No data" message
                   ↓
                User comes online → Auto-refresh available ✓
```

---

## Best Practices

### For Users
1. **First time setup**: Sync your data while online before using offline
2. **Pull-to-refresh**: On History/Saved Rules pages when back online
3. **Important data**: Periodically export rules and history as backup
4. **Check status**: Look for the offline indicator at top of app

### For Developers
1. **Always cache on fetch**: Call `cacheHistory()` after successful API calls
2. **Fallback gracefully**: Check cache when API fails
3. **Show status**: Display offline indicator to users
4. **Test offline**: Use DevTools → Network → Offline mode
5. **Respect quota**: Monitor storage usage for large datasets

---

## Performance Metrics

- **Time to interactive** (app already cached): ~1 second
- **API response cache timeout**: 3 seconds
- **Pull-to-refresh debounce**: 80px threshold
- **Service worker update**: Auto on each app launch

---

## Security Notes

- **Offline data is stored on device**: Not encrypted by default
- **IndexedDB is per-origin**: Each domain has separate storage
- **Cache includes API responses**: Be careful with sensitive data
- **Clear cache on logout**: Recommended for shared devices

---

## Future Enhancements

- [ ] Queue actions while offline (save rules, delete items)
- [ ] Background sync when reconnected
- [ ] Selective data sync (choose what to cache)
- [ ] Offline search across all cached data
- [ ] Export cached data to CSV/JSON
- [ ] Detect slow 2G network (show warnings)

---

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Workbox Caching](https://developers.google.com/web/tools/workbox/modules/workbox-strategies)

---

**Last Updated**: Feb 2025  
**Version**: 1.0
