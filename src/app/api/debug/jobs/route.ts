import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = createAdminClient()

    // Insert logic to test DB info
    const { data: inserted, error: insertError } = await (supabase
        .from('jobs') as any)
        .insert({
            customer_id: 'test-user-id', // Assuming auth is optional or we need a real ID?
            // Usually customer_id references auth.users. Admin client can bypass FK if it's not enforced?
            // Actually supabase enforces FK on auth.users usually.
            // Let's rely on the fact that we might have a user 
            // OR let's just list profiles content to see if we have valid IDs.
            description_raw: 'Debug Job',
            price_min: 100,
            price_max: 200,
            status: 'draft'
        })
        .select()
    // If customer_id FK fails, we will see it in insertError.

    // Fetch last 10 jobs
    const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    // Fetch profiles
    const { data: profiles } = await supabase.from('profiles').select('*').limit(5)

    return NextResponse.json({
        jobs,
        profileCount: profiles?.length,
        profiles,
        insertAttempt: inserted,
        insertError
    })
}
