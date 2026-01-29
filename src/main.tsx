import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * ============================================
 * DIAGNOSTIC LOGGING - Tab Switch Debug
 * Acest cod ajută la identificarea cauzei resetării la schimbarea tab-ului.
 * Setează DEBUG_TAB_SWITCH = false după diagnosticare.
 * Vezi DEBUG_TAB_SWITCH.md pentru interpretarea output-ului.
 * ============================================
 */
const DEBUG_TAB_SWITCH = true;

// Detectare Browser Tab Discarding
const detectTabDiscarding = () => {
  const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  const navType = navEntries[0]?.type;
  const wasDiscarded = navType === 'reload' && sessionStorage.getItem('__app_was_active') === 'true';
  
  if (wasDiscarded) {
    console.log('%c[TAB DISCARDING DETECTED] Browser a discardat tab-ul și l-a reîncărcat!', 
      'background: #ff0000; color: #fff; padding: 8px; font-size: 14px;');
    console.log('%c[CAUZA] Browser-ul a eliberat memoria ocupată de acest tab inactiv.', 
      'background: #ff6600; color: #fff; padding: 4px;');
    console.log('%c[SOLUȚIE] State-ul trebuie restaurat din sessionStorage.', 
      'background: #009900; color: #fff; padding: 4px;');
  }
  
  // Marchează că aplicația este activă
  sessionStorage.setItem('__app_was_active', 'true');
  
  return { navType, wasDiscarded };
};

if (DEBUG_TAB_SWITCH) {
  const mountId = Date.now();
  const { navType, wasDiscarded } = detectTabDiscarding();
  
  console.log(`%c[MOUNT] Main.tsx executed at ${new Date().toISOString()}`, 'background: #ff0000; color: #fff; padding: 4px;');
  console.log(`[MOUNT] Mount ID: ${mountId}`);
  console.log(`%c[NAVIGATION] Type: ${navType}`, navType === 'reload' ? 'background: #ff6600; color: #fff; padding: 4px;' : 'background: #0066ff; color: #fff; padding: 4px;');
  
  if (wasDiscarded) {
    console.log('%c===== DIAGNOSTIC: BROWSER TAB DISCARDING =====', 'background: #ff0000; color: #fff; padding: 8px; font-weight: bold;');
  }
  
  // Verifică dacă există un mountId anterior
  const previousMountId = sessionStorage.getItem('__debug_last_mount_id');
  const previousTimestamp = sessionStorage.getItem('__debug_last_timestamp');
  if (previousMountId) {
    console.log(`[MOUNT] Previous mount ID: ${previousMountId}`);
    if (previousTimestamp) {
      const timeDiff = Date.now() - parseInt(previousTimestamp);
      console.log(`[MOUNT] Time since last mount: ${Math.round(timeDiff / 1000)}s`);
    }
    console.log(`%c[ANALYSIS] App was ${previousMountId === String(mountId) ? 'NOT remounted' : 'REMOUNTED'}`, 
      previousMountId === String(mountId) ? 'background: #00ff00; color: #000;' : 'background: #ff0000; color: #fff;');
  }
  sessionStorage.setItem('__debug_last_mount_id', String(mountId));
  sessionStorage.setItem('__debug_last_timestamp', String(Date.now()));
  
  // Event listeners pentru debugging
  document.addEventListener('visibilitychange', () => {
    const state = document.visibilityState;
    console.log(`%c[EVENT] visibilitychange: ${state}`, 'background: #9900ff; color: #fff; padding: 2px;');
    if (state === 'hidden') {
      sessionStorage.setItem('__debug_hidden_at', String(Date.now()));
    } else if (state === 'visible') {
      const hiddenAt = sessionStorage.getItem('__debug_hidden_at');
      if (hiddenAt) {
        const hiddenDuration = Date.now() - parseInt(hiddenAt);
        console.log(`[EVENT] Tab was hidden for: ${Math.round(hiddenDuration / 1000)}s`);
      }
    }
  });
  
  window.addEventListener('focus', () => {
    console.log(`%c[EVENT] window focus`, 'background: #009900; color: #fff; padding: 2px;');
  });
  
  window.addEventListener('blur', () => {
    console.log(`%c[EVENT] window blur`, 'background: #666666; color: #fff; padding: 2px;');
  });
  
  window.addEventListener('pageshow', (event) => {
    console.log(`%c[EVENT] pageshow - persisted: ${event.persisted}`, 'background: #ff9900; color: #000; padding: 2px;');
    if (event.persisted) {
      console.log('%c[BF-CACHE] Page restored from bfcache - state should be intact!', 'background: #00ff00; color: #000; padding: 4px;');
    }
  });
  
  window.addEventListener('pagehide', (event) => {
    console.log(`%c[EVENT] pagehide - persisted: ${event.persisted}`, 'background: #990000; color: #fff; padding: 2px;');
  });
  
  window.addEventListener('beforeunload', () => {
    console.log(`%c[EVENT] beforeunload - page is being unloaded!`, 'background: #ff0000; color: #fff; padding: 4px;');
  });
  
  // Detectare freeze/resume events (Page Lifecycle API)
  if ('onfreeze' in document) {
    document.addEventListener('freeze', () => {
      console.log('%c[LIFECYCLE] Page FROZEN by browser!', 'background: #0066ff; color: #fff; padding: 4px;');
    });
    document.addEventListener('resume', () => {
      console.log('%c[LIFECYCLE] Page RESUMED from frozen state!', 'background: #00ff00; color: #000; padding: 4px;');
    });
  }
}
// ============================================
// END DIAGNOSTIC LOGGING
// ============================================

createRoot(document.getElementById("root")!).render(<App />);
