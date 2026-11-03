# RallyPal: stanje izrade

Poslednja izmena: 3. 11. 2026. Svaka nova izmena dopisuje se gore u "Dnevnik", a faze i "Šta čeka" se ažuriraju.

## Faze (iz [plan-izrade.md](plan-izrade.md))

| Faza | Stanje |
|---|---|
| 1. Slike ekrana sata | Gotovo, [nacrt2-sat.png](nacrt2-sat.png) odobreno 20. 10. |
| 2. Bodovanje svih šest sportova | Gotovo 20. 10. (`shared/rules.js`, `shared/match.js`) |
| 3. Aplikacija na satu | Gotovo, probano na T-Rex 3 Pro 21. 10., izmene posle probe urađene (odluke 33 do 40) |
| 4. Telefon (Setups, History, Stats, Settings) | Gotovo 21. 10. (odluka 42), plus srpski, QR i Feedback (43 do 45) |
| 5. Proba i naplata (3 meča, KiezelPay, pravi appId) | Gotovo 2. 11. (odluka 47): appId 1134434, KiezelPay App ID 2025865549; čeka probnu kupovinu |
| 6. Strava i Intervals.icu | Napravljeno 21. 10. (odluka 46), čeka probu na pravom telefonu |
| 7. Store (ikonica, slike, opisi, privatnost, ZAB) | v1 predat pa povučen; paket za 1.0.0 sa 17 jezika gotov 3. 11. ([SUBMIT.md](SUBMIT.md), grana `claude/rallypal-release`); čeka `zeus build` i predaju |

## Šta čeka

**Od Pavla (redom iz [SUBMIT.md](SUBMIT.md))**
- Na Macu: `git pull` grane `claude/rallypal-release`, `build-copy.sh`, `zeus build`, pa forma na konzoli (ili prompt za Remote Control iz odeljka C) i Submit for Approval.
- Preporuka pre predaje: `zeus preview`, prvo pokretanje (tri pitanja), meč do prve promene strane i odmora, probna kupovina sa `KPAY_TEST = true` pa nazad na `false`.
- Proba Strave i Intervals-a na telefonu: Connect Strava, kratak meč sa pulsom, Check the connection za Intervals.
- Odgovori: da li Zepp-ov trening može da ide uz RallyPal (ROAST-v2 14), i šta radi taster dok je ekran ugašen (21).
- Otvoreno iz [ROAST-v2.md](ROAST-v2.md): 14, 20, 21 i 23, posle 1.0.0 ili kad kažeš.

**Nije provereno na pravom uređaju**
- Kupovina kroz KiezelPay za RallyPal (kod je iz SaunaPal-a, koji radi u store-u).
- Brojač probe na servisu `rallypal-trial` iz pravog telefona (servis odgovara u pregledaču).
- Učitavanje jezika iz `assets/raw/lang` na pravom satu (u simulatoru radi; ako ne nađe fajl, sat ostaje na engleskom).
- Japanska slova na satu (simulator crta IPA Gothic; sat koristi svoj font).
- Zepp dugme Connect na iPhonu i adresa za povratak `zepp-os.zepp.com`.
- Slanje fajla sa pulsom (multipart) kroz Zepp fetch.
- Da li Strava i Intervals.icu primaju Padel, Pickleball i ostale kao tip aktivnosti.
- Baterija na meču od sat vremena.

## Provere koje prolaze za 1.0.0 (3. 11. 2026)

- 100 testova (`npm test`), među njima istorija u fajlovima (prelazak sa starog fajla, rezervna kopija indeksa), početak od rezultata, statistika servisa, odmor, ručni unos meča, nova Strava adresa i provera da su fajlovi jezika u `assets` usklađeni sa tekstovima; testovi servisa za probu.
- Simulator sata: 7 veličina ekrana x 17 jezika, 9.010 ekrana (sa prvim pokretanjem, početkom od rezultata, dugmadima za servis i odmorom). Prvi prolaz našao 29 predugih tekstova na ruskom, poljskom, holandskom i finskom (npr. РАЗБЛОКИРОВАТЬ na kraju meča, PODWÓJNY BŁĄD); skraćeni, ponovni prolaz za ta 4 jezika: 0 preklapanja ili odsečenog teksta.
- Telefon: stranica nacrtana na japanskom, ruskom, poljskom, finskom i ukrajinskom (proba, puna verzija, Statistika, Dodaj meč); ruski i poljski padeži (1 матч, 3 матча, 6 матчей) rade.
- Slike za store: 6 okruglih i 6 četvrtastih na svakom od 17 jezika; tekstovi za store do 40 i do 596 znakova (`.dev/tools/store_text.py` proverava).

## Provere koje prolaze za 2.0 (2. 11. 2026, kasno uveče)

- 93 testa (`npm test`), među njima promena strane po sportovima, ko je pobedio, zone pulsa, rekordi i nova Strava adresa; testovi servisa za probu (`node .dev/tools/trial-server/test.js`).
- Simulator sata: 7 veličina ekrana x 7 jezika, 3.241 ekran sa novim ekranima v2, 0 preklapanja ili odsečenog teksta (francuski natpis za promenu strane skraćen na CHANGER DE CÔTÉ posle prvog prolaza).
- Slike za store: 6 okruglih i 6 četvrtastih na svakom od 7 jezika (`docs/store/screenshots/`).
- Servis `rallypal-trial` postavljen kao `saunapal-trial` (isti kod, svoj KV), ali iz ovog okruženja ne može da se pozove; proveriti otvaranjem adrese u pregledaču.

## Provere koje prolaze (2. 11. 2026, 15:00)

- 87 testova (`npm test`), među njima nasumični mečevi za svaku kombinaciju pravila, proba i KiezelPay, i test za svaku popravku iz ROAST-a.
- Simulator sata: 7 veličina ekrana x 7 jezika, 2.996 ekrana sa ekranima probe i otključavanja, 0 preklapanja ili odsečenog teksta.
- Telefon: stranica u probi, posle probe i u punoj verziji (crtano 2. 11.).
- Svaka ulazna tačka (stranice, kartica, servis, telefon) se prevodi za ES2015 bez greške.

## Dnevnik

- **3. 11. 2026:** v1 povučen; sve ide u prvu verziju 1.0.0 na grani `claude/rallypal-release` (odluke 51 i 52): 17 jezika na satu, telefonu i u store-u (sat čita samo svoj jezik iz `assets`), podešavanje u 3 koraka na prvom pokretanju, ručni unos meča sa telefona, istorija u fajlovima po meču sa rezervnom kopijom indeksa, puls se ne gubi pri podizanju ruke, odbrojavanje odmora, početak od zatečenog rezultata, statistika servisa (as, dupla greška, prvi i drugi servis). Novo uputstvo za predaju [SUBMIT.md](SUBMIT.md) sa promptom za Remote Control; SUBMIT-2.0.md više ne važi.
- **2. 11. 2026, kasno uveče:** v2 (2.0.0) gotov na grani `claude/rallypal-2.0` (odluke 49 i 50): sopstveni servis za probu `rallypal-trial` na Cloudflare-u, nova Strava adresa od 2027, PROMENA STRANE, poen samo tasterom, "Ko je pobedio?", zone pulsa, rekordi, OTKLJUČAJ na kraju meča, slike za store na 7 jezika. Predaja po [SUBMIT-2.0.md](SUBMIT-2.0.md) kad Zepp odobri 1.0.
- **2. 11. 2026, uveče:** v1 (1.0.0) predat na recenziju iz 56677d0 (grana `claude/rallypal-1.0-store`, ostaje kakva je). v2 na grani `claude/rallypal-2.0` (2.0.0): poruka posle besplatnog meča i ispravljena Strava napomena; roast za v2 u [ROAST-v2.md](ROAST-v2.md), čeka izbor brojeva.
- **2. 11. 2026, 15:00:** faza 5 i 7 i greške iz ROAST-a (odluke 47 i 48). Proba od 3 meča i KiezelPay kao SaunaPal: brojač na satu i na Cloudflare servisu, ekran za otključavanje na satu, OTKLJUČAJ umesto NOVI MEČ posle probe, katanci na telefonu. Greške: 6 (meč ostavljen otvoren), 8 (vraćanje istorije i grafici pulsa), 9 (red za slanje), 10 (servis u dublu), 13 (kratki mečevi). Paket za store u `docs/store/` i [SUBMIT.md](SUBMIT.md); `.dev/tools/build-copy.sh` kopira samo aplikaciju za `zeus build`.
- **2. 11. 2026:** kod i sva dokumentacija prvi put u GitHub repo (stanje sa 22. 10.).
- **22. 10. 2026:** roast pre izlaska, [ROAST.md](ROAST.md): 22 stavke; greške ponovljene probnim skriptama (meč završen sutra traje 16 h na Stravi, sat ne vraća istoriju ako već ima meč, grafici pulsa se brišu posle 20 mečeva, dupli Intervals unos, red za slanje se blokira, servis u dublu). Nađeno i da Strava traži pretplatu za API (od 30. 6. 2026) i menja adresu API-ja od 4. 1. 2027.
- **21. 10. 2026, 13:00:** faza 6 na Macu: Strava i Intervals.icu po [rallypal-strava-telefon-v2.png](rallypal-strava-telefon-v2.png) (odluka 46).
- **21. 10. 2026, 12:20:** srpski kao sedmi jezik, QR do sajta i Feedback na satu i telefonu (odluke 43 do 45).
- **21. 10. 2026, ujutru:** izmene posle prve probe na satu: boje tastera, vrednost poena pored tastera, OPPONENT umesto THEM, BACK taster, UNDO na kraju meča (odluke 33 do 40); telefon po [rallypal-telefon-nacrt.png](rallypal-telefon-nacrt.png) (odluka 42).
- **20. 10. 2026:** odluka da RallyPal bude posebna aplikacija kao SaunaPal (odluka 26); slike sata odobrene (32); bodovanje i aplikacija na satu napravljeni, na Macu za probu.

Sve odluke sa tačnim vremenom su u [dogovor.md](dogovor.md).
