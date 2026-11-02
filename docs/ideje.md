# Druga Zepp aplikacija: ideje za zaradu

Lista od 20. 10. 2026. Pored aplikacije za trku (pace band i gelovi u Zepp-ovom Run-u), koju radi thread "Nova Zepp aplikacija". Oslanja se na [pregled-stora.md](../nova-aplikacija/pregled-stora.md), [analiza-publike.md](../nova-aplikacija/analiza-publike.md) i [izvodljivost.md](../nova-aplikacija/izvodljivost.md).

## Kako se ovde zarađuje

KiezelPay radi samo jednokratno otključavanje. Na $2.99 i oko 27% provizije ostaje oko $2.18 po kupcu, pa je 1.000 kupaca oko $2.200. Zato su važne tri stvari: koliko ljudi uopšte traži takvu aplikaciju, koliko često je koriste (svako korišćenje je šansa da plate posle probnog perioda) i da li na satu rešava nešto što telefon ne može (ruke su zauzete, telefon je u torbi).

Za svaku ideju koristimo isto što SaunaPal već ima: KiezelPay kod na telefonu, Cloudflare brojač probnog perioda, zvukove koji se čuju na T-Rex 3 Pro, dodir koji pouzdano radi, simulator ekrana i iskustvo sa predajom u store.

## Lista po redu

| # | Ideja | Zašto može da zaradi | Glavni rizik | Posao |
|---|---|---|---|---|
| 1 | **Interval tajmer** (Tabata, EMOM, AMRAP, runde za boks, odmor između serija) | Velika publika (HIIT, CrossFit, boks, kućni trening, teretana), koristi se više puta nedeljno, a na satu radi bez gledanja: vibracija i bip za svaki prelaz. Zepp sam gura hibridni trening. | **Zepp to već ima ugrađeno** (vidi ispravku ispod): Tabata, EMOM i AMRAP u HIIT, Cross Training i HYROX treningu, plus šabloni u Zepp aplikaciji. | srednje |
| 2 | **Rezultat za reket sportove** (tenis, pikleball, stoni tenis, skvoš, badminton, padel u jednoj) | Padel Score Pro u storu već naplaćuje, znači da ljudi plaćaju za ovo. Za tenis i pikleball nismo našli ništa. Koristi se na svakom meču. | Pikleball nema svoj Zepp sport (igra se pod Tenis). Autor Padel Score Pro može da doda tenis. | malo do srednje |
| 3 | **Tajmer za post** (16:8, 18:6, OMAD, faze posta, niz dana) | Beleženje zdravlja je najjača kategorija po preuzimanjima u Zepp storu, post se drži svaki dan, a kartica na satu pokazuje koliko je ostalo. | Ljudi to već rade na telefonu; sat je udobnost, ne nužnost, pa slabije plaćaju. | malo |
| 4 | **Hladna kupka i kontrastna terapija** (ledena voda, runde sauna pa hladno) | Skoro ceo kod je SaunaPal, pa je najbrže za napraviti, a ista publika može da kupi obe. | Najmanja publika. Puls u hladnoj vodi je nepouzdan. SaunaNow može da doda hladnu kupku. | najmanje |
| 5 | **Navike i suplementi** (kreatin, vitamini, voda, "uradio danas", podsetnici) | Najšira publika, koristi se svaki dan. | Lako se kopira, puno besplatnih rešenja na telefonu, ljudi najmanje plaćaju. | malo |

## Ispravka (20. 10., posle izbora)

Kad sam krenuo na funkcije za interval tajmer, našao sam da Zepp OS 5 već ima ugrađene AMRAP, TABATA i EMOM tajmere u HYROX, Cross Training i HIIT treningu, sa šablonima koji se prave u Zepp aplikaciji i šalju na sat (koraci, upozorenja, broj krugova), a T-Rex 3 Pro je na Zepp-ovom spisku uređaja za to. Na T-Rex 3 Pro postoji i Hybrid Training sa ta tri načina i sopstvenim planovima vežbi. Zepp OS 6 to zadržava. Na listi sam to pogrešno opisao kao "teško napraviti", a zapravo je to glavni konkurent, i to besplatan i ugrađen. Za reket sportove Zepp ima režime treninga (Tenis, Padel, Pikleball), ali nismo našli da vodi rezultat.

Izvori: [Zepp OS 5 pregled](https://os.zepp.com/zepp-os-5), [Notebookcheck: T-Rex 3 dobija Zepp OS 5](https://www.notebookcheck.net/Amazfit-T-Rex-3-finally-gets-Zepp-OS-5-0-in-new-update.1170814.0.html), [Gadgets & Wearables: Zepp OS 6](https://gadgetsandwearables.com/2026/05/08/zepp-os-6/), [Amazfit: Padel i Pikleball u Zepp OS 4](https://us.amazfit.com/blogs/product-update/july-2024-amazfit-balance-zepp-os-4-updates-ahead-of-summer-of-sport).

## Detaljnije

### 1. Interval tajmer
- Na telefonu praviš svoje treninge (koraci rada, odmora, broj rundi, nazivi vežbi), na satu biraš i kreneš.
- Bez gledanja: različita vibracija i bip za "kreni", "odmor", "još 3 sekunde", "kraj".
- Puls tokom treninga i istorija; upis na Stravu kao u SaunaPal-u.
- Kako: obična aplikacija (kao SaunaPal) drži ekran upaljen i sama meri vreme, pa ne zavisi od toga da li Zepp pauzira Run ekran. Druga mogućnost je ekran unutar Zepp-ovog HIIT treninga, ali on ima isti problem sa pauzom koji sad proveravamo za aplikaciju za trku.
- I ti bi je koristio (teretana, HIIT), pa probavamo na sebi.

### 2. Rezultat za reket sportove
- Ekran unutar Zepp-ovog treninga (Tenis, Stoni tenis, Skvoš, Badminton), pa Zepp normalno beleži meč, a mi vodimo rezultat. Zepp dozvoljava takav ekran za te sportove.
- Ograničenja tog ekrana (jedna stranica, samo tap) baš odgovaraju rezultatu: tap levo "ja", tap desno "protivnik", tap za vraćanje.
- Pravila po sportu: gem, set, tie-break, servis, advantage ili "no-ad"; pikleball do 11 sa servisom.
- Na kraju: rezultat po setovima u opisu treninga na Stravi (to već radimo za teretanu).

### 3. Tajmer za post
- Start i kraj posta jednim tapom, faze posta kao okvirne oznake (uz napomenu da nije medicinski savet), niz uzastopnih dana.
- Kartica na satu sa preostalim vremenom; podsetnik kad se prozor za jelo otvara i zatvara.

### 4. Hladna kupka i kontrastna terapija
- Isti tok kao SaunaPal: start, tajmer, puls, istorija, Strava. Dodatak: runde (npr. 3 x sauna 12 min pa hladno 2 min) sa vibracijom za prelaz.
- Ranije smo odlučili da SaunaPal ostane samo sauna, zato bi ovo bila posebna aplikacija.

### 5. Navike i suplementi
- Lista stvari za danas, tap da štikliraš, podsetnici u zadato vreme, niz dana. Podešavanje na telefonu.

## Pre konačnog izbora

Ne vidimo Zepp store spolja (postoji samo u Zepp aplikaciji na telefonu), a vesti pokrivaju samo istaknute aplikacije. Kad izabereš ideju, pretraži store po rečima za nju (npr. "interval", "tabata", "timer"; "tennis", "score"; "fasting"; "cold", "plunge"). Ako nešto nađeš, javi ime, pa gledamo šta radi i po čemu bismo bili bolji.

## Izvori

- [Notebookcheck: devet novih mini aplikacija (LiftGo, SaunaNow, Voice Bridge)](https://www.notebookcheck.net/Nine-new-Amazfit-Mini-Apps-now-available-for-smartwatch-users.1253503.0.html)
- [Notebookcheck: tri nove mini aplikacije (Padel Score Pro)](https://www.notebookcheck.net/Amazfit-smartwatch-users-can-now-download-three-new-Mini-Apps.1249049.0.html)
- [Notebookcheck: mini golf drop, BadmintonScorer (februar 2026)](https://www.notebookcheck.net/Amazfit-smartwatches-get-new-mini-golf-app-in-latest-drop.1222372.0.html)
- [Notebookcheck: Heart Trace i najpreuzimanije aplikacije](https://www.notebookcheck.net/Amazfit-smartwatches-get-new-heart-rate-related-Mini-App.1229290.0.html)
- [Notebookcheck: sedam novih mini aplikacija (wrist-list)](https://www.notebookcheck.net/Amazfit-smartwatch-users-get-seven-new-Mini-Apps.1242656.0.html)
- [Zepp docs: Workout Extension, podržani sportovi (Tenis 17, Stoni tenis 89, Skvoš 81, Badminton 92, HIIT 49)](https://raw.githubusercontent.com/zepp-health/zeppos-docs/main/docs/guides/workout-extension/quick-start.mdx)
- Pretrage od 20. 10. 2026 za Zepp interval tajmer, tenis i pikleball rezultat, post, hladnu kupku i navike: nijedna nije našla Zepp aplikaciju, samo aplikacije za telefon i Apple Watch.
