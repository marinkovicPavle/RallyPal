# RallyPal 1.0: predaja u Zepp store, korak po korak

Sve što se kuca ili lepi je ispod, spremno za kopiranje. Tekstovi su u `docs/store/text/` (pravi ih `.dev/tools/store_text.py`, koji proverava i dužine), slike u `docs/store/` (pravi ih `.dev/tools/store.py` iz simulatora).

## A. Pre predaje (ti)

### 1. Zepp appId

console.zepp.com > **My Service > Application > Create App**, ime **RallyPal**, tip Mini Program (App). appId je broj u prvoj koloni (za SaunaPal je bio 1131485). Ako ime nije slobodno, javi mi pa biramo drugo.

Upiši ga u `app.json` umesto privremenog 1099458:
```
"appId": 1099458,
```
postaje npr.
```
"appId": 1234567,
```
(ili mi pošalji broj, pa ja to uradim).

### 2. KiezelPay proizvod

kiezelpay.com > **ADD NEW > Add New Product**:

- **Product Image, Amazfit:** `docs/store/kiezelpay-preview.png` (ekran meča). Fitbit, Garmin i Pebble prazni.
- **Name of Product:**
```
RallyPal
```
- **Description for Product:**
```
Full version of RallyPal for Zepp OS watches: score keeping for tennis, padel, pickleball, table tennis, squash and badminton, your own setups and rule variants, player names, stats, Strava and Intervals.icu sync. One-time purchase, no subscription.
```
- **Price of Product:**
```
2.99
```
- **Fitbit / Garmin / Pebble Appstore Url, Custom Domain:** prazno. **Amazfit Appstore Url:** prazno sada, upisuje se link iz store-a kad Zepp odobri.
- **Custom Product Note:**
```
Thanks for buying RallyPal! Your watch unlocks by itself within a minute; keep the Zepp app open on your phone. Lost your unlock after a reset? Restore it at kzl.io/unlock. Questions: pavle019@live.com
```
- Štikliraj izjavu o pravima, **CREATE PRODUCT**. KiezelPay trial, ako ga nudi, ostavi isključen (3 besplatna meča broji RallyPal).

KiezelPay App ID (broj koji dobiješ posle CREATE PRODUCT) upiši u `shared/licence.js`:
```
export const KPAY_APP_ID = ''
```
postaje npr.
```
export const KPAY_APP_ID = '311267087'
```
(ili mi pošalji broj). Bez njega ekran za otključavanje na satu kaže "KiezelPay not reachable".

### 3. Kod na Macu

zeus pakuje svaki fajl koji nađe van skrivenih foldera, pa `docs/` i `arhiva/` ne smeju biti pored aplikacije kad se pravi ZAB. Zato se aplikacija kopira u poseban folder:
```
cd ~/Claude && git clone -b claude/rallypal-1.0-store https://github.com/marinkovicPavle/RallyPal rallypal-repo
```
```
cd ~/Claude/rallypal-repo && bash .dev/tools/build-copy.sh ~/Claude/rallypal-store
```
```
cd ~/Claude/rallypal-store && npm install
```
Kad promeniš appId ili KiezelPay App ID u `rallypal-repo`, ponovo pusti `build-copy.sh` (ili menjaj direktno u `rallypal-store`).

### 4. Probna kupovina (preporuka, 10 minuta)

1. U `~/Claude/rallypal-store/shared/licence.js` stavi `KPAY_TEST = true`.
2. `zeus preview` i otvori RallyPal na satu. Settings > **Unlock RallyPal**: sat pokaže kod.
3. Na kzl.io/code upiši kod: u test režimu KiezelPay pušta kupovinu bez plaćanja. Sat posle par sekundi kaže **Unlocked**.
4. Vrati `KPAY_TEST = false`. **Obavezno pre `zeus build`**, inače bi u store otišla verzija koja otključava bez plaćanja.

Usput odigraj jedan kratak meč i proveri da ide kako treba. Nije provereno na pravom satu: kupovina kroz KiezelPay za RallyPal, Strava i Intervals.icu na pravom telefonu, baterija na meču od sat vremena.

Napomena: probni appId 1099458 i pravi appId su za sat dve različite aplikacije, pa istorija iz probe ne prelazi u pravu.

### 5. Finalni build

```
cd ~/Claude/rallypal-store && zeus build
```
Fajl za upload je u `~/Claude/rallypal-store/dist/` i završava se na `.zab`.

## B. Na konzoli (forma "App Release")

Proveri da stoji: payment status **in app purchase**, In-app payment mode **Kiezepay**, Publish Area **Global**, Service Category **Common**, App Classification **Sports** (ili Health & Fitness ako Sports ne postoji), App Language **English (Default)**, App Name **RallyPal**, Version **1.0.0**.

1. **App Introduction** (do 40 znakova, ovaj ima 35):
```
Racket sports score, serve and side
```
2. **App Details** (do 600 znakova, ovaj ima 572):
```
Score keeper for tennis, padel, pickleball, table tennis, squash and badminton, plus padel Americano rounds. A key or a tap on your half of the screen scores the point; RallyPal follows the serve and the side, also in doubles, calls set, break and match points and vibrates on games and sets. Heart rate, summary after every match, history on the watch and phone, stats, optional Strava and Intervals.icu sync.

3 free matches, then a one-time $2.99 unlock via KiezelPay: the watch shows a code, pay at kzl.io/code. No subscription.

Created by Pavle (pavlemarinkovic.com)
```
Ako konzola nudi druge jezike, tekstovi za srpski, španski, italijanski, nemački, francuski i portugalski su u `docs/store/text/02-sr-Serbian/` … `07-pt-Portuguese/` (svaki do 40 i do 600 znakova).
3. **App Introduction Screenshot (round screen):** redom `docs/store/screenshots/round/1-match.png` … `6-history.png`.
4. **App Introduction Screenshot (square screen):** redom `docs/store/screenshots/square/1-match.png` … `6-history.png`.
5. **App Icon:** `docs/store/icon-240.png`.
6. **Privacy Statement** (do 2000 znakova, ovaj ima 1592): ceo `docs/store/text/00-common/privacy.txt`, ili odavde:
```
RallyPal Privacy Statement (November 2026)

RallyPal keeps score for racket sports on Zepp OS watches. It is made by Pavle Marinković (pavlemarinkovic.com).

What the app uses
- Heart rate: shown during a match and saved with it.
- Watch model and device ID: for the free trial.

Your matches, with the names you type for players, are stored on your watch and backed up to the Zepp app on your phone. They are not sent to us.

Free trial
So that reinstalling does not reset the 3 free matches, your phone sends our trial service (on Cloudflare) a one-way hash of your watch ID and short hashes of the counted matches. These cannot be turned back into your watch ID or match times, and the service never gets your name or account. Watches without a device ID (older than Zepp OS 4.2) use a random ID made by your phone instead.

Purchase
The full version is sold through KiezelPay (kiezelpay.com). Your phone sends KiezelPay a random account number and your watch model to check the purchase. You pay on KiezelPay's website under their privacy policy; RallyPal never sees payment details.

Optional connections
If you connect Strava or Intervals.icu, your matches (time, sport, score, statistics, heart rate and the names you typed) go directly from your phone to that service with the keys you entered. The keys stay on your phone and are never sent to us.

No ads, no analytics, no tracking. We don't sell or share your data.

Uninstalling RallyPal removes your matches from the watch and phone. Trial hashes stay on the trial service but cannot be linked to you.

Contact: pavle019@live.com
```
7. **Call Permission:** štikliraj **Heart Rate**, **Connect to the network** (telefon šalje na trial servis, KiezelPay, Stravu i Intervals.icu), **Run in background** (puls dok je ekran ugašen) i **Others**. **None** i **Positioning** ne. Ako uz Others traži opis:
```
Device ID (free trial count, sent only as a one-way hash).
```
8. **Whether the installation package includes SDK:** **No**. Ako traži opis:
```
No third-party SDK is bundled. The purchase status is checked over KiezelPay's web API.
```
9. **Full music playback:** **No**.
10. **Features Descriptions** (opis za recenzente, sa objašnjenjem naplate):
```
Score keeper for racket sports. On the start screen pick a setup (sport and rules), tap NEW MATCH and choose who serves first. In a match the upper half of the screen or the upper key gives the opponent a point, the lower half or the lower key gives you one; UNDO and MENU are in the middle. The match ends by the rules or from the menu, and a summary follows. History and settings are on the watch and on the app's settings page in the Zepp app.

Payment: free download with 3 free matches (a match counts from 5 minutes). Then a one-time $2.99 unlock through KiezelPay: the watch shows a code, the user pays at kzl.io/code and the watch unlocks by itself. Strava and Intervals.icu sync are optional.
```
11. **Work Statement:** štiklirano.
12. **Submit for Approval.** 6 predaja nedeljno (resetuje se u ponedeljak), pa pre klika proveri sva polja. Recenzija obično traje 1 do 5 radnih dana (tako piše u SaunaPal uputstvu).

Ako neko polje odbije tekst, pošalji mi screenshot.

## C. Posle predaje

- **Odbijeno:** pošalji mi razlog. Ispravim, ti `build-copy.sh`, `zeus build` i preko **Edit** ponovo predaš.
- **Odobreno:** u KiezelPay-u upiši link iz Zepp store-a u **Amazfit Appstore Url** proizvoda RallyPal.

## Šta je još otvoreno

- **Strava (ROAST stavka 4):** od 30. 6. 2026 Strava traži plaćenu pretplatu od vlasnika svake Strava API aplikacije, a kod nas svaki kupac pravi svoju. Za 1.0 ostaje kako jeste (mogućnost a); opis u store-u kaže samo "optional Strava sync". Zajednička RallyPal Strava aplikacija (mogućnost b) je posao za 1.1 ako je odabereš.
- **Brojač probe** koristi isti Cloudflare servis kao SaunaPal (`saunapal-trial`), sa posebnim RallyPal ključevima, pa se brojevi dve aplikacije ne mešaju. Besplatni Cloudflare KV dozvoljava 1.000 upisa dnevno za obe aplikacije zajedno; ako se to ikad potroši, proba radi po brojaču na satu.
