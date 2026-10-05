-- Example dogs tell about the dog, not about their made-up owner: no name, health or days at home (DPIA maatregel M18; src/db/seed.ts has the same new texts). Data only, no schema change. A row only changes when it is an example dog (is_demo), its id is one of the example dogs, and the text is still exactly the old example text: a real dog, and an example text someone edited, stay as they are. Safe to run twice: the second time nothing matches the old text any more.
UPDATE "dog" SET "story" = "v"."new_text"
FROM (VALUES
	('demo-saar', 'Ans loopt sinds haar nieuwe heup alleen nog kleine stukjes. Saar is gewend aan lange rondjes langs de Singel en mist ze.', 'Saar is gewend aan lange rondjes langs de Singel en mist ze. Ze is rustig, trekt nooit en blijft graag even staan bij de eendjes.'),
	('demo-pip', 'Henk heeft COPD. Een blokje om lukt nog, het park niet meer. Pip kijkt elke middag naar de deur.', 'Pip is een rustige oude teckel met een grote neus. Het park is zijn favoriete rondje, en elke duif krijgt een blafje.'),
	('demo-tess', 'Marian is midden in een chemokuur en te moe om Tess uit te laten. Een vaste wandelaar geeft rust.', 'Tess is een vriendelijke golden retriever die iedereen begroet. Ze zwemt graag en is blij met een vaste wandelaar.'),
	('demo-bolle', 'Paul loopt met een rollator. Het rondje naar het Citadelpark lukt niet meer, het praatje na afloop mist hij het meest.', 'Bolle is een gezellige Franse bulldog. Het Citadelpark is zijn lievelingsrondje, en een aai van een voorbijganger vindt hij het allermooist.'),
	('demo-luna', 'Carmen ya no puede seguir el ritmo de Luna. En el Retiro, Luna es feliz con una pelota.', 'Luna tiene energía de sobra y aprende rápido. En el Retiro es feliz con una pelota.')
) AS "v"("id", "old_text", "new_text")
WHERE "dog"."id" = "v"."id" AND "dog"."is_demo" = true AND "dog"."story" = "v"."old_text";
--> statement-breakpoint
UPDATE "dog" SET "needs" = "v"."new_text"
FROM (VALUES
	('demo-saar', 'Twee extra rondjes per week houden Saar fit tot Ans weer verder kan lopen.', 'Twee extra rondjes per week houden Saar fit en vrolijk.'),
	('demo-tess', 'Voor een paar maanden, op dinsdag en vrijdag.', 'Voor een paar maanden, twee keer per week.')
) AS "v"("id", "old_text", "new_text")
WHERE "dog"."id" = "v"."id" AND "dog"."is_demo" = true AND "dog"."needs" = "v"."old_text";
