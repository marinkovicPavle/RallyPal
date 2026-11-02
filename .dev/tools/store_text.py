# Store texts for the Zepp console (phase 7), one folder per language plus the common ones, with the
# console's limits checked: App Introduction 40, App Details 600, Privacy Statement 2000 characters.
# Usage: python3 .dev/tools/store_text.py   (writes docs/store/text/)

import os

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(root, 'docs', 'store', 'text')

LANGS = [
    ('01-en-English', 'Racket sports score, serve and side',
     """Score keeper for tennis, padel, pickleball, table tennis, squash and badminton, plus padel Americano rounds. A key or a tap on your half of the screen scores the point; RallyPal follows the serve and the side, also in doubles, calls set, break and match points and vibrates on games and sets. Heart rate, summary after every match, history on the watch and phone, stats, optional Strava and Intervals.icu sync.

3 free matches, then a one-time $2.99 unlock via KiezelPay: the watch shows a code, pay at kzl.io/code. No subscription.

Created by Pavle (pavlemarinkovic.com)"""),
    ('02-sr-Serbian', 'Rezultat i servis za reket sportove',
     """Vodi rezultat u tenisu, padelu, pikleballu, stonom tenisu, skvošu i badmintonu, plus Americano kola u padelu. Poen se upisuje tasterom ili tapom na svoju polovinu ekrana; RallyPal prati servis i stranu, i u dublu, najavljuje set, brejk i meč loptu i vibrira na gem i set. Puls, rezime posle svakog meča, istorija na satu i telefonu, statistika, po želji slanje na Stravu i Intervals.icu.

3 besplatna meča, pa jednokratno otključavanje za $2.99 preko KiezelPay-a: sat pokaže kod, plaća se na kzl.io/code. Bez pretplate.

Autor: Pavle (pavlemarinkovic.com)"""),
    ('03-es-Spanish', 'Marcador, saque y lado para raqueta',
     """Marcador para tenis, pádel, pickleball, tenis de mesa, squash y bádminton, además de rondas Americano de pádel. Una tecla o un toque en tu mitad de la pantalla suma el punto; RallyPal sigue el saque y el lado, también en dobles, anuncia set, break y match point y vibra en cada juego y set. Pulso, resumen tras cada partido, historial en el reloj y el teléfono, estadísticas, envío opcional a Strava e Intervals.icu.

3 partidos gratis y luego un desbloqueo único de $2.99 con KiezelPay: el reloj muestra un código, se paga en kzl.io/code. Sin suscripción.

Creado por Pavle (pavlemarinkovic.com)"""),
    ('04-it-Italian', 'Punteggio e servizio per la racchetta',
     """Segnapunti per tennis, padel, pickleball, tennis tavolo, squash e badminton, più i turni Americano del padel. Un tasto o un tocco sulla tua metà dello schermo segna il punto; RallyPal segue servizio e lato, anche in doppio, annuncia set point, palla break e match point e vibra a ogni game e set. Battito, riepilogo dopo ogni partita, storico su orologio e telefono, statistiche, invio facoltativo a Strava e Intervals.icu.

3 partite gratis, poi sblocco unico a $2.99 con KiezelPay: l'orologio mostra un codice, si paga su kzl.io/code. Nessun abbonamento.

Creato da Pavle (pavlemarinkovic.com)"""),
    ('05-de-German', 'Spielstand, Aufschlag und Seite',
     """Zählt Punkte in Tennis, Padel, Pickleball, Tischtennis, Squash und Badminton, dazu Padel-Americano-Runden. Eine Taste oder ein Tipp auf deine Bildschirmhälfte zählt den Punkt; RallyPal folgt Aufschlag und Seite, auch im Doppel, sagt Satz-, Break- und Matchball an und vibriert bei Spiel und Satz. Puls, Zusammenfassung nach jedem Match, Verlauf auf Uhr und Handy, Statistik, optional Strava und Intervals.icu.

3 Gratis-Matches, dann einmalig $2.99 über KiezelPay: Die Uhr zeigt einen Code, bezahlt wird auf kzl.io/code. Kein Abo.

Von Pavle (pavlemarinkovic.com)"""),
    ('06-fr-French', 'Score, service et côté pour la raquette',
     """Score pour tennis, padel, pickleball, tennis de table, squash et badminton, plus les tours Americano en padel. Une touche ou un appui sur votre moitié d'écran marque le point ; RallyPal suit le service et le côté, aussi en double, annonce les balles de set, break et match et vibre à chaque jeu et set. Pouls, résumé après chaque match, historique sur montre et téléphone, stats, envoi optionnel à Strava et Intervals.icu.

3 matchs gratuits, puis déblocage unique à 2,99 $ via KiezelPay : la montre affiche un code, paiement sur kzl.io/code. Sans abonnement.

Créé par Pavle (pavlemarinkovic.com)"""),
    ('07-pt-Portuguese', 'Placar, saque e lado para raquete',
     """Placar para tênis, padel, pickleball, tênis de mesa, squash e badminton, além de rodadas Americano de padel. Uma tecla ou um toque na sua metade da tela marca o ponto; o RallyPal segue o saque e o lado, também em duplas, anuncia set point, break point e match point e vibra a cada game e set. Pulso, resumo após cada partida, histórico no relógio e no celular, estatísticas, envio opcional ao Strava e Intervals.icu.

3 partidas grátis, depois desbloqueio único de US$ 2,99 via KiezelPay: o relógio mostra um código, pague em kzl.io/code. Sem assinatura.

Criado por Pavle (pavlemarinkovic.com)"""),
]

PRIVACY = """RallyPal Privacy Statement (November 2026, version 2.0)

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

FEATURES = """Score keeper for racket sports. On the start screen pick a setup (sport and rules), tap NEW MATCH and choose who serves first. In a match the upper half of the screen or the upper key gives the opponent a point, the lower half or the lower key gives you one; UNDO and MENU are in the middle. The match ends by the rules or from the menu, and a summary follows. History and settings are on the watch and on the app's settings page in the Zepp app.

Payment: free download with 3 free matches (a match counts from 5 minutes). Then a one-time $2.99 unlock through KiezelPay: the watch shows a code, the user pays at kzl.io/code and the watch unlocks by itself. Strava and Intervals.icu sync are optional."""

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
        if len(details) > 600:
            problems.append(f'{folder}: details {len(details)} > 600')
        write(os.path.join(OUT, folder, '1-app-name.txt'), 'RallyPal')
        write(os.path.join(OUT, folder, '2-app-introduction.txt'), intro)
        write(os.path.join(OUT, folder, '3-app-details.txt'), details)
        print(f'{folder}: introduction {len(intro)}, details {len(details)}')
    if len(PRIVACY) > 2000:
        problems.append(f'privacy {len(PRIVACY)} > 2000')
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
