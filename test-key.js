const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Manually read .env.local to avoid needing dotenv package
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        // simple parse
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // remove quotes if any
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error("Could not read .env.local:", e.message);
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY not found in .env.local");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    console.log("Testing OpenAI API Key with model: gpt-4o-mini...");
    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: "Say 'Hello, World!' if you can hear me." }],
            model: "gpt-4o-mini",
        });

        console.log("Success! API Responded:");
        console.log(completion.choices[0].message.content);
    } catch (error) {
        console.error("API Error occurred:");
        console.error(error.message);
        if (error.code) console.error("Error Code:", error.code);
        if (error.status) console.error("HTTP Status:", error.status);
        if (error.type) console.error("Error Type:", error.type);
    }
}

main();
