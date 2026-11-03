# RallyPal 1.0.0: predaja u Zepp store, korak po korak

Prva verzija koja ide u prodavnicu, sa svim što je urađeno posle povlačenja prve predaje: 17 jezika, podešavanje u 3 koraka na prvom pokretanju, ručni unos meča sa telefona, istorija u fajlovima po meču, puls koji se ne gubi pri podizanju ruke, odbrojavanje odmora, početak meča od zatečenog rezultata, statistika servisa, promena strane, zone pulsa, rekordi i OTKLJUČAJ na kraju meča.

- Grana: **`claude/rallypal-release`** (stare grane `claude/rallypal-1.0-store` i `claude/rallypal-2.0` se više ne koriste).
- appId **1134434**, verzija **1.0.0** (code 1), KiezelPay App ID **2025865549**.
- Tekstovi: `docs/store/text/` (folder po jeziku, `01-en-English` do `17-ja-Japanese`, i `00-common`). Pravi ih `.dev/tools/store_text.py`, koji proverava i dužine.
- Slike: `docs/store/screenshots/<folder jezika>/round` i `square`, po 6 (`1-match.png` do `6-history.png`), ikonica `docs/store/icon-240.png`. Pravi ih `.dev/tools/store.py` iz simulatora.

## A. Pre predaje (ti, na Macu)

KiezelPay proizvod i Zepp aplikacija su već napravljeni (2. 11.), ništa se tu ne menja. Servis za probu: https://rallypal-trial.svadba-media.workers.dev u pregledaču treba da pokaže "RallyPal trial service".

```
cd ~/Claude/rallypal-repo && git fetch origin && git checkout claude/rallypal-release && git pull
```
Ako `~/Claude/rallypal-repo` ne postoji:
```
cd ~/Claude && git clone -b claude/rallypal-release https://github.com/marinkovicPavle/RallyPal rallypal-repo
```
```
cd ~/Claude/rallypal-repo && bash .dev/tools/build-copy.sh ~/Claude/rallypal-store
```
```
cd ~/Claude/rallypal-store && npm install && grep "KPAY_TEST =" shared/licence.js && grep '"name": "1' app.json && zeus build && ls -t dist/*.zab | head -1
```
Mora da piše `KPAY_TEST = false` i `"name": "1.0.0"`. Poslednja linija je fajl za upload, ime počinje sa `1134434-RallyPal-1.0.0-`.

Preporuka pre predaje (`zeus preview`, 10 minuta): prvo pokretanje (tri pitanja), jedan meč stonog tenisa do prve promene strane i odmora, pa Meni > Kraj meča > "Ko je pobedio?". Za probnu kupovinu: `KPAY_TEST = true`, Podešavanja > Otključaj RallyPal, kod na kzl.io/code, pa **obavezno** nazad na `false` i ponovo `zeus build`.

Nije provereno na pravom satu: kupovina kroz KiezelPay, Strava i Intervals.icu na pravom telefonu, baterija na meču od sat vremena.

## B. Na konzoli (forma "App Release", posle povlačenja)

Otvori RallyPal na console.zepp.com i uđi u izmenu povučene verzije (Edit). Ako konzola traži veći broj verzije od 1.0.0, stani i javi mi: podići ću na 1.0.1.

1. **App Installation Package:** novi `.zab` (zameni stari). **Version No.** 1.0.0.
2. **payment status** in app purchase, **In-app payment mode** **Kiezepay**, **Publish Area** Global, **Service Category** Common, **App Classification** Sports (ili Health & Fitness ako Sports ne postoji).
3. **App Language:** English (Default) ostaje. Chinese (Simplified) i Chinese (Traditional) ne štikliraj. U meniju **Please select other languages** izaberi ovih 16: Serbian, Spanish, Italian, German, French, Portuguese, Dutch, Polish, Czech, Ukrainian, Russian, Swedish, Norwegian, Danish, Finnish, Japanese. Ako nekog nema u meniju, preskoči ga (na satu ga aplikacija i dalje ima) i javi mi koji. Portugalski tekst je brazilski: ako postoje i Portuguese (Brazil) i Portuguese (Portugal), stavi ga za Brazil.
4. **Blok za svaki jezik** (prvo English, pa ostali redom iz tabele):
   - **App Name:** `RallyPal` (`1-app-name.txt`)
   - **App Introduction** (do 40): `2-app-introduction.txt`
   - **App Details** (do 600): `3-app-details.txt`
   - **round screenshots:** ako su ostale stare slike, obriši ih (X na slici), pa `screenshots/<folder>/round/1-match.png` do `6-history.png`, redom
   - **square screenshots:** isto, `screenshots/<folder>/square/1-match.png` do `6-history.png`
   - Ako blok ima i **New Version Introduction** i ne da da ostane prazno, upiši isti tekst kao App Introduction.
5. **App Icon:** `docs/store/icon-240.png`.
6. **Privacy Statement:** ceo `00-common/privacy.txt` (1729 znakova). Novo u odnosu na prvu predaju: godine iz Zepp profila za zone pulsa.
7. **Call Permission:** **Heart Rate**, **Connect to the network**, **Run in background**, **Others**; ako postoji posebno polje za podatke o korisniku (User info / Personal information), štikliraj i njega. **None** i **Positioning** ne. Tekst uz Others (`00-common/call-permission-others.txt`):
```
Device ID (free trial count, sent only as a one-way hash), age from the user profile (heart rate zones).
```
8. **Whether the installation package includes SDK:** **No**; ako traži opis, `00-common/sdk.txt`. **Full music playback:** **No**.
9. **Features Descriptions:** ceo `00-common/features-descriptions.txt` (1152 znakova).
10. **Work Statement:** štiklirano. **Submit for Approval** klikćeš ti (6 predaja nedeljno, resetuje se u ponedeljak).

### Jezici

| # | Jezik u meniju | Folder | Uvod | Opis |
|---|---|---|---|---|
| 1 | English (Default) | `01-en-English` | 35 | 588 |
| 2 | Serbian (srpski) | `02-sr-Serbian` | 35 | 567 |
| 3 | Spanish (španski) | `03-es-Spanish` | 35 | 590 |
| 4 | Italian (italijanski) | `04-it-Italian` | 37 | 588 |
| 5 | German (nemački) | `05-de-German` | 31 | 562 |
| 6 | French (francuski) | `06-fr-French` | 39 | 594 |
| 7 | Portuguese (portugalski, brazilski tekst) | `07-pt-Portuguese` | 33 | 596 |
| 8 | Dutch (holandski) | `08-nl-Dutch` | 34 | 586 |
| 9 | Polish (poljski) | `09-pl-Polish` | 37 | 592 |
| 10 | Czech (češki) | `10-cs-Czech` | 34 | 555 |
| 11 | Ukrainian (ukrajinski) | `11-uk-Ukrainian` | 39 | 579 |
| 12 | Russian (ruski) | `12-ru-Russian` | 36 | 568 |
| 13 | Swedish (švedski) | `13-sv-Swedish` | 37 | 577 |
| 14 | Norwegian (norveški) | `14-nb-Norwegian` | 36 | 577 |
| 15 | Danish (danski) | `15-da-Danish` | 36 | 567 |
| 16 | Finnish (finski) | `16-fi-Finnish` | 31 | 595 |
| 17 | Japanese (japanski) | `17-ja-Japanese` | 16 | 310 |

### Engleski tekstovi (za proveru)

App Introduction:
```
Racket sports score, serve and side
```
App Details:
```
Score keeper for tennis, padel, pickleball, table tennis, squash and badminton, plus padel Americano rounds. A key or a tap on your half of the screen scores the point; RallyPal follows the serve and the side, also in doubles, calls set, break and match points and vibrates on games, sets and change of ends. Rest countdown, aces and double faults, heart rate zones, records, history and stats on watch and phone, optional Strava and Intervals.icu sync. In 17 languages.

3 free matches, then a one-time $2.99 unlock via KiezelPay. No subscription.

Created by Pavle (pavlemarinkovic.com)
```

## C. Prompt za Remote Control

Kopiraj ceo blok u sesiju koja radi na tvom Macu (Claude in Chrome):

```
Popuni formu „App Release” za RallyPal 1.0.0 na Zepp konzoli (console.zepp.com) u mom Chrome-u, preko Claude in Chrome. Aplikacija je RallyPal, appId 1134434. Prva predaja je povučena (Withdraw), sada se ista verzija predaje ponovo sa novim paketom i tekstovima. Submit for Approval NE klikći, to radim ja.

1. Paket: ako ne postoji ~/Claude/rallypal-repo, pokreni
   cd ~/Claude && git clone -b claude/rallypal-release https://github.com/marinkovicPavle/RallyPal rallypal-repo
   a ako postoji: cd ~/Claude/rallypal-repo && git fetch origin && git checkout claude/rallypal-release && git pull
   Uputstvo je ~/Claude/rallypal-repo/docs/SUBMIT.md, tekstovi u docs/store/text/, slike u docs/store/screenshots/. Pročitaj uputstvo celo pre početka.

2. ZAB:
   cd ~/Claude/rallypal-repo && bash .dev/tools/build-copy.sh ~/Claude/rallypal-store
   cd ~/Claude/rallypal-store && npm install
   Proveri: u app.json "appId": 1134434 i "name": "1.0.0"; u shared/licence.js KPAY_APP_ID = '2025865549' i KPAY_TEST = false. Ako bilo šta ne stoji tako, stani i pitaj me.
   cd ~/Claude/rallypal-store && zeus build && ls -t dist/*.zab | head -1
   Uploaduj taj fajl (ime počinje sa 1134434-RallyPal-1.0.0-) umesto starog. Version No. na formi je 1.0.0; ako konzola traži veću verziju, stani i pitaj me.

3. Popuni formu tačno po odeljku B iz SUBMIT.md:
   - App Language: English (Default) plus 16 jezika iz tabele u odeljku B (Serbian, Spanish, Italian, German, French, Portuguese, Dutch, Polish, Czech, Ukrainian, Russian, Swedish, Norwegian, Danish, Finnish, Japanese). Kineske ne štikliraj. Portugalski tekst je brazilski: ako postoje i Portuguese (Brazil) i Portuguese (Portugal), stavi ga za Brazil i pitaj me za Portugal;
   - za svaki jezik iz foldera tog jezika (01-en-English … 17-ja-Japanese): App Name iz 1-app-name.txt, App Introduction iz 2-app-introduction.txt, App Details iz 3-app-details.txt. Ako blok ima obavezno polje New Version Introduction, upiši isti tekst kao App Introduction;
   - slike za svaki jezik: obriši stare i dodaj screenshots/<folder jezika>/round/1-match.png do 6-history.png, pa square/1-match.png do 6-history.png, tim redom;
   - App Icon: docs/store/icon-240.png;
   - Privacy Statement, tekst uz Others, SDK opis i Features Descriptions iz text/00-common/. U Call Permission štikliraj Heart Rate, Connect to the network, Run in background, Others i polje za podatke o korisniku ako postoji;
   - payment status in app purchase, In-app payment mode Kiezepay, Publish Area Global, Service Category Common, App Classification Sports (ako ne postoji, Health & Fitness), SDK No, Full music playback No, Work Statement štiklirano.

4. Tekst lepi tačno kako je u fajlu (bez poslednjeg praznog reda). Posle svakog polja pročitaj vrednost iz polja i uporedi je sa fajlom.

5. Ako forma izgleda drugačije nego u uputstvu, polje odbije tekst, zeus build javi grešku ili nekog jezika nema u meniju, stani i pitaj me.

6. Na kraju ostavi tab sa popunjenom formom otvoren. Javi mi šta je popunjeno, koji jezici, koliko je slika po jeziku i šta je eventualno ostalo.
```

## D. Posle predaje

- **Odbijeno:** pošalji mi razlog. Ispravka ide na granu `claude/rallypal-release`, pa `build-copy.sh`, `zeus build` i ponovo predaja.
- **Odobreno:** u KiezelPay-u upiši link iz Zepp store-a u **Amazfit Appstore Url** proizvoda RallyPal.
- Strava: svaki kupac pravi svoju Strava API aplikaciju (od juna 2026 Strava za to traži plaćenu pretplatu; napomena je u uputstvu na telefonu). Odluka 24 A.
