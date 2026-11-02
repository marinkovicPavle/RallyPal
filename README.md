# RallyPal

Aplikacija za Zepp OS satove (Amazfit) koja vodi rezultat u šest reket sportova: tenis, padel, pikleball, stoni tenis, skvoš i badminton, plus Americano i Mexicano kola u padelu. Poen se upisuje tasterom ili tapom na polovinu ekrana; RallyPal prati servis i stranu, vibrira po događaju, meri puls, čuva istoriju na satu i telefonu i šalje meč na Stravu i Intervals.icu sa pulsom i pravim sportom.

## Gde je šta

| Putanja | Šta je |
|---|---|
| `app.json`, `app.js` | Opis aplikacije za Zepp (appId 1134434, sa console.zepp.com 2. 11.) |
| `page/` | Ekrani na satu: početni, meč, kraj meča, istorija, podešavanja |
| `shared/` | Zajednički kod za sat i telefon: pravila i bodovanje (`rules.js`, `match.js`), statistika, jezici (`lang/`), Strava i Intervals podaci (`integrations.js`), besplatna proba i KiezelPay (`licence.js`) |
| `utils/` | Sat: tasteri, čuvanje, sinhronizacija sa telefonom, pozadinski puls |
| `app-service/` | Pozadinski servis za puls dok je ekran ugašen |
| `app-widget/` | Kartica-prečica u listi kartica |
| `app-side/` | Deo na telefonu: prima mečeve sa sata, šalje na Stravu i Intervals.icu |
| `setting/` | Stranica podešavanja u Zepp aplikaciji na telefonu (Setups, History, Stats, Settings) |
| `assets/` | Slike za okrugle (`common.r`) i četvrtaste (`common.s`) satove |
| `.dev/test/` | Automatski testovi (bodovanje svih sportova, Strava i Intervals tok) |
| `.dev/tools/sim/` | Simulator rasporeda za sve veličine ekrana i jezike, i crtanje stranice na telefonu |
| `docs/` | Sav dogovor, plan, izmene posle proba, roast i slike koje su odobrene; `docs/store/` i `docs/SUBMIT.md` za Zepp store |
| `arhiva/rallypal-proba/` | Stari probni ekran u Zepp treningu (više se ne koristi, odluka 26) |

## Dokumentacija i napredak

- [docs/STATUS.md](docs/STATUS.md): gde smo sada, šta je urađeno i šta čeka. Počni odavde.
- [docs/SUBMIT.md](docs/SUBMIT.md): predaja u Zepp store i KiezelPay, korak po korak.
- [docs/plan-izrade.md](docs/plan-izrade.md): faze izrade 1 do 7.
- [docs/dogovor.md](docs/dogovor.md): sve odluke sa vremenom, izvor istine.
- [docs/ROAST.md](docs/ROAST.md): spisak poboljšanja pre izlaska (22. 10. 2026); 1, 2, 6, 8, 9, 10 i 13 urađeni 2. 11. (odluke 47 i 48).
- [docs/telefon-elementi.md](docs/telefon-elementi.md), [docs/izmene-posle-probe.md](docs/izmene-posle-probe.md), [docs/izmene-posle-telefona.md](docs/izmene-posle-telefona.md): elementi i izmene po probama.
- [docs/ideje.md](docs/ideje.md): početni spisak ideja za drugu Zepp aplikaciju.
- Slike (`docs/*.png`) i skripte koje ih crtaju (`docs/*.py`).

## Pokretanje na satu

Na Macu, sa Zepp CLI (`zeus`) i satom u developer modu:

```
cd ~/Claude/rallypal && npm install && zeus preview
```

Za store fajl (ZAB) zeus ne sme da vidi `docs/` i `arhiva/`, pa se aplikacija prvo kopira u poseban folder:

```
bash .dev/tools/build-copy.sh ~/Claude/rallypal-store
cd ~/Claude/rallypal-store && npm install && zeus build
```

## Provere

```
npm install
npm test
npm run sim
```

`npm test` pušta 87 testova, među njima nekoliko hiljada nasumično odigranih mečeva. `npm run sim` crta ekrane sata na 7 veličina i 7 jezika i javlja preklapanja i odsečen tekst.

Ključevi i lozinke (Strava Client Secret, Intervals API ključ) se nikad ne upisuju u kod ni u ovaj repo; korisnik ih unosi u podešavanjima na telefonu.
