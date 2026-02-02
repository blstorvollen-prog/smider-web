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

async function seedUser() {
    console.log('Seeding Test User...');

    const email = 'test@handyman.com';
    const password = 'password123';

    const { data: user, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'customer' }
    });

    if (userError) {
        console.log('User creation result:', userError.message);
    } else {
        console.log('User created:', user.user.id);
        // Create profile
        await supabase.from('profiles').upsert({
            id: user.user.id,
            role: 'customer',
            full_name: 'Test Customer',
            phone: '99887766'
        });
    }
}

seedUser();
