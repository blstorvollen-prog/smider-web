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
  ELEKTRIKER: ["task_details", "materials_by_customer"],
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
  estimated_material_cost?: number;
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
  ELEKTRIKER: () => 2.5,
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
- task_details (tekstlig beskrivelse)
- materials_description (string: HVIS materials_by_customer=false: Hva skal kjøpes inn? F.eks "Hvit maling, pensler, gipsplater". Hvis ukjent, null.)
- estimated_material_cost (number: HVIS materials_by_customer=false OG materials_description er kjent: Gjør et kvalifisert estimat på materialkostnad i NOK. Vær konservativ. F.eks 2000 for maling av et rom.)
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
