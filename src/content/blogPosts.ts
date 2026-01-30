export interface BlogPostContent {
  type: 'paragraph' | 'heading' | 'list' | 'example';
  text?: string;
  items?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime: string;
  category: string;
  tags: string[];
  content: BlogPostContent[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'cum-citesti-rapid-balanta-verificare',
    title: 'Cum citești rapid o balanță de verificare: 7 controale care prind erori',
    excerpt: 'Verificarea balanței contabile nu trebuie să dureze ore. Iată 7 controale rapide care îți arată instant dacă ceva nu e în regulă.',
    date: '2025-01-15',
    readingTime: '6 min',
    category: 'Contabilitate',
    tags: ['balanță', 'verificare', 'erori', 'control'],
    content: [
      {
        type: 'paragraph',
        text: 'Balanța de verificare este unul dintre cele mai importante instrumente de control în contabilitate. Ea confirmă că principiul dublei înregistrări a fost respectat și oferă o imagine de ansamblu asupra soldurilor conturilor.'
      },
      {
        type: 'paragraph',
        text: 'Cu toate acestea, mulți contabili petrec ore verificând manual fiecare linie. În realitate, există 7 controale rapide care identifică marea majoritate a problemelor în câteva minute.'
      },
      {
        type: 'heading',
        text: '1. Verifică egalitatea debit-credit'
      },
      {
        type: 'paragraph',
        text: 'Primul și cel mai evident control: totalul debitelor trebuie să fie egal cu totalul creditelor. Dacă nu sunt egale, ai o eroare de înregistrare undeva.'
      },
      {
        type: 'heading',
        text: '2. Caută solduri negative neașteptate'
      },
      {
        type: 'paragraph',
        text: 'Un cont de casă cu sold negativ? Un stoc cu valoare negativă? Acestea sunt semne clare de erori. Unele conturi pot avea solduri negative legitime (ajustări, provizioane), dar majoritatea nu ar trebui.'
      },
      {
        type: 'heading',
        text: '3. Compară cu luna anterioară'
      },
      {
        type: 'paragraph',
        text: 'Variații mari față de luna precedentă necesită explicații. O creștere de 500% la cheltuieli administrative sau o scădere bruscă a stocurilor ar trebui investigate.'
      },
      {
        type: 'example',
        text: 'Exemplu: Dacă contul 401 (Furnizori) avea sold 150.000 lei luna trecută și acum are 15.000 lei, verifică dacă au fost plăți mari sau dacă lipsesc facturi.'
      },
      {
        type: 'heading',
        text: '4. Verifică conturile de regularizare'
      },
      {
        type: 'paragraph',
        text: 'Conturile 471, 472 (Cheltuieli/Venituri înregistrate în avans) și 408, 418 (Facturi nesosite/de întocmit) ar trebui să aibă solduri explicabile și documentate.'
      },
      {
        type: 'heading',
        text: '5. Reconciliază cu extrasele bancare'
      },
      {
        type: 'paragraph',
        text: 'Soldul contului 512 trebuie să corespundă cu extrasul bancar. Diferențele pot fi legitime (cecuri în tranzit, operațiuni neprocesate), dar trebuie documentate.'
      },
      {
        type: 'heading',
        text: '6. Verifică TVA-ul'
      },
      {
        type: 'paragraph',
        text: 'Soldurile conturilor 4426 și 4427 trebuie să corespundă cu decontul de TVA. Diferențele semnificative indică erori de înregistrare sau declarare.'
      },
      {
        type: 'heading',
        text: '7. Caută conturi cu mișcări neobișnuite'
      },
      {
        type: 'list',
        items: [
          'Conturi care ar trebui să aibă mișcări dar nu au (amortizare, salarii)',
          'Conturi cu mișcări dar fără sold final logic',
          'Conturi inactive care brusc au solduri'
        ]
      },
      {
        type: 'paragraph',
        text: 'Aplicând aceste 7 controale sistematic, vei identifica majoritatea erorilor înainte ca ele să ajungă în rapoartele financiare sau în declarații.'
      }
    ]
  },
  {
    slug: 'pl-vs-cash-flow-diferente',
    title: 'P&L vs Cash Flow: de ce profitul nu înseamnă bani în bancă',
    excerpt: 'O companie poate fi profitabilă pe hârtie și totuși să nu aibă lichidități. Înțelege diferența critică dintre profit și flux de numerar.',
    date: '2025-01-10',
    readingTime: '7 min',
    category: 'Analiză Financiară',
    tags: ['P&L', 'cash flow', 'lichiditate', 'profit'],
    content: [
      {
        type: 'paragraph',
        text: 'Una dintre cele mai frecvente confuzii în finanțe este echivalarea profitului cu disponibilul de numerar. "Dacă avem profit, de ce nu avem bani?" - o întrebare pe care mulți antreprenori o pun contabililor lor.'
      },
      {
        type: 'paragraph',
        text: 'Răspunsul stă în diferența fundamentală dintre contabilitatea pe bază de angajamente (P&L) și mișcarea efectivă a banilor (Cash Flow).'
      },
      {
        type: 'heading',
        text: 'Ce măsoară fiecare raport'
      },
      {
        type: 'paragraph',
        text: 'Contul de Profit și Pierdere (P&L) înregistrează veniturile când sunt realizate și cheltuielile când sunt angajate, indiferent de momentul încasării sau plății. Cash Flow-ul urmărește strict intrările și ieșirile de numerar.'
      },
      {
        type: 'example',
        text: 'Exemplu: Vinzi marfă de 100.000 lei în decembrie, cu plata în 60 de zile. În P&L apare venit de 100.000 lei în decembrie. În Cash Flow, încasarea apare abia în februarie.'
      },
      {
        type: 'heading',
        text: 'Cele 5 cauze principale ale diferențelor'
      },
      {
        type: 'list',
        items: [
          'Creanțe neîncasate - venituri recunoscute dar neîncasate',
          'Stocuri - bani blocați în marfă nevândută',
          'Amortizare - cheltuială fără ieșire de numerar',
          'Investiții - ieșiri de cash care nu apar în P&L',
          'Credite - intrări/ieșiri de numerar fără impact în profit'
        ]
      },
      {
        type: 'heading',
        text: 'Scenariul companiei profitabile fără cash'
      },
      {
        type: 'paragraph',
        text: 'Imaginează-ți o companie cu vânzări de 1 milion lei și marjă de 20% (profit 200.000 lei). Dar: clienții plătesc în 90 de zile, furnizorii cer plata în 30 de zile, și compania crește rapid necesitând stocuri mai mari.'
      },
      {
        type: 'paragraph',
        text: 'Rezultatul: profit pe hârtie, dar nevoie constantă de finanțare pentru a susține operațiunile. Aceasta este capcana creșterii fără capital de lucru adecvat.'
      },
      {
        type: 'heading',
        text: 'Indicatori de urmărit'
      },
      {
        type: 'list',
        items: [
          'DSO (Days Sales Outstanding) - câte zile durează încasarea',
          'DPO (Days Payable Outstanding) - câte zile durează plata furnizorilor',
          'Ciclul de conversie a numerarului - timpul între plata furnizorului și încasarea de la client',
          'Free Cash Flow - numerarul rămas după investiții'
        ]
      },
      {
        type: 'heading',
        text: 'Recomandări practice'
      },
      {
        type: 'paragraph',
        text: 'Monitorizează ambele rapoarte împreună. Un profit fără cash flow pozitiv este nesustenabil pe termen lung. Un cash flow pozitiv fără profit poate indica vânzarea de active sau acumulare de datorii.'
      }
    ]
  },
  {
    slug: 'maparea-plan-conturi-rapoarte-management',
    title: 'Maparea planului de conturi la rapoarte de management: o abordare pragmatică',
    excerpt: 'Cum transformi balanța contabilă în rapoarte pe care managementul le înțelege și le folosește pentru decizii.',
    date: '2025-01-05',
    readingTime: '8 min',
    category: 'Raportare',
    tags: ['mapare', 'plan conturi', 'rapoarte', 'management'],
    content: [
      {
        type: 'paragraph',
        text: 'Planul de conturi românesc este organizat pentru conformitate fiscală și statutară, nu pentru management. Un director nu vrea să vadă conturi de la 601 la 628 - vrea să vadă "Costuri de producție" sau "Cheltuieli administrative".'
      },
      {
        type: 'paragraph',
        text: 'Maparea este procesul prin care grupezi conturile contabile în categorii relevante pentru decizii de business. Este esențială pentru orice raportare de management.'
      },
      {
        type: 'heading',
        text: 'Principii de bază ale mapării'
      },
      {
        type: 'list',
        items: [
          'Un cont se mapează la o singură linie de raport (evită dublările)',
          'Toate conturile trebuie mapate (completitudine)',
          'Maparea trebuie consistentă în timp (comparabilitate)',
          'Categoriile trebuie să aibă sens pentru utilizatori (relevanță)'
        ]
      },
      {
        type: 'heading',
        text: 'Structura recomandată pentru P&L managerial'
      },
      {
        type: 'paragraph',
        text: 'O structură frecvent utilizată împarte veniturile și cheltuielile astfel:'
      },
      {
        type: 'list',
        items: [
          'Venituri din vânzări (701, 702, 703, 704, 705, 706, 707, 708)',
          'Cost bunuri vândute - COGS (variația stocurilor + achiziții directe)',
          'Marja brută (calculat)',
          'Cheltuieli operaționale (salarii, utilități, servicii, amortizare operațională)',
          'EBITDA (calculat)',
          'Amortizare și depreciere',
          'EBIT / Profit operațional',
          'Venituri/Cheltuieli financiare',
          'Profit înainte de impozit',
          'Impozit pe profit',
          'Profit net'
        ]
      },
      {
        type: 'heading',
        text: 'Provocări comune'
      },
      {
        type: 'example',
        text: 'Provocare: Contul 641 (Salarii) conține atât salarii de producție cât și administrative. Soluție: Solicită contabilității să folosească analitice sau centre de cost pentru separare.'
      },
      {
        type: 'paragraph',
        text: 'Alte provocări includ: cheltuieli care traversează categorii, diferențe între IFRS și RAS, și nevoia de ajustări pentru comparabilitate internațională în grupuri.'
      },
      {
        type: 'heading',
        text: 'Documentarea mapării'
      },
      {
        type: 'paragraph',
        text: 'Menține o documentație clară a mapării: ce cont merge unde, de ce, și când a fost ultima actualizare. Această documentație este esențială pentru audit și pentru continuitate când se schimbă echipa.'
      },
      {
        type: 'heading',
        text: 'Automatizarea procesului'
      },
      {
        type: 'paragraph',
        text: 'Odată definită maparea, ea ar trebui aplicată automat la fiecare import de balanță. Instrumente precum FinGuard permit definirea mapării o singură dată și generarea automată a rapoartelor manageriale.'
      }
    ]
  },
  {
    slug: 'inchiderea-lunii-checklist-control-financiar',
    title: 'Închiderea lunii: checklist scurt pentru control financiar',
    excerpt: 'Un proces de închidere lunară structurat previne erorile și reduce timpul de pregătire a rapoartelor. Iată checklistul esențial.',
    date: '2024-12-28',
    readingTime: '5 min',
    category: 'Procese',
    tags: ['închidere', 'checklist', 'control', 'lunar'],
    content: [
      {
        type: 'paragraph',
        text: 'Închiderea lunară este momentul în care contabilitatea pregătește datele pentru raportare. Un proces haotic duce la erori, întârzieri și nopți nedormite. Un proces structurat oferă predictibilitate și calitate.'
      },
      {
        type: 'paragraph',
        text: 'Acest checklist acoperă pașii esențiali pentru o închidere eficientă. Adaptează-l la specificul companiei tale.'
      },
      {
        type: 'heading',
        text: 'Înainte de închidere (ziua -2 până la -1)'
      },
      {
        type: 'list',
        items: [
          'Confirmă că toate facturile de vânzare au fost emise',
          'Colectează toate facturile de achiziție de la departamente',
          'Verifică că extrasele bancare sunt actualizate',
          'Solicită date pentru facturi estimative (utilități, servicii recurente)'
        ]
      },
      {
        type: 'heading',
        text: 'Procesare tranzacții (ziua 1-2)'
      },
      {
        type: 'list',
        items: [
          'Înregistrează toate facturile de achiziție',
          'Înregistrează plățile și încasările',
          'Procesează notele de recepție și de ieșire din stoc',
          'Înregistrează salariile și contribuțiile',
          'Calculează și înregistrează amortizarea',
          'Procesează diferențele de curs valutar'
        ]
      },
      {
        type: 'heading',
        text: 'Reconcilieri (ziua 3)'
      },
      {
        type: 'list',
        items: [
          'Reconciliază conturile bancare cu extrasele',
          'Verifică soldul de TVA cu jurnalele',
          'Reconciliază conturile de clienți cu confirmările',
          'Verifică soldurile intercompanie (dacă e cazul)'
        ]
      },
      {
        type: 'heading',
        text: 'Control și raportare (ziua 4-5)'
      },
      {
        type: 'list',
        items: [
          'Generează balanța de verificare',
          'Aplică cele 7 controale de balanță (vezi articolul dedicat)',
          'Generează rapoartele manageriale (P&L, Balance Sheet)',
          'Pregătește analiza variațiilor vs buget și vs luna anterioară',
          'Documentează pozițiile neobișnuite sau ajustările'
        ]
      },
      {
        type: 'heading',
        text: 'Finalizare'
      },
      {
        type: 'paragraph',
        text: 'După aprobare, blocați perioada în sistemul contabil pentru a preveni modificări ulterioare. Arhivați documentele suport și comunicați rapoartele către stakeholderi conform calendarului stabilit.'
      },
      {
        type: 'example',
        text: 'Sfat: Creează un calendar de închidere cu deadline-uri clare pentru fiecare echipă. "Facturile trebuie predate până pe 2, raportul de vânzări până pe 3" etc.'
      }
    ]
  },
  {
    slug: 'buget-vs-realizat-explicarea-deviatiilor',
    title: 'Buget vs realizat: cum explici deviațiile fără să te pierzi în detalii',
    excerpt: 'Analiza buget vs realizat este esențială, dar poate deveni copleșitoare. Iată cum te concentrezi pe ce contează.',
    date: '2024-12-20',
    readingTime: '6 min',
    category: 'Bugetare',
    tags: ['buget', 'realizat', 'deviații', 'analiză'],
    content: [
      {
        type: 'paragraph',
        text: 'Fiecare lună, echipele financiare produc rapoarte de buget vs realizat. Problema: aceste rapoarte pot avea zeci de linii cu variații, iar timpul de analiză este limitat. Cum decizi ce merită atenție?'
      },
      {
        type: 'heading',
        text: 'Principiul materialității'
      },
      {
        type: 'paragraph',
        text: 'Nu toate deviațiile sunt egale. O variație de 50.000 lei la o linie de 5 milioane (1%) este mai puțin relevantă decât o variație de 20.000 lei la o linie de 100.000 lei (20%).'
      },
      {
        type: 'paragraph',
        text: 'Stabilește praguri clare: analizezi detaliat doar variațiile peste un anumit procent (ex: 10%) SAU peste o anumită valoare absolută (ex: 50.000 lei), oricare e îndeplinită.'
      },
      {
        type: 'heading',
        text: 'Clasificarea deviațiilor'
      },
      {
        type: 'list',
        items: [
          'Timing - cheltuiala vine luna viitoare, nu anul acesta (ex: factură întârziată)',
          'Volum - am vândut/produs mai mult sau mai puțin decât planificat',
          'Preț - prețurile de vânzare sau achiziție au variat',
          'Mix - structura vânzărilor/costurilor diferă de plan',
          'Eficiență - consumuri mai mari sau mai mici decât standardul',
          'Buget incorect - planificarea inițială a fost nerealistă'
        ]
      },
      {
        type: 'heading',
        text: 'Structura explicației'
      },
      {
        type: 'paragraph',
        text: 'Pentru fiecare deviație semnificativă, răspunde la:'
      },
      {
        type: 'list',
        items: [
          'CE: Care este deviația în lei și procent?',
          'DE CE: Ce a cauzat-o? (folosește clasificarea de mai sus)',
          'ACȚIUNE: Este nevoie de vreo măsură corectivă?',
          'FORECAST: Va continua tendința sau este punctuală?'
        ]
      },
      {
        type: 'example',
        text: 'Exemplu: "Cheltuieli de transport +45.000 lei (+15%) vs buget. Cauză: creșterea prețului la carburant (+12%) și volum mai mare de livrări (+8% comenzi). Acțiune: renegociere contract transportator. Forecast: așteptăm +10% pe lunile următoare."'
      },
      {
        type: 'heading',
        text: 'Formatul prezentării'
      },
      {
        type: 'paragraph',
        text: 'Managementul nu vrea să citească 50 de pagini. Prezintă un rezumat executiv cu top 5-10 deviații și impactul cumulat, urmat de detalii pentru cine vrea să aprofundeze.'
      },
      {
        type: 'paragraph',
        text: 'Vizualizările ajută: un grafic waterfall care arată cum s-a ajuns de la buget la realizat este mult mai clar decât un tabel.'
      }
    ]
  },
  {
    slug: 'indicatori-lichiditate-indatorare-interpretare',
    title: 'Indicatori de lichiditate și îndatorare: interpretare pentru decizii',
    excerpt: 'Lichiditatea și îndatorarea sunt vitale pentru sănătatea financiară. Înțelege ce îți spun acești indicatori și când să acționezi.',
    date: '2024-12-15',
    readingTime: '7 min',
    category: 'Indicatori',
    tags: ['lichiditate', 'îndatorare', 'indicatori', 'analiză'],
    content: [
      {
        type: 'paragraph',
        text: 'O companie poate fi profitabilă dar să intre în insolvență din lipsă de lichidități. Alta poate avea cash dar să fie sufocată de datorii. Indicatorii de lichiditate și îndatorare oferă vizibilitate asupra acestor riscuri.'
      },
      {
        type: 'heading',
        text: 'Indicatori de lichiditate'
      },
      {
        type: 'paragraph',
        text: 'Lichiditatea măsoară capacitatea de a plăti obligațiile pe termen scurt.'
      },
      {
        type: 'list',
        items: [
          'Lichiditate curentă = Active curente / Pasive curente (ideal: 1.5-2.0)',
          'Lichiditate rapidă = (Active curente - Stocuri) / Pasive curente (ideal: 1.0+)',
          'Lichiditate imediată = Disponibilități / Pasive curente (ideal: 0.2-0.5)'
        ]
      },
      {
        type: 'example',
        text: 'Interpretare: O lichiditate curentă de 0.8 înseamnă că activele curente nu acoperă datoriile pe termen scurt. Compania poate avea probleme de plată dacă nu obține finanțare sau nu accelerează încasările.'
      },
      {
        type: 'heading',
        text: 'Indicatori de îndatorare'
      },
      {
        type: 'paragraph',
        text: 'Îndatorarea măsoară dependența de creditori și riscul financiar.'
      },
      {
        type: 'list',
        items: [
          'Gradul de îndatorare = Datorii totale / Active totale (ideal: sub 60%)',
          'Levier financiar = Datorii totale / Capitaluri proprii (ideal: sub 1.5)',
          'Rata de acoperire a dobânzilor = EBIT / Cheltuieli cu dobânzile (ideal: peste 3)'
        ]
      },
      {
        type: 'heading',
        text: 'Contextul contează'
      },
      {
        type: 'paragraph',
        text: 'Nu există valori "corecte" universale. Industria, stadiul companiei și condițiile de piață influențează interpretarea:'
      },
      {
        type: 'list',
        items: [
          'Retail-ul operează cu lichiditate mică (stocuri mari, încasări rapide)',
          'Utilitățile pot susține îndatorare mare (cash flow-uri predictibile)',
          'Start-up-urile în creștere pot avea indicatori "slabi" dar potențial mare',
          'În criză economică, lichiditatea devine mai importantă decât profitabilitatea'
        ]
      },
      {
        type: 'heading',
        text: 'Semnale de alarmă'
      },
      {
        type: 'list',
        items: [
          'Lichiditate curentă sub 1 și în scădere',
          'Levier financiar peste 3 fără perspectivă de reducere',
          'Rata de acoperire a dobânzilor sub 1.5',
          'Tendință negativă pe mai multe trimestre consecutive'
        ]
      },
      {
        type: 'heading',
        text: 'Acțiuni corective'
      },
      {
        type: 'paragraph',
        text: 'Pentru îmbunătățirea lichidității: accelerează încasările, negociază termene mai lungi cu furnizorii, optimizează stocurile, refinanțează datorii pe termen scurt cu credite pe termen lung.'
      },
      {
        type: 'paragraph',
        text: 'Pentru reducerea îndatorării: reține profituri în loc să distribui dividende, vinde active neproductive, atrage capital de la investitori, restructurează datorii.'
      }
    ]
  }
];

export const categories = [...new Set(blogPosts.map(post => post.category))];

export const getPostBySlug = (slug: string): BlogPost | undefined => {
  return blogPosts.find(post => post.slug === slug);
};
