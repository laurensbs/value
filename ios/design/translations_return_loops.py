# Return-loops unit: calm opt-in seintjes and the week recap. Dutch key -> (English, French, Spanish).
# "Seintje" is a gentle reminder; Guus keeps his name everywhere.
T = {
    # Seintjes (settings)
    "Seintjes": ("Nudges", "Petits rappels", "Avisos"),
    "Aan": ("On", "Activé", "Activado"),
    "Uit": ("Off", "Désactivé", "Desactivado"),
    "Ik stuur je alleen een seintje op een moment dat jij kiest. Hooguit zo vaak als jij wilt.": (
        "I only nudge you at a moment you choose. Never more often than you want.",
        "Je t'envoie un petit rappel seulement au moment que tu choisis. Jamais plus souvent que tu ne veux.",
        "Solo te aviso en el momento que tú elijas. Nunca más a menudo de lo que quieras."),
    "Seintjes van Guus": ("Nudges from Guus", "Petits rappels de Guus", "Avisos de Guus"),
    "Meldingen staan uit in Instellingen.": (
        "Notifications are off in Settings.",
        "Les notifications sont désactivées dans Réglages.",
        "Las notificaciones están desactivadas en Ajustes."),
    "Open Instellingen": ("Open Settings", "Ouvrir Réglages", "Abrir Ajustes"),
    "Op welke dagen?": ("On which days?", "Quels jours ?", "¿Qué días?"),
    "Kies er hooguit drie.": ("Pick up to three.", "Choisis-en trois au maximum.", "Elige tres como máximo."),
    "Ma": ("Mo", "Lu", "Lu"),
    "Di": ("Tu", "Ma", "Ma"),
    "Wo": ("We", "Me", "Mi"),
    "Do": ("Th", "Je", "Ju"),
    "Vr": ("Fr", "Ve", "Vi"),
    "Za": ("Sa", "Sa", "Sá"),
    "Zo": ("Su", "Di", "Do"),
    "Hoe laat?": ("What time?", "À quelle heure ?", "¿A qué hora?"),
    "Ochtend 9:00": ("Morning 9:00", "Matin 9:00", "Mañana 9:00"),
    "Middag 13:00": ("Afternoon 13:00", "Midi 13:00", "Mediodía 13:00"),
    "Avond 18:30": ("Evening 18:30", "Soir 18:30", "Tarde 18:30"),
    "Ander tijdstip": ("Another time", "Autre heure", "Otra hora"),
    "Tijdstip": ("Time", "Heure", "Hora"),
    "Tussen half tien 's avonds en half negen 's ochtends stuurt Guus nooit iets.": (
        "Between 9:30 in the evening and 8:30 in the morning, Guus never sends anything.",
        "Entre 21 h 30 et 8 h 30, Guus n'envoie jamais rien.",
        "Entre las 21:30 y las 8:30, Guus nunca envía nada."),
    "Hooguit 1, 2 of 3 per week": ("At most 1, 2 or 3 a week", "Au maximum 1, 2 ou 3 par semaine", "Como máximo 1, 2 o 3 por semana"),
    "Even pauze": ("Take a break", "Petite pause", "Una pausa"),
    "1 week": ("1 week", "1 semaine", "1 semana"),
    "2 weken": ("2 weeks", "2 semaines", "2 semanas"),
    "Tot ik ze weer aanzet": ("Until I turn them back on", "Jusqu'à ce que je les réactive", "Hasta que los vuelva a activar"),
    "Hervat": ("Resume", "Reprendre", "Reanudar"),
    "Gepauzeerd tot %@": ("Paused until %@", "En pause jusqu'au %@", "En pausa hasta el %@"),
    "Gepauzeerd tot je ze weer aanzet": ("Paused until you turn them back on", "En pause jusqu'à ce que tu les réactives", "En pausa hasta que los vuelvas a activar"),
    "Volgende seintje: %@ %@": ("Next nudge: %@ %@", "Prochain rappel : %@ %@", "Próximo aviso: %@ %@"),
    "Er staat geen seintje gepland. Je hebt al een afspraak deze week, of je seintjes staan uit.": (
        "No nudge is planned. You already have an appointment this week, or your nudges are off.",
        "Aucun rappel n'est prévu. Tu as déjà un rendez-vous cette semaine, ou tes rappels sont désactivés.",
        "No hay ningún aviso previsto. Ya tienes una cita esta semana, o tus avisos están desactivados."),
    "Kies een dag, dan plant Guus een seintje.": (
        "Pick a day and Guus will plan a nudge.",
        "Choisis un jour et Guus prévoit un petit rappel.",
        "Elige un día y Guus programará un aviso."),
    "Seintjes worden op je telefoon ingepland. Er gaat niets via een server. Afspraak-herinneringen tellen niet mee.": (
        "Nudges are planned on your phone. Nothing goes through a server. Appointment reminders don't count.",
        "Les rappels sont programmés sur ton téléphone. Rien ne passe par un serveur. Les rappels de rendez-vous ne comptent pas.",
        "Los avisos se programan en tu teléfono. Nada pasa por un servidor. Los recordatorios de citas no cuentan."),

    # Seintjes (notifications)
    "Een rondje deze week?": ("A walk this week?", "Une balade cette semaine ?", "¿Un paseo esta semana?"),
    "Zin in een rondje met %@? Je kunt het de eigenaar vragen.": (
        "Fancy a walk with %@? You can ask the owner.",
        "Envie d'une balade avec %@ ? Tu peux le demander au propriétaire.",
        "¿Te apetece un paseo con %@? Puedes pedírselo al dueño."),
    "Even naar buiten?": ("Time for some fresh air?", "Un petit tour dehors ?", "¿Salimos un rato?"),
    "%@ woont bij jou in de buurt. %@, %lld minuten.": (
        "%@ lives near you. %@, %lld minutes.",
        "%@ habite près de chez toi. %@, %lld minutes.",
        "%@ vive cerca de ti. %@, %lld minutos."),
    "Er wonen honden bij jou in de buurt. Kijk wie er mee wil.": (
        "There are dogs living near you. See who wants to come along.",
        "Des chiens habitent près de chez toi. Regarde qui veut venir.",
        "Hay perros que viven cerca de ti. Mira quién quiere venir."),
    "Minder seintjes": ("Fewer nudges", "Moins de rappels", "Menos avisos"),

    # Offer and stop notice on Ontdek
    "Wil je een rustig seintje op een vast moment? Jij kiest wanneer.": (
        "Would you like a calm nudge at a set moment? You choose when.",
        "Tu veux un petit rappel tranquille à un moment fixe ? C'est toi qui choisis quand.",
        "¿Quieres un aviso tranquilo en un momento fijo? Tú eliges cuándo."),
    "Kies een moment": ("Pick a moment", "Choisir un moment", "Elegir un momento"),
    "Nee, dank je": ("No, thanks", "Non, merci", "No, gracias"),
    "Ik stuur je even geen seintjes meer. Aanzetten kan altijd bij Jij, Seintjes.": (
        "I'll stop sending nudges for now. You can always turn them on in You, Nudges.",
        "Je n'envoie plus de rappels pour l'instant. Tu peux toujours les réactiver dans Toi, Petits rappels.",
        "Dejo de enviarte avisos por ahora. Siempre puedes activarlos en Tú, Avisos."),
    "Oké": ("OK", "D'accord", "Vale"),

    # Week recap
    "Jouw week: 1 rondje met %@.": ("Your week: 1 walk with %@.", "Ta semaine : 1 balade avec %@.", "Tu semana: 1 paseo con %@."),
    "Jouw week: %lld rondjes, samen %@, met %@.": (
        "Your week: %lld walks, %@ in total, with %@.",
        "Ta semaine : %lld balades, %@ au total, avec %@.",
        "Tu semana: %lld paseos, %@ en total, con %@."),
    "Jouw week: %lld rondjes met %@.": ("Your week: %lld walks with %@.", "Ta semaine : %lld balades avec %@.", "Tu semana: %lld paseos con %@."),
    "Na je rondjes voelde je je beter. Alleen jij ziet dit.": (
        "You felt better after your walks. Only you can see this.",
        "Tu te sentais mieux après tes balades. Toi seul vois ceci.",
        "Te sentiste mejor después de tus paseos. Solo tú ves esto."),
    "Je wandelde al in %lld verschillende weken.": (
        "You've walked in %lld different weeks.",
        "Tu as déjà marché pendant %lld semaines différentes.",
        "Ya has paseado en %lld semanas distintas."),
    "%@ ging %lld keer extra naar buiten, met %@.": (
        "%@ got out %lld extra times, with %@.",
        "%@ est sorti %lld fois de plus, avec %@.",
        "%@ salió %lld veces más, con %@."),
    "%@ ging %lld keer extra naar buiten.": (
        "%@ got out %lld extra times.",
        "%@ est sorti %lld fois de plus.",
        "%@ salió %lld veces más."),
    "Volgende week weer met %@?": ("Again with %@ next week?", "À nouveau avec %@ la semaine prochaine ?", "¿Otra vez con %@ la semana que viene?"),
    "Fijn": ("Lovely", "Super", "Genial"),
    "Je seintjes staan even op pauze.": ("Your nudges are paused for now.", "Tes petits rappels sont en pause pour l'instant.", "Tus avisos están en pausa por ahora."),
    "Jouw week: %@ ging %lld keer extra naar buiten, met %@.": (
        "Your week: %@ got out %lld extra times, with %@.",
        "Ta semaine : %@ est sorti %lld fois de plus, avec %@.",
        "Tu semana: %@ salió %lld veces más, con %@."),
    "Jouw week: %@ ging %lld keer extra naar buiten.": (
        "Your week: %@ got out %lld extra times.",
        "Ta semaine : %@ est sorti %lld fois de plus.",
        "Tu semana: %@ salió %lld veces más."),
}
