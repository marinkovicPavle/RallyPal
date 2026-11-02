# RallyPal: plan izrade

Šta pravimo: posebnu aplikaciju za sat (kao SaunaPal) za šest reket sportova: tenis, padel, pikleball, stoni tenis, skvoš i badminton. Poen se upisuje dugmetom ili tapom na polovinu ekrana, RallyPal prati servis, vibrira po događaju, meri puls, čuva istoriju na satu i telefonu i šalje meč na Stravu sa grafikom pulsa i pravim sportom. Na telefonu su kombinacije, istorija, statistika i podešavanja; 3 besplatna meča, pa $2.99 jednom. Sve odluke: [dogovor.md](dogovor.md).

## Gde je šta

- Kod pravim u /mnt/project-files/druga-aplikacija/rallypal, a kopiju stavljam na tvoj Mac u ~/Claude/rallypal za `zeus preview`.
- Većinu uzimamo iz SaunaPal 1.0, koji već radi na tvom satu: dugmad i oznake uz njih, puls, rad u pozadini kad izađeš, istorija i backup na telefonu, podešavanja na satu i telefonu, KiezelPay otključavanje, Cloudflare brojač probe, Strava, simulator za sve veličine ekrana.
- Probni ekran u treningu ("RallyPal proba") više ne treba, jer više ne pravimo ekran u treningu.

## Faze

**1. Slike ekrana.** Crtam sve ekrane sata (okrugli i četvrtasti) po spisku "Novi ekrani na satu" u dogovoru, pa ih prolazimo. Tvoj deo: pregled i izmene. **Gotovo:** [nacrt2-sat.png](nacrt2-sat.png), odobreno 20. 10. 14:20.

**2. Bodovanje.** Pravila svih šest sportova sa varijantama, kolo do zbira poena, servis i strana, u dublu ko od dvojice, natpisi (set poen, break poen, zlatni poen...) i statistika. Proveravam ga automatskim testovima na hiljadama odigranih mečeva pre nego što ide na sat. Tvoj deo: ništa. **Gotovo 20. 10.:** rallypal/shared/rules.js i match.js; 44 testa, među njima 5.108 nasumično odigranih mečeva (svaka kombinacija pravila u singlu i dublu, sa vraćanjem poena i ručnom promenom servisa). Gde pravila ostavljaju izbor igračima (ko iz para servira u novom setu, prvi server u stonom tenisu u dublu), RallyPal nastavlja redom, a menja se u meniju.

**3. Aplikacija na satu.** Svi ekrani sa slika, dugmad, vibracije, puls, istorija, podešavanja, prečica u kartice, svih šest jezika; raspored proveren simulatorom na svim veličinama. Tvoj deo: `zeus preview` i jedan probni meč (možeš i sam da upisuješ poene). Tom prilikom proveravamo i da li Zepp-ov trening može da ide uz RallyPal. **Spremno za probu 20. 10. 15:40:** kod u rallypal/ i na Macu u ~/Claude/rallypal; 55 testova prolazi; simulator je prošao oko 300 ekrana po satu na 7 veličina ekrana i 6 jezika bez ijednog preklapanja ili odsečenog teksta. appId 1099458 je privremen (pravi stiže u fazi 5, pa probna istorija neće preći u konačnu verziju).

**4. Telefon.** Pre koda ti šaljem sliku kartica Setups, History, Stats i Settings i prolazimo ih element po element, kao za sat. Posle toga ekrani, prenos mečeva sa sata na telefon i backup istorije.

**5. Proba i naplata.** 3 besplatna meča sa posebnim Cloudflare brojačem za RallyPal (odvojen od SaunaPal-a), katanci po dogovoru i KiezelPay otključavanje. Tvoj deo: nova aplikacija u KiezelPay-u i na console.zepp.com (tu se vidi i da li je ime RallyPal slobodno); napisaću ti korake kao za SaunaPal. Kupovina se prvo proba u test režimu.

**6. Strava.** Povezivanje sopstvene Strava aplikacije; meč ide sa pulsom kroz vreme i pravim sportom, rezultat u naslovu, statistika u opisu. Tvoj deo: jedan meč sa uključenom Stravom.

**7. Store.** Ikonica 240 px, slike ekrana, opis na šest jezika, izjava o privatnosti, objašnjenje plaćanja i ZAB fajl, sve u SUBMIT.md kao za SaunaPal. Tvoj deo: `zeus build` i slanje.

## Šta treba od tebe, ukupno

- Pregled slika sata (faza 1) i telefona (faza 4).
- Jedan probni meč (faza 3) i jedan meč sa Stravom (faza 6).
- Nalozi za RallyPal u KiezelPay-u i na console.zepp.com (faza 5).
- `zeus build` i slanje u store (faza 7).

## Rizici

- **Zepp ne beleži meč kao svoj trening**, pa ga nema u Zepp-ovoj statistici (osim ako korisnik uz RallyPal pokrene i Zepp-ov trening). Na Stravi meč izgleda kao pravi trening, sa pulsom.
- **Baterija:** ako korisnik u podešavanjima izabere ekran upaljen ceo meč, sat troši primetno više.
- **Dugme dok je ekran ugašen:** da li odmah upisuje poen ili prvo pali ekran, vidi se na probnom meču.
- **Konkurencija:** na Zepp-u već postoje Padel Score Pro i BadmintonScorer; po onome što smo našli, nijedna aplikacija nema svih šest sportova.
