# RallyPal: roast pre izlaska (22. 10. 2026)

**2. 11. 2026:** urađeno 1 (proba i naplata, čeka pravi appId i KiezelPay App ID), 2 (paket za store, [SUBMIT.md](SUBMIT.md)), 6, 8, 9, 10 i 13 (odluke 47 i 48 u [dogovor.md](dogovor.md)). Za 4 (Strava) 1.0 ostaje po mogućnosti a. Ostalo čeka.

Ti biraš brojeve, a ništa ne pravim dok ne izabereš. Za svaku stavku piše popravka, zašto je važna, koliki je posao, da li ide u besplatnu probu ili u punu verziju i šta nije provereno. Za sve što menja izgled prvo dobijaš elemente, pa sliku, pa tek onda pravim, kao do sada.

Kako sam gledao: pročitao sam ceo kod na satu i telefonu i pustio probne skripte na pravom kodu. Greške u odeljku C su sve ponovljene skriptom, osim onih gde piše da sam ih zaključio iz koda. Uz to sam pogledao slične aplikacije na Zepp-u, Apple Watch-u, Wear OS-u i Garminu i šta im korisnici zameraju. Bodovanje svih šest sportova je prošlo: tie-break, super tie-break, zlatni poen, star point, servis u dublu, pikleball 0-0-2, stoni tenis od 10:10, skvoš i badminton do 30.

## A. Bez ovoga ne ide u store

**1. Proba i naplata (faza 5).** Sad je sve otključano, a appId 1099458 je izmišljen. Da sad napravimo ZAB, aplikacija bi izašla besplatna i pod pogrešnim brojem.
- Popravka: 3 besplatna meča sa Cloudflare brojačem (odvojen od SaunaPal-a), katanci po odluci 20, KiezelPay otključavanje, pravi appId. Kupovina se prvo proba u test režimu.
- Tvoj deo: nova aplikacija na console.zepp.com (tu vidimo i da li je ime RallyPal slobodno) i nova aplikacija u KiezelPay-u. Koraci kao za SaunaPal.
- Posao: srednji, većina koda je iz SaunaPal-a.

**2. Paket za store (faza 7).** Ikonica 240 px, slike ekrana za okrugle i četvrtaste satove, opis na 7 jezika, izjava o privatnosti, objašnjenje plaćanja, SUBMIT.md i ZAB.
- Predlog iz istraživanja: prva slika je ekran meča sa servisom i stranom, jer većina ljudi vidi samo prve 2 do 3 slike. Druga slika: šest sportova i Strava sa pulsom. U opisu jasno "$2.99 jednom, bez pretplate, 3 meča besplatno", jer recenzije ovakvih aplikacija kažnjavaju pretplate.
- Ne obećavamo automatsko prepoznavanje poena. Tuđe aplikacije dobijaju loše ocene baš zbog toga.
- Posao: srednji.

**3. Tvoja proba Strave i Intervals-a na telefonu.** Kod je na Macu od juče u 13:00, ali još nemamo tvoju probu.
- Nije provereno na pravom telefonu: Zepp-ovo dugme Connect na iPhonu, adresa za povratak zepp-os.zepp.com, slanje fajla sa pulsom kroz Zepp, i da li Strava i Intervals primaju Padel i ostale sportove kao tip.
- Uz to dva pitanja koja su još otvorena: da li Zepp-ov trening može da ide uz RallyPal, i šta radi taster dok je ekran ugašen (stavka 19).
- Posao: mali, tvoj.

## B. Strava je promenila pravila

**4. Strava od 30. 6. 2026 traži plaćenu pretplatu od svakog ko ima svoju Strava API aplikaciju.** Kod nas svaki kupac pravi svoju Strava aplikaciju, pa Stravu može da poveže samo ko plaća Stravu (oko $11.99 mesečno ili $79.99 godišnje u SAD). Većina korisnika Strave ne plaća.
- Mogućnost a: ostaje kako jeste, a u opisu i uputstvu piše da za Stravu treba Strava pretplata.
- Mogućnost b: jedna zajednička RallyPal Strava aplikacija na tvom nalogu, sa malim Cloudflare servisom za prijavu, da Secret ne stoji u aplikaciji. Kupcu tada ne treba ni pretplata ni svoja Strava aplikacija, a povezivanje je jedan dodir. Granica: 10 ljudi bez pregleda, a do 9.999 posle Stravinog pregleda. Posao: srednji, plus prijava Stravi.
- Isto važi za SaunaPal. Zajedničku aplikaciju si za SaunaPal odbio 21. 10., ali tada ovo nismo znali. SaunaPal je u drugoj niti i tamo ga ne diram.
- Nije provereno: pravila sam našao u Stravinoj objavi od 1. 6. 2026 i u tuđim sažecima, jer Stravine stranice ne mogu da otvorim odavde. Tvoja Strava aplikacija radi verovatno zato što ti imaš pretplatu (Strava konektor u ovom projektu radi samo uz nju), to je moj zaključak.
- Tvoja odluka: a ili b.

**5. Strava menja adresu svog API-ja.** Nova adresa api-v3.strava.com radi od 4. 1. 2027. Po Stravinom forumu stara prestaje 1. 6. 2027.
- Popravka: posle 4. 1. 2027 RallyPal sam prelazi na novu adresu, a ako ona ne odgovori, vraća se na staru. Token već šaljemo u zaglavlju, kako Strava i traži.
- Važi i za SaunaPal.
- Posao: mali. Nije provereno: tačan datum gašenja stare adrese (forum, ne zvanična stranica).

## C. Greške koje sam našao

**6. Meč koji ostaviš otvoren pa završiš sutra ide na Stravu kao trening od 16 sati.** Trajanje se računa do trenutka kad pritisneš kraj, pa i puls i opterećenje na Stravi i Intervals-u ispadnu besmisleni. Pozadinski puls radi sve dok meč postoji.
- Popravka: trajanje se završava posle poslednjeg poena (uz kratak dodatak), a puls se gasi posle 30 minuta bez poena.
- Posao: mali. Proba.

**7. Dva treninga na Stravi kad uz RallyPal ide i Zepp-ov trening.** Telefon traži Zepp-ov trening samo jednom, odmah posle meča, a Zepp ga pošalje na Stravu tek kad ga zaustaviš. RallyPal onda doda svoj, pa Zepp svoj. Ako u jednom Zepp treningu odigraš dva meča (REVANŠ), oba meča upišu sebe u isti Zepp trening i drugi pregazi prvi.
- Popravka, mogućnosti: (a) podešavanje "I also record a Zepp workout": RallyPal tada čeka Zepp-ov trening do nekoliko sati pa ga dopuni; (b) RallyPal uvek čeka sat vremena pre slanja. Jedan Zepp trening dobija samo jedan meč, ostali se dopisuju u njegov opis.
- Zavisi od tvog odgovora da li Zepp-ov trening uopšte može da ide uz RallyPal.
- Posao: srednji. Puna verzija (Strava je u probi zaključana). Zaključio iz koda, zavisi od vremena pa nije pušteno skriptom; drugi deo (dva meča) je ponovljen.

**8. Sat ne vraća istoriju sa telefona ako već ima ijedan meč.** Na resetovanom satu odigraš jedan meč pre nego što se telefon poveže, i sat zauvek ima 1 meč, a telefon 61. Ako se vraćanje prekine (izađeš sa početnog ekrana), sat zauvek ostane npr. na 40 od 100.
- Uz to: sat čuva grafik pulsa samo za poslednjih 20 mečeva, čak i ako stariji još nisu stigli na telefon. Posle 25 mečeva bez telefona, 5 najstarijih stigne bez pulsa.
- Popravka: sat traži ono što mu fali, a ne samo kad je prazan, i nastavlja gde je stao; grafik se briše tek kad telefon potvrdi da ga ima.
- Posao: mali do srednji. Proba.

**9. Red za slanje na Stravu i Intervals.** Pet stvari:
- Intervals dobije isti meč dva puta ako prvo slanje uspe, a sledeći korak padne zbog mreže. Isto posle UNDO na ekranu kraja meča.
- Pet mečeva koji stalno padaju (npr. obrisani na Stravi pa preimenovani) blokiraju sve novije, koji nikad ne odu.
- Connect again ne radi kad Strava povuče pristup: ostaje "sign-in failed" dok ne pritisneš Disconnect.
- Prijava na Stravu bez interneta se izgubi.
- Preko 50 mečeva na čekanju, najstariji se tiho izbacuju.
- Popravka: sve male izmene, plus red "Couldn't send N matches" sa Retry now, koji već imamo.
- Posao: mali do srednji. Puna verzija.

**10. Servis u dublu, tri greške.**
- Badminton i pikleball sa rally bodovanjem: kad protivnici prvi serviraju, odgovor na "Who serves for your team?" ispadne obrnut (izabereš partnera, a piše "you · left").
- Pikleball: kad u meniju promeniš servis na protivnike, pokaže pogrešnu stranu.
- Stoni tenis, dubl, odlučujući gem: na 5 poena se menja redosled primanja, a RallyPal to ne radi, pa do kraja gema pogrešno kaže ko iz tvog para prima. Ovo sam zaključio iz pravila, nije pušteno.
- Posao: mali. Proba.

**11. Istorija je jedan veliki fajl.** Čita se cela pri svakom crtanju početnog ekrana, osvežavanju kartice i slanju meča. Sa 200 mečeva to je oko 650 KB na satu, a sa 1000 oko 3,8 MB na telefonu. Ako se sat ugasi baš dok upisuje, istorija se isprazni, a zbog stavke 8 se ne vrati.
- Popravka: spisak mečeva odvojeno od detalja, upis prvo u privremeni fajl pa zamena.
- Posao: srednji. Proba. Nije mereno na satu, veličine su procena.

**12. Do 30 sekundi pulsa se izgubi svaki put kad podigneš ruku.** Zaključio iz koda. Posao: mali. Proba.

**13. Slučajan meč od jednog poena ode na Stravu** kao trening od minut, a brisanje na satu ga ne briše sa Strave.
- Popravka: na Stravu i Intervals ide tek meč od bar 5 minuta (ili broj poena koji ti kažeš). Probni brojač već ne broji kratke mečeve.
- Posao: mali. Puna verzija.

## D. Šta bi igrač prvi primetio da fali

**14. Promena strane terena.** Nigde ne kažemo kad se menja strana: tenis i padel posle neparnih gemova i na svakih 6 poena u tie-break-u, stoni tenis posle gema i na 5 u odlučujućem, badminton na 11 u trećem gemu, pikleball na polovini trećeg gema. Konkurencija (CourtScore na Apple Watch-u) to ima.
- Popravka: natpis CHANGE ENDS i posebna vibracija, može da se isključi.
- Posao: mali do srednji. Proba.

**15. Zaštita od slučajnih dodira.** Znoj, kiša ili rukav upišu poen. Tuđe aplikacije imaju "water lock", a na Garminu se ljudi žale baš na ovo.
- Popravka: podešavanje "Tap on screen: On / Off (keys only)".
- Posao: mali. Proba.

**16. Odmor između gemova i setova.** Odbrojavanje sa vibracijom: tenis 90 s na promeni strane i 120 s između setova, badminton 60 s na 11 i 120 s između gemova, stoni tenis i skvoš između gemova.
- Posao: mali do srednji. Puna verzija.

**17. Meč završen predajom ili istekom termina.** Kad meč završiš ručno, nema pobednika, pa se predaja ili "istekao nam je sat terena" ne računa kao pobeda ili poraz.
- Popravka: posle End match pitanje "Who won?" sa You, Opponent i No result.
- Posao: mali. Proba.

**18. Početak od zatečenog rezultata.** Ako počneš da beležiš na 3:2 u setu, moraš da tapkaš svaki poen, pa je i statistika pogrešna.
- Popravka: na ekranu ko servira još "Start from score" (setovi i gemovi).
- Posao: srednji. Puna verzija.

**19. Ugašen ekran i baterija.** Najčešća žalba na Apple Watch-u: posle gašenja ekrana dodir pokaže sat umesto aplikacije. Na Wear OS-u ljudi pišu 15 do 20% baterije na sat igre.
- Tvoj deo: jedan meč od sat vremena sa "Off with wrist down" i zapišeš procenat baterije pre i posle, plus šta radi taster i dodir dok je ekran ugašen.
- Posao: mali. Nije provereno na T-Rex-u.

**20. Statistika servisa u tenisu:** as, dupla greška, procenat prvog servisa. Traži dodatne tapove tokom poena, pa nisam siguran da vredi. Posao: srednji. Puna verzija.

## E. Za posle izlaska

**21. Izgovaranje rezultata.** Najviše se traži za pikleball, gde se rezultat izgovara pre svakog servisa. T-Rex pušta samo naše zvučne fajlove (to smo videli u SaunaPal-u), pa treba snimiti brojeve na 7 jezika. Posao: veliki.

**22. Rezultat uživo za gledaoce** preko linka na telefonu, kao Padel Smash na Garminu. Treba server. Posao: veliki.

## Konkurencija i cena, ukratko

- Na Zepp-u postoje Padel Score Pro, BadmintonScorer, Squash Scoring i PadelPunto (otvoren kod). Nijednu za tenis, pikleball ili stoni tenis nisam našao, pa je RallyPal verovatno jedini sa svih šest sportova. Nije provereno u samom Zepp store-u.
- Najjači konkurent je Padel Smash na Garminu: star point, Americano i Mexicano, mali teren sa servisom, undo 15 poena, rezultat uživo za gledaoce, a umesto probe vraća novac 24 sata.
- Amazfit sam dodaje brojanje udaraca (Helio Strap, pikleball), pa RallyPal treba predstaviti kroz rezultat, servis i Stravu, a ne kroz udarce.
- Cena: ovakve aplikacije za sat koštaju jednom od $0.99 do $5.99. $2.99 je sredina, isto kao CourtScore.

## Moj predlog pre izlaska

1. Obavezno: 1, 2 i 3, i tvoja odluka za 4.
2. Greške koje kvare podatke: 6, 8, 9, 10 i 13.
3. Ono što igrač odmah primeti: 14, 15 i 17.
4. Do januara: 5.

Ostalo (7, 11, 12, 16, 18, 20, 21, 22) posle prve verzije ili kad kažeš. Za 7 mi prvo treba tvoj odgovor da li Zepp-ov trening ide uz RallyPal.

## Izvori

- [Strava: An Update To Our Developer Program (1. 6. 2026)](https://communityhub.strava.com/insider-journal-9/an-update-to-our-developer-program-13428)
- [Sažetak novih Strava pravila i cena](https://appsforstrava.com/blog/strava-developer-program-changes-2026)
- [Intervals.icu forum o Strava pretplati za API](https://forum.intervals.icu/t/strava-api-update-new-terms-subs-required-for-api-access/130240)
- [Strava V3 API Changelog (nova adresa od 4. 1. 2027, Padel kao tip)](https://developers.strava.com/docs/changelog/)
- [Strava forum: šta znači nova API poruka (1. 6. 2027)](https://communityhub.strava.com/developers-api-7/new-strava-api-update-what-the-message-means-13433)
- [Garmin forum: Padel Smash](https://forums.garmin.com/developer/connect-iq/f/showcase/444848/app-padel-smash-padel-scoring-on-your-wrist-with-star-point-and-mexicano)
- [App Store: CourtScore](https://apps.apple.com/app/courtscore/id6749335551)
- [App Store: Padelore (Water Lock)](https://apps.apple.com/us/app/padelore-watch-scorekeeper/id6778968043)
- [App Store: Padel Watch, recenzije o ugašenom ekranu](https://apps.apple.com/gb/app/padel-watch-padel-scorekeeper/id6443518532)
- [Google Play: Tennis Score, recenzije o bateriji](https://play.google.com/store/apps/details?id=com.jarpistel.android.wearable.tennisscore)
- [Garmin forum: Badminton Score Tracker, žalbe na dodir](https://forums.garmin.com/developer/connect-iq/f/showcase/2350/app-badminton-score-tracker/1898627)
- [Notebookcheck: Padel Score Pro na Zepp-u](https://www.notebookcheck.net/Amazfit-smartwatch-users-can-now-download-three-new-Mini-Apps.1249049.0.html)
- [Notebookcheck: Squash Scoring na Zepp-u](https://www.notebookcheck.net/Amazfit-smartwatch-users-get-seven-new-Mini-Apps.1242656.0.html)
- [GitHub: PadelPunto](https://github.com/fat-toni/PadelPunto)
- [Zepp FAQ: plaćene aplikacije](https://docs.zepp.com/docs/guides/faq/paid-app/)
- [Screenhance: koliko ljudi gleda slike u store-u](https://screenhance.com/blog/state-of-app-store-screenshots-2026)
