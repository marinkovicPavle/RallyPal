# Store texts for the Zepp console (the App Release form of 1.0.0), one folder per language (the 17 the
# watch speaks) plus the common ones, with the console's limits checked: App Introduction 40, App Details
# 600, Privacy Statement 2000 characters. The details stay a few characters under 600, in case the console
# counts a line break as two.
# Usage: python3 .dev/tools/store_text.py   (writes docs/store/text/)

import os

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(root, 'docs', 'store', 'text')

LANGS = [
    ('01-en-English', 'Racket sports score, serve and side',
     """Score keeper for tennis, padel, pickleball, table tennis, squash and badminton, plus padel Americano rounds. A key or a tap on your half of the screen scores the point; RallyPal follows the serve and the side, also in doubles, calls set, break and match points and vibrates on games, sets and change of ends. Rest countdown, aces and double faults, heart rate zones, records, history and stats on watch and phone, optional Strava and Intervals.icu sync. In 17 languages.

3 free matches, then a one-time $2.99 unlock via KiezelPay. No subscription.

Created by Pavle (pavlemarinkovic.com)"""),
    ('02-sr-Serbian', 'Rezultat i servis za reket sportove',
     """Vodi rezultat u tenisu, padelu, pikleballu, stonom tenisu, skvošu i badmintonu, plus Americano kola u padelu. Poen se upisuje tasterom ili tapom na svoju polovinu ekrana; RallyPal prati servis i stranu, i u dublu, najavljuje set, brejk i meč loptu i vibrira na gem, set i promenu strane. Odbrojavanje odmora, asovi i duple greške, zone pulsa, rekordi, istorija i statistika na satu i telefonu, po želji Strava i Intervals.icu. Na 17 jezika.

3 besplatna meča, pa jednokratno otključavanje za $2.99 preko KiezelPay-a. Bez pretplate.

Autor: Pavle (pavlemarinkovic.com)"""),
    ('03-es-Spanish', 'Marcador, saque y lado para raqueta',
     """Marcador para tenis, pádel, pickleball, tenis de mesa, squash y bádminton, y rondas Americano de pádel. Una tecla o un toque en tu mitad de pantalla suma el punto; RallyPal sigue el saque y el lado, también en dobles, anuncia set, break y match point y vibra en cada juego, set y cambio de lado. Cuenta atrás del descanso, aces y dobles faltas, zonas de pulso, récords, historial y estadísticas en reloj y teléfono, Strava e Intervals.icu opcionales. En 17 idiomas.

3 partidos gratis y luego desbloqueo único de $2.99 con KiezelPay. Sin suscripción.

Creado por Pavle (pavlemarinkovic.com)"""),
    ('04-it-Italian', 'Punteggio e servizio per la racchetta',
     """Segnapunti per tennis, padel, pickleball, tennis tavolo, squash e badminton, e turni Americano del padel. Un tasto o un tocco sulla tua metà dello schermo segna il punto; RallyPal segue servizio e lato, anche in doppio, annuncia set point, palla break e match point e vibra a ogni game, set e cambio campo. Countdown della pausa, ace e doppi falli, zone di battito, record, storico e statistiche su orologio e telefono, Strava e Intervals.icu facoltativi. In 17 lingue.

3 partite gratis, poi sblocco unico a $2.99 con KiezelPay. Nessun abbonamento.

Creato da Pavle (pavlemarinkovic.com)"""),
    ('05-de-German', 'Spielstand, Aufschlag und Seite',
     """Zählt Punkte in Tennis, Padel, Pickleball, Tischtennis, Squash und Badminton, dazu Padel-Americano-Runden. Eine Taste oder ein Tipp auf deine Bildschirmhälfte zählt den Punkt; RallyPal folgt Aufschlag und Seite, auch im Doppel, sagt Satz-, Break- und Matchball an und vibriert bei Spiel, Satz und Seitenwechsel. Pausen-Countdown, Asse und Doppelfehler, Pulszonen, Rekorde, Verlauf und Statistik auf Uhr und Handy, optional Strava und Intervals.icu. In 17 Sprachen.

3 Gratis-Matches, dann einmalig $2.99 über KiezelPay. Kein Abo.

Von Pavle (pavlemarinkovic.com)"""),
    ('06-fr-French', 'Score, service et côté pour la raquette',
     """Score pour tennis, padel, pickleball, tennis de table, squash et badminton, et tours Americano en padel. Une touche ou un appui sur votre moitié d'écran marque le point ; RallyPal suit service et côté, aussi en double, annonce les balles de set, break et match et vibre aux jeux, sets et changements de côté. Décompte de la pause, aces et doubles fautes, zones cardiaques, records, historique et stats sur montre et mobile, Strava et Intervals.icu en option. En 17 langues.

3 matchs gratuits, puis déblocage unique à 2,99 $ via KiezelPay. Sans abonnement.

Créé par Pavle (pavlemarinkovic.com)"""),
    ('07-pt-Portuguese', 'Placar, saque e lado para raquete',
     """Placar para tênis, padel, pickleball, tênis de mesa, squash e badminton, e rodadas Americano de padel. Uma tecla ou um toque na sua metade da tela marca o ponto; o RallyPal segue saque e lado, também em duplas, anuncia set point, break point e match point e vibra a cada game, set e troca de lado. Contagem do descanso, aces e duplas faltas, zonas de frequência, recordes, histórico e estatísticas no relógio e celular, Strava e Intervals.icu opcionais. Em 17 idiomas.

3 partidas grátis, depois desbloqueio único de US$ 2,99 via KiezelPay. Sem assinatura.

Criado por Pavle (pavlemarinkovic.com)"""),
    ('08-nl-Dutch', 'Score en opslag voor racketsporten',
     """Scorebord voor tennis, padel, pickleball, tafeltennis, squash en badminton, plus padel-Americano-rondes. Een knop of een tik op jouw helft van het scherm telt het punt; RallyPal volgt opslag en kant, ook in dubbel, meldt set-, break- en matchpoints en trilt bij games, sets en wisselen van kant. Aftellen van de pauze, aces en dubbele fouten, hartslagzones, records, geschiedenis en statistieken op horloge en telefoon, optioneel Strava en Intervals.icu. In 17 talen.

3 gratis wedstrijden, daarna eenmalig $2.99 via KiezelPay. Geen abonnement.

Gemaakt door Pavle (pavlemarinkovic.com)"""),
    ('09-pl-Polish', 'Wynik i serwis w sportach rakietowych',
     """Licznik wyniku do tenisa, padla, pickleballa, tenisa stołowego, squasha i badmintona, plus rundy Americano w padlu. Przycisk lub dotknięcie twojej połowy ekranu dodaje punkt; RallyPal śledzi serwis i stronę, także w deblu, ogłasza piłki setowe, break pointy i meczowe oraz wibruje po gemie, secie i przy zmianie stron. Odliczanie przerwy, asy i podwójne błędy, strefy tętna, rekordy, historia i statystyki na zegarku i telefonie, opcjonalnie Strava i Intervals.icu. W 17 językach.

3 darmowe mecze, potem jednorazowo $2.99 przez KiezelPay. Bez subskrypcji.

Autor: Pavle (pavlemarinkovic.com)"""),
    ('10-cs-Czech', 'Skóre a podání pro raketové sporty',
     """Počítadlo skóre pro tenis, padel, pickleball, stolní tenis, squash a badminton, plus kola Americano v padelu. Tlačítko nebo klepnutí na vaši polovinu displeje přidá bod; RallyPal sleduje podání a stranu, i ve čtyřhře, hlásí setbol, brejkbol a mečbol a vibruje po gemu, setu a při výměně stran. Odpočet pauzy, esa a dvojchyby, tepové zóny, rekordy, historie a statistiky na hodinkách i v telefonu, volitelně Strava a Intervals.icu. V 17 jazycích.

3 zápasy zdarma, pak jednorázově $2.99 přes KiezelPay. Bez předplatného.

Autor: Pavle (pavlemarinkovic.com)"""),
    ('11-uk-Ukrainian', 'Рахунок і подача для ракеткового спорту',
     """Рахунок для тенісу, паделу, піклболу, настільного тенісу, сквошу та бадмінтону, а також раунди Americano в паделі. Кнопка або дотик до вашої половини екрана додає очко; RallyPal стежить за подачею і стороною, також у парі, оголошує сетбол, брейк-пойнт і матчбол та вібрує після гейму, сету й при зміні сторін. Відлік перерви, ейси та подвійні помилки, пульсові зони, рекорди, історія та статистика на годиннику й телефоні, за бажанням Strava та Intervals.icu. 17 мов.

3 безкоштовні матчі, потім одноразово $2.99 через KiezelPay. Без підписки.

Автор: Pavle (pavlemarinkovic.com)"""),
    ('12-ru-Russian', 'Счёт и подача для ракеточного спорта',
     """Счёт для тенниса, падела, пиклбола, настольного тенниса, сквоша и бадминтона, а также раунды Americano в паделе. Кнопка или касание вашей половины экрана добавляет очко; RallyPal следит за подачей и стороной, и в паре, объявляет сетбол, брейк-пойнт и матчбол и вибрирует после гейма, сета и при смене сторон. Отсчёт перерыва, эйсы и двойные ошибки, пульсовые зоны, рекорды, история и статистика на часах и телефоне, по желанию Strava и Intervals.icu. 17 языков.

3 бесплатных матча, затем разово $2.99 через KiezelPay. Без подписки.

Автор: Pavle (pavlemarinkovic.com)"""),
    ('13-sv-Swedish', 'Poäng, serve och sida för racketsport',
     """Poängräknare för tennis, padel, pickleball, bordtennis, squash och badminton, plus padel-Americano-rundor. En knapp eller ett tryck på din halva av skärmen ger poängen; RallyPal följer serven och sidan, även i dubbel, meddelar set-, break- och matchboll och vibrerar vid game, set och sidbyte. Nedräkning av vilan, ess och dubbelfel, pulszoner, rekord, historik och statistik på klocka och telefon, valfritt Strava och Intervals.icu. På 17 språk.

3 gratis matcher, sedan en engångsupplåsning för $2.99 via KiezelPay. Ingen prenumeration.

Skapad av Pavle (pavlemarinkovic.com)"""),
    ('14-nb-Norwegian', 'Poeng, serve og side for racketsport',
     """Poengteller for tennis, padel, pickleball, bordtennis, squash og badminton, pluss padel-Americano-runder. En knapp eller et trykk på din halvdel av skjermen gir poenget; RallyPal følger serven og siden, også i double, melder sett-, break- og matchball og vibrerer ved game, sett og sidebytte. Nedtelling av pausen, ess og dobbeltfeil, pulssoner, rekorder, historikk og statistikk på klokke og telefon, valgfritt Strava og Intervals.icu. På 17 språk.

3 gratis kamper, deretter en engangsopplåsing for $2.99 via KiezelPay. Ingen abonnement.

Laget av Pavle (pavlemarinkovic.com)"""),
    ('15-da-Danish', 'Point, serv og side til ketchersport',
     """Pointtæller til tennis, padel, pickleball, bordtennis, squash og badminton, plus padel-Americano-runder. En knap eller et tryk på din halvdel af skærmen giver pointet; RallyPal følger serven og siden, også i double, melder sæt-, break- og matchbold og vibrerer ved partier, sæt og sideskift. Nedtælling af pausen, es og dobbeltfejl, pulszoner, rekorder, historik og statistik på ur og telefon, valgfrit Strava og Intervals.icu. På 17 sprog.

3 gratis kampe, derefter en engangsoplåsning for $2.99 via KiezelPay. Intet abonnement.

Lavet af Pavle (pavlemarinkovic.com)"""),
    ('16-fi-Finnish', 'Pisteet ja syöttö mailapeleihin',
     """Pistelasku tennikseen, padeliin, pickleballiin, pöytätennikseen, squashiin ja sulkapalloon sekä padelin Americano-kierrokset. Painike tai napautus omaan näytön puoliskoon antaa pisteen; RallyPal seuraa syöttöä ja puolta, myös nelinpelissä, ilmoittaa erä-, break- ja ottelupallot ja värisee peleissä, erissä ja puolenvaihdoissa. Taukolaskuri, ässät ja kaksoisvirheet, sykealueet, ennätykset, historia ja tilastot kellossa ja puhelimessa, valinnaisesti Strava ja Intervals.icu. 17 kieltä.

3 ilmaista ottelua, sitten kertamaksu $2.99 KiezelPayllä. Ei tilausta.

Tekijä: Pavle (pavlemarinkovic.com)"""),
    ('17-ja-Japanese', 'ラケットスポーツのスコアとサーブ',
     """テニス、パデル、ピックルボール、卓球、スカッシュ、バドミントンのスコアを記録。パデルのアメリカーノにも対応。ボタンか、画面の自分側のタップで得点。ダブルスでもサーブとサイドを追い、セットポイント、ブレークポイント、マッチポイントを表示し、ゲーム、セット、コートチェンジで振動します。休憩のカウントダウン、エースとダブルフォルト、心拍ゾーン、記録、ウォッチとスマホの履歴と統計、Strava と Intervals.icu への同期（任意）。17言語対応。

3試合まで無料、その後 KiezelPay で $2.99 の買い切り。サブスクリプションなし。

作成: Pavle (pavlemarinkovic.com)"""),
]

PRIVACY = """RallyPal Privacy Statement (November 2026)

RallyPal keeps score for racket sports on Zepp OS watches. It is made by Pavle Marinković (pavlemarinkovic.com).

What the app uses
- Heart rate: shown during a match and saved with it, with the time in each heart rate zone.
- Age from your Zepp profile: to work out the heart rate zones (unless you set your own maximum).
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

Contact: pavle019@live.com"""

FEATURES = """Score keeper for racket sports. On the first start three questions set it up (sport, singles or doubles, points by tap or by keys only). On the start screen pick a setup (sport and rules), tap NEW MATCH and choose who serves first, or start from a score already on the board. In a match the upper half of the screen or the upper key gives the opponent a point, the lower half or the lower key gives you one; UNDO and MENU are in the middle. RallyPal shows CHANGE ENDS, counts down the rest the rules allow and, if turned on in Settings, adds FAULT and ACE buttons under the score in tennis and padel (after a fault: 2ND SERVE and DOUBLE FAULT). The match ends by the rules or from the menu, and a summary follows. History (with records and heart rate zones), stats and settings are on the watch and on the app's settings page in the Zepp app, where a match can also be added by hand.

Payment: free download with 3 free matches (a match counts from 5 minutes). Then a one-time $2.99 unlock through KiezelPay: the watch shows a code and a QR code, the user pays at kzl.io/code and the watch unlocks by itself. Strava and Intervals.icu sync are optional."""

OTHERS = 'Device ID (free trial count, sent only as a one-way hash), age from the user profile (heart rate zones).'
SDK = 'No third-party SDK is bundled. The purchase status is checked over KiezelPay\'s web API.'


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text + '\n')


def main():
    problems = []
    for folder, intro, details in LANGS:
        if len(intro) > 40:
            problems.append(f'{folder}: introduction {len(intro)} > 40')
        if len(details) > 596:
            problems.append(f'{folder}: details {len(details)} > 596 (the limit is 600)')
        write(os.path.join(OUT, folder, '1-app-name.txt'), 'RallyPal')
        write(os.path.join(OUT, folder, '2-app-introduction.txt'), intro)
        write(os.path.join(OUT, folder, '3-app-details.txt'), details)
        # a first release has no New Version Introduction
        old = os.path.join(OUT, folder, '4-new-version-introduction.txt')
        if os.path.exists(old):
            os.remove(old)
        print(f'{folder}: introduction {len(intro)}, details {len(details)}')
    if len(PRIVACY) > 2000:
        problems.append(f'privacy {len(PRIVACY)} > 2000')
    if len(FEATURES) > 2000:
        problems.append(f'features {len(FEATURES)} > 2000')
    common = os.path.join(OUT, '00-common')
    write(os.path.join(common, 'privacy.txt'), PRIVACY)
    write(os.path.join(common, 'features-descriptions.txt'), FEATURES)
    write(os.path.join(common, 'call-permission-others.txt'), OTHERS)
    write(os.path.join(common, 'sdk.txt'), SDK)
    print(f'privacy {len(PRIVACY)}, features {len(FEATURES)}')
    if problems:
        raise SystemExit('\n'.join(problems))


if __name__ == '__main__':
    main()
