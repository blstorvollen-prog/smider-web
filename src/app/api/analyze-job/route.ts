import { NextResponse } from "next/server";
import { OpenAI } from "openai";

export const runtime = "nodejs";

/**
 * ============================================================
 *  SMIDER PILOT — ELECTRICIAN ONLY (Production-stable)
 * ============================================================
 */

/** Hourly rate (NOK) */
const ELECTRICIAN_RATE = 1500;

/** Required base fields */
const REQUIRED_FIELDS = ["task_details", "materials_by_customer"];

/**
 * Payload shape (only electrician fields)
 */
interface JobPayload {
  task_details?: string;
  materials_by_customer?: boolean;
  materials_description?: string | null;
  estimated_material_cost?: number | null;

  // Lamp
  has_existing_point?: boolean | null;
  lamp_count?: number | null;
  ceiling_height_type?: "standard" | "high_sloped" | null;
  switch_type?: "existing" | "new" | null;

  // Socket
  socket_count?: number | null;
  is_grounded?: boolean | null;
  is_socket_accessible?: boolean | null;

  // Dimmer
  bulb_type?: "led" | "halogen" | null;
  dimmer_count?: number | null;
  dimmer_circuit_type?: "single" | "multi" | null;

  // EV charger
  ev_has_charger?: boolean | null;
  ev_distance_meters?: number | null;
  ev_phase?: "1-phase" | "3-phase" | null;
  ev_load_balancing?: boolean | null;

  // Troubleshooting
  troubleshoot_is_acute?: boolean | null;

  // Spots
  spot_count?: number | null;
  ceiling_type?: "open_loft" | "closed" | null;
  spot_needs_dimmer?: boolean | null;

  // Move socket
  wall_type?: "drywall" | "concrete" | null;
  wiring_type?: "hidden" | "open" | null;

  // New circuit
  appliance_type?: string | null;
  fuse_box_has_space?: boolean | null;
  circuit_distance_meters?: number | null;

  // Outdoor socket
  outdoor_distance_meters?: number | null;
  outdoor_socket_count?: number | null;
  outdoor_weather_exposed?: boolean | null;

  // Meta
  intent?: string | null;
  user_question?: string | null;
}

/**
 * ============================================================
 *  1) TIME ESTIMATION RULES (Deterministic)
 * ============================================================
 */
function estimateHours(data: JobPayload): number {
  const d = (data.task_details || "").toLowerCase();
  const intent = (data.intent || "").toLowerCase();

  const has = (words: string[]) =>
    words.some((w) => d.includes(w) || intent.includes(w));

  // SOCKET CHANGE
  if (has(["stikk", "kontakt", "bytte"])) {
    const count = data.socket_count || 1;
    return 1.5 + (count - 1) * 1.0;
  }

  // DIMMER
  if (has(["dimmer"])) {
    let hours = data.dimmer_circuit_type === "multi" ? 3 : 2;
    const count = data.dimmer_count || 1;
    if (count > 1) hours += (count - 1) * 1.5;
    return hours;
  }

  // EV CHARGER
  if (has(["elbil", "lader", "ladeboks", "zaptec", "easee"])) {
    let hours = 4;
    if ((data.ev_distance_meters || 0) > 10) hours += 2;
    if (data.ev_phase === "3-phase" || data.ev_load_balancing) hours += 3;
    return hours;
  }

  // COOKTOP / OVEN CONNECTION / NEW CIRCUIT
  if (has(["platetopp", "induksjon", "komfyr", "ovn", "ny kurs"])) {
    let hours = 3.5;

    if (d.includes("ny kurs") || d.includes("egen kurs") || d.includes("må trekkes")) {
      hours = 5.5;
    }

    // Komfyrvakt installation usually takes ~0.5 - 1h extra if not included in base? 
    // Usually part of the "Ny kurs til komfyr" package, but let's add 0.5h for safety if specifically komfyr/platetopp
    if (d.includes("komfyr") || d.includes("platetopp") || d.includes("induksjon")) {
      // checks later in price calculation for material cost
    }

    return hours;
  }

  // TROUBLESHOOTING
  if (has(["sikring", "jordfeil", "feilsøk", "strøm borte"])) {
    return data.troubleshoot_is_acute ? 3 : 2;
  }
  // TROUBLESHOOTING
  if (has(["sikring", "jordfeil", "feilsøk", "strøm borte"])) {
    return data.troubleshoot_is_acute ? 3 : 2;
  }

  // SPOTS
  if (has(["spot", "downlight"])) {
    const count = data.spot_count || 4;
    let hours = count * 1.25;
    if (data.ceiling_type === "closed") hours += 2;
    if (data.spot_needs_dimmer) hours += 0.5;
    return hours;
  }

  // OUTDOOR SOCKET
  if (has(["utendørs", "terrasse", "balkong"])) {
    let hours = 3;
    if ((data.outdoor_distance_meters || 0) > 10) hours += 2;
    if (data.outdoor_weather_exposed) hours += 0.5;
    return hours;
  }

  // LAMP INSTALL
  if (has(["lampe", "pendel", "lysekrone"])) {
    let hours = data.has_existing_point === false ? 2.5 : 1.5;
    if (data.ceiling_height_type === "high_sloped") hours += 2;
    const count = data.lamp_count || 1;
    if (count > 1) hours += (count - 1) * 0.5;
    return hours;
  }

  // DEFAULT FALLBACK
  return 2.5;
}

/**
 * ============================================================
 *  2) PRICE CALCULATION
 * ============================================================
 */

/** Material prices (NOK) */
const MATERIAL_PRICES = {
  CABLE_PER_METER: 100,
  SOCKET: 450,
  DIMMER: 800,
  STOVE_GUARD: 1500,
  SPOT: 600, // Enkel spot
  SERVICE_VAN: 900,
};

function calculatePrice(hours: number, data: JobPayload) {
  const days = Math.ceil(hours / 7.5);
  const serviceVanFee = days * MATERIAL_PRICES.SERVICE_VAN;
  const laborCost = hours * ELECTRICIAN_RATE;

  let totalMin = laborCost + serviceVanFee;
  let totalMax = (laborCost * 1.3) + serviceVanFee; // Only scale labor for max range? Or scale both? Usually labor is the variable. Let's keep simple scaling for now or specific logic.

  // Let's stick to existing logic: base * 1.3 for max, but materials should be additive and fixed?
  // Actually, material usage can vary too. 
  // For the requested breakdown, valid values are needed. 

  const lineItems: { name: string; amount: string | number; type?: 'range' }[] = [];

  // 1. Labor
  lineItems.push({
    name: `Arbeid (${hours}t x ${ELECTRICIAN_RATE} kr)`,
    amount: `${laborCost} kr`,
  });

  // 2. Service Van
  lineItems.push({
    name: `Servicebil (${days} ${days === 1 ? 'dag' : 'dager'})`,
    amount: `${serviceVanFee} kr`,
  });

  // 3. Materials (if not provided by customer)
  let materialCost = 0;
  if (data.materials_by_customer !== true) {
    // Cable
    if (data.circuit_distance_meters) {
      const cost = data.circuit_distance_meters * MATERIAL_PRICES.CABLE_PER_METER;
      materialCost += cost;
      lineItems.push({
        name: `Kabel (${data.circuit_distance_meters}m x ${MATERIAL_PRICES.CABLE_PER_METER} kr)`,
        amount: `${cost} kr`
      });
    }

    // Sockets
    if (data.socket_count) {
      const cost = data.socket_count * MATERIAL_PRICES.SOCKET;
      materialCost += cost;
      lineItems.push({
        name: `Stikkontakt (${data.socket_count} stk x ${MATERIAL_PRICES.SOCKET} kr)`,
        amount: `${cost} kr`
      });
    }

    // Dimmers
    if (data.dimmer_count) {
      const cost = data.dimmer_count * MATERIAL_PRICES.DIMMER;
      materialCost += cost;
      lineItems.push({
        name: `Dimmer (${data.dimmer_count} stk x ${MATERIAL_PRICES.DIMMER} kr)`,
        amount: `${cost} kr`
      });
    }

    // Spots
    if (data.spot_count) {
      const cost = data.spot_count * MATERIAL_PRICES.SPOT;
      materialCost += cost;
      lineItems.push({
        name: `Spotter (${data.spot_count} stk x ${MATERIAL_PRICES.SPOT} kr)`,
        amount: `${cost} kr`
      });
    }

    // Stove Guard (Special case logic from previous code)
    if (data.appliance_type && (
      data.appliance_type.includes("komfyr") ||
      data.appliance_type.includes("platetopp") ||
      data.appliance_type.includes("induksjon")
    )) {
      materialCost += MATERIAL_PRICES.STOVE_GUARD;
      lineItems.push({
        name: `Komfyrvakt (påkrevd)`,
        amount: `${MATERIAL_PRICES.STOVE_GUARD} kr`
      });
    }
  }

  totalMin += materialCost;
  // For max price, maybe add 10-20% buffer on materials?
  totalMax = (laborCost * 1.3) + serviceVanFee + (materialCost * 1.2);

  return {
    hours: Math.round(hours * 10) / 10,
    min: Math.round(totalMin),
    max: Math.round(totalMax),
    serviceVanFee,
    lineItems,
  };
}

/**
 * ============================================================
 *  3) AI JSON EXTRACTOR (Strict)
 * ============================================================
 */
async function aiInterpret(conversation: any[]) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `
DU ER KUN EN JSON-EXTRACTOR.
Du skal IKKE svare brukeren. IKKE forklare. IKKE gi råd.
Returner kun gyldig JSON.

GYLDIG KATEGORI: ELEKTRIKER

Eksempler på elektrikertjenester i piloten:
- Tilkobling av platetopp/induksjon
- Komfyr og ovn
- Ny kurs til kjøkken


ENUMS (STRICT):
ceiling_height_type: "standard" | "high_sloped"
dimmer_circuit_type: "single" | "multi"
wall_type: "drywall" | "concrete"
wiring_type: "hidden" | "open"
ev_phase: "1-phase" | "3-phase"

Hvis ukjent → null.

Returner alltid feltene:
{
  "task_details": string|null,
  "materials_by_customer": boolean|null,
  "materials_description": string|null,
  "estimated_material_cost": number|null,

  "has_existing_point": boolean|null,
  "lamp_count": number|null,
  "ceiling_height_type": string|null,
  "switch_type": string|null,

  "socket_count": number|null,
  "is_grounded": boolean|null,
  "is_socket_accessible": boolean|null,

  "bulb_type": string|null,
  "dimmer_count": number|null,
  "dimmer_circuit_type": string|null,

  "ev_has_charger": boolean|null,
  "ev_distance_meters": number|null,
  "ev_phase": string|null,
  "ev_load_balancing": boolean|null,

  "troubleshoot_is_acute": boolean|null,

  "spot_count": number|null,
  "ceiling_type": string|null,
  "spot_needs_dimmer": boolean|null,

  "wall_type": string|null,
  "wiring_type": string|null,

  "appliance_type": string|null, // Hva skal kobles til (komfyr, platetopp, stikkontakt, etc)
  "fuse_box_has_space": boolean|null,
  "circuit_distance_meters": number|null,

  "outdoor_distance_meters": number|null,
  "outdoor_socket_count": number|null,
  "outdoor_weather_exposed": boolean|null,

  "intent": string|null,
  "user_question": string|null  // KUN hvis brukeren stiller et faktisk spørsmål som krever svar. Hvis brukeren svarer på et spørsmål (f.eks "Alt"), sett denne til null.
}
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversation,
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as any,
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

/**
 * ============================================================
 *  4) Missing Fields Logic
 * ============================================================
 */
function getMissingFields(payload: JobPayload) {
  const missing: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if ((payload as any)[field] === null || (payload as any)[field] === undefined) {
      missing.push(field);
    }
  }

  // Check for specific intents
  const d = (payload.task_details || "").toLowerCase();

  // New circuit -> Ask what appliance
  if (d.includes("ny kurs") || d.includes("egen kurs")) {
    if (!payload.appliance_type) {
      missing.push("appliance_type");
    }
  }

  if (payload.materials_by_customer === false && !payload.materials_description) {
    missing.push("materials_description");
  }

  return missing;
}

/**
 * ============================================================
 *  5) Question Builder (One question at a time)
 * ============================================================
 */
function buildQuestion(field: string) {
  switch (field) {
    case "task_details":
      return "Kan du kort beskrive hva du trenger hjelp til?";

    case "appliance_type":
      return "Hva skal kobles til den nye kursen? (F.eks platetopp, komfyr, elbillader eller vanlig stikkontakt?)";

    case "materials_by_customer":
      return "Har du utstyret/materialene selv, eller skal elektriker ta med?";

    case "materials_description":
      return "Hva trenger du at elektrikeren kjøper inn?";

    default:
      return "Kan du gi litt mer informasjon?";
  }
}

function answerUserQuestion(q: string) {
  const text = q.toLowerCase();

  // Lastbalansering
  if (text.includes("lastbalansering")) {
    return `Lastbalansering betyr at elbilladeren automatisk justerer ladeeffekten slik at du ikke overbelaster sikringsskapet når andre apparater brukes samtidig.\n\nØnsker du lastbalansering?`;
  }

  // 1-fase / 3-fase
  if (text.includes("1-fase") || text.includes("3-fase")) {
    return `1-fase og 3-fase handler om hvor mye effekt anlegget kan levere. 3-fase gir ofte raskere og mer stabil lading.\n\nVet du om boligen din har 1-fase eller 3-fase?`;
  }

  // Jordet kontakt
  if (text.includes("jordet") || text.includes("ujordet")) {
    return `Jordet stikkontakt har ekstra sikkerhet mot feilstrøm. På kjøkken, bad og utendørs er jordet vanligvis påkrevd.\n\nVet du om kontakten er jordet?`;
  }

  return `Kan du utdype eller forklare litt nærmere hva du mener?`;
}

/**
 * ============================================================
 *  API ROUTE
 * ============================================================
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const conversation = body.messages;

    const extracted: JobPayload = await aiInterpret(conversation);

    const missing = getMissingFields(extracted);


    if (extracted.user_question) {
      return NextResponse.json({
        message: answerUserQuestion(extracted.user_question),
      });
    }


    if (missing.length > 0) {
      return NextResponse.json({
        message: buildQuestion(missing[0]),
        missing_fields: missing,
      });
    }

    const hours = estimateHours(extracted);
    const price = calculatePrice(hours, extracted);

    return NextResponse.json({
      message: "Takk! Jeg har forstått oppdraget og laget et estimat.",
      analysis: {
        category: "ELEKTRIKER",
        intent: extracted.intent,
        estimated_price_min: price.min,
        estimated_price_max: price.max,
        hours: price.hours,
        structured_data: extracted,
        line_items: price.lineItems
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

