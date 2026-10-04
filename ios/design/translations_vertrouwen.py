# Trust moments, plain error texts and honest empty states (onderzoek/gevoel-animatie §3.3, §3.4, §3.8, §5).
# Order per key: English, French, Spanish. The Dutch key is the source.
T = {
    # --- errors: never the system's technical text ---
    "Dat lukte even niet. Controleer je verbinding en probeer het opnieuw.": (
        "That didn't work just now. Check your connection and try again.",
        "Ça n'a pas marché pour l'instant. Vérifie ta connexion et réessaie.",
        "No ha funcionado ahora mismo. Comprueba tu conexión e inténtalo de nuevo."),
    "Er ging iets mis aan onze kant. Probeer het zo nog eens.": (
        "Something went wrong on our side. Please try again in a moment.",
        "Un problème est survenu de notre côté. Réessaie dans un instant.",
        "Algo ha fallado por nuestra parte. Vuelve a intentarlo en un momento."),
    # --- status labels ---
    "Afgesproken": ("Confirmed", "Confirmée", "Confirmada"),
    "Gelopen": ("Walked", "Terminée", "Completada"),
    # --- request sent ---
    "de eigenaar": ("the owner", "le propriétaire", "el dueño"),
    "Verstuurd naar %@.": ("Sent to %@.", "Envoyé à %@.", "Enviado a %@."),
    "Wat er nu gebeurt": ("What happens now", "Et maintenant", "Qué pasa ahora"),
    "%@ leest je bericht.": ("%@ reads your message.", "%@ lit ton message.", "%@ lee tu mensaje."),
    "Jullie spreken een moment af.": (
        "You agree on a moment together.",
        "Vous convenez ensemble d'un moment.",
        "Acordáis un momento juntos."),
    "De eerste keer lopen jullie samen.": (
        "The first time, you walk together.",
        "La première fois, vous marchez ensemble.",
        "La primera vez, paseáis juntos."),
    "De eerste keer kom je langs bij %@ en %@.": (
        "The first time, you visit %1$@ and %2$@.",
        "La première fois, tu passes voir %1$@ et %2$@.",
        "La primera vez, visitas a %1$@ y a %2$@."),
    "Eerst bellen jullie. Daarna ontmoet je %@ in het echt.": (
        "First you have a call. Then you meet %@ in person.",
        "D'abord, vous vous appelez. Ensuite, tu rencontres %@ en vrai.",
        "Primero habláis por teléfono. Después conoces a %@ en persona."),
    "Zegt %@ ja, dan staat het rondje vast.": (
        "If %@ says yes, the walk is set.",
        "Si %@ dit oui, la balade est confirmée.",
        "Si %@ dice que sí, el paseo queda confirmado."),
    "Op de dag zelf start je het rondje bij Afspraken.": (
        "On the day itself, you start the walk in Appointments.",
        "Le jour même, tu lances la balade dans Rendez-vous.",
        "El mismo día, empiezas el paseo en Citas."),
    "Je krijgt een melding zodra %@ antwoordt.": (
        "You'll get a notification as soon as %@ replies.",
        "Tu reçois une notification dès que %@ répond.",
        "Recibirás un aviso en cuanto %@ responda."),
    # --- accepted ---
    "Jullie zien elkaars contactgegevens nu.": (
        "You can now see each other's contact details.",
        "Vous voyez maintenant vos coordonnées respectives.",
        "Ahora podéis ver vuestros datos de contacto."),
    # --- trust ladder ---
    "Kennismaking": ("Meeting", "Rencontre", "Encuentro"),
    "Mag zelfstandig": ("May walk alone", "Peut promener seul·e", "Puede pasear por su cuenta"),
    "%@ mag nu zelfstandig met %@ op pad.": (
        "%1$@ may now walk %2$@ on their own.",
        "%1$@ peut maintenant promener %2$@ seul·e.",
        "%1$@ ya puede pasear a %2$@ por su cuenta."),
    "Je kijkt bij elk rondje live mee, en je kunt dit altijd weer uitzetten.": (
        "You follow every walk live, and you can always switch this off again.",
        "Tu suis chaque balade en direct, et tu peux toujours retirer cette permission.",
        "Sigues cada paseo en directo y siempre puedes volver a desactivarlo."),
    "Je hebt het ID van %@ gezien.": (
        "You've seen %@'s ID.",
        "Tu as vu la pièce d'identité de %@.",
        "Has visto el documento de %@."),
    "Zelfstandig wandelen kun je later altijd nog toestaan.": (
        "You can always allow walks on their own later.",
        "Tu pourras toujours autoriser les balades en solo plus tard.",
        "Siempre puedes permitir paseos por su cuenta más adelante."),
    "Jullie lopen voorlopig samen.": (
        "For now, you walk together.",
        "Pour l'instant, vous marchez ensemble.",
        "Por ahora, paseáis juntos."),
    # --- walk done, level ---
    "%@ en jij zijn samen op pad geweest. Dank je wel.": (
        "%@ and you went out together. Thank you.",
        "%@ et toi êtes sortis ensemble. Merci.",
        "%@ y tú habéis salido juntos. Gracias."),
    "Nieuw level": ("New level", "Nouveau niveau", "Nuevo nivel"),
    "Nieuw level: %@!": ("New level: %@!", "Nouveau niveau : %@ !", "¡Nuevo nivel: %@!"),
    "Hoogste level. Wat een rondjes!": (
        "Highest level. What a lot of walks!",
        "Niveau maximal. Quelle collection de balades !",
        "Nivel máximo. ¡Cuántos paseos!"),
    "Jouw level": ("Your level", "Ton niveau", "Tu nivel"),
    "Jouw level en badges": ("Your level and badges", "Ton niveau et tes badges", "Tu nivel e insignias"),
    # --- intro, onboarding ---
    "Even naar buiten": ("A moment outside", "Un moment dehors", "Un rato fuera"),
    "Een vaste afspraak, en een hond die blij is dat je komt. Gratis en zonder reclame.": (
        "A regular appointment, and a dog who's happy you came. Free and without ads.",
        "Un rendez-vous régulier, et un chien heureux de te voir arriver. Gratuit et sans pub.",
        "Una cita fija y un perro que se alegra de verte llegar. Gratis y sin anuncios."),
    "Laat me de honden zien": ("Show me the dogs", "Montre-moi les chiens", "Enséñame los perros"),
    # --- Discover: honest empty states ---
    "We zijn hier net begonnen. Ken je iemand wiens hond vaker naar buiten wil? Stuur je link, of tip een opvang.": (
        "We've only just started here. Know someone whose dog would like to go out more? Send your link, or suggest a shelter.",
        "Nous venons de commencer ici. Tu connais quelqu'un dont le chien aimerait sortir plus souvent ? Envoie ton lien ou suggère un refuge.",
        "Acabamos de empezar aquí. ¿Conoces a alguien cuyo perro querría salir más? Envía tu enlace o sugiere un refugio."),
    "Ken je %@? Iemand uit de buurt loopt gratis een rondje met je hond. De eerste keer lopen jullie samen.": (
        "Do you know %@? Someone from the neighbourhood walks your dog for free. The first time, you walk together.",
        "Tu connais %@ ? Quelqu'un du quartier promène ton chien gratuitement. La première fois, vous marchez ensemble.",
        "¿Conoces %@? Alguien del barrio pasea a tu perro gratis. La primera vez, paseáis juntos."),
    "Stuur je link": ("Send your link", "Envoyer ton lien", "Enviar tu enlace"),
    "Tip een opvang": ("Suggest a shelter", "Suggérer un refuge", "Sugerir un refugio"),
    "Geen honden gevonden": ("No dogs found", "Aucun chien trouvé", "No se han encontrado perros"),
    "Met dit filter of deze zoekterm is er nu geen hond.": (
        "There's no dog with this filter or search right now.",
        "Aucun chien pour ce filtre ou cette recherche pour l'instant.",
        "Ahora no hay ningún perro con este filtro o esta búsqueda."),
    "Toon alle honden": ("Show all dogs", "Voir tous les chiens", "Ver todos los perros"),
}
