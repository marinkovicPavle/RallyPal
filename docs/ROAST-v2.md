# RallyPal: roast za v2 (2. 11. 2026)

v1 (1.0.0) je predat na recenziju 2. 11. iz commita 56677d0, grana `claude/rallypal-1.0-store`. Ta grana ostaje kakva je: ako Zepp odbije v1, ispravka ide tamo. v2 se radi na grani `claude/rallypal-2.0` (verzija 2.0.0, isti appId 1134434, pa se instalira preko v1 i čuva istoriju).

Ti biraš brojeve, ništa novo ne pravim dok ne izabereš. Za sve što menja izgled prvo dobijaš elemente, pa sliku, pa tek onda kod, kao do sada. Uz svaku stavku piše koliki je posao, da li ide u besplatnu probu ili u punu verziju i šta nije provereno.

Kako sam gledao: uporedio sam RallyPal sa SaunaPal-om 3.0 (kod i dogovor za v3), prošao stavke iz [ROAST.md](ROAST.md) koje nisu urađene i ponovo pregledao kod koji je dodat danas (proba, KiezelPay, popravke).

## A. Već urađeno u v2 (posle predaje v1)

**1. Poruka posle besplatnog meča.** Kad se završi meč koji se broji u probu, sat kratko pokaže "Preostalo besplatnih mečeva: 1", a posle trećeg "To je bio poslednji besplatni meč", kao SaunaPal. Na 7 jezika, simulator proverava da se pojavi.

**2. Strava napomena na telefonu.** U v1 piše da je pravljenje svoje Strava aplikacije besplatno. Od 30. 6. 2026 Strava za to traži plaćenu pretplatu (ROAST stavka 4), pa je tekst ispravljen na 7 jezika, kao u SaunaPal-u 3.0 (njegova odluka 15).

## B. Ima rok

**3. Strava menja adresu API-ja** (ROAST stavka 5). Nova adresa `api-v3.strava.com` radi od 4. 1. 2027, a po Stravinom forumu stara prestaje 1. 6. 2027.
- Popravka: posle 4. 1. 2027 RallyPal šalje na novu adresu, a ako ona ne odgovori, vraća se na staru.
- Posao: mali. Važi i za SaunaPal.
- Nije provereno: tačan datum gašenja stare adrese (forum, ne zvanična stranica).

## C. Iz SaunaPal-a (tamo već radi)

**4. Zone pulsa.** Pet zona po procentu maksimalnog pulsa (50/60/70/80/90%), maksimum 220 minus godine ili upisan ručno. Vreme po zonama na sažetku, u istoriji i na telefonu.
- Zašto: pokazuje koliko je meč bio težak, a to je prvo što ljudi gledaju posle treninga.
- Treba nova dozvola za godine iz Zepp profila, pa dopuna izjave o privatnosti i dozvola na konzoli.
- Posao: srednji, većina koda je iz SaunaPal-a.
- Kao u SaunaPal-u: zone na sažetku u probi, u istoriji i na telefonu samo u punoj verziji.

**5. Rekordi i proslava.** Na primer: najduži meč, najduži niz poena, najviše pobeda zaredom, najviše mečeva u nedelji. Na sažetku red sa peharom ("Novi rekord: …") i kratka vibracija. Na satu red Rekordi u Istoriji, na telefonu u Statistici.
- Kao u SaunaPal-u, prva 3 meča se ne slave.
- Posao: srednji.
- Proba: red Rekordi u Istoriji; proslava u punoj verziji (SaunaPal odluka 16).

**6. OTKLJUČAJ na sažetku posle poslednjeg besplatnog meča.** SaunaPal tu ima dugme, a RallyPal sada samo poruku iz stavke 1.
- Raspored sažetka je pun (REVANŠ, GOTOVO, UNDO), pa prvo ide slika.
- Posao: mali.

**7. Još 10 jezika, kao SaunaPal:** holandski, poljski, češki, ukrajinski, ruski, švedski, norveški, danski, finski i japanski. Ukupno bi bilo 17.
- Uz to opis za store na tim jezicima.
- Posao: veliki, oko 450 tekstova po jeziku (sat i telefon). Simulator proverava raspored na svim satovima.
- Nije provereno: da li japanski font na satu ima sve znakove (SaunaPal ga ima, pa verovatno da).

**8. Slike za store na svakom jeziku.** v1 ima samo engleske slike za sve jezike.
- Posao: mali, jer simulator već crta sve ekrane na svih 7 jezika.

**9. Podešavanje u 3 koraka na prvom pokretanju**, kao SaunaPal 3.0: 1) sport, 2) singl ili dubl, 3) poen dodirom ili samo tasterom (stavka 13). Svaki korak može da se preskoči.
- Posao: srednji. Proba.

**10. Ručni unos meča sa telefona** (meč odigran bez sata), kao "+ Add session" u SaunaPal-u. Ulazi u istoriju, statistiku i međusobni skor.
- Kao u SaunaPal-u, u probi troši besplatni meč.
- Posao: srednji.

Podsetnike za trening (SaunaPal odluka 11) ne predlažem: reket sportovi se igraju po zakazanom terminu.

## D. Iz prvog roast-a, još otvoreno

Detalji su u [ROAST.md](ROAST.md); ovde samo kratko.

**11. Promena strane terena** (ROAST 14): natpis CHANGE ENDS i posebna vibracija, može da se isključi. Igrači ovo prvo primete; konkurencija (CourtScore) ima. Posao: mali do srednji.

**12. Zaključavanje dodira** (ROAST 15): podešavanje "poen samo tasterom", protiv znoja, kiše i rukava. Posao: mali.

**13. Ko je pobedio kad se meč završi ručno** (ROAST 17): predaja ili isteklo vreme terena. Posle End match pitanje You, Opponent ili No result. Posao: mali.

**14. Dupli trening na Stravi uz Zepp-ov trening** (ROAST 7). Zavisi od tvog odgovora da li Zepp-ov trening uopšte može da ide uz RallyPal. Posao: srednji.

**15. Istorija u jednom fajlu** (ROAST 11). Čita se cela pri svakom crtanju početnog ekrana. Posle popravke 8 iz v1 se bar vraća sa telefona ako se izgubi. Posao: srednji.

**16. Puls pri podizanju ruke** (ROAST 12): do 30 sekundi pulsa se izgubi. Zaključio iz koda, nije pušteno. Posao: mali.

**17. Odmor između gemova i setova** (ROAST 16): odbrojavanje sa vibracijom. Posao: mali do srednji.

**18. Početak od zatečenog rezultata** (ROAST 18). Posao: srednji.

**19. Statistika servisa** (ROAST 20): as, dupla greška, procenat prvog servisa. Posao: srednji.

**20. Izgovaranje rezultata i rezultat uživo** (ROAST 21 i 22). Oba su velika posla; ne za v2.

**21. Tvoja proba baterije i ugašenog ekrana** (ROAST 19): meč od sat vremena sa "Gasi se kad spustiš ruku". Zapiši procenat baterije pre i posle, i šta rade taster i dodir dok je ekran ugašen.

## E. Novo, nađeno danas

**22. Brojač probe deli servis sa SaunaPal-om.** Brojač je na istom Cloudflare servisu (`saunapal-trial`), sa posebnim RallyPal ključevima, pa se brojevi ne mešaju. Ali besplatni Cloudflare KV dozvoljava 1.000 upisa dnevno za obe aplikacije zajedno.
- Kad se limit potroši, proba radi samo po brojaču na satu, pa reinstalacija vraća 3 besplatna meča.
- Popravka: poseban RallyPal servis, ili plaćeni Workers plan.
- Posao: mali, ali treba Cloudflare (konektor ovde ne radi, pa ili ti ili kroz Remote Control).
- Nije provereno: trenutna cena plaćenog plana.

**23. Dva sata na jednom telefonu.** Od v1 sat povlači sa telefona mečeve koje nema (popravka 8). Zato se istorije dva sata istog vlasnika spoje na oba sata.
- Pitanje: da li je to u redu (isti čovek, ista istorija), ili svaki sat treba da vidi samo svoje mečeve?
- Posao: mali u oba slučaja.

**24. Strava za kupce** (ROAST 4, odluka još otvorena). Sada svaki kupac pravi svoju Strava aplikaciju, za šta mu treba plaćena Strava pretplata.
- Zajednička RallyPal Strava aplikacija na tvom nalogu, sa malim Cloudflare servisom za prijavu, bi to uklonila: povezivanje bi bilo jedan dodir, bez pretplate kupca.
- Ograničenje: 10 ljudi bez Stravinog pregleda, do 9.999 posle pregleda.
- Posao: srednji, plus prijava Stravi.

## Moj predlog za v2

1. Već urađeno: 1 i 2.
2. Rok: 3.
3. Ono što igrač odmah primeti: 11, 12 i 13.
4. Prodaja: 6 i 8, plus 22 da proba ostane pouzdana.
5. Iz SaunaPal-a, ako želiš veći v2: 4 i 5.

Za 7 (jezici), 9, 10 i 14 do 19 predlažem v3 ili kad kažeš. Za 14 mi treba odgovor da li Zepp-ov trening ide uz RallyPal, za 23 tvoj izbor, a za 24 odluka a ili b.
