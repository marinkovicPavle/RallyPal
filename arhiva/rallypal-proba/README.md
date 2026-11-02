# RallyPal proba (probni ekran u treningu)

Mali Workout Extension samo za proveru, nije aplikacija za store. Odgovara na ono što iz Zepp dokumentacije ne znamo, pre nego što pravimo pravi RallyPal:

1. U kojim treninzima Zepp nudi naš ekran (Padel i Pickleball nisu na spisku u dokumentaciji).
2. Da li tap na gornju i donju polovinu radi brzo i pouzdano.
3. Da li se četiri vibracije jasno razlikuju i da li se čuje naš zvuk.
4. Da li rezultat ostaje kad spustiš ruku, odeš na drugi Zepp ekran ili Zepp ponovo pokrene naš ekran.
5. Da li stižu puls i vreme treninga.

## Šta je na ekranu

- Gore: puls i vreme iz Zepp-ovog treninga (isti način kao Teretana plan).
- Ispod sitno: `senzor 142` je puls koji čitamo sami (treba nam za prosečan i najveći puls u rezimeu), `vreme 0:12:30` je vreme treninga koje čitamo sami. Ako piše `kod 7` ili `greška`, to čitanje ne radi.
- **THEM** i **YOU**: tap bilo gde na gornju ili donju polovinu dodaje poen toj strani i daje kratku vibraciju (vibracija za poen).
- **GEM** (jedna duža vibracija), **SET** (dve), **MEČ** (tri, pa bip): da osetiš kako bi izgledali gem, set i kraj meča.
- `start 1 · pauze 0 · stalo 0 · zvuk 0/0`: koliko puta je Zepp pokrenuo naš ekran, koliko puta si otišao na drugi ekran, koliko puta je ekran tiho stao, koliko je bipova pušteno od pritisnutih.
- Poslednji red: šta se poslednje desilo (npr. `nazad posle 60s`).
- **RESET** briše rezultat i brojače.

## Instalacija (kao Teretana plan)

U Terminalu na Mac-u:

```
cd ~/Claude/rallypal-proba
zeus preview
```

Izaberi T-Rex 3 Pro i skeniraj QR kod u Zepp aplikaciji (Profil, Developer mode, Scan).

## Test, oko 5 minuta, može kod kuće

1. Na satu pokreni trening **Tennis**. U podešavanjima treninga: More, Data Page, Add Page, Workout Extension, izaberi **RallyPal proba** (kao Teretana plan). Pokreni trening (**GO**) i pređi na naš ekran, pa **RESET**.
2. Tapni brzo 10 puta gornju polovinu, pa 10 puta donju. Da li piše 10 i 10 i da li si osetio svaki tap?
3. Pritisni **GEM**, **SET** i **MEČ**. Da li se razlikuju i da li si čuo bip kod MEČ?
4. Spusti ruku na 1 minut (ekran se ugasi), pa podigni. Da li je rezultat ostao?
5. Pređi na drugi Zepp ekran treninga na 1 minut, pa se vrati. Da li je rezultat ostao?
6. **Slikaj ekran** i završi trening.
7. Pokreni **Padel**, pa **Pickleball**, pa **Table Tennis**, **Squash** i **Badminton**. Za svaki samo pogledaj da li se **RallyPal proba** nudi u Add Page, Workout Extension. Ako se nudi u Padelu, dodaj ga i tapni par poena da vidiš da radi.

Pošalji sliku ekrana i napiši: šta si osetio i čuo u koracima 2 do 5, i u kojim od šest treninga se nudi naš ekran.
