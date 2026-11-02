# RallyPal: stanje izrade

Poslednja izmena: 2. 11. 2026. Svaka nova izmena dopisuje se gore u "Dnevnik", a faze i "Šta čeka" se ažuriraju.

## Faze (iz [plan-izrade.md](plan-izrade.md))

| Faza | Stanje |
|---|---|
| 1. Slike ekrana sata | Gotovo, [nacrt2-sat.png](nacrt2-sat.png) odobreno 20. 10. |
| 2. Bodovanje svih šest sportova | Gotovo 20. 10. (`shared/rules.js`, `shared/match.js`) |
| 3. Aplikacija na satu | Gotovo, probano na T-Rex 3 Pro 21. 10., izmene posle probe urađene (odluke 33 do 40) |
| 4. Telefon (Setups, History, Stats, Settings) | Gotovo 21. 10. (odluka 42), plus srpski, QR i Feedback (43 do 45) |
| 5. Proba i naplata (3 meča, KiezelPay, pravi appId) | Nije počelo |
| 6. Strava i Intervals.icu | Napravljeno 21. 10. (odluka 46), čeka probu na pravom telefonu |
| 7. Store (ikonica, slike, opisi, privatnost, ZAB) | Nije počelo |

## Šta čeka

**Od Pavla**
- Izbor brojeva iz [ROAST.md](ROAST.md) (22. 10.). Ništa iz roast-a se ne pravi pre izbora.
- Odluka za Stravu (ROAST stavka 4): od 30. 6. 2026 Strava traži plaćenu pretplatu od vlasnika svake Strava API aplikacije, pa (a) to piše u opisu, ili (b) jedna zajednička RallyPal Strava aplikacija.
- Proba Strave i Intervals-a na telefonu: Connect Strava, kratak meč sa pulsom, Check the connection za Intervals.
- Odgovori: da li Zepp-ov trening može da ide uz RallyPal, i šta radi taster dok je ekran ugašen.
- Za fazu 5: nova aplikacija na console.zepp.com (provera imena RallyPal) i u KiezelPay-u.

**Nije provereno na pravom uređaju**
- Zepp dugme Connect na iPhonu i adresa za povratak `zepp-os.zepp.com`.
- Slanje fajla sa pulsom (multipart) kroz Zepp fetch.
- Da li Strava i Intervals.icu primaju Padel, Pickleball i ostale kao tip aktivnosti.
- Baterija na meču od sat vremena.

## Provere koje prolaze (2. 11. 2026)

- 70 testova (`npm test`), među njima nasumični mečevi za svaku kombinaciju pravila.
- Simulator sata: 7 veličina ekrana x 7 jezika, 0 preklapanja ili odsečenog teksta (poslednji put 21. 10.).
- Telefon: crtanje stranice podešavanja bez dugmadi sa tekstom u dva reda (21. 10.).

## Dnevnik

- **2. 11. 2026:** kod i sva dokumentacija prvi put u GitHub repo (stanje sa 22. 10.).
- **22. 10. 2026:** roast pre izlaska, [ROAST.md](ROAST.md): 22 stavke; greške ponovljene probnim skriptama (meč završen sutra traje 16 h na Stravi, sat ne vraća istoriju ako već ima meč, grafici pulsa se brišu posle 20 mečeva, dupli Intervals unos, red za slanje se blokira, servis u dublu). Nađeno i da Strava traži pretplatu za API (od 30. 6. 2026) i menja adresu API-ja od 4. 1. 2027.
- **21. 10. 2026, 13:00:** faza 6 na Macu: Strava i Intervals.icu po [rallypal-strava-telefon-v2.png](rallypal-strava-telefon-v2.png) (odluka 46).
- **21. 10. 2026, 12:20:** srpski kao sedmi jezik, QR do sajta i Feedback na satu i telefonu (odluke 43 do 45).
- **21. 10. 2026, ujutru:** izmene posle prve probe na satu: boje tastera, vrednost poena pored tastera, OPPONENT umesto THEM, BACK taster, UNDO na kraju meča (odluke 33 do 40); telefon po [rallypal-telefon-nacrt.png](rallypal-telefon-nacrt.png) (odluka 42).
- **20. 10. 2026:** odluka da RallyPal bude posebna aplikacija kao SaunaPal (odluka 26); slike sata odobrene (32); bodovanje i aplikacija na satu napravljeni, na Macu za probu.

Sve odluke sa tačnim vremenom su u [dogovor.md](dogovor.md).
