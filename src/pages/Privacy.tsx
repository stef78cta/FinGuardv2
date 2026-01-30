import PageShell from '@/components/marketing/PageShell';
import { AlertTriangle } from 'lucide-react';

const Privacy = () => {
  return (
    <PageShell
      title="Politica de Confidențialitate"
      heroTitle="Politica de Confidențialitate"
      heroSubtitle="Ultima actualizare: Ianuarie 2025"
      narrow
    >
      {/* Disclaimer */}
      <div className="mb-12 p-4 rounded-[var(--newa-radius-lg)] bg-[var(--newa-status-warning)]/10 border border-[var(--newa-status-warning)]/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[var(--newa-status-warning)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--newa-text-secondary)]">
          Acest document are caracter orientativ și va fi revizuit de un consilier juridic înainte de publicarea 
          oficială. Textul de mai jos nu constituie consiliere juridică.
        </p>
      </div>

      <div className="prose-custom space-y-8">
        {/* 1. Cine suntem */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">1. Cine suntem</h2>
          <p className="text-[var(--newa-text-secondary)] mb-3">
            Operatorul datelor cu caracter personal este:
          </p>
          <div className="p-4 rounded-[var(--newa-radius-md)] bg-[var(--newa-surface-light)] border border-[var(--newa-border-subtle)] text-[var(--newa-text-secondary)]">
            <p><strong>FinGuard S.R.L.</strong></p>
            <p>Adresa: [Adresa completă va fi adăugată]</p>
            <p>CUI: [Va fi adăugat]</p>
            <p>Email: <a href="mailto:privacy@finguard.ro" className="text-[var(--newa-brand-accent-indigo)] hover:underline">privacy@finguard.ro</a></p>
          </div>
          <p className="text-[var(--newa-text-secondary)] mt-3">
            Pentru întrebări legate de protecția datelor, contactați Responsabilul cu Protecția Datelor (DPO) 
            la adresa de email de mai sus.
          </p>
        </section>

        {/* 2. Ce date colectăm */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">2. Ce date colectăm</h2>
          <p className="text-[var(--newa-text-secondary)] mb-3">
            Colectăm și prelucrăm următoarele categorii de date:
          </p>
          <ul className="space-y-2 text-[var(--newa-text-secondary)]">
            <li><strong>Date de cont:</strong> nume, adresă de email, parolă (criptată), rol în organizație</li>
            <li><strong>Date despre companie:</strong> denumire, CUI, date de contact ale companiei</li>
            <li><strong>Fișiere încărcate:</strong> balanțe contabile și alte documente financiare în format Excel sau CSV</li>
            <li><strong>Date de utilizare:</strong> acțiuni în platformă, timestamp-uri, adrese IP</li>
            <li><strong>Date tehnice:</strong> tip de browser, sistem de operare, rezoluție ecran</li>
          </ul>
        </section>

        {/* 3. Scopuri și temeiuri */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">3. Scopuri și temeiuri legale</h2>
          <p className="text-[var(--newa-text-secondary)] mb-3">
            Prelucrăm datele pentru următoarele scopuri:
          </p>
          <ul className="space-y-3 text-[var(--newa-text-secondary)]">
            <li>
              <strong>Furnizarea serviciului</strong> (temei: executarea contractului) – autentificare, procesare date 
              financiare, generare rapoarte
            </li>
            <li>
              <strong>Securitate și audit</strong> (temei: interes legitim) – monitorizare pentru prevenirea abuzurilor, 
              jurnalizarea acțiunilor
            </li>
            <li>
              <strong>Comunicări despre serviciu</strong> (temei: interes legitim) – notificări despre modificări, 
              actualizări de securitate
            </li>
            <li>
              <strong>Marketing</strong> (temei: consimțământ) – newsletter, materiale promoționale; doar cu acord explicit
            </li>
            <li>
              <strong>Îmbunătățirea serviciului</strong> (temei: interes legitim) – analize agregate, anonimizate
            </li>
          </ul>
        </section>

        {/* 4. Stocare și perioade */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">4. Stocare și perioade de păstrare</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Păstrăm datele atât timp cât este necesar pentru îndeplinirea scopurilor descrise mai sus sau 
            conform cerințelor legale. În general:
          </p>
          <ul className="space-y-2 text-[var(--newa-text-secondary)] mt-3">
            <li>Datele de cont: pe durata relației contractuale + perioada legală de arhivare</li>
            <li>Fișierele încărcate: conform retenției configurate de utilizator sau la ștergerea contului</li>
            <li>Loguri de securitate: maxim 12 luni</li>
            <li>Date de marketing: până la retragerea consimțământului</li>
          </ul>
        </section>

        {/* 5. Împuterniciți */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">5. Împuterniciți și furnizori terți</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Colaborăm cu furnizori terți pentru operarea Platformei. Aceștia acționează ca împuterniciți și 
            au obligații contractuale de confidențialitate și securitate. Categorii de furnizori:
          </p>
          <ul className="space-y-2 text-[var(--newa-text-secondary)] mt-3">
            <li>Servicii de hosting și infrastructură cloud</li>
            <li>Servicii de email tranzacțional</li>
            <li>Instrumente de analiză și monitorizare</li>
            <li>Servicii de plăți (dacă este cazul)</li>
          </ul>
        </section>

        {/* 6. Transferuri */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">6. Transferuri în afara SEE</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Preferăm să stocăm și să prelucrăm datele în Spațiul Economic European. Dacă un transfer în afara 
            SEE este necesar, ne asigurăm că există garanții adecvate (clauze contractuale standard, decizii de 
            adecvare sau alte mecanisme conforme GDPR).
          </p>
        </section>

        {/* 7. Securitate */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">7. Securitate</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Implementăm măsuri tehnice și organizatorice pentru protejarea datelor, incluzând:
          </p>
          <ul className="space-y-2 text-[var(--newa-text-secondary)] mt-3">
            <li>Criptarea datelor în tranzit (TLS/HTTPS)</li>
            <li>Acces pe bază de roluri și permisiuni</li>
            <li>Autentificare securizată</li>
            <li>Monitorizare și jurnalizare</li>
            <li>Backup-uri regulate</li>
          </ul>
          <p className="text-[var(--newa-text-secondary)] mt-3">
            Nicio metodă de transmitere sau stocare electronică nu este 100% sigură. Ne angajăm să răspundem 
            prompt la orice incident de securitate.
          </p>
        </section>

        {/* 8. Drepturile persoanei vizate */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">8. Drepturile dumneavoastră</h2>
          <p className="text-[var(--newa-text-secondary)] mb-3">
            Conform GDPR, aveți următoarele drepturi:
          </p>
          <ul className="space-y-2 text-[var(--newa-text-secondary)]">
            <li><strong>Dreptul de acces:</strong> să solicitați o copie a datelor dvs.</li>
            <li><strong>Dreptul la rectificare:</strong> să corectați datele incorecte</li>
            <li><strong>Dreptul la ștergere:</strong> să solicitați ștergerea datelor ("dreptul de a fi uitat")</li>
            <li><strong>Dreptul la restricționare:</strong> să limitați prelucrarea în anumite situații</li>
            <li><strong>Dreptul la portabilitate:</strong> să primiți datele într-un format structurat</li>
            <li><strong>Dreptul la opoziție:</strong> să vă opuneți prelucrării bazate pe interes legitim</li>
            <li><strong>Dreptul de retragere a consimțământului:</strong> oricând, pentru prelucrările bazate pe consimțământ</li>
          </ul>
          <p className="text-[var(--newa-text-secondary)] mt-3">
            Pentru exercitarea acestor drepturi, contactați-ne la{' '}
            <a 
              href="mailto:privacy@finguard.ro" 
              className="text-[var(--newa-brand-accent-indigo)] hover:underline newa-focus-ring rounded"
            >
              privacy@finguard.ro
            </a>
            . Răspundem în maxim 30 de zile. Aveți dreptul de a depune o plângere la autoritatea de supraveghere 
            (ANSPDCP în România).
          </p>
        </section>

        {/* 9. Cookies */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">9. Cookies</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Platforma utilizează cookies pentru funcționalitate și analiză. Cookies esențiale sunt necesare 
            pentru autentificare și securitate. Cookies de analiză ne ajută să înțelegem cum este utilizată 
            Platforma. Puteți controla cookies din setările browserului. Dezactivarea unor cookies poate 
            afecta funcționalitatea.
          </p>
        </section>

        {/* 10. Actualizări */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">10. Actualizări ale Politicii</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Putem actualiza această Politică periodic. Modificările semnificative vor fi notificate prin email 
            sau prin intermediul Platformei. Vă încurajăm să revedeți periodic această pagină.
          </p>
          <p className="text-[var(--newa-text-secondary)] mt-3">
            Pentru întrebări, contactați-ne la{' '}
            <a 
              href="mailto:privacy@finguard.ro" 
              className="text-[var(--newa-brand-accent-indigo)] hover:underline newa-focus-ring rounded"
            >
              privacy@finguard.ro
            </a>
          </p>
        </section>
      </div>
    </PageShell>
  );
};

export default Privacy;
