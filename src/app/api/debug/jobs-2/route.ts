
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = createAdminClient()

    // Insert logic to test DB info
    const { data: inserted, error: insertError } = await (supabase
        .from('jobs') as any)
        .insert({
            customer_id: 'test-user-id',
            description_raw: 'Debug Job 2',
            price_min: 100,
            price_max: 200,
            status: 'draft'
        })
        .select()

    // Fetch last 10 jobs
    const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    return NextResponse.json({
        msg: "DEBUG 2",
        jobs,
        insertError
    })
}
