# Changed terms (terms art. 19) and the live-location switch (LIVE_LOCATION). The same words as the
# website (termsUpdate, walk.together and request.reasons in web/messages, branch claude/voorwaarden-opnieuw),
# with "tu" in French like the rest of the app. Calm: no countdown, no "nog maar", nothing that hurries.
# Honest: never "until then everything stays as it was" (some changes describe how it already works).
# Order: English, French, Spanish.
T = {
    # The sheet and the notice under Jij.
    "De voorwaarden zijn bijgewerkt": ("The terms have been updated", "Les conditions ont été mises à jour", "Hemos actualizado las condiciones"),
    "Lees in rust wat er verandert. De nieuwe voorwaarden gelden voor jou vanaf %@. Vanaf dan vragen we eerst je akkoord, voordat je iets nieuws afspreekt of een rondje start.": (
        "Take your time to read what changes. The new terms apply to you from %@. From then on, we ask for your agreement first, before you arrange something new or start a walk.",
        "Prends le temps de lire ce qui change. Les nouvelles conditions s'appliquent pour toi à partir du %@. Dès lors, nous te demandons d'abord ton accord, avant de convenir de quelque chose de nouveau ou de commencer une balade.",
        "Lee con calma lo que cambia. Las nuevas condiciones se aplican para ti a partir del %@. A partir de entonces, te pedimos primero tu aceptación, antes de quedar para algo nuevo o empezar un paseo."),
    "De nieuwe voorwaarden gelden sinds %@. Lees wat er verandert. Na je akkoord kun je weer afspraken maken en rondjes starten.": (
        "The new terms have applied since %@. Read what changes. Once you agree, you can make appointments and start walks again.",
        "Les nouvelles conditions s'appliquent depuis le %@. Lis ce qui change. Une fois que tu les acceptes, tu peux à nouveau prendre rendez-vous et commencer des balades.",
        "Las nuevas condiciones se aplican desde el %@. Lee lo que cambia. Cuando las aceptes, podrás volver a quedar y empezar paseos."),
    "Lees wat er verandert. Na je akkoord kun je weer afspraken maken en rondjes starten.": (
        "Read what changes. Once you agree, you can make appointments and start walks again.",
        "Lis ce qui change. Une fois que tu les acceptes, tu peux à nouveau prendre rendez-vous et commencer des balades.",
        "Lee lo que cambia. Cuando las aceptes, podrás volver a quedar y empezar paseos."),
    "Lees in rust wat er verandert.": ("Take your time to read what changes.", "Prends le temps de lire ce qui change.", "Lee con calma lo que cambia."),
    "Voor jou gelden ze vanaf %@. Vanaf dan vragen we eerst je akkoord, voordat je iets nieuws afspreekt of een rondje start.": (
        "For you, they apply from %@. From then on, we ask for your agreement first, before you arrange something new or start a walk.",
        "Pour toi, elles s'appliquent à partir du %@. Dès lors, nous te demandons d'abord ton accord, avant de convenir de quelque chose de nouveau ou de commencer une balade.",
        "Para ti, se aplican a partir del %@. A partir de entonces, te pedimos primero tu aceptación, antes de quedar para algo nuevo o empezar un paseo."),
    "Na je akkoord kun je weer afspraken maken en rondjes starten.": (
        "Once you agree, you can make appointments and start walks again.",
        "Une fois que tu les acceptes, tu peux à nouveau prendre rendez-vous et commencer des balades.",
        "Cuando las aceptes, podrás volver a quedar y empezar paseos."),
    "Lees wat er verandert": ("Read what changes", "Lire ce qui change", "Leer qué cambia"),
    "Lees de volledige voorwaarden": ("Read the full terms", "Lire les conditions complètes", "Leer las condiciones completas"),
    "Opent de website in je browser": ("Opens the website in your browser", "Ouvre le site dans ton navigateur", "Abre la web en tu navegador"),
    "Niet akkoord? Je kunt je account altijd verwijderen onder Jij (artikel 19 van de voorwaarden).": (
        "Don't agree? You can always delete your account in the You tab (article 19 of the terms).",
        "Tu n'es pas d'accord ? Tu peux toujours supprimer ton compte dans l'onglet Toi (article 19 des conditions).",
        "¿No estás de acuerdo? Siempre puedes eliminar tu cuenta en la pestaña Tú (artículo 19 de las condiciones)."),
    "Akkoord": ("I agree", "J'accepte", "Acepto"),
    "Dank je. Je akkoord is opgeslagen.": ("Thank you. Your agreement has been saved.", "Merci. Ton accord est enregistré.", "Gracias. Hemos guardado tu aceptación."),
    "Je hebt de nieuwste voorwaarden al geaccepteerd.": (
        "You have already agreed to the latest terms.",
        "Tu as déjà accepté les dernières conditions.",
        "Ya has aceptado las condiciones más recientes."),
    "Eerst graag je akkoord met de bijgewerkte voorwaarden.": (
        "Please agree to the updated terms first.",
        "Merci d'accepter d'abord les conditions mises à jour.",
        "Primero acepta las condiciones actualizadas, por favor."),
    # No list of changes on screen: no "Akkoord" either.
    "We konden de wijzigingen nu niet laden. Probeer het later nog eens.": (
        "We couldn't load the changes just now. Please try again later.",
        "Nous n'avons pas pu charger les changements pour l'instant. Réessaie plus tard.",
        "No hemos podido cargar los cambios ahora. Inténtalo de nuevo más tarde."),

    # Live location switched off on the server.
    "Live locatie staat uit": ("Live location is off", "Localisation en direct désactivée", "Ubicación en directo desactivada"),
    "Je route wordt niet bijgehouden of gedeeld. De tijd, het rondje-rapport en foto's werken gewoon.": (
        "Your route is not tracked or shared. The time, the walk report and photos work as usual.",
        "Ton trajet n'est ni suivi ni partagé. Le temps, le compte rendu de la balade et les photos fonctionnent comme d'habitude.",
        "Tu recorrido no se registra ni se comparte. El tiempo, el informe del paseo y las fotos funcionan como siempre."),
    "Live locatie staat op dit moment uit, dus hier staat geen kaart. Je ziet wel de tijd, het rondje-rapport en de foto's.": (
        "Live location is off for now, so there is no map here. You still see the time, the walk report and the photos.",
        "La localisation en direct est désactivée pour le moment, il n'y a donc pas de carte ici. Tu vois quand même le temps, le compte rendu de la balade et les photos.",
        "La ubicación en directo está desactivada por ahora, así que aquí no hay mapa. Sí ves el tiempo, el informe del paseo y las fotos."),
    "Live locatie staat voorlopig uit, dus een rondje alleen met de hond start nog niet. Samen met de eigenaar lopen kan wel.": (
        "Live location is off for now, so a walk alone with the dog doesn't start yet. Walking together with the owner is possible.",
        "La localisation en direct est désactivée pour le moment, donc une balade seul avec le chien ne démarre pas encore. Se promener avec le propriétaire reste possible.",
        "La ubicación en directo está desactivada por ahora, así que todavía no empieza un paseo a solas con el perro. Pasear junto con el dueño sí es posible."),
    "Live locatie staat op dit moment uit: je telefoon deelt tijdens dit rondje geen locatie.": (
        "Live location is off for now: your phone does not share your location during this walk.",
        "La localisation en direct est désactivée pour le moment : ton téléphone ne partage pas ta position pendant cette balade.",
        "La ubicación en directo está desactivada por ahora: tu móvil no comparte tu ubicación durante este paseo."),

    # A first meeting never shares a location (web lib/rules.ts walkHasLiveLocation, walk.together).
    "Jullie lopen samen, dus er is geen kaart nodig.": (
        "You're walking together, so there's no need for a map.",
        "Vous vous promenez ensemble, donc pas besoin de carte.",
        "Paseáis juntos, así que no hace falta mapa."),
    # The same, short, on the Lock Screen.
    "Jullie lopen samen": ("You're walking together", "Vous vous promenez ensemble", "Paseáis juntos"),
}
