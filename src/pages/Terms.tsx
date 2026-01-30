import PageShell from '@/components/marketing/PageShell';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const Terms = () => {
  return (
    <PageShell
      title="Termeni și Condiții"
      heroTitle="Termeni și Condiții"
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
        {/* 1. Definiții */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">1. Definiții</h2>
          <ul className="space-y-2 text-[var(--newa-text-secondary)]">
            <li><strong>"Platforma"</strong> sau <strong>"Serviciul"</strong> – aplicația web FinGuard și toate funcționalitățile asociate.</li>
            <li><strong>"Operator"</strong> sau <strong>"Noi"</strong> – societatea care operează Platforma (detalii în secțiunea Contact).</li>
            <li><strong>"Utilizator"</strong> sau <strong>"Dvs."</strong> – persoana sau entitatea care accesează sau utilizează Platforma.</li>
            <li><strong>"Cont"</strong> – contul creat de Utilizator pentru accesarea Platformei.</li>
            <li><strong>"Date"</strong> – informațiile încărcate, introduse sau generate de Utilizator în cadrul Platformei.</li>
          </ul>
        </section>

        {/* 2. Descrierea serviciului */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">2. Descrierea serviciului</h2>
          <p className="text-[var(--newa-text-secondary)] mb-3">
            FinGuard oferă instrumente software pentru:
          </p>
          <ul className="space-y-2 text-[var(--newa-text-secondary)]">
            <li>Importul și procesarea balanțelor contabile</li>
            <li>Maparea conturilor la structuri de raportare</li>
            <li>Generarea rapoartelor financiare (P&L, Bilanț, Cash Flow)</li>
            <li>Calculul și monitorizarea indicatorilor financiari</li>
            <li>Colaborarea în echipă pe date financiare</li>
          </ul>
          <p className="text-[var(--newa-text-secondary)] mt-3">
            <strong>Important:</strong> Platforma nu oferă consultanță financiară, contabilă sau juridică. Rezultatele 
            depind de datele introduse de Utilizator. Utilizatorul este responsabil pentru validarea și interpretarea 
            informațiilor generate.
          </p>
        </section>

        {/* 3. Conturi și acces */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">3. Conturi și acces</h2>
          <p className="text-[var(--newa-text-secondary)] mb-3">
            Pentru utilizarea Platformei este necesar un Cont. Utilizatorul este responsabil pentru:
          </p>
          <ul className="space-y-2 text-[var(--newa-text-secondary)]">
            <li>Furnizarea de informații corecte și actualizate la înregistrare</li>
            <li>Păstrarea confidențialității credențialelor de acces</li>
            <li>Toate acțiunile efectuate din Cont</li>
            <li>Notificarea imediată în cazul accesului neautorizat</li>
          </ul>
        </section>

        {/* 4. Abonamente și plăți */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">4. Abonamente și plăți</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Accesul la funcționalitățile Platformei poate fi condiționat de un abonament plătit. Detaliile 
            privind prețurile, perioadele de facturare și modalitățile de plată sunt prezentate în pagina 
            de prețuri sau în oferta comercială. Neplata la termen poate duce la suspendarea accesului.
          </p>
        </section>

        {/* 5. Utilizare acceptabilă */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">5. Utilizare acceptabilă</h2>
          <p className="text-[var(--newa-text-secondary)] mb-3">
            Utilizatorul se angajează să nu:
          </p>
          <ul className="space-y-2 text-[var(--newa-text-secondary)]">
            <li>Acceseze Platforma prin metode neautorizate</li>
            <li>Încarce conținut malițios, viruși sau cod dăunător</li>
            <li>Extragă date prin scraping sau metode automatizate neautorizate</li>
            <li>Utilizeze Platforma pentru activități ilegale</li>
            <li>Perturbe funcționarea normală a Platformei</li>
            <li>Revândă sau sublicențeze accesul fără acord scris</li>
          </ul>
        </section>

        {/* 6. Proprietate intelectuală */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">6. Proprietate intelectuală</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Platforma, inclusiv codul sursă, designul, logo-urile și documentația, sunt proprietatea Operatorului 
            sau a licențiatorilor săi. Utilizatorul primește o licență limitată, neexclusivă și netransferabilă 
            de utilizare a Platformei conform acestor Termeni. Datele încărcate de Utilizator rămân proprietatea 
            acestuia.
          </p>
        </section>

        {/* 7. Confidențialitate */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">7. Confidențialitate</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Colectarea și prelucrarea datelor personale sunt descrise în{' '}
            <Link 
              to="/confidentialitate" 
              className="text-[var(--newa-brand-accent-indigo)] hover:underline newa-focus-ring rounded"
            >
              Politica de Confidențialitate
            </Link>
            , care face parte integrantă din acești Termeni.
          </p>
        </section>

        {/* 8. Limitarea răspunderii */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">8. Limitarea răspunderii</h2>
          <p className="text-[var(--newa-text-secondary)] mb-3">
            În limita permisă de lege:
          </p>
          <ul className="space-y-2 text-[var(--newa-text-secondary)]">
            <li>Platforma este furnizată "ca atare", fără garanții exprese sau implicite privind adecvarea pentru un anumit scop</li>
            <li>Operatorul nu garantează disponibilitatea neîntreruptă sau lipsa erorilor</li>
            <li>Operatorul nu este răspunzător pentru deciziile de afaceri luate pe baza informațiilor din Platformă</li>
            <li>Răspunderea totală a Operatorului este limitată la suma plătită de Utilizator în ultimele 12 luni</li>
          </ul>
        </section>

        {/* 9. Suspendare și încetare */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">9. Suspendare și încetare</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Operatorul poate suspenda sau închide accesul Utilizatorului în caz de încălcare a acestor Termeni, 
            neplată sau solicitare legală. Utilizatorul poate închide Contul oricând. La încetare, accesul la 
            Date va fi disponibil pentru export pentru o perioadă rezonabilă, după care Datele pot fi șterse.
          </p>
        </section>

        {/* 10. Modificări */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">10. Modificări ale Termenilor</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Operatorul poate modifica acești Termeni. Modificările semnificative vor fi notificate cu cel puțin 
            30 de zile înainte. Continuarea utilizării Platformei după intrarea în vigoare a modificărilor 
            constituie acceptarea acestora.
          </p>
        </section>

        {/* 11. Legea aplicabilă */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">11. Legea aplicabilă și jurisdicție</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Acești Termeni sunt guvernați de legea română. Eventualele dispute vor fi soluționate de instanțele 
            competente din București, România.
          </p>
        </section>

        {/* 12. Contact */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--newa-text-primary)] mb-4">12. Contact</h2>
          <p className="text-[var(--newa-text-secondary)]">
            Pentru întrebări privind acești Termeni, contactați-ne la:{' '}
            <a 
              href="mailto:legal@finguard.ro" 
              className="text-[var(--newa-brand-accent-indigo)] hover:underline newa-focus-ring rounded"
            >
              legal@finguard.ro
            </a>
          </p>
        </section>
      </div>
    </PageShell>
  );
};

export default Terms;
