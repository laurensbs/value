# "Help ons" under Jij: one row that opens the crowdfunding page (Whydonate) in the browser.
# The same words as the website's app shell (helpApp in web/messages), with "tu" in French like the
# rest of the app. Neutral in every language, never like buying something: "Support us via" in
# English (not "Buy a round"), "Ayúdanos vía", "Aide-nous via". Dutch keeps "Geef een rondje" and the
# goal in rondjes ("Doel: 600 rondjes", Dutch only and so not in the catalog: HelpUs.swift). The other
# languages name the goal in euros and say "From €5": nothing may read like a price per walk
# (no "€5 = 1 round", no "600 rounds"; Laurens, 5 okt 2026).
# Order: English, French, Spanish.
T = {
    "Help ons via %@": ("Support us via %@", "Aide-nous via %@", "Ayúdanos vía %@"),
    "Opent %@ in je browser": ("Opens %@ in your browser", "Ouvre %@ dans ton navigateur", "Abre %@ en tu navegador"),
    "Geef een rondje vanaf %@": ("From %@", "Dès %@", "Desde %@"),
    "Geef een rondje vanaf %@ · %@ van %@": (
        "From %1$@ · %2$@ of %3$@",
        "Dès %1$@ · %2$@ sur %3$@",
        "Desde %1$@ · %2$@ de %3$@"),
    "Geef een rondje vanaf %@ · Doel: %@": (
        "From %1$@ · Goal: %2$@",
        "Dès %1$@ · Objectif : %2$@",
        "Desde %1$@ · Objetivo: %2$@"),
}
