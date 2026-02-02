import { ChatInterface } from '@/components/chat-interface'
import { createClient } from '@/utils/supabase/server'
import { JobList } from '@/components/job-list'
import { getCustomerJobs, activateJob } from '@/app/actions/job'
import { Separator } from '@/components/ui/separator'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CustomerDashboard({ searchParams }: Props) {
    // Await searchParams before access in Next.js 15+ (if using 15), 
    // but for 14 it's sync usually, but good practice to handle promise if typed as promise.
    // The type Props suggests promise.
    const params = await searchParams
    const paymentIntent = params.payment_intent
    const jobId = params.jobId // We might not get jobId back from Stripe unless we put it in return_url params or check metadata via server.
    // Actually Stripe return_url appends payment_intent and payment_intent_client_secret.
    // We don't get 'jobId' unless we passed it.
    // In payment/page.tsx check: return_url: `${window.location.origin}/dashboard/customer`
    // We didn't append jobId there. 
    // But we can find the job by paymentIntent ID.

    if (paymentIntent && typeof paymentIntent === 'string') {
        // Attempt to activate the job if we just returned from Stripe
        // This makes sure status updates to 'pending_contractor' (and then 'assigned' via our new auto-accept logic)
        // We find the job by the intent ID in the DB, so we don't strictly need jobId param, but activateJob takes jobId.
        // Let's look up the job first.
        const supabase = await createClient()
        const { data: jobByIntent } = await (supabase
            .from('jobs') as any)
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntent)
            .single()

        if (jobByIntent) {
            await activateJob(jobByIntent.id)
        }
    }

    const jobs = await getCustomerJobs()

    return (
        <div className="container py-10 space-y-8">
            <div>
                <h1 className="mb-4 text-3xl font-bold">Ny Jobb</h1>
                <div className="mx-auto max-w-2xl">
                    <ChatInterface />
                </div>
            </div>

            <Separator />

            <div>
                <h2 className="mb-4 text-2xl font-bold">Dine Jobber</h2>
                <JobList jobs={jobs} />
            </div>
        </div>
    )
}
