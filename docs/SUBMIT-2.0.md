# RallyPal 2.0: Version Upgrade, korak po korak

2.0 se predaje kao **Version Upgrade** iste aplikacije (appId 1134434, verzija 2.0.0), **tek kad Zepp odobri 1.0**. Kupci ga dobijaju kao ažuriranje, pa istorija i otključavanje ostaju.

Tekstovi su u `docs/store/text/` (po folder za svaki jezik, `01-en-English` do `07-pt-Portuguese`, i `00-common`), slike u `docs/store/screenshots/<jezik>/round` i `square`. Tekstove pravi `.dev/tools/store_text.py` (proverava i dužine), slike `.dev/tools/store.py` iz simulatora.

## Šta je novo u 2.0

- PROMENA STRANE: natpis i četiri kratke vibracije kad se menja strana terena (tenis i padel posle neparnih gemova i na svakih 6 poena tie-break-a; stoni tenis, badminton i pikleball posle gema i na polovini poslednjeg). Podešavanje, uključeno.
- Poen dodirom: podešavanje, isključeno znači poen samo tasterom (satovi sa 2 ili više tastera).
- "Ko je pobedio?" kad se meč završi ručno (ti, protivnik, bez rezultata).
- Zone pulsa u detaljima meča na satu i telefonu; maksimalni puls 220 minus godine iz Zepp profila ili svoj (na telefonu). Nova dozvola: podaci o korisniku (godine).
- Rekordi: red Rekordi na vrhu Istorije na satu, kartica u Statistici na telefonu, proslava novog rekorda posle meča (puna verzija).
- OTKLJUČAJ na kraju meča posle poslednjeg besplatnog meča, i poruka koliko je besplatnih ostalo.
- Sopstveni servis za brojanje probe (`rallypal-trial`), odvojen od SaunaPal-a.
- Strava: nova adresa API-ja od 4. 1. 2027 (stara ostaje rezerva), ispravljena napomena o Stravinoj pretplati.

Slike novih ekrana: [rallypal-v2-sat.png](rallypal-v2-sat.png) (sat: promena strane, ko je pobedio, OTKLJUČAJ na kraju meča, rekordi, zone u detaljima, podešavanja) i [rallypal-v2-telefon.png](rallypal-v2-telefon.png) (telefon: rekordi u Statistici, zone u detaljima meča, maksimalni puls i nova podešavanja).

## A. Pre predaje (ti, na Macu)

```
cd ~/Claude/rallypal-repo && git fetch origin && git checkout claude/rallypal-2.0 && git pull
```
```
cd ~/Claude/rallypal-repo && bash .dev/tools/build-copy.sh ~/Claude/rallypal-store
```
```
cd ~/Claude/rallypal-store && npm install && grep KPAY_TEST shared/licence.js && grep '"name": "2' app.json && zeus build && ls -t dist/*.zab | head -1
```
Mora da piše `KPAY_TEST = false` i `"name": "2.0.0"`. Poslednja linija je fajl za upload, ime počinje sa `1134434-RallyPal-2.0.0-`.

Preporuka pre predaje: `zeus preview` i jedan meč stonog tenisa ili tenisa do prve promene strane (natpis i vibracija), pa Meni > Kraj meča > "Ko je pobedio?".

## B. Na konzoli (Version Upgrade)

1. **App Installation Package:** novi `.zab`. **Version No.** mora da bude **2.0.0**.
2. **payment status** in app purchase, **In-app payment mode** **Kiezepay**, **Publish Area** Global, **Service Category** Common, **App Classification** kao u 1.0.
3. **App Language:** English (Default) i jezici iz 1.0. Ako u 1.0 nisu dodati, dodaj Serbian, Spanish, Italian, German, French i Portuguese.
4. **Za svaki jezik:**
   - **App Name:** `RallyPal`
   - **App Introduction** (do 40): `2-app-introduction.txt`
   - **App Details** (do 600): `3-app-details.txt` (isto kao 1.0)
   - **New Version Introduction** (do 200): `4-new-version-introduction.txt`
   - **round screenshots:** obriši stare, pa `screenshots/<jezik>/round/1-match.png` do `6-history.png`, redom
   - **square screenshots:** obriši stare, pa `screenshots/<jezik>/square/1-match.png` do `6-history.png`, redom
5. **App Icon:** ista kao u 1.0 (`docs/store/icon-240.png`).
6. **Privacy Statement:** zameni tekstom iz `00-common/privacy.txt` (1742 znaka). Novo: godine iz Zepp profila za zone pulsa.
7. **Call Permission:** **Heart Rate**, **Connect to the network**, **Run in background**, **Others**; ako postoji posebno polje za podatke o korisniku (User info / Personal information), štikliraj i njega. Tekst uz Others zameni sa `00-common/call-permission-others.txt`:
```
Device ID (free trial count, sent only as a one-way hash), age from the user profile (heart rate zones).
```
8. **SDK:** No. **Full music playback:** No.
9. **Features Descriptions:** zameni tekstom iz `00-common/features-descriptions.txt` (966 znakova). Ako je predugačak, izbaci pasus "New in 2.0 ...".
10. **Work Statement:** štiklirano. **Submit for Approval** klikćeš ti.

## C. Prompt za Remote Control

Kopiraj ceo blok u sesiju koja radi na tvom Macu (Claude in Chrome):

```
Popuni formu „Version Upgrade” za RallyPal 2.0 na Zepp konzoli (console.zepp.com) u mom Chrome-u, preko Claude in Chrome. Aplikacija je RallyPal, appId 1134434, verzija 1.0.0 je već odobrena. Submit for Approval NE klikći, to radim ja.

1. Paket: ako ne postoji ~/Claude/rallypal-repo, pokreni
   cd ~/Claude && git clone -b claude/rallypal-2.0 https://github.com/marinkovicPavle/RallyPal rallypal-repo
   a ako postoji: cd ~/Claude/rallypal-repo && git fetch origin && git checkout claude/rallypal-2.0 && git pull
   Uputstvo je ~/Claude/rallypal-repo/docs/SUBMIT-2.0.md, tekstovi u docs/store/text/, slike u docs/store/screenshots/. Pročitaj uputstvo celo pre početka.

2. ZAB:
   cd ~/Claude/rallypal-repo && bash .dev/tools/build-copy.sh ~/Claude/rallypal-store
   cd ~/Claude/rallypal-store && npm install
   Proveri: u app.json "appId": 1134434 i "name": "2.0.0"; u shared/licence.js KPAY_APP_ID = '2025865549' i KPAY_TEST = false. Ako bilo šta ne stoji tako, stani i pitaj me.
   cd ~/Claude/rallypal-store && zeus build && ls -t dist/*.zab | head -1
   Uploaduj taj fajl (ime počinje sa 1134434-RallyPal-2.0.0-). Version No. na formi mora da bude 2.0.0.

3. Popuni formu tačno po odeljku B iz SUBMIT-2.0.md:
   - za svaki jezik (engleski i oni koji su već na formi; ako ih nema, dodaj srpski, španski, italijanski, nemački, francuski i portugalski): App Details iz 3-app-details.txt i New Version Introduction iz 4-new-version-introduction.txt iz foldera tog jezika (01-en-English … 07-pt-Portuguese). App Name i App Introduction ostaju; ako je polje prazno, uzmi 1-app-name.txt ili 2-app-introduction.txt. Portugalski tekst je brazilski: ako postoje i Portuguese (Brazil) i Portuguese (Portugal), stavi ga za Brazil i pitaj me za Portugal;
   - slike za svaki jezik: obriši stare i dodaj screenshots/<folder jezika>/round/1-match.png do 6-history.png, pa square/1-match.png do 6-history.png, tim redom;
   - Privacy Statement, tekst uz Others i Features Descriptions zameni tekstovima iz text/00-common/. U Call Permission štikliraj i polje za podatke o korisniku ako postoji;
   - In-app payment mode mora da bude Kiezepay.

4. Tekst lepi tačno kako je u fajlu. Posle svakog polja pročitaj vrednost iz polja i uporedi je sa fajlom.

5. Ako forma izgleda drugačije nego u uputstvu, polje odbije tekst, zeus build javi grešku ili nekog jezika nema u meniju, stani i pitaj me.

6. Na kraju ostavi tab sa popunjenom formom otvoren. Javi mi šta je popunjeno, koji jezici, koliko je slika po jeziku i šta je eventualno ostalo.
```

## D. Posle predaje

- **Odbijeno:** pošalji mi razlog. Ispravka ide na granu `claude/rallypal-2.0`, pa ponovo build i predaja.
- **Odobreno:** na prvom satu koji se ažurira iz prodavnice proveri da su istorija i otključavanje ostali.
- Proveri servis za probu: otvori https://rallypal-trial.svadba-media.workers.dev u pregledaču, treba da piše "RallyPal trial service".
