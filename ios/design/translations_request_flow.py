# Request-flow unit: ready-made requests, chat replies and the homecoming card.
# Dutch key -> (English, French, Spanish). Guus keeps his name everywhere.
T = {
    # The hello and its sentences
    "Hoi! Ik ben %@.": ("Hi! I'm %@.", "Salut ! Je suis %@.", "¡Hola! Soy %@."),
    "Hoi! Ik ben %@ uit %@.": ("Hi! I'm %1$@ from %2$@.", "Salut ! Je suis %1$@, de %2$@.", "¡Hola! Soy %1$@, de %2$@."),
    "Ik heb nog geen ervaring met honden, maar ik leer graag.": (
        "I don't have experience with dogs yet, but I'm happy to learn.",
        "Je n'ai pas encore d'expérience avec les chiens, mais j'apprends volontiers.",
        "Todavía no tengo experiencia con perros, pero me encanta aprender."),
    "Ik heb veel ervaring met honden.": ("I have lots of experience with dogs.", "J'ai beaucoup d'expérience avec les chiens.", "Tengo mucha experiencia con perros."),
    "Ik heb wat ervaring met honden.": ("I have some experience with dogs.", "J'ai un peu d'expérience avec les chiens.", "Tengo algo de experiencia con perros."),
    "Ik zou %@ graag leren kennen.": ("I'd love to meet %@.", "J'aimerais beaucoup rencontrer %@.", "Me encantaría conocer a %@."),
    "Zin om weer samen op pad te gaan!": ("Looking forward to heading out together again!", "J'ai hâte de repartir ensemble !", "¡Con ganas de salir juntos otra vez!"),
    "Ik kan meestal 's avonds.": ("I'm usually free in the evening.", "Je suis souvent libre le soir.", "Normalmente puedo por la tarde-noche."),
    "Ik kan meestal overdag.": ("I'm usually free during the day.", "Je suis souvent libre en journée.", "Normalmente puedo durante el día."),
    "Ik ben student.": ("I'm a student.", "Je suis étudiant·e.", "Soy estudiante."),
    "Ik had vroeger zelf een hond.": ("I used to have a dog myself.", "J'avais moi-même un chien avant.", "Antes tenía un perro."),
    "Ik wandel graag in het park.": ("I like walking in the park.", "J'aime me promener au parc.", "Me gusta pasear por el parque."),
    "Ik neem mijn ID mee.": ("I'll bring my ID.", "J'apporte ma pièce d'identité.", "Llevaré mi documento de identidad."),

    # Chat replies and thanks
    "Leuk! Wanneer kun je kennismaken?": ("Nice! When can you come and meet?", "Super ! Quand peux-tu venir faire connaissance ?", "¡Genial! ¿Cuándo puedes venir a conocernos?"),
    "Dank je! Ik kijk even in mijn agenda.": ("Thanks! Let me check my calendar.", "Merci ! Je regarde mon agenda.", "¡Gracias! Miro mi agenda."),
    "Leuk, tot dan!": ("Great, see you then!", "Super, à bientôt !", "¡Genial, hasta entonces!"),
    "Neem je je ID mee?": ("Will you bring your ID?", "Tu apportes ta pièce d'identité ?", "¿Traerás tu documento de identidad?"),
    "Ik sta bij de voordeur.": ("I'll be at the front door.", "Je serai à la porte d'entrée.", "Estaré en la puerta de entrada."),
    "Dank je wel!": ("Thank you!", "Merci beaucoup !", "¡Muchas gracias!"),
    "%@ ligt heerlijk te slapen.": ("%@ is fast asleep.", "%@ dort à poings fermés.", "%@ está durmiendo a gusto."),
    "Tot volgende week!": ("See you next week!", "À la semaine prochaine !", "¡Hasta la semana que viene!"),
    "Ik kan ook op een ander moment.": ("Another time works for me too.", "Un autre moment me va aussi.", "También puedo en otro momento."),
    "Ik ben er over 5 minuten.": ("I'll be there in 5 minutes.", "J'arrive dans 5 minutes.", "Llego en 5 minutos."),
    "Dank je wel voor het vertrouwen!": ("Thanks for trusting me!", "Merci pour ta confiance !", "¡Gracias por la confianza!"),
    "%@ was een schatje.": ("%@ was a sweetheart.", "%@ a été adorable.", "%@ ha sido un encanto."),
    "Daar knapt %@ van op.": ("%@ really enjoyed that.", "Ça a fait du bien à %@.", "A %@ le ha sentado de maravilla."),

    # Rebook
    "Zin om vaker samen te gaan? Elke %@ om %@?": (
        "Fancy walking together more often? Every %@ at %@?",
        "Envie de vous promener plus souvent ensemble ? Chaque %@ à %@ ?",
        "¿Te apetece pasear juntos más a menudo? ¿Cada %@ a las %@?"),
    "Je kunt nu geen nieuwe afspraak maken met %@.": ("You can't make a new appointment with %@ right now.", "Tu ne peux pas prendre de nouveau rendez-vous avec %@ pour le moment.", "Ahora no puedes hacer una nueva cita con %@."),
    "Je kunt nu geen nieuwe afspraak maken.": ("You can't make a new appointment right now.", "Tu ne peux pas prendre de nouveau rendez-vous pour le moment.", "Ahora no puedes hacer una nueva cita."),

    # The three steps
    "Stap %lld van 3": ("Step %lld of 3", "Étape %lld sur 3", "Paso %lld de 3"),
    "Wanneer?": ("When?", "Quand ?", "¿Cuándo?"),
    "Kies een moment. De eigenaar loopt de eerste keer mee.": (
        "Pick a moment. The owner comes along the first time.",
        "Choisis un moment. Le propriétaire vient avec toi la première fois.",
        "Elige un momento. El dueño te acompaña la primera vez."),
    "Kies een moment dat je vaak kunt. Vaste momenten werken het best.": (
        "Pick a moment you can often make. Regular times work best.",
        "Choisis un moment où tu es souvent libre. Les moments fixes marchent le mieux.",
        "Elige un momento en el que sueles poder. Los horarios fijos funcionan mejor."),
    "Vast moment van %@": ("%@'s regular time", "Moment habituel de %@", "Hora habitual de %@"),
    "Ander moment": ("Another time", "Autre moment", "Otro momento"),
    "Stel je voor": ("Introduce yourself", "Présente-toi", "Preséntate"),
    "Tik om toe te voegen": ("Tap to add", "Touche pour ajouter", "Toca para añadir"),
    "Afspraak is afspraak": ("A promise is a promise", "Promis, c'est promis", "Lo prometido es deuda"),
    "Geen koekjes zonder toestemming": ("No treats without permission", "Pas de friandises sans permission", "Nada de premios sin permiso"),
    "Meteen melden als er iets gebeurt": ("Report right away if something happens", "Signaler tout de suite s'il se passe quelque chose", "Avisar enseguida si pasa algo"),
    "Neem je ID mee. De eigenaar bekijkt het.": ("Bring your ID. The owner will check it.", "Apporte ta pièce d'identité. Le propriétaire la vérifiera.", "Lleva tu documento de identidad. El dueño lo revisará."),
    "Lees de hele gedragscode": ("Read the full code of conduct", "Lire tout le code de conduite", "Lee el código de conducta completo"),
    "Elke week": ("Every week", "Chaque semaine", "Cada semana"),
    "Moment aanpassen": ("Change time", "Modifier le moment", "Cambiar el momento"),
    "Bericht aanpassen": ("Change message", "Modifier le message", "Cambiar el mensaje"),
    "Nog geen bericht": ("No message yet", "Pas encore de message", "Aún no hay mensaje"),
    "Aanpassen": ("Change", "Modifier", "Cambiar"),
    "Ik beloof het, verstuur": ("I promise, send it", "Promis, envoyer", "Lo prometo, enviar"),

    # Sent
    "Verstuurd!": ("Sent!", "Envoyé !", "¡Enviado!"),
    "Intussen kun je de Hondenschool doen. Vijf lessen van 2 minuten.": (
        "Meanwhile you can do the Dog School. Five 2-minute lessons.",
        "En attendant, tu peux suivre l'École des chiens. Cinq leçons de 2 minutes.",
        "Mientras tanto puedes hacer la Escuela de perros. Cinco lecciones de 2 minutos."),
    "Naar de Hondenschool": ("Go to Dog School", "Aller à l'École des chiens", "Ir a la Escuela de perros"),

    # Homecoming card
    "%@ is weer thuis!": ("%@ is home again!", "%@ est de retour à la maison !", "¡%@ ya está en casa!"),
    "Met %@": ("With %@", "Avec %@", "Con %@"),
    "Verstuurd naar %@": ("Sent to %@", "Envoyé à %@", "Enviado a %@"),
    "Bedank %@": ("Thank %@", "Remercier %@", "Dar las gracias a %@"),
    "Zelf iets schrijven": ("Write something yourself", "Écrire toi-même", "Escribir algo tú"),
}
