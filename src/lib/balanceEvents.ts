/**
 * Mecanism centralizat și ușor de invalidare pentru datele de balanță.
 *
 * Hook-urile care țin starea balanțelor (`useBalante`, `useTrialBalances`) sunt
 * instanțe separate, montate în pagini diferite. Acest event bus permite ca o
 * mutație dintr-un loc (upload / ștergere) să notifice toți consumatorii montați
 * să-și reîmprospăteze datele, fără a depinde de remontarea paginii.
 *
 * Nu atinge baza de date: doar semnalează că datele s-au schimbat.
 */

type BalanceChangeListener = (companyId: string | null) => void;

const listeners = new Set<BalanceChangeListener>();

/**
 * Notifică toți consumatorii că balanțele unei companii s-au schimbat.
 *
 * @param companyId - Compania afectată; `null` invalidează necondiționat.
 */
export function emitBalancesChanged(companyId: string | null): void {
  listeners.forEach((listener) => {
    try {
      listener(companyId);
    } catch (error) {
      console.error('[balanceEvents] Listener error:', error);
    }
  });
}

/**
 * Abonează un listener la schimbările de balanță.
 *
 * @returns Funcție de dezabonare (de apelat în cleanup-ul de efect).
 */
export function subscribeBalancesChanged(listener: BalanceChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
