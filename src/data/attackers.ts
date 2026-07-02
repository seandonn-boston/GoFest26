/**
 * ATTACKERS — the premier Pokémon GO raid attackers, by attacking type.
 *
 * This is the "best attackers of their type" data (à la DialgaDex's Attacker
 * Rankings, June 2026 meta) that the counter engine cross-references against a
 * boss's dual-type weaknesses (see domain/counters.ts) to pick the best picks.
 *
 * Each entry is one *form* (e.g. "Mega Tyranitar", "Shadow Tyranitar" and
 * "Tyranitar" are three separate entries — all viable, all may appear on the
 * same boss). `attacks` maps each attacking type the form is a premier user of
 * to an approximate effective-DPS rating; the engine multiplies that by the
 * boss's type-effectiveness so a glass cannon hitting a double weakness sorts
 * above a stronger mon that's only neutral.
 *
 * `category` buckets the form for the four per-card lists:
 *   - mega:      Mega / Primal Evolutions
 *   - shadow:    Shadow forms
 *   - legendary: Legendary / Mythical / Ultra Beast (non-mega, non-shadow)
 *   - regular:   everything else
 *
 * `species` is the final-evolution search term (no Mega/Shadow/Forme prefix)
 * used for the combined copy/paste counter search string.
 */

export type PType =
  | "Normal"
  | "Fire"
  | "Water"
  | "Grass"
  | "Electric"
  | "Ice"
  | "Fighting"
  | "Poison"
  | "Ground"
  | "Flying"
  | "Psychic"
  | "Bug"
  | "Rock"
  | "Ghost"
  | "Dragon"
  | "Dark"
  | "Steel"
  | "Fairy";

export type AttackerCategory = "mega" | "shadow" | "legendary" | "regular";

export interface Attacker {
  /** Display name, e.g. "Shadow Tyranitar", "Origin Forme Giratina". */
  name: string;
  /** Final-evolution search term (no prefix/forme), e.g. "Tyranitar", "Giratina". */
  species: string;
  category: AttackerCategory;
  /** Attacking type → approximate effective DPS when using that type's moves. */
  attacks: Partial<Record<PType, number>>;
}

export const ATTACKERS: Attacker[] = [
  // ============================ MEGAS / PRIMALS ============================
  { name: "Mega Charizard Y", species: "Charizard", category: "mega", attacks: { Fire: 18.0 } },
  { name: "Mega Charizard X", species: "Charizard", category: "mega", attacks: { Fire: 16.8, Dragon: 15.5 } },
  { name: "Mega Blaziken", species: "Blaziken", category: "mega", attacks: { Fire: 17.5, Fighting: 17.8 } },
  { name: "Mega Houndoom", species: "Houndoom", category: "mega", attacks: { Fire: 16.0, Dark: 16.2 } },
  { name: "Mega Camerupt", species: "Camerupt", category: "mega", attacks: { Fire: 15.0, Ground: 15.5 } },
  { name: "Primal Kyogre", species: "Kyogre", category: "mega", attacks: { Water: 21.0 } },
  { name: "Mega Swampert", species: "Swampert", category: "mega", attacks: { Water: 18.0, Ground: 16.0 } },
  { name: "Mega Gyarados", species: "Gyarados", category: "mega", attacks: { Water: 15.5, Dark: 16.0 } },
  { name: "Mega Blastoise", species: "Blastoise", category: "mega", attacks: { Water: 16.0 } },
  { name: "Mega Sceptile", species: "Sceptile", category: "mega", attacks: { Grass: 17.5 } },
  { name: "Mega Venusaur", species: "Venusaur", category: "mega", attacks: { Grass: 15.5, Poison: 14.5 } },
  { name: "Mega Abomasnow", species: "Abomasnow", category: "mega", attacks: { Grass: 14.5, Ice: 14.8 } },
  { name: "Mega Manectric", species: "Manectric", category: "mega", attacks: { Electric: 16.5 } },
  { name: "Mega Ampharos", species: "Ampharos", category: "mega", attacks: { Electric: 15.8 } },
  { name: "Mega Glalie", species: "Glalie", category: "mega", attacks: { Ice: 15.5 } },
  { name: "Mega Lucario", species: "Lucario", category: "mega", attacks: { Fighting: 18.0, Steel: 16.0 } },
  { name: "Mega Heracross", species: "Heracross", category: "mega", attacks: { Fighting: 17.0, Bug: 18.5 } },
  { name: "Mega Gallade", species: "Gallade", category: "mega", attacks: { Fighting: 16.5, Psychic: 15.0 } },
  { name: "Mega Gengar", species: "Gengar", category: "mega", attacks: { Ghost: 19.0, Poison: 17.5 } },
  { name: "Mega Beedrill", species: "Beedrill", category: "mega", attacks: { Bug: 16.0, Poison: 15.0 } },
  { name: "Primal Groudon", species: "Groudon", category: "mega", attacks: { Ground: 20.0 } },
  { name: "Mega Garchomp", species: "Garchomp", category: "mega", attacks: { Ground: 17.5, Dragon: 18.0 } },
  { name: "Mega Rayquaza", species: "Rayquaza", category: "mega", attacks: { Flying: 20.0, Dragon: 21.0 } },
  { name: "Mega Salamence", species: "Salamence", category: "mega", attacks: { Flying: 17.5, Dragon: 18.5 } },
  { name: "Mega Pinsir", species: "Pinsir", category: "mega", attacks: { Flying: 16.5, Bug: 17.0 } },
  { name: "Mega Pidgeot", species: "Pidgeot", category: "mega", attacks: { Flying: 16.0 } },
  { name: "Mega Aerodactyl", species: "Aerodactyl", category: "mega", attacks: { Rock: 16.5, Flying: 15.5 } },
  { name: "Mega Mewtwo Y", species: "Mewtwo", category: "mega", attacks: { Psychic: 21.0 } },
  { name: "Mega Mewtwo X", species: "Mewtwo", category: "mega", attacks: { Psychic: 19.5, Fighting: 19.0 } },
  { name: "Mega Alakazam", species: "Alakazam", category: "mega", attacks: { Psychic: 18.0 } },
  { name: "Mega Gardevoir", species: "Gardevoir", category: "mega", attacks: { Fairy: 17.0, Psychic: 16.0 } },
  { name: "Mega Latios", species: "Latios", category: "mega", attacks: { Dragon: 17.5, Psychic: 17.5 } },
  { name: "Mega Metagross", species: "Metagross", category: "mega", attacks: { Steel: 18.0, Psychic: 17.0 } },
  { name: "Mega Scizor", species: "Scizor", category: "mega", attacks: { Bug: 15.0, Steel: 15.5 } },
  { name: "Mega Aggron", species: "Aggron", category: "mega", attacks: { Steel: 16.5 } },
  { name: "Mega Tyranitar", species: "Tyranitar", category: "mega", attacks: { Rock: 16.0, Dark: 17.0 } },
  { name: "Mega Diancie", species: "Diancie", category: "mega", attacks: { Rock: 15.5, Fairy: 16.0 } },
  { name: "Mega Absol", species: "Absol", category: "mega", attacks: { Dark: 16.5 } },
  { name: "Mega Banette", species: "Banette", category: "mega", attacks: { Ghost: 16.0 } },

  // ================================ SHADOWS ================================
  { name: "Shadow Reshiram", species: "Reshiram", category: "shadow", attacks: { Fire: 18.8, Dragon: 18.0 } },
  { name: "Shadow Moltres", species: "Moltres", category: "shadow", attacks: { Fire: 17.6, Flying: 16.5 } },
  { name: "Shadow Chandelure", species: "Chandelure", category: "shadow", attacks: { Fire: 16.2, Ghost: 18.5 } },
  { name: "Shadow Charizard", species: "Charizard", category: "shadow", attacks: { Fire: 16.4, Flying: 14.0 } },
  { name: "Shadow Entei", species: "Entei", category: "shadow", attacks: { Fire: 16.0 } },
  { name: "Shadow Kyogre", species: "Kyogre", category: "shadow", attacks: { Water: 19.5 } },
  { name: "Shadow Swampert", species: "Swampert", category: "shadow", attacks: { Water: 16.5, Ground: 15.0 } },
  { name: "Shadow Feraligatr", species: "Feraligatr", category: "shadow", attacks: { Water: 15.5 } },
  { name: "Shadow Empoleon", species: "Empoleon", category: "shadow", attacks: { Water: 15.0, Steel: 13.5 } },
  { name: "Shadow Gyarados", species: "Gyarados", category: "shadow", attacks: { Water: 14.5 } },
  { name: "Shadow Tangrowth", species: "Tangrowth", category: "shadow", attacks: { Grass: 14.5 } },
  { name: "Shadow Venusaur", species: "Venusaur", category: "shadow", attacks: { Grass: 14.2, Poison: 13.5 } },
  { name: "Shadow Torterra", species: "Torterra", category: "shadow", attacks: { Grass: 14.0, Ground: 13.0 } },
  { name: "Shadow Raikou", species: "Raikou", category: "shadow", attacks: { Electric: 17.0 } },
  { name: "Shadow Zapdos", species: "Zapdos", category: "shadow", attacks: { Electric: 16.2, Flying: 15.8 } },
  { name: "Shadow Electivire", species: "Electivire", category: "shadow", attacks: { Electric: 16.0 } },
  { name: "Shadow Magnezone", species: "Magnezone", category: "shadow", attacks: { Electric: 15.5, Steel: 15.0 } },
  { name: "Shadow Mamoswine", species: "Mamoswine", category: "shadow", attacks: { Ice: 17.0, Ground: 16.0 } },
  { name: "Shadow Articuno", species: "Articuno", category: "shadow", attacks: { Ice: 15.5, Flying: 14.0 } },
  { name: "Shadow Weavile", species: "Weavile", category: "shadow", attacks: { Ice: 15.0, Dark: 16.0 } },
  { name: "Shadow Glalie", species: "Glalie", category: "shadow", attacks: { Ice: 14.0 } },
  { name: "Shadow Machamp", species: "Machamp", category: "shadow", attacks: { Fighting: 16.5 } },
  { name: "Shadow Hariyama", species: "Hariyama", category: "shadow", attacks: { Fighting: 14.5 } },
  { name: "Shadow Gengar", species: "Gengar", category: "shadow", attacks: { Ghost: 18.0, Poison: 15.5 } },
  { name: "Shadow Nidoking", species: "Nidoking", category: "shadow", attacks: { Poison: 14.0, Ground: 13.0 } },
  { name: "Shadow Garchomp", species: "Garchomp", category: "shadow", attacks: { Ground: 16.5, Dragon: 17.0 } },
  { name: "Shadow Rhyperior", species: "Rhyperior", category: "shadow", attacks: { Ground: 16.0, Rock: 17.5 } },
  { name: "Shadow Excadrill", species: "Excadrill", category: "shadow", attacks: { Ground: 16.2, Steel: 15.5 } },
  { name: "Shadow Rampardos", species: "Rampardos", category: "shadow", attacks: { Rock: 18.5 } },
  { name: "Shadow Tyranitar", species: "Tyranitar", category: "shadow", attacks: { Rock: 16.5, Dark: 17.5 } },
  { name: "Shadow Aerodactyl", species: "Aerodactyl", category: "shadow", attacks: { Rock: 15.0, Flying: 14.0 } },
  { name: "Shadow Honchkrow", species: "Honchkrow", category: "shadow", attacks: { Flying: 14.5, Dark: 15.5 } },
  { name: "Shadow Staraptor", species: "Staraptor", category: "shadow", attacks: { Flying: 14.0 } },
  { name: "Shadow Salamence", species: "Salamence", category: "shadow", attacks: { Dragon: 18.0, Flying: 16.5 } },
  { name: "Shadow Rayquaza", species: "Rayquaza", category: "shadow", attacks: { Dragon: 19.5, Flying: 18.5 } },
  { name: "Shadow Dragonite", species: "Dragonite", category: "shadow", attacks: { Dragon: 17.5 } },
  { name: "Shadow Mewtwo", species: "Mewtwo", category: "shadow", attacks: { Psychic: 20.0 } },
  { name: "Shadow Alakazam", species: "Alakazam", category: "shadow", attacks: { Psychic: 17.0 } },
  { name: "Shadow Metagross", species: "Metagross", category: "shadow", attacks: { Psychic: 16.0, Steel: 17.0 } },
  { name: "Shadow Espeon", species: "Espeon", category: "shadow", attacks: { Psychic: 16.0 } },
  { name: "Shadow Gallade", species: "Gallade", category: "shadow", attacks: { Psychic: 15.0, Fighting: 15.5 } },
  { name: "Shadow Pinsir", species: "Pinsir", category: "shadow", attacks: { Bug: 15.0 } },
  { name: "Shadow Scizor", species: "Scizor", category: "shadow", attacks: { Bug: 14.0, Steel: 13.5 } },
  { name: "Shadow Gardevoir", species: "Gardevoir", category: "shadow", attacks: { Fairy: 16.0, Psychic: 15.5 } },
  { name: "Shadow Granbull", species: "Granbull", category: "shadow", attacks: { Fairy: 13.5 } },

  // ================== LEGENDARY / MYTHICAL / ULTRA BEAST ==================
  { name: "Reshiram", species: "Reshiram", category: "legendary", attacks: { Fire: 17.4, Dragon: 16.8 } },
  { name: "Blacephalon", species: "Blacephalon", category: "legendary", attacks: { Fire: 17.0, Ghost: 16.8 } },
  { name: "Moltres", species: "Moltres", category: "legendary", attacks: { Fire: 16.4, Flying: 15.8 } },
  { name: "Heatran", species: "Heatran", category: "legendary", attacks: { Fire: 16.0, Steel: 14.5 } },
  { name: "Entei", species: "Entei", category: "legendary", attacks: { Fire: 15.0 } },
  { name: "Ho-Oh", species: "Ho-Oh", category: "legendary", attacks: { Fire: 14.8, Flying: 15.0 } },
  { name: "Kyogre", species: "Kyogre", category: "legendary", attacks: { Water: 18.5 } },
  { name: "Origin Forme Palkia", species: "Palkia", category: "legendary", attacks: { Water: 17.2, Dragon: 17.4 } },
  { name: "Palkia", species: "Palkia", category: "legendary", attacks: { Water: 16.5, Dragon: 16.8 } },
  { name: "Suicune", species: "Suicune", category: "legendary", attacks: { Water: 14.5 } },
  { name: "Kartana", species: "Kartana", category: "legendary", attacks: { Grass: 18.0, Steel: 16.5 } },
  { name: "Tapu Bulu", species: "Tapu Bulu", category: "legendary", attacks: { Grass: 15.5, Fairy: 13.5 } },
  { name: "Zarude", species: "Zarude", category: "legendary", attacks: { Grass: 15.0, Dark: 14.5 } },
  { name: "Regieleki", species: "Regieleki", category: "legendary", attacks: { Electric: 18.5 } },
  { name: "Xurkitree", species: "Xurkitree", category: "legendary", attacks: { Electric: 17.5 } },
  { name: "Zeraora", species: "Zeraora", category: "legendary", attacks: { Electric: 16.8 } },
  { name: "Zekrom", species: "Zekrom", category: "legendary", attacks: { Electric: 16.5, Dragon: 17.0 } },
  { name: "Thundurus (Therian)", species: "Thundurus", category: "legendary", attacks: { Electric: 16.2, Flying: 14.0 } },
  { name: "Raikou", species: "Raikou", category: "legendary", attacks: { Electric: 16.0 } },
  { name: "Zapdos", species: "Zapdos", category: "legendary", attacks: { Electric: 15.5, Flying: 15.0 } },
  { name: "Kyurem", species: "Kyurem", category: "legendary", attacks: { Ice: 16.0, Dragon: 15.5 } },
  { name: "Articuno", species: "Articuno", category: "legendary", attacks: { Ice: 14.5, Flying: 13.5 } },
  { name: "Regice", species: "Regice", category: "legendary", attacks: { Ice: 14.0 } },
  { name: "Terrakion", species: "Terrakion", category: "legendary", attacks: { Fighting: 16.5, Rock: 16.8 } },
  { name: "Keldeo", species: "Keldeo", category: "legendary", attacks: { Fighting: 16.2, Water: 14.0 } },
  { name: "Zamazenta (Hero)", species: "Zamazenta", category: "legendary", attacks: { Fighting: 16.0 } },
  { name: "Virizion", species: "Virizion", category: "legendary", attacks: { Fighting: 14.2, Grass: 13.5 } },
  { name: "Cobalion", species: "Cobalion", category: "legendary", attacks: { Fighting: 14.0, Steel: 13.5 } },
  { name: "Naganadel", species: "Naganadel", category: "legendary", attacks: { Poison: 16.5, Dragon: 15.0 } },
  { name: "Groudon", species: "Groudon", category: "legendary", attacks: { Ground: 18.0 } },
  { name: "Landorus (Therian)", species: "Landorus", category: "legendary", attacks: { Ground: 17.0, Flying: 14.5 } },
  { name: "Rayquaza", species: "Rayquaza", category: "legendary", attacks: { Flying: 17.5, Dragon: 18.0 } },
  { name: "Tornadus (Therian)", species: "Tornadus", category: "legendary", attacks: { Flying: 16.0 } },
  { name: "Yveltal", species: "Yveltal", category: "legendary", attacks: { Flying: 14.5, Dark: 15.0 } },
  { name: "Mewtwo", species: "Mewtwo", category: "legendary", attacks: { Psychic: 18.5 } },
  { name: "Deoxys (Attack)", species: "Deoxys", category: "legendary", attacks: { Psychic: 16.5 } },
  { name: "Latios", species: "Latios", category: "legendary", attacks: { Psychic: 15.5, Dragon: 16.0 } },
  { name: "Necrozma", species: "Necrozma", category: "legendary", attacks: { Psychic: 15.0 } },
  { name: "Latias", species: "Latias", category: "legendary", attacks: { Psychic: 14.5, Dragon: 15.0 } },
  { name: "Lunala", species: "Lunala", category: "legendary", attacks: { Ghost: 16.0, Psychic: 14.0 } },
  { name: "Genesect", species: "Genesect", category: "legendary", attacks: { Bug: 16.0, Steel: 15.5 } },
  { name: "Pheromosa", species: "Pheromosa", category: "legendary", attacks: { Bug: 16.5, Fighting: 15.0 } },
  { name: "Buzzwole", species: "Buzzwole", category: "legendary", attacks: { Bug: 14.5, Fighting: 14.0 } },
  { name: "Origin Forme Giratina", species: "Giratina", category: "legendary", attacks: { Ghost: 17.0, Dragon: 16.0 } },
  { name: "Giratina (Altered)", species: "Giratina", category: "legendary", attacks: { Ghost: 13.5, Dragon: 14.0 } },
  { name: "Regidrago", species: "Regidrago", category: "legendary", attacks: { Dragon: 18.5 } },
  { name: "Origin Forme Dialga", species: "Dialga", category: "legendary", attacks: { Steel: 16.5, Dragon: 17.0 } },
  { name: "Dialga", species: "Dialga", category: "legendary", attacks: { Steel: 16.0, Dragon: 16.5 } },
  { name: "Jirachi", species: "Jirachi", category: "legendary", attacks: { Steel: 13.5, Psychic: 12.5 } },
  { name: "Darkrai", species: "Darkrai", category: "legendary", attacks: { Dark: 16.5 } },
  { name: "Xerneas", species: "Xerneas", category: "legendary", attacks: { Fairy: 16.5 } },
  { name: "Zacian (Hero)", species: "Zacian", category: "legendary", attacks: { Fairy: 16.0 } },
  { name: "Enamorus (Incarnate)", species: "Enamorus", category: "legendary", attacks: { Fairy: 15.5, Flying: 13.5 } },
  { name: "Tapu Lele", species: "Tapu Lele", category: "legendary", attacks: { Fairy: 14.5, Psychic: 14.0 } },
  { name: "Tapu Koko", species: "Tapu Koko", category: "legendary", attacks: { Fairy: 13.0, Electric: 13.5 } },

  // ================================ REGULARS ===============================
  { name: "Darmanitan", species: "Darmanitan", category: "regular", attacks: { Fire: 16.0 } },
  { name: "Chandelure", species: "Chandelure", category: "regular", attacks: { Fire: 15.8, Ghost: 16.5 } },
  { name: "Volcarona", species: "Volcarona", category: "regular", attacks: { Fire: 15.2, Bug: 15.0 } },
  { name: "Charizard", species: "Charizard", category: "regular", attacks: { Fire: 14.0, Flying: 13.5 } },
  { name: "Emboar", species: "Emboar", category: "regular", attacks: { Fire: 13.8, Fighting: 13.0 } },
  { name: "Typhlosion", species: "Typhlosion", category: "regular", attacks: { Fire: 13.6 } },
  { name: "Kingler", species: "Kingler", category: "regular", attacks: { Water: 15.0 } },
  { name: "Greninja", species: "Greninja", category: "regular", attacks: { Water: 14.2 } },
  { name: "Feraligatr", species: "Feraligatr", category: "regular", attacks: { Water: 14.0 } },
  { name: "Swampert", species: "Swampert", category: "regular", attacks: { Water: 13.8, Ground: 13.0 } },
  { name: "Gyarados", species: "Gyarados", category: "regular", attacks: { Water: 13.6 } },
  { name: "Empoleon", species: "Empoleon", category: "regular", attacks: { Water: 13.5, Steel: 12.5 } },
  { name: "Roserade", species: "Roserade", category: "regular", attacks: { Grass: 16.0, Poison: 16.2 } },
  { name: "Tangrowth", species: "Tangrowth", category: "regular", attacks: { Grass: 14.8 } },
  { name: "Sceptile", species: "Sceptile", category: "regular", attacks: { Grass: 14.0 } },
  { name: "Leafeon", species: "Leafeon", category: "regular", attacks: { Grass: 13.8 } },
  { name: "Venusaur", species: "Venusaur", category: "regular", attacks: { Grass: 13.5, Poison: 13.0 } },
  { name: "Torterra", species: "Torterra", category: "regular", attacks: { Grass: 13.4, Ground: 12.5 } },
  { name: "Electivire", species: "Electivire", category: "regular", attacks: { Electric: 14.5 } },
  { name: "Magnezone", species: "Magnezone", category: "regular", attacks: { Electric: 14.0, Steel: 13.5 } },
  { name: "Vikavolt", species: "Vikavolt", category: "regular", attacks: { Electric: 13.2, Bug: 13.5 } },
  { name: "Luxray", species: "Luxray", category: "regular", attacks: { Electric: 13.0 } },
  { name: "Raichu", species: "Raichu", category: "regular", attacks: { Electric: 13.0 } },
  { name: "Galarian Darmanitan", species: "Darmanitan", category: "regular", attacks: { Ice: 18.0 } },
  { name: "Mamoswine", species: "Mamoswine", category: "regular", attacks: { Ice: 16.5, Ground: 15.5 } },
  { name: "Glaceon", species: "Glaceon", category: "regular", attacks: { Ice: 14.8 } },
  { name: "Weavile", species: "Weavile", category: "regular", attacks: { Ice: 14.5, Dark: 15.0 } },
  { name: "Glalie", species: "Glalie", category: "regular", attacks: { Ice: 12.5 } },
  { name: "Conkeldurr", species: "Conkeldurr", category: "regular", attacks: { Fighting: 15.5 } },
  { name: "Annihilape", species: "Annihilape", category: "regular", attacks: { Fighting: 15.5, Ghost: 15.0 } },
  { name: "Machamp", species: "Machamp", category: "regular", attacks: { Fighting: 15.0 } },
  { name: "Lucario", species: "Lucario", category: "regular", attacks: { Fighting: 15.0, Steel: 14.5 } },
  { name: "Hariyama", species: "Hariyama", category: "regular", attacks: { Fighting: 13.5 } },
  { name: "Toxicroak", species: "Toxicroak", category: "regular", attacks: { Fighting: 13.0, Poison: 13.0 } },
  { name: "Gengar", species: "Gengar", category: "regular", attacks: { Ghost: 16.0, Poison: 14.5 } },
  { name: "Overqwil", species: "Overqwil", category: "regular", attacks: { Poison: 13.0, Dark: 12.5 } },
  { name: "Nidoking", species: "Nidoking", category: "regular", attacks: { Poison: 12.5, Ground: 12.5 } },
  { name: "Vileplume", species: "Vileplume", category: "regular", attacks: { Poison: 12.0, Grass: 12.0 } },
  { name: "Excadrill", species: "Excadrill", category: "regular", attacks: { Ground: 15.8, Steel: 14.5 } },
  { name: "Garchomp", species: "Garchomp", category: "regular", attacks: { Ground: 15.5, Dragon: 16.0 } },
  { name: "Rhyperior", species: "Rhyperior", category: "regular", attacks: { Ground: 15.0, Rock: 16.5 } },
  { name: "Krookodile", species: "Krookodile", category: "regular", attacks: { Ground: 13.0, Dark: 13.0 } },
  { name: "Rhydon", species: "Rhydon", category: "regular", attacks: { Ground: 12.5, Rock: 12.5 } },
  { name: "Salamence", species: "Salamence", category: "regular", attacks: { Flying: 15.5, Dragon: 16.0 } },
  { name: "Archeops", species: "Archeops", category: "regular", attacks: { Flying: 14.5, Rock: 14.0 } },
  { name: "Staraptor", species: "Staraptor", category: "regular", attacks: { Flying: 14.0 } },
  { name: "Honchkrow", species: "Honchkrow", category: "regular", attacks: { Flying: 13.5, Dark: 14.0 } },
  { name: "Braviary", species: "Braviary", category: "regular", attacks: { Flying: 13.0 } },
  { name: "Metagross", species: "Metagross", category: "regular", attacks: { Psychic: 15.0, Steel: 16.0 } },
  { name: "Alakazam", species: "Alakazam", category: "regular", attacks: { Psychic: 15.5 } },
  { name: "Espeon", species: "Espeon", category: "regular", attacks: { Psychic: 15.0 } },
  { name: "Gardevoir", species: "Gardevoir", category: "regular", attacks: { Psychic: 14.0, Fairy: 14.5 } },
  { name: "Gallade", species: "Gallade", category: "regular", attacks: { Psychic: 13.5, Fighting: 14.0 } },
  { name: "Pinsir", species: "Pinsir", category: "regular", attacks: { Bug: 14.5 } },
  { name: "Scizor", species: "Scizor", category: "regular", attacks: { Bug: 14.0, Steel: 13.0 } },
  { name: "Escavalier", species: "Escavalier", category: "regular", attacks: { Bug: 13.0, Steel: 12.5 } },
  { name: "Rampardos", species: "Rampardos", category: "regular", attacks: { Rock: 17.0 } },
  { name: "Tyranitar", species: "Tyranitar", category: "regular", attacks: { Rock: 14.5, Dark: 15.5 } },
  { name: "Gigalith", species: "Gigalith", category: "regular", attacks: { Rock: 14.0 } },
  { name: "Aerodactyl", species: "Aerodactyl", category: "regular", attacks: { Rock: 13.0, Flying: 12.5 } },
  { name: "Haxorus", species: "Haxorus", category: "regular", attacks: { Dragon: 16.5 } },
  { name: "Dragapult", species: "Dragapult", category: "regular", attacks: { Dragon: 16.5, Ghost: 15.5 } },
  { name: "Dragonite", species: "Dragonite", category: "regular", attacks: { Dragon: 16.0 } },
  { name: "Hydreigon", species: "Hydreigon", category: "regular", attacks: { Dragon: 14.5, Dark: 14.5 } },
  { name: "Absol", species: "Absol", category: "regular", attacks: { Dark: 14.0 } },
  { name: "Bisharp", species: "Bisharp", category: "regular", attacks: { Dark: 13.0, Steel: 12.5 } },
  { name: "Aggron", species: "Aggron", category: "regular", attacks: { Steel: 13.0 } },
  { name: "Togekiss", species: "Togekiss", category: "regular", attacks: { Fairy: 14.0, Flying: 12.5 } },
  { name: "Sylveon", species: "Sylveon", category: "regular", attacks: { Fairy: 13.8 } },
  { name: "Primarina", species: "Primarina", category: "regular", attacks: { Fairy: 13.5, Water: 13.0 } },
  { name: "Granbull", species: "Granbull", category: "regular", attacks: { Fairy: 12.5 } },
  { name: "Golurk", species: "Golurk", category: "regular", attacks: { Ghost: 13.5, Ground: 12.0 } },
  { name: "Mismagius", species: "Mismagius", category: "regular", attacks: { Ghost: 13.0 } },
];
