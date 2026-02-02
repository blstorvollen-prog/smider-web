import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
    const supabase = createAdminClient()
    const email = 'test_consumer@example.com'
    const fullName = 'Test Consumer'

    // 1. Find or Create User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) return NextResponse.json({ error: userError }, { status: 500 })

    let user = users.find(u => u.email === email)

    if (!user) {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: 'Password123',
            email_confirm: true,
            user_metadata: { full_name: fullName, role: 'customer' }
        })
        if (error) return NextResponse.json({ error }, { status: 500 })
        user = data.user
    }

    // 2. Upsert Profile
    // Note: address/zip_code might fail if column doesn't exist yet (user needs to run migration)
    // We try/catch or just ignore error for now
    const { error: profileError } = await (supabase
        .from('profiles') as any)
        .upsert({
            id: user.id,
            role: 'customer',
            full_name: fullName,
            phone: '12345678',
            address: 'Testveien 12',
            zip_code: '1234'
        })

    if (profileError) console.error('Profile error:', profileError)

    // 3. Create Dummy Job (History)
    const { error: jobError } = await (supabase
        .from('jobs') as any)
        .insert({
            customer_id: user.id,
            description_raw: 'Reparere lekk kran',
            main_category: 'plumber',
            price_min: 1500,
            price_max: 2500,
            status: 'completed',
            created_at: new Date(Date.now() - 86400000 * 5).toISOString()
        })

    if (jobError) console.error('Job error:', jobError)

    return NextResponse.json({ message: 'Seed consumer complete' })
}
