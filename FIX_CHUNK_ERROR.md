# Fix Next.js Chunk Loading Error

## Quick Fix Steps

### 1. Stop the Dev Server
- Press `Ctrl+C` in the terminal where `npm run dev` is running
- Or close the terminal window

### 2. Clear Build Cache
```powershell
# Delete .next folder (already done)
Remove-Item -Recurse -Force .next
```

### 3. Clear Browser Cache
- **Chrome/Edge:** Press `Ctrl+Shift+Delete` → Clear cached images and files
- **Or Hard Refresh:** Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Or DevTools:** Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### 4. Restart Dev Server
```bash
npm run dev
```

### 5. Reload Browser
- Navigate to `http://localhost:5000`
- The page should load correctly now

## If Issue Persists

### Option 1: Clear Node Modules Cache
```powershell
# Clear npm cache
npm cache clean --force

# Reinstall dependencies (if needed)
npm install
```

### Option 2: Check for Port Conflicts
```powershell
# Check if port 5000 is in use
netstat -ano | findstr :5000

# If needed, kill the process
# taskkill /PID <process-id> /F
```

### Option 3: Try Different Port
```bash
# In package.json, change dev script to use different port
npm run dev -- -p 3000
```

## Common Causes

1. **Build cache corruption** - Fixed by deleting `.next` folder ✅
2. **Browser cache** - Fixed by hard refresh
3. **Dev server restart** - Fixed by restarting
4. **Network timeout** - Check internet connection
5. **File system watcher issues** - Restart dev server

## Prevention

- Always stop dev server gracefully (`Ctrl+C`)
- Clear `.next` folder if you see chunk errors
- Use hard refresh when developing (`Ctrl+Shift+R`)

