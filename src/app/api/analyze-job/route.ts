import { NextResponse } from "next/server";
import { OpenAI } from "openai";

export const runtime = "nodejs";

// ... (CATEGORY_RATES and other constants remain the same) ...


// 2. Categories & rates (THIS you control, not the AI!)
const CATEGORY_RATES = {
  MALER: 1100,
  SNEKKER: 1200,
  RØRLEGGER: 1500,
  ELEKTRIKER: 1500,
  FLISLEGGING: 1300,
  HANDYMAN: 900,
  TOTALRENOVERING: 1600, // New category for complex projects (Bathroom, Kitchen) -> we'll rename to TOTALRENOVERING_BAD in next chunk, but multi_replace targets unique strings. 
  // Wait, I should replace lines 17, 28, 51, 61, 64, 252.
  // Chunk 1: CATEGORY_RATES
  TOTALRENOVERING_BAD: 1600,
  MONTERING_KJØKKEN: 1300, // Snekker + Rør + El needs mixed rate
};

// 3. Required fields per job (what must be asked)
const REQUIRED_FIELDS = {
  MALER: ["area_sqm", "materials_by_customer", "include_ceiling"],
  SNEKKER: ["task_details", "materials_by_customer"],
  RØRLEGGER: ["task_details", "materials_by_customer"],
  ELEKTRIKER: ["task_details", "materials_by_customer"], // Dynamic fields added in getMissingFields based on context
  FLISLEGGING: ["area_sqm", "materials_by_customer"],
  HANDYMAN: ["task_details"],
  TOTALRENOVERING_BAD: ["area_sqm", "task_details", "materials_by_customer"],
  MONTERING_KJØKKEN: ["task_details", "needs_plumbing", "needs_electrician"],
};

// 4. Time estimation rules (your deterministic logic!)
interface JobPayload {
  area_sqm?: number;
  include_ceiling?: boolean; // New field
  needs_plumbing?: boolean;
  needs_electrician?: boolean;
  materials_description?: string;
  switch_type?: 'existing' | 'new';
  // Socket Change
  socket_count?: number;
  is_grounded?: boolean;
  is_socket_accessible?: boolean;
  // Dimmer
  bulb_type?: 'led' | 'halogen';
  dimmer_count?: number;
  dimmer_circuit_type?: 'single' | 'multi'; // Enkel vs Trapp
  // EV Charger
  ev_has_charger?: boolean;
  ev_distance_meters?: number;
  ev_phase?: '1-phase' | '3-phase';
  ev_load_balancing?: boolean;
  // Troubleshooting
  troubleshoot_type?: 'fuse' | 'other';
  troubleshoot_is_acute?: boolean;
  // Spots
  spot_count?: number;
  ceiling_type?: 'open_loft' | 'closed'; // Loft/Åpent vs Lukket
  spot_needs_dimmer?: boolean;
  // Move Socket
  wall_type?: 'drywall' | 'concrete';
  wiring_type?: 'hidden' | 'open';
  socket_move_action?: 'remove_old' | 'keep_old';
  // New Circuit
  appliance_type?: 'induction' | 'other'; // Induksjon or not
  fuse_box_has_space?: boolean;
  circuit_distance_meters?: number;
  // Fuse Box
  fuse_box_age?: number;
  fuse_box_circuit_count?: number;
  fuse_box_surge_protection?: boolean; // Overspenningsvern
  fuse_box_extra_equipment?: boolean; // EV/Solar
  // Outdoor Socket
  outdoor_location?: string;
  outdoor_distance_meters?: number;
  outdoor_socket_count?: number;
  outdoor_weather_exposed?: boolean; // Tak over vs værutsatt
  [key: string]: any;
}

const TIME_RULES: Record<string, (data: JobPayload) => number> = {
  MALER: (data) => {
    const area = data.area_sqm || 0;
    // If ceiling is included, we effectively double the area to paint
    const effectiveArea = data.include_ceiling ? area * 2 : area;
    return effectiveArea * 0.5; // 30 kvm → 15 timer (walls only) | 30 hours (walls + ceiling)
  },
  FLISLEGGING: (data) => (data.area_sqm || 0) * 1.2,
  HANDYMAN: () => 1.5, // minimum small-job block
  SNEKKER: () => 3,
  RØRLEGGER: () => 2.5,
  ELEKTRIKER: (data) => {
    // Check for specific intents
    const d = (data.task_details || "").toLowerCase();

    // Helper to check for keywords
    const has = (words: string[]) => words.some(w => d.includes(w));

    // 1. SOCKET CHANGE (Stikkontakt)
    if (has(['bytte stikk', 'ny stikk', 'jordet stikk', 'ujordet', 'brent stikk'])) {
      // 1 stk: 1.5 - 1.8h (1500-2800kr). Let's say 1.5h base.
      // Flere: 2500-5000. 2 stk ~ 2.5h (3750).
      let count = data.socket_count || 1;
      let hours = 1.5;
      if (count > 1) {
        hours += (count - 1) * 1.0; // +1h per extra socket
      }
      return hours;
    }

    // 2. DIMMER
    if (has(['dimmer', 'dimme'])) {
      // Enkel: 2000-4000kr -> ~2h.
      // Trapp: 3500-6000kr -> ~3h.
      let hours = 2.0;
      if (data.dimmer_circuit_type === 'multi') hours = 3.0; // Trapp

      let count = data.dimmer_count || 1;
      if (count > 1) hours += (count - 1) * 1.5; // +1.5h per extra dimmer

      return hours;
    }

    // 3. EV CHARGER (Elbillader)
    if (has(['elbil', 'lader', 'ladeboks', 'zaptec', 'easee'])) {
      // Enkel: 12k-20k. Mat cost typically 8k-10k. Labor ~4k-10k -> 3-6 hours.
      // Upgrade: 20k-35k. Labor + Mat upgrade.
      let hours = 4.0;
      if (data.ev_distance_meters && data.ev_distance_meters > 10) hours += 2.0;

      // If upgrade needed (3-phase check or load balancing might imply complexity)
      if (data.ev_phase === '3-phase' || data.ev_load_balancing) hours += 3.0;

      return hours;
    }

    // 4. TROUBLESHOOTING (Feilsøking)
    if (has(['sikring', 'går', 'strøm', 'borte', 'jordfeil', 'reparasjon', 'feilsøk'])) {
      // 1-2 hours base estimate as per user spec (2500-6000kr).
      // 2500kr = 1.6h. 6000kr = 4h.
      // We start at 2h.
      let hours = 2.0;
      if (data.troubleshoot_is_acute) hours += 1; // Acute usually implies urgent dispatch fee, simplified as hours here
      return hours;
    }

    // 5. SPOTS (Spotter på bad etc)
    if (has(['spot', 'downlight'])) {
      // 4-6 spots: 10-18k. Mat cost for 5 spots ~3-5k. Labor 7-13k -> 5-8h. 
      // ~1h per spot is a safe rule of thumb for new install.
      let count = data.spot_count || 4;
      let hours = count * 1.25; // 5 spots = 6.25h

      if (data.ceiling_type === 'closed') hours += 2; // Harder access
      if (data.spot_needs_dimmer) hours += 0.5;

      return hours;
    }

    // 6. MOVE SOCKET (Flytte stikkontakt)
    if (has(['flytte', 'flytting'])) {
      // Enkel: 3-6k (2-4h). Betong: 6-10k (4-7h).
      let hours = 2.5; // Base
      if (data.wall_type === 'concrete') hours = 5.0;
      if (data.wiring_type === 'hidden') hours += 1.0; // Hidden is harder to move nicely

      return hours;
    }

    // 7. NEW CIRCUIT (Ny kurs / Platetopp)
    if (has(['ny kurs', 'platetopp', 'komfyr', 'induksjon'])) {
      // Ny kurs: 6-12k (4-8h).
      let hours = 5.0; // Base
      if (data.circuit_distance_meters && data.circuit_distance_meters > 10) hours += 2.0;
      if (data.fuse_box_has_space === false) hours += 3.0; // Must expand cabinet, simplified

      return hours;
    }

    // 8. FUSE BOX (Bytte sikringsskap)
    if (has(['bytte sikringsskap', 'oppgradere sikringsskap', 'automatsikring'])) {
      // Standard: 25-45k. Mat ~10-15k. Labor 15-30k -> 10-20h.
      let hours = 15.0;
      if ((data.fuse_box_circuit_count || 0) > 10) hours += 5.0;
      if (data.fuse_box_extra_equipment) hours += 3.0;

      return hours;
    }

    // 9. OUTDOOR SOCKET (Utendørs)
    if (has(['ute', 'terrasse', 'balkong', 'utendørs'])) {
      // Enkel: 3.5k-7k (2.5-4.5h).
      // Lang: 7-12k (4.5-8h).
      let hours = 3.0;
      if (data.outdoor_distance_meters && data.outdoor_distance_meters > 10) hours += 2.0;
      if (data.outdoor_weather_exposed) hours += 0.5; // Needs robust cover/seal

      return hours;
    }

    // 10. LAMP (Fallthrough from previous Logic, now specific)
    if (has(['lampe', 'belysning', 'lys', 'pendel', 'krone'])) {
      let hours = 0;
      if (data.has_existing_point === false) {
        hours = 2.5;
      } else {
        hours = 1.5;
      }
      if (data.ceiling_height_type === 'high_sloped') hours += 2.0;

      const count = data.lamp_count || 1;
      if (count > 1) hours += (count - 1) * 0.5;

      if (data.switch_type === 'new') hours += 0.5;

      return hours > 0 ? hours : 1.5;
    }

    return 2.5; // Default fallback
  },
  // Base 60 hours + 15 hours per sqm. A 4sqm bathroom = 60 + 60 = 120h. Steps: Demolition, Membranes, Tiling, Plumbing, Electric.
  TOTALRENOVERING_BAD: (data) => 60 + ((data.area_sqm || 4) * 15),
  MONTERING_KJØKKEN: (data) => {
    let hours = 10; // Base mounting time (placeholder)
    if (data.needs_plumbing) hours += 4;
    if (data.needs_electrician) hours += 4;
    return hours;
  },
};

// 5. AI interpreter (Context-aware)
async function aiInterpret(conversation: any[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = `
Du er en smart assistent som henter ut strukturert data fra en samtale om håndverkertjenester.
Din oppgave er å slå sammen informasjonen fra HELE samtalen.

GYLDIGE KATEGORIER:
MALER, SNEKKER, RØRLEGGER, ELEKTRIKER, FLISLEGGING, HANDYMAN, TOTALRENOVERING_BAD, MONTERING_KJØKKEN.

REGLER FOR KATEGORI:
- "Nytt bad", "Totalrenovering bad", "Pusse opp bad" -> TOTALRENOVERING_BAD
- "Montere kjøkken", "Nytt kjøkken", "Kjøkkenmontering" -> MONTERING_KJØKKEN
- "Male" -> MALER
- "Snekre", "Bygge" -> SNEKKER
- "Rør", "Vann", "Kran" (med mindre det er del av kjøkken) -> RØRLEGGER
- "Strøm", "Sikring", "Elbil" -> ELEKTRIKER
- "Fliser" (utenom totalrenovering) -> FLISLEGGING

Data du skal se etter (avhengig av kategori):
- area_sqm (tall)
- materials_by_customer (boolean: true hvis kunden har/kjøper, false hvis håndverker skal kjøpe)
- include_ceiling (boolean: kun for MALER. true hvis taket også skal males)
- needs_plumbing (boolean: kun for MONTERING_KJØKKEN. true hvis bruker nevner kran, oppvaskmaskin, rør, vann)
- needs_electrician (boolean: kun for MONTERING_KJØKKEN. true hvis bruker nevner stikkontakter, ovn, strøm, elektriker)
- has_existing_point (boolean: kun for ELEKTRIKER. true hvis bruker sier "det er uttak der", "bytte lampe", "henger der fra før". false hvis "nytt punkt", "må legge strøm", "ingen uttak")
- ceiling_height_type ('standard' eller 'high_sloped')
- lamp_count (number: antall lamper)
- switch_type ('existing' eller 'new')
- socket_count (number: antall stikkontakter som skal byttes/monteres)
- is_grounded (boolean: true for jordet, false for ujordet)
- is_socket_accessible (boolean: true hvis "lett tilgjengelig", false hvis bak sofa/skap)
- bulb_type ('led' eller 'halogen')
- dimmer_count (number)
- dimmer_circuit_type ('single' eller 'multi'/'trapp'. trapp hvis "to steder", "trappebryter")
- ev_has_charger (boolean: true hvis kunde har lader)
- ev_distance_meters (number: avstand sikringsskap til lader/garasje)
- ev_phase ('1-phase' eller '3-phase')
- ev_load_balancing (boolean)
- troubleshoot_type ('fuse' eller 'other')
- troubleshoot_is_acute (boolean: true hvis "ingen strøm", "haster", "akutt")
- spot_count (number: antall spotter)
- ceiling_type ('open_loft' el 'closed')
- spot_needs_dimmer (boolean)
- wall_type ('drywall'/'gips' eller 'concrete'/'betong')
- wiring_type ('hidden'/'skjult' eller 'open'/'åpent')
- socket_move_action ('remove_old' eller 'keep_old')
- appliance_type ('induction' eller 'other')
- fuse_box_has_space (boolean)
- circuit_distance_meters (number)
- fuse_box_age (number: år)
- fuse_box_circuit_count (number)
- fuse_box_surge_protection (boolean)
- fuse_box_extra_equipment (boolean)
- outdoor_location (string: "terrasse", "vegg", "garasje")
- outdoor_distance_meters (number)
- outdoor_socket_count (number)
- outdoor_weather_exposed (boolean: true hvis "værutsatt", false hvis "under tak")
- task_details (tekstlig beskrivelse)
- materials_description (string: HVIS materials_by_customer=false: Hva skal kjøpes inn? F.eks "Hvit maling, pensler, gipsplater". Hvis ukjent, null.)
- estimated_material_cost (number: HVIS materials_by_customer=false OG materials_description er kjent: Gjør et kvalifisert estimat på materialkostnad i NOK. 
    REGLER FOR MATERIALKOSTNAD (ELEKTRIKER):
    - Elbillader: 8000 (hvis ev_has_charger=false)
    - Spot: 500 per stk (standard led downlight)
    - Dimmer: 1000 per stk
    - Stikkontakt: 300 per stk
    - Sikringsskap standard innmat: 10000
    - Kabel: 50 per meter
    Bruk disse som tommelfingerregler pluss 20% buffer.)
- user_question (string: hvis brukeren stiller et spørsmål om prosessen, prisen eller materialer som krever et svar)
- customer_description (string: en oppsummering eller direkte sitat av detaljerte beskrivelser fra kunden som kan være nyttige for håndverkeren, f.eks. "Huset er fra 1950", "Det er trangt bak vasken", "Jeg har hund som må passes på". Dette skal være mer utfyllende enn task_details hvis kunden har gitt mye info.)

OUTPUT JSON (Strict):
{
  "category": "STRING_UPPERCASE" | null,
  "area_sqm": number | null,
  "materials_by_customer": boolean | null,
  "include_ceiling": boolean | null,
  "needs_plumbing": boolean | null,
  "needs_electrician": boolean | null,
  "has_existing_point": boolean | null,
  "ceiling_height_type": 'standard' | 'high_sloped' | null,
  "lamp_count": number | null,
  "switch_type": 'existing' | 'new' | null,
  "socket_count": number | null,
  "is_grounded": boolean | null,
  "is_socket_accessible": boolean | null,
  "bulb_type": 'led' | 'halogen' | null,
  "dimmer_count": number | null,
  "dimmer_circuit_type": 'single' | 'multi' | null,
  "ev_has_charger": boolean | null,
  "ev_distance_meters": number | null,
  "ev_phase": '1-phase' | '3-phase' | null,
  "ev_load_balancing": boolean | null,
  "troubleshoot_type": 'fuse' | 'other' | null,
  "troubleshoot_is_acute": boolean | null,
  "spot_count": number | null,
  "ceiling_type": 'open_loft' | 'closed' | null,
  "spot_needs_dimmer": boolean | null,
  "wall_type": 'drywall' | 'concrete' | null,
  "wiring_type": 'hidden' | 'open' | null,
  "socket_move_action": 'remove_old' | 'keep_old' | null,
  "appliance_type": 'induction' | 'other' | null,
  "fuse_box_has_space": boolean | null,
  "circuit_distance_meters": number | null,
  "fuse_box_age": number | null,
  "fuse_box_circuit_count": number | null,
  "fuse_box_surge_protection": boolean | null,
  "fuse_box_extra_equipment": boolean | null,
  "outdoor_location": string | null,
  "outdoor_distance_meters": number | null,
  "outdoor_socket_count": number | null,
  "outdoor_weather_exposed": boolean | null,
  "task_details": string | null,
  "materials_description": string | null,
  "estimated_material_cost": number | null,
  "user_question": string | null,
  "customer_description": string | null,
  "intent": "short_summary_string"
}

VIKTIG:
- Returner KUN JSON.
- Hvis kategorien ble nevnt tidligere, husk den.
- Hvis brukeren sier "male tak" eller "inkludert tak", sett include_ceiling til true.
- Hvis brukeren spør "Er materialer inkludert?", sett user_question til spørsmålet og IKKE gjett på materials_by_customer (la den være null).
- Hent ut nyttig kontekst til 'customer_description' hvis tilgjengelig.
`;

  // Format messages for OpenAI
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...conversation.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    })),
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: apiMessages as any,
    response_format: { type: "json_object" },
  });

  try {
    const raw = completion.choices[0].message.content;
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("AI JSON Parse Error:", err);
    return {};
  }
}

// 6. Find missing fields
function getMissingFields(category: string, payload: any) {
  const normCategory = category?.toUpperCase();
  const needed = [...(REQUIRED_FIELDS[normCategory as keyof typeof REQUIRED_FIELDS] || [])];

  // Conditional: If customer explicitly says they DO NOT have materials, we must know WHAT to buy.
  if (payload.materials_by_customer === false) {
    needed.push("materials_description");
  }

  // Logic for Electrician Lamp jobs
  if (normCategory === 'ELEKTRIKER') {
    const detail = (payload.task_details || "").toLowerCase();
    const has = (words: string[]) => words.some(w => detail.includes(w));

    // LAMPE
    if (has(['lampe', 'belysning', 'lys', 'pendel'])) {
      if (payload.has_existing_point === undefined || payload.has_existing_point === null) needed.push("has_existing_point");
      if (payload.lamp_count === undefined || payload.lamp_count === null) needed.push("lamp_count");
      if (payload.ceiling_height_type === undefined || payload.ceiling_height_type === null) needed.push("ceiling_height_type");
      if (payload.switch_type === undefined || payload.switch_type === null) needed.push("switch_type");
    }
    // STIKKONTAKT BYTTE
    else if (has(['bytte stikk', 'ny stikk', 'jordet stikk', 'brent stikk'])) {
      if (payload.socket_count === undefined || payload.socket_count === null) needed.push("socket_count");
      if (payload.is_grounded === undefined || payload.is_grounded === null) needed.push("is_grounded");
      if (payload.is_socket_accessible === undefined || payload.is_socket_accessible === null) needed.push("is_socket_accessible");
    }
    // DIMMER
    else if (has(['dimmer', 'dimme'])) {
      if (payload.bulb_type === undefined || payload.bulb_type === null) needed.push("bulb_type");
      if (payload.dimmer_circuit_type === undefined || payload.dimmer_circuit_type === null) needed.push("dimmer_circuit_type");
      if (payload.dimmer_count === undefined || payload.dimmer_count === null) needed.push("dimmer_count");
    }
    // ELBIL
    else if (has(['elbil', 'lader', 'ladeboks', 'zaptec', 'easee'])) {
      if (payload.ev_has_charger === undefined || payload.ev_has_charger === null) needed.push("ev_has_charger");
      if (payload.ev_distance_meters === undefined || payload.ev_distance_meters === null) needed.push("ev_distance_meters");
      if (payload.ev_phase === undefined || payload.ev_phase === null) needed.push("ev_phase");
      if (payload.ev_load_balancing === undefined || payload.ev_load_balancing === null) needed.push("ev_load_balancing");
    }
    // FEILSØK
    else if (has(['sikring', 'går', 'strøm', 'borte', 'jordfeil'])) {
      if (payload.troubleshoot_is_acute === undefined || payload.troubleshoot_is_acute === null) needed.push("troubleshoot_is_acute");
    }
    // SPOTTER
    else if (has(['spot', 'downlight'])) {
      if (payload.spot_count === undefined || payload.spot_count === null) needed.push("spot_count");
      if (payload.ceiling_type === undefined || payload.ceiling_type === null) needed.push("ceiling_type");
      if (payload.spot_needs_dimmer === undefined || payload.spot_needs_dimmer === null) needed.push("spot_needs_dimmer");
    }
    // FLYTTE STIKK
    else if (has(['flytte', 'flytting'])) {
      if (payload.wall_type === undefined || payload.wall_type === null) needed.push("wall_type");
      if (payload.wiring_type === undefined || payload.wiring_type === null) needed.push("wiring_type");
      if (payload.socket_move_action === undefined || payload.socket_move_action === null) needed.push("socket_move_action");
    }
    // NY KURS
    else if (has(['ny kurs', 'platetopp', 'komfyr'])) {
      if (payload.appliance_type === undefined || payload.appliance_type === null) needed.push("appliance_type");
      if (payload.fuse_box_has_space === undefined || payload.fuse_box_has_space === null) needed.push("fuse_box_has_space");
      if (payload.circuit_distance_meters === undefined || payload.circuit_distance_meters === null) needed.push("circuit_distance_meters");
    }
    // SIKRINGSSKAP
    else if (has(['sikringsskap', 'oppgradere'])) {
      if (payload.fuse_box_age === undefined || payload.fuse_box_age === null) needed.push("fuse_box_age");
      if (payload.fuse_box_circuit_count === undefined || payload.fuse_box_circuit_count === null) needed.push("fuse_box_circuit_count");
      if (payload.fuse_box_surge_protection === undefined || payload.fuse_box_surge_protection === null) needed.push("fuse_box_surge_protection");
      if (payload.fuse_box_extra_equipment === undefined || payload.fuse_box_extra_equipment === null) needed.push("fuse_box_extra_equipment");
    }
    // UTE STIKK
    else if (has(['ute', 'terrasse', 'balkong'])) {
      if (payload.outdoor_location === undefined || payload.outdoor_location === null) needed.push("outdoor_location");
      if (payload.outdoor_distance_meters === undefined || payload.outdoor_distance_meters === null) needed.push("outdoor_distance_meters");
      if (payload.outdoor_socket_count === undefined || payload.outdoor_socket_count === null) needed.push("outdoor_socket_count");
      if (payload.outdoor_weather_exposed === undefined || payload.outdoor_weather_exposed === null) needed.push("outdoor_weather_exposed");
    }
  }

  return needed.filter((field) => {
    const val = payload[field];
    return val === undefined || val === null || val === "";
  });
}

// 7. Build next question
function buildQuestion(field: string) {
  switch (field) {
    case "area_sqm":
      return "Hvor mange kvadratmeter gjelder jobben?";
    case "materials_by_customer":
      return "Har du materialene selv, eller skal håndverkeren kjøpe inn?";
    case "include_ceiling":
      return "Skal taket også males?";
    case "task_details":
      return "Kan du beskrive litt mer detaljert hva som skal gjøres?";
    case "materials_description":
      return "Hvilke materialer trenger du at håndverkeren kjøper inn? (F.eks. type maling, antall gipsplater, armatur)";
    case "needs_plumbing":
      return "Skal det monteres kran, oppvaskmaskin eller lignende?";
    case "needs_electrician":
      return "Er det behov for elektriker (f.eks. til stikkontakter eller hvitevarer)?";
    case "has_existing_point":
      return "Er det allerede et eksisterende lampeuttak i taket der lampen skal monteres?";
    case "lamp_count":
      return "Hvor mange lamper gjelder det?";
    case "ceiling_height_type":
      return "Er det vanlig takhøyde (ca 2,4 m), eller høyt/skråtak?";
    // SOCKET
    case "socket_count": return "Hvor mange kontakter skal byttes?";
    case "is_grounded": return "Er det jordet eller ujordet kontakt?";
    case "is_socket_accessible": return "Er det synlig skade/svidd plast? Og er den lett tilgjengelig?"; // Combined for brevity
    // DIMMER
    case "bulb_type": return "Er det LED-lys eller halogen?";
    case "dimmer_circuit_type": return "Er det én bryter eller trappebryter (to steder)?";
    case "dimmer_count": return "Hvor mange dimmere ønskes?";
    // EV
    case "ev_has_charger": return "Har du allerede lader, eller skal den leveres av elektriker?";
    case "ev_distance_meters": return "Ca. avstand fra sikringsskap til garasje/ladested?";
    case "ev_phase": return "Vet du om du har 1-fase eller 3-fase anlegg?";
    case "ev_load_balancing": return "Ønsker du lastbalansering?";
    // TROUBLESHOOT
    case "troubleshoot_is_acute": return "Er det akutt (ingen strøm i hele huset) eller kun en kurs?";
    // SPOTS
    case "spot_count": return "Hvor mange spotter ser du for deg?";
    case "ceiling_type": return "Er taket åpent over (loft) eller lukket?";
    case "spot_needs_dimmer": return "Skal det monteres dimmer?";
    // MOVE
    case "wall_type": return "Er det gipsvegg eller betong?";
    case "wiring_type": return "Er det skjult eller åpent anlegg?";
    case "socket_move_action": return "Skal den gamle kontakten fjernes helt eller bli stående?";
    // NEW CIRCUIT
    case "appliance_type": return "Hva skal kobles til? (F.eks induksjon/platetopp krever høy effekt)";
    case "fuse_box_has_space": return "Har du ledig plass i sikringsskapet?";
    case "circuit_distance_meters": return "Ca. avstand fra sikringsskap til der strømmen skal?";
    // FUSE BOX
    case "fuse_box_age": return "Hvor gammelt er sikringsskapet (ca)?";
    case "fuse_box_circuit_count": return "Ca. hvor mange kurser (sikringer) er det i dag?";
    case "fuse_box_surge_protection": return "Ønsker du overspenningsvern?";
    case "fuse_box_extra_equipment": return "Har du elbillader, solceller eller annet spesialutstyr?";
    // OUTDOOR
    case "outdoor_location": return "Hvor skal den plasseres? (Vegg, terrasse, annet)";
    case "outdoor_distance_meters": return "Avstand til nærmeste innvendige punkt/stikkontakt?";
    case "outdoor_socket_count": return "Ønsker du en dobbel eller flere kontakter?";
    case "outdoor_weather_exposed": return "Er det tak over plasseringen, eller helt værutsatt?";

    // EXISTING
    case "switch_type":
      return "Skal den kobles til eksisterende bryter, eller ny styring (f.eks. dimmer)?";
    default:
      return "Kan du gi litt mer informasjon?";
  }
}

// 8. Pricing logic (stable, deterministic)
function calculatePrice(category: string, payload: any) {
  const normCategory = category?.toUpperCase();
  const timeFn = TIME_RULES[normCategory as keyof typeof TIME_RULES] || (() => 0);
  const rateFn = CATEGORY_RATES[normCategory as keyof typeof CATEGORY_RATES] || 0;

  let hours = 0;
  try {
    hours = timeFn(payload);
  } catch (e) {
    hours = 0;
  }

  if (isNaN(hours) || hours <= 0) hours = 1;

  // Calculate Service Van Fee (900kr per started 7.5h day)
  const days = Math.ceil(hours / 7.5);
  const serviceVanFee = days * 900;

  const laborCost = hours * rateFn;
  const base = laborCost + serviceVanFee;

  return {
    hours: Math.round(hours * 10) / 10,
    base,
    // Increased buffer from 1.1 to 1.3 for more flexibility
    adjusted: Math.round(base * 1.3),
    serviceVanFee
  };
}

// API ROUTE HANDLER
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const conversation = body.messages || body.conversation;

    if (!conversation || !Array.isArray(conversation)) {
      return NextResponse.json({ error: "Invalid conversation format" }, { status: 400 });
    }

    // 1) AI interprets WHOLE conversation history
    const extracted = await aiInterpret(conversation);
    console.log("AI Extracted:", extracted);

    // 2) Validate Category
    if (!extracted.category) {
      // If the user is just asking a general question without a category context yet
      if (extracted.user_question) {
        return NextResponse.json({
          message: "Jeg er en AI-assistent for håndverkertjenester. For å kunne svare må jeg vite hva slags jobb du trenger hjelp til. (F.eks. nytt bad, male stue, bygge terrasse).",
          analysis: null
        });
      }
      return NextResponse.json({
        message: "Hva slags type jobb gjelder det? (Maler, snekker, rørlegger osv.)",
        analysis: null
      });
    }

    // Normalize category
    const category = extracted.category.toUpperCase();

    // RESTRICT MVP TO ELECTRICIAN ONLY
    if (category !== 'ELEKTRIKER') {
      return NextResponse.json({
        message: `Beklager, denne demoversjonen er kun åpen for elektrikerarbeid. Vi jobber med å rulle ut støtte for ${category.toLowerCase()} snart! Prøv gjerne å spørre om bytte av stikkontakt eller montering av elbillader.`,
        analysis: null
      });
    }

    if (!CATEGORY_RATES[category as keyof typeof CATEGORY_RATES]) {
      return NextResponse.json({
        message: `Beklager, vi har foreløpig ikke priser for ${category}. Vi dekker: Maler, Snekker, Rørlegger, Elektriker, Flislegging, Montere Kjøkken og Handyman. Hvilken passer best?`,
        analysis: null
      });
    }

    // 3) Check missing fields
    const missing = getMissingFields(category, extracted);

    if (missing.length > 0) {
      // If user asked a question, try to answer it alongside the demand for missing info
      let msg = buildQuestion(missing[0]);
      if (extracted.user_question) {
        // Simple heuristic response for common questions
        if (extracted.user_question.toLowerCase().includes("material")) {
          msg = "Prisestimatet vårt dekker kun arbeid. Materialer kommer i tillegg. " + msg;
        } else {
          msg = `Angående spørsmålet ditt: "${extracted.user_question}": Vi fokuserer først på å hente inn info for å gi deg et estimat. ` + msg;
        }
      }

      return NextResponse.json({
        message: msg,
        missing_fields: missing,
        analysis: null
      });
    }

    // 4) All data collected → calculate price
    const price = calculatePrice(category, extracted);

    // Add material costs if applicable
    const materialCost = (extracted.materials_by_customer === false && extracted.estimated_material_cost)
      ? extracted.estimated_material_cost
      : 0;

    // Total price includes labor + service + materials
    const totalMin = price.base + materialCost;
    const totalMax = price.adjusted + Math.round(materialCost * 1.2); // +20% buffer on materials

    // Construct response message
    let responseMessage = `Jeg har forstått oppdraget. Her et estimat for ${category}.`;
    if (materialCost > 0) {
      responseMessage += ` Jeg har lagt inn ca. ${materialCost} kr for materialer, men merk at håndverkeren laster opp kvittering for faktisk kostnad.`;
    }

    if (extracted.user_question) {
      // ... existing user question logic ...
      if (!extracted.user_question.toLowerCase().includes("material")) {
        // If the question is about materials, we likely covered it above, but let's keep the generic handler too
        responseMessage = `Angående spørsmålet ditt: "${extracted.user_question}". ` + responseMessage;
      }
    }

    // 5) Build Line Items
    let lineItems = [];
    if (category === 'TOTALRENOVERING_BAD') {
      // Breakdown logic for Total Renovation
      const totalHours = price.hours;
      const breakdown = [
        { role: 'Rørlegger', share: 0.25, rate: 1500 },
        { role: 'Flislegger', share: 0.50, rate: 1300 },
        { role: 'Elektriker', share: 0.15, rate: 1500 },
        { role: 'Snekker', share: 0.10, rate: 1200 },
      ];

      lineItems = breakdown.map(b => {
        const hrs = Math.round(totalHours * b.share);
        return {
          name: `${b.role} (~${hrs}t)`,
          amount: `${Math.round(hrs * b.rate)} kr`,
          type: "currency"
        };
      });

      lineItems.push({ name: "Oppmøte/Rigging", amount: `${price.serviceVanFee} kr`, type: "currency" });

      if (materialCost > 0) {
        lineItems.push({ name: "Estimerte materialer*", amount: `~${materialCost} kr`, type: "currency" });
        lineItems.push({ name: "*Faktureres etter kvittering", amount: "", type: "text" });
      } else {
        lineItems.push({ name: "Materialer", amount: "Kommer i tillegg", type: "text" });
      }

    } else if (category === 'MONTERING_KJØKKEN') {
      // Breakdown for Kitchen
      lineItems.push({ name: "Snekker/Montering (~10t)", amount: `${10 * 1200} kr`, type: "currency" });

      if (extracted.needs_plumbing) {
        lineItems.push({ name: "Rørlegger (~4t)", amount: `${4 * 1500} kr`, type: "currency" });
      }
      if (extracted.needs_electrician) {
        lineItems.push({ name: "Elektriker (~4t)", amount: `${4 * 1500} kr`, type: "currency" });
      }

      lineItems.push({ name: "Oppmøte/Rigging", amount: `${price.serviceVanFee} kr`, type: "currency" });

      if (materialCost > 0) {
        lineItems.push({ name: "Estimerte materialer*", amount: `~${materialCost} kr`, type: "currency" });
        lineItems.push({ name: "*Faktureres etter kvittering", amount: "", type: "text" });
      } else {
        lineItems.push({ name: "Materialer", amount: "Ikke inkludert", type: "text" });
      }

    } else {
      // Standard breakdown
      lineItems = [
        { name: "Estimert tid", amount: `${price.hours} timer`, type: "time" },
        { name: "Timepris", amount: `${CATEGORY_RATES[category as keyof typeof CATEGORY_RATES]} kr/t`, type: "currency" },
        { name: "Oppmøte/Servicebil", amount: `${price.serviceVanFee} kr`, type: "currency" },
      ];

      if (materialCost > 0) {
        lineItems.push({ name: "Estimerte materialer*", amount: `~${materialCost} kr`, type: "currency" });
        lineItems.push({ name: "*Faktureres etter kvittering", amount: "", type: "text" });
      } else {
        lineItems.push({ name: "Materiell", amount: "Ikke inkludert", type: "text" });
      }
    }

    return NextResponse.json({
      message: responseMessage,
      analysis: {
        main_category: category,
        subcategory: extracted.intent || "Generelt",
        estimated_price_min: totalMin,
        estimated_price_max: totalMax,
        explanation: `Basert på ${price.hours} timer arbeid ` + (materialCost > 0 ? `og ca ${materialCost}kr i materialer.` : '.'),
        line_items: lineItems,
        structured_data: extracted
      }
    });

  } catch (err: any) {
    console.error("Analyze Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
