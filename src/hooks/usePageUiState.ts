import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';

/**
 * Generează cheia pentru sessionStorage bazată pe rută, companie și user.
 * Format: ui_state:<route>:<companyId>:<userId>
 */
const getStorageKey = (routeKey: string, companyId?: string, userId?: string): string => {
  const parts = ['ui_state', routeKey];
  if (companyId) parts.push(companyId);
  if (userId) parts.push(userId);
  return parts.join(':');
};

/**
 * Salvează state-ul în sessionStorage cu tratarea erorilor.
 */
const saveToStorage = <T>(key: string, state: T): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('[usePageUiState] Failed to save state to sessionStorage:', error);
  }
};

/**
 * Citește state-ul din sessionStorage cu tratarea erorilor.
 */
const loadFromStorage = <T>(key: string): T | null => {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (error) {
    console.warn('[usePageUiState] Failed to load state from sessionStorage:', error);
  }
  return null;
};

/**
 * Interfața pentru opțiunile scroll-ului.
 */
interface ScrollOptions {
  /** Referință la containerul de scroll (dacă nu e window) */
  scrollContainerRef?: React.RefObject<HTMLElement>;
  /** Restaurează scroll-ul automat la mount */
  restoreScroll?: boolean;
}

/**
 * Interfața pentru return-ul hook-ului.
 */
interface UsePageUiStateReturn<T> {
  /** State-ul curent */
  state: T;
  /** Setter pentru state (similar cu useState) */
  setState: React.Dispatch<React.SetStateAction<T>>;
  /** Actualizează parțial state-ul (merge) */
  updateState: (partial: Partial<T>) => void;
  /** Resetează state-ul la valoarea inițială */
  resetState: () => void;
  /** Salvează manual state-ul (util pentru acțiuni critice) */
  saveNow: () => void;
  /** Indică dacă state-ul a fost restaurat din storage */
  wasRestored: boolean;
}

/**
 * Hook reutilizabil pentru persistența state-ului UI per pagină.
 * 
 * Salvează automat state-ul în sessionStorage și îl restaurează la mount,
 * asigurând că UI-ul rămâne identic la schimbarea tab-ului browserului.
 * 
 * Caracteristici:
 * - Salvare automată cu debounce (300ms)
 * - Salvare la visibilitychange când documentul devine hidden
 * - Restaurare automată la mount
 * - Suport pentru scroll position (window sau container custom)
 * - Cheie unică per rută/companie/user
 * 
 * @param routeKey - Identificator unic pentru pagină (ex: 'incarcare-balanta')
 * @param initialState - State-ul inițial (folosit dacă nu există date salvate)
 * @param options - Opțiuni pentru scroll
 * 
 * @example
 * ```tsx
 * const { state, updateState, wasRestored } = usePageUiState('my-page', {
 *   filters: {},
 *   sortBy: 'date',
 *   page: 0,
 *   expandedRows: []
 * });
 * 
 * // Actualizare parțială
 * updateState({ page: 2 });
 * 
 * // Sau înlocuire completă
 * setState({ ...state, filters: newFilters });
 * ```
 */
export function usePageUiState<T extends Record<string, unknown>>(
  routeKey: string,
  initialState: T,
  options: ScrollOptions = {}
): UsePageUiStateReturn<T> {
  const { restoreScroll = true, scrollContainerRef } = options;
  const location = useLocation();
  const { user } = useAuth();
  const { activeCompany } = useCompanyContext();
  
  // Generează cheia de storage
  const storageKey = getStorageKey(routeKey, activeCompany?.id, user?.id);
  
  // Referințe pentru debounce și tracking
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasRestoredRef = useRef(false);
  const scrollPositionRef = useRef<number>(0);
  
  // Inițializează state-ul din storage sau folosește initialState
  const [state, setStateInternal] = useState<T>(() => {
    const stored = loadFromStorage<T>(storageKey);
    if (stored) {
      wasRestoredRef.current = true;
      return { ...initialState, ...stored };
    }
    return initialState;
  });
  
  const [wasRestored] = useState(() => wasRestoredRef.current);
  
  /**
   * Salvează state-ul cu debounce pentru a evita scrierea excesivă.
   */
  const debouncedSave = useCallback((stateToSave: T) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveToStorage(storageKey, stateToSave);
    }, 300);
  }, [storageKey]);
  
  /**
   * Salvează imediat (fără debounce).
   */
  const saveNow = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    saveToStorage(storageKey, state);
  }, [storageKey, state]);
  
  /**
   * Wrapper pentru setState care declanșează și salvarea.
   */
  const setState: React.Dispatch<React.SetStateAction<T>> = useCallback((action) => {
    setStateInternal((prev) => {
      const newState = typeof action === 'function' 
        ? (action as (prev: T) => T)(prev) 
        : action;
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);
  
  /**
   * Actualizează parțial state-ul (merge shallow).
   */
  const updateState = useCallback((partial: Partial<T>) => {
    setStateInternal((prev) => {
      const newState = { ...prev, ...partial };
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);
  
  /**
   * Resetează state-ul la valoarea inițială și șterge din storage.
   */
  const resetState = useCallback(() => {
    setStateInternal(initialState);
    try {
      sessionStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('[usePageUiState] Failed to remove state from sessionStorage:', error);
    }
  }, [initialState, storageKey]);
  
  /**
   * Salvează scroll position-ul.
   */
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef?.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    } else {
      scrollPositionRef.current = window.scrollY;
    }
  }, [scrollContainerRef]);
  
  /**
   * Restaurează scroll position-ul.
   */
  const restoreScrollPosition = useCallback(() => {
    if (!restoreScroll) return;
    
    // Folosim requestAnimationFrame pentru a ne asigura că DOM-ul e randat
    requestAnimationFrame(() => {
      const savedScroll = scrollPositionRef.current;
      if (savedScroll > 0) {
        if (scrollContainerRef?.current) {
          scrollContainerRef.current.scrollTop = savedScroll;
        } else {
          window.scrollTo(0, savedScroll);
        }
      }
    });
  }, [restoreScroll, scrollContainerRef]);
  
  /**
   * Handler pentru visibilitychange - salvează când tab-ul devine hidden.
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Salvează imediat când tab-ul devine hidden
        saveScrollPosition();
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        saveToStorage(storageKey, {
          ...state,
          __scrollPosition: scrollPositionRef.current,
        });
      } else if (document.visibilityState === 'visible') {
        // La revenire, restaurăm scroll-ul dacă e cazul
        const stored = loadFromStorage<T & { __scrollPosition?: number }>(storageKey);
        if (stored?.__scrollPosition) {
          scrollPositionRef.current = stored.__scrollPosition;
          restoreScrollPosition();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [storageKey, state, saveScrollPosition, restoreScrollPosition]);
  
  /**
   * La mount, restaurează scroll-ul dacă state-ul a fost restaurat.
   */
  useEffect(() => {
    if (wasRestored && restoreScroll) {
      const stored = loadFromStorage<T & { __scrollPosition?: number }>(storageKey);
      if (stored?.__scrollPosition) {
        scrollPositionRef.current = stored.__scrollPosition;
        // Delay mic pentru a permite DOM-ului să se randeze complet
        setTimeout(restoreScrollPosition, 100);
      }
    }
  }, [wasRestored, restoreScroll, storageKey, restoreScrollPosition]);
  
  /**
   * Cleanup la unmount - salvează state-ul final.
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Salvează state-ul final la unmount
      saveToStorage(storageKey, state);
    };
  }, [storageKey, state]);
  
  /**
   * Când se schimbă compania/user-ul, reîncarcă state-ul pentru noua cheie.
   */
  useEffect(() => {
    const newStorageKey = getStorageKey(routeKey, activeCompany?.id, user?.id);
    if (newStorageKey !== storageKey) {
      // Salvează state-ul pentru cheia veche
      saveToStorage(storageKey, state);
      // Încarcă state-ul pentru cheia nouă
      const stored = loadFromStorage<T>(newStorageKey);
      if (stored) {
        setStateInternal({ ...initialState, ...stored });
      } else {
        setStateInternal(initialState);
      }
    }
  }, [activeCompany?.id, user?.id, routeKey]);
  
  return {
    state,
    setState,
    updateState,
    resetState,
    saveNow,
    wasRestored,
  };
}

/**
 * Versiune simplificată pentru cazuri unde nu ai nevoie de toate funcționalitățile.
 * Folosește doar sessionStorage fără scroll tracking.
 */
export function useSimplePageState<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const stored = loadFromStorage<T>(key);
    return stored ?? initialValue;
  });
  
  const setStateWithPersist = useCallback((value: T) => {
    setState(value);
    saveToStorage(key, value);
  }, [key]);
  
  return [state, setStateWithPersist];
}

export default usePageUiState;
