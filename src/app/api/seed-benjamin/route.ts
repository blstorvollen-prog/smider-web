import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
    const supabase = createAdminClient()
    const email = 'benjamin@elara.no'

    // 1. Find User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) return NextResponse.json({ error: userError }, { status: 500 })

    const user = users.find(u => u.email === email)

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Ensure Profile is Contractor
    const { error: profileError } = await (supabase
        .from('profiles') as any)
        .upsert({
            id: user.id,
            role: 'contractor',
            full_name: 'Benjamin Contractor',
            phone: '99887766'
        })

    if (profileError) console.error('Profile error:', profileError)

    // 3. Ensure Contractor Entry
    const { error: contractorError } = await (supabase
        .from('contractors') as any)
        .upsert({
            id: user.id,
            company_name: 'Elara AS',
            org_nr: '999111222',
            is_available: true,
            category: ['plumber', 'handyman', 'electrician', 'carpenter', 'painter', 'tiler', 'hvac', 'roofer', 'landscaper', 'cleaner'],
            latitude: 59.9139,
            longitude: 10.7522,
            service_radius_km: 50
        })

    if (contractorError) console.error('Contractor error:', contractorError)

    // 4. Create Dummy Job (Pending)
    const { data: job, error: jobError } = await (supabase
        .from('jobs') as any)
        .insert({
            customer_id: user.id, // Self-job for simplicity
            description_raw: 'Fikse lekkasje på kjøkkenet',
            location_address: 'Karl Johans gate 1, Oslo',
            price_min: 2000,
            price_max: 4000,
            status: 'pending_contractor'
        })
        .select()
        .single()

    if (jobError) console.error('Job creation error:', jobError)
    else {
        // Create Offer
        await (supabase
            .from('job_offers') as any)
            .insert({
                job_id: job.id,
                contractor_id: user.id,
                status: 'pending',
                expires_at: new Date(Date.now() + 86400000).toISOString()
            })
    }

    // 5. Create Dummy Job (History/Completed)
    const { data: job2, error: job2Error } = await (supabase
        .from('jobs') as any)
        .insert({
            customer_id: user.id,
            description_raw: 'Male soverom',
            location_address: 'Storgata 2, Oslo',
            price_min: 5000,
            price_max: 8000,
            status: 'completed'
        })
        .select()
        .single()

    if (job2Error) console.error('Job2 error:', job2Error)
    else {
        // Create Offer (Accepted)
        await (supabase
            .from('job_offers') as any)
            .insert({
                job_id: job2.id,
                contractor_id: user.id,
                status: 'accepted',
                expires_at: new Date(Date.now() - 86400000).toISOString()
            })
    }

    return NextResponse.json({ message: 'Seeding complete' })
}
