const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
    console.log('Seeding Dummy Contractor...');

    const DUMMY_ID = 'd0mmy-us3r-id00-0000-000000000000';

    // 1. Check if user exists (can't easily check auth.users via client usually, but can try insert profile)
    // We will just insert profile/contractor directly.
    // If foreign key constraint fails on auth.users, we might be stuck without admin API for Auth.
    // BUT, using service_role should allow us to use admin.auth.

    const { data: user, error: userError } = await supabase.auth.admin.createUser({
        email: 'dummy@handyman.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: { role: 'contractor' }
    });

    let userId = user?.user?.id;

    if (userError) {
        console.log('User creation check:', userError.message);
        // If user already exists, we need their ID.
        // We can't list users easily?
        // Let's assume we can proceed if we find the profile.
        if (userError.message.includes('already been registered')) {
            // We can't query auth users easily to get ID by email without listUsers permission? 
            // Admin client has listUsers.
            const { data: users } = await supabase.auth.admin.listUsers();
            const existing = users.users.find(u => u.email === 'dummy@handyman.com');
            if (existing) userId = existing.id;
        }
    }

    // Force the ID to match our hardcoded one? 
    // Actually, relying on a hardcoded ID in actions/job.ts is brittle if we generate a new random UUID.
    // Better: Update actions/job.ts to find the contractor by email or company name?
    // OR: Just use the ID we found/created here.

    // Let's use the DUMMY_ID for consistency if we can.
    // We can't force ID in createUser easily.

    // PLAN CHANGE: We will update actions/job.ts to look for 'dummy@handyman.com' in profiles, 
    // OR we just assume the specific ID is not needed, we just need ANY contractor that is "Dummy".
    // I will update the logic to find contractor with company_name 'Rask Fiks AS (Dummy)'.

    if (userId) {
        console.log('Using User ID:', userId);

        // 2. Profile
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            role: 'contractor',
            full_name: 'Auto-Reply Handyman',
            phone: '12345678'
        });
        if (profileError) console.error('Profile Error:', profileError);

        // 3. Contractor
        const { error: contractorError } = await supabase.from('contractors').upsert({
            id: userId,
            company_name: 'Rask Fiks AS (Dummy)',
            org_nr: '999999999',
            // location: PostGIS point is hard via JS client without raw sql or specific format?
            // checking if we can send text representation?
            // Or just skip location for now (nullable?).
            // Schema has `location geography(POINT)`.
            // We can try sending WKT string? 'POINT(10.75 59.91)'
            // Supabase client often handles it if we cast.
        });
        if (contractorError) console.error('Contractor Error:', contractorError);

        console.log('Seeding Complete for ID:', userId);
    }
}

seed();
