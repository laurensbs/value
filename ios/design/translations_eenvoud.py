# A calmer app: groups under Jij, a small first-steps row, numbers in one line. Order: English, French, Spanish.
T = {
    "%lld van %lld · Volgende: %@": ("%1$lld of %2$lld · Next: %3$@", "%1$lld sur %2$lld · Ensuite : %3$@", "%1$lld de %2$lld · Siguiente: %3$@"),
    "Open": ("Open", "Ouvert", "Abierto"),
    "Dicht": ("Closed", "Fermé", "Cerrado"),
    "Nodig uit": ("Invite", "Inviter", "Invitar"),
    "Wandelen": ("Walking", "Promenades", "Paseos"),
    "Instellingen": ("Settings", "Réglages", "Ajustes"),
    "Account": ("Account", "Compte", "Cuenta"),
    "1 rondje": ("1 walk", "1 balade", "1 paseo"),
    "%lld rondjes": ("%lld walks", "%lld balades", "%lld paseos"),
    "%lld× ID gezien": ("ID seen %lld×", "Pièce d'identité vue %lld×", "Documento visto %lld×"),
    "sinds %@": ("since %@", "depuis %@", "desde %@"),
}
T["1 badge"] = ("1 badge", "1 badge", "1 insignia")
# Ronde 2: Ontdek with a List | Map switch.
T["Lijst"] = ("List", "Liste", "Lista")
T["Kaart"] = ("Map", "Carte", "Mapa")
T["Opent de pagina van %@"] = ("Opens %@'s page", "Ouvre la page de %@", "Abre la página de %@")
# Ronde 2: the safety quiz right after the account, one question at a time, before any request.
T.update({
    "%lld van %lld goed": ("%1$lld of %2$lld right", "%1$lld sur %2$lld justes", "%1$lld de %2$lld bien"),
    "Acht korte vragen over veilig wandelen, ongeveer 3 minuten. Na elke vraag leg ik uit waarom. Geen tijdsdruk.": (
        "Eight short questions about walking safely, about 3 minutes. After each one I explain why. No time pressure.",
        "Huit petites questions sur la promenade en sécurité, environ 3 minutes. Après chacune, je t'explique pourquoi. Pas de chrono.",
        "Ocho preguntas cortas sobre pasear con seguridad, unos 3 minutos. Después de cada una te explico por qué. Sin prisas."),
    "Acht korte vragen over veilig wandelen. Daarna vraag je %@ meteen aan.": (
        "Eight short questions about walking safely. Then you can ask for %@ right away.",
        "Huit petites questions sur la promenade en sécurité. Ensuite, tu peux demander %@ tout de suite.",
        "Ocho preguntas cortas sobre pasear con seguridad. Después puedes pedir a %@ enseguida."),
    "Acht korte vragen. Nodig voor elke aanvraag.": (
        "Eight short questions. Needed for every request.",
        "Huit petites questions. Nécessaire pour chaque demande.",
        "Ocho preguntas cortas. Necesario para cada solicitud."),
    "Nodig voor elke aanvraag": ("Needed for every request", "Nécessaire pour chaque demande", "Necesario para cada solicitud"),
    "Controleer": ("Check", "Vérifier", "Comprobar"),
    "Daarna kun je een kennismaking aanvragen.": (
        "Then you can ask to meet a dog.",
        "Ensuite, tu peux demander une rencontre.",
        "Después puedes pedir un encuentro."),
    "Deze kwam net al langs. Nog een keer?": (
        "You saw this one a moment ago. Once more?",
        "Tu l'as déjà vue il y a un instant. On réessaie ?",
        "Esta ya salió hace un momento. ¿Otra vez?"),
    "Deze vraag komt zo nog een keer terug.": (
        "This question will come back once more in a moment.",
        "Cette question reviendra encore une fois tout à l'heure.",
        "Esta pregunta volverá a salir en un momento."),
    "Eerst de quiz": ("Quiz first", "D'abord le quiz", "Primero el test"),
    "Eerst de quiz (± 3 min)": ("Quiz first (± 3 min)", "D'abord le quiz (± 3 min)", "Primero el test (± 3 min)"),
    "Eerst de veiligheidsquiz": ("First, the safety quiz", "D'abord le quiz de sécurité", "Primero, el test de seguridad"),
    "Eerst de veiligheidsquiz, dan kun je een hond aanvragen. Acht vragen, geen tijdsdruk.": (
        "First the safety quiz, then you can ask for a dog. Eight questions, no time pressure.",
        "D'abord le quiz de sécurité, ensuite tu peux demander un chien. Huit questions, pas de chrono.",
        "Primero el test de seguridad, después puedes pedir un perro. Ocho preguntas, sin prisas."),
    "Goed zo!": ("Well done!", "Bravo !", "¡Muy bien!"),
    "Net niet.": ("Not quite.", "Pas tout à fait.", "Casi."),
    "Je kunt nu een kennismaking aanvragen. Zelfstandige rondjes komen later, als een eigenaar je vertrouwt.": (
        "You can now ask to meet a dog. Walks on your own come later, once an owner trusts you.",
        "Tu peux maintenant demander une rencontre. Les balades en solo viendront plus tard, quand un propriétaire te fera confiance.",
        "Ya puedes pedir un encuentro. Los paseos por tu cuenta llegan más tarde, cuando un dueño confíe en ti."),
    "Nog één ding: de veiligheidsquiz": ("One more thing: the safety quiz", "Encore une chose : le quiz de sécurité", "Una cosa más: el test de seguridad"),
    "Voordat je een hond aanvraagt, doe je één keer de veiligheidsquiz.": (
        "Before you ask for a dog, you do the safety quiz once.",
        "Avant de demander un chien, tu fais une fois le quiz de sécurité.",
        "Antes de pedir un perro, haces una vez el test de seguridad."),
    # Why each answer is right (QuizExplanation).
    "Bij warmte loop je kort, in de schaduw en met water. Voel met je hand of de stoep niet te heet is voor zijn pootjes.": (
        "When it's hot, keep it short, in the shade and with water. Feel with your hand whether the pavement is too hot for its paws.",
        "Quand il fait chaud, fais court, à l'ombre et avec de l'eau. Vérifie avec ta main que le trottoir n'est pas trop chaud pour ses pattes.",
        "Con calor, paseo corto, a la sombra y con agua. Comprueba con la mano que el suelo no queme sus patas."),
    "De hond blijft aan de lijn, tenzij de eigenaar uitdrukkelijk zegt dat hij los mag, en alleen waar het mag.": (
        "The dog stays on the lead, unless the owner clearly says it may go off, and only where that's allowed.",
        "Le chien reste en laisse, sauf si le propriétaire dit clairement qu'il peut être lâché, et seulement là où c'est permis.",
        "El perro va con correa, salvo que el dueño diga claramente que puede ir suelto, y solo donde está permitido."),
    "Geef alleen een koekje als het profiel van de hond zegt dat het mag. Sommige honden mogen niets extra's.": (
        "Only give a treat if the dog's profile says it's allowed. Some dogs may not have anything extra.",
        "Ne donne une friandise que si le profil du chien le permet. Certains chiens ne doivent rien avoir en plus.",
        "Da una golosina solo si el perfil del perro lo permite. Algunos perros no pueden tomar nada extra."),
    "Houd afstand en vraag de andere eigenaar eerst. Twijfel je, loop dan rustig door.": (
        "Keep your distance and ask the other owner first. If in doubt, calmly walk on.",
        "Garde tes distances et demande d'abord à l'autre propriétaire. Dans le doute, continue tranquillement.",
        "Mantén la distancia y pregunta primero al otro dueño. Si dudas, sigue caminando con calma."),
    "Blijf rustig en ren niet achter de hond aan. Bel meteen de eigenaar: samen vind je hem sneller.": (
        "Stay calm and don't run after the dog. Call the owner straight away: together you'll find it sooner.",
        "Reste calme et ne cours pas après le chien. Appelle tout de suite le propriétaire : à deux, vous le trouverez plus vite.",
        "Mantén la calma y no corras detrás del perro. Llama enseguida al dueño: juntos lo encontraréis antes."),
    "Zorg eerst dat iedereen veilig is. Wissel gegevens uit, bel de eigenaar en meld het in de app.": (
        "First make sure everyone is safe. Exchange details, call the owner and report it in the app.",
        "Assure-toi d'abord que tout le monde est en sécurité. Échangez vos coordonnées, appelle le propriétaire et signale-le dans l'app.",
        "Primero asegúrate de que todos estén bien. Intercambiad datos, llama al dueño y avisa en la app."),
    "Veel gapen, lippen likken en wegtrekken betekent: ik voel me niet op mijn gemak. Zoek een rustigere plek.": (
        "Lots of yawning, lip licking and pulling away means: I don't feel at ease. Find a quieter spot.",
        "Bâiller souvent, se lécher les babines et tirer pour s'éloigner veut dire : je ne suis pas à l'aise. Cherche un endroit plus calme.",
        "Bostezar mucho, lamerse los labios y tirar hacia atrás significa: no estoy a gusto. Busca un sitio más tranquilo."),
    "Laat het de eigenaar meteen weten als je later terug bent. Een kort berichtje geeft rust.": (
        "Let the owner know right away if you'll be back later. A short message puts their mind at rest.",
        "Préviens tout de suite le propriétaire si tu rentres plus tard. Un petit message le rassure.",
        "Avisa enseguida al dueño si vas a volver más tarde. Un mensaje corto le tranquiliza."),
})
