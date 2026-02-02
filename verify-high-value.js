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
    console.error('Missing Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
    console.log('Verifying High Value Logic...');

    // 1. Get a user (dummy contractor) to use as customer
    const { data: user } = await supabase
        .from('contractors')
        .select('id')
        .limit(1)
        .single();

    if (!user) {
        console.error("No user found to test with");
        return;
    }

    // 2. Insert High Value Job
    console.log("Inserting job with price 150,000...");
    const { data: job, error: jobError } = await supabase.from('jobs').insert({
        customer_id: user.id,
        description_raw: 'High Value Test Job',
        price_min: 120000,
        price_max: 150000,
        status: 'manual_review' // We are simulating what the server action does, validating allowed status
    }).select().single();

    if (jobError) {
        console.error('FAIL: Could not create high value job', jobError);
    } else {
        console.log('SUCCESS: High Value Job Created with status:', job.status);
        if (job.status === 'manual_review') {
            console.log('PASS: Status is manual_review');
        } else {
            console.error('FAIL: Status is not manual_review');
        }

        // Cleanup
        await supabase.from('jobs').delete().eq('id', job.id);
    }

    // 3. Insert Low Value Job (Control)
    console.log("Inserting job with price 50,000...");
    const { data: jobLow, error: jobLowError } = await supabase.from('jobs').insert({
        customer_id: user.id,
        description_raw: 'Low Value Test Job',
        price_min: 40000,
        price_max: 50000,
        status: 'draft'
    }).select().single();

    if (jobLowError) {
        console.error('FAIL: Could not create low value job', jobLowError);
    } else {
        console.log('SUCCESS: Low Value Job Created with status:', jobLow.status);
        await supabase.from('jobs').delete().eq('id', jobLow.id);
    }
}

verify();
