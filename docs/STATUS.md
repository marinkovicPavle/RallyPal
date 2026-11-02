# RallyPal: stanje izrade

Poslednja izmena: 2. 11. 2026, 15:00. Svaka nova izmena dopisuje se gore u "Dnevnik", a faze i "Šta čeka" se ažuriraju.

## Faze (iz [plan-izrade.md](plan-izrade.md))

| Faza | Stanje |
|---|---|
| 1. Slike ekrana sata | Gotovo, [nacrt2-sat.png](nacrt2-sat.png) odobreno 20. 10. |
| 2. Bodovanje svih šest sportova | Gotovo 20. 10. (`shared/rules.js`, `shared/match.js`) |
| 3. Aplikacija na satu | Gotovo, probano na T-Rex 3 Pro 21. 10., izmene posle probe urađene (odluke 33 do 40) |
| 4. Telefon (Setups, History, Stats, Settings) | Gotovo 21. 10. (odluka 42), plus srpski, QR i Feedback (43 do 45) |
| 5. Proba i naplata (3 meča, KiezelPay, pravi appId) | Kod gotov 2. 11. (odluka 47), KiezelPay App ID 2025865549 upisan; čeka pravi appId |
| 6. Strava i Intervals.icu | Napravljeno 21. 10. (odluka 46), čeka probu na pravom telefonu |
| 7. Store (ikonica, slike, opisi, privatnost, ZAB) | Paket gotov 2. 11. ([SUBMIT.md](SUBMIT.md)); čeka `zeus build` i slanje |

## Šta čeka

**Od Pavla (redom iz [SUBMIT.md](SUBMIT.md))**
- Pravi appId sa console.zepp.com (u `app.json` umesto 1099458). KiezelPay App ID 2025865549 je upisan.
- Probna kupovina u test režimu, pa `KPAY_TEST = false`, `zeus build` i slanje.
- Odluka za Stravu (ROAST stavka 4): za 1.0 ostaje kako jeste (a); zajednička RallyPal Strava aplikacija (b) bi bila 1.1.
- Proba Strave i Intervals-a na telefonu: Connect Strava, kratak meč sa pulsom, Check the connection za Intervals.
- Odgovori: da li Zepp-ov trening može da ide uz RallyPal, i šta radi taster dok je ekran ugašen.
- ROAST stavke koje nisu urađene (5, 7, 11, 12, 14 do 22): posle 1.0 ili kad kažeš.

**Nije provereno na pravom uređaju**
- Kupovina kroz KiezelPay za RallyPal (kod je iz SaunaPal-a, koji radi u store-u).
- Brojač probe na Cloudflare servisu iz RallyPal-a (isti servis kao SaunaPal, svoji ključevi).
- Zepp dugme Connect na iPhonu i adresa za povratak `zepp-os.zepp.com`.
- Slanje fajla sa pulsom (multipart) kroz Zepp fetch.
- Da li Strava i Intervals.icu primaju Padel, Pickleball i ostale kao tip aktivnosti.
- Baterija na meču od sat vremena.

## Provere koje prolaze (2. 11. 2026, 15:00)

- 87 testova (`npm test`), među njima nasumični mečevi za svaku kombinaciju pravila, proba i KiezelPay, i test za svaku popravku iz ROAST-a.
- Simulator sata: 7 veličina ekrana x 7 jezika, 2.996 ekrana sa ekranima probe i otključavanja, 0 preklapanja ili odsečenog teksta.
- Telefon: stranica u probi, posle probe i u punoj verziji (crtano 2. 11.).
- Svaka ulazna tačka (stranice, kartica, servis, telefon) se prevodi za ES2015 bez greške.

## Dnevnik

- **2. 11. 2026, 15:00:** faza 5 i 7 i greške iz ROAST-a (odluke 47 i 48). Proba od 3 meča i KiezelPay kao SaunaPal: brojač na satu i na Cloudflare servisu, ekran za otključavanje na satu, OTKLJUČAJ umesto NOVI MEČ posle probe, katanci na telefonu. Greške: 6 (meč ostavljen otvoren), 8 (vraćanje istorije i grafici pulsa), 9 (red za slanje), 10 (servis u dublu), 13 (kratki mečevi). Paket za store u `docs/store/` i [SUBMIT.md](SUBMIT.md); `.dev/tools/build-copy.sh` kopira samo aplikaciju za `zeus build`.
- **2. 11. 2026:** kod i sva dokumentacija prvi put u GitHub repo (stanje sa 22. 10.).
- **22. 10. 2026:** roast pre izlaska, [ROAST.md](ROAST.md): 22 stavke; greške ponovljene probnim skriptama (meč završen sutra traje 16 h na Stravi, sat ne vraća istoriju ako već ima meč, grafici pulsa se brišu posle 20 mečeva, dupli Intervals unos, red za slanje se blokira, servis u dublu). Nađeno i da Strava traži pretplatu za API (od 30. 6. 2026) i menja adresu API-ja od 4. 1. 2027.
- **21. 10. 2026, 13:00:** faza 6 na Macu: Strava i Intervals.icu po [rallypal-strava-telefon-v2.png](rallypal-strava-telefon-v2.png) (odluka 46).
- **21. 10. 2026, 12:20:** srpski kao sedmi jezik, QR do sajta i Feedback na satu i telefonu (odluke 43 do 45).
- **21. 10. 2026, ujutru:** izmene posle prve probe na satu: boje tastera, vrednost poena pored tastera, OPPONENT umesto THEM, BACK taster, UNDO na kraju meča (odluke 33 do 40); telefon po [rallypal-telefon-nacrt.png](rallypal-telefon-nacrt.png) (odluka 42).
- **20. 10. 2026:** odluka da RallyPal bude posebna aplikacija kao SaunaPal (odluka 26); slike sata odobrene (32); bodovanje i aplikacija na satu napravljeni, na Macu za probu.

Sve odluke sa tačnim vremenom su u [dogovor.md](dogovor.md).
