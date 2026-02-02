'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin' // Added import
import Stripe from 'stripe'
import { redirect } from 'next/navigation'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20' as any,
})

import { findProviders } from '@/utils/matching'

// ... (other imports)

export async function createJob(data: any) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { error: 'Du må være logget inn for å legge ut en jobb', code: 'UNAUTHORIZED' }
        }

        // Ensure Profile Exists (Fix for FK violation)
        const supabaseAdmin = createAdminClient()
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            // Auto-create profile if missing
            console.log('Profile missing for user, creating default customer profile...')
            await (supabaseAdmin.from('profiles') as any).insert({
                id: user.id,
                role: 'customer',
                full_name: user?.email?.split('@')[0] || 'Unknown',
            })
        }

        if (!data || !data.estimated_price_max) {
            console.error("Missing price data", data)
            return { error: 'Kunne ikke opprette jobb: Mangler prisestimat.', code: 'INVALID_DATA' }
        }

        // 1. Create Job in DB
        const isHighValue = data.estimated_price_max > 100000
        const initialStatus = isHighValue ? 'manual_review' : 'draft'

        // Default to Oslo for MVP if not geocoded
        const lat = 59.9139
        const lng = 10.7522

        const { data: jobData, error: jobError } = await (supabase
            .from('jobs') as any)
            .insert({
                customer_id: user.id,
                description_raw: data.structured_data?.customer_description || data.structured_data?.task_details || data.explanation || "Ingen beskrivelse",
                structured_data: data,
                price_min: data.estimated_price_min,
                price_max: data.estimated_price_max,
                status: initialStatus,

                // New Fields Mapped from AI
                main_category: data.main_category,
                subcategory: data.subcategory,
                estimated_hours: data.estimated_hours,
                material_needed: data.material_needed,
                number_of_workers: data.number_of_workers,
                complexity: data.complexity,
                price_modifier: data.price_modifier,

                // Location (Mocked for MVP)
                customer_lat: lat,
                customer_lng: lng,
                location_address: 'Oslo (Mock)',
            })
            .select()
            .single()

        const job = jobData as any

        if (jobError) {
            console.error("Values DB Error", jobError)
            return { error: `Databasefeil: ${jobError.message}`, code: 'DB_ERROR' }
        }

        if (isHighValue) {
            return { highValue: true, jobId: job.id }
        }

        // 2. Create Stripe Payment Intent
        const amount = Math.round(data.estimated_price_max * 100)

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'nok',
            metadata: { jobId: job.id },
            capture_method: 'manual',
            automatic_payment_methods: { enabled: true },
        })

        await (supabase
            .from('jobs') as any)
            .update({ stripe_payment_intent_id: paymentIntent.id })
            .eq('id', job.id)

        return { clientSecret: paymentIntent.client_secret, jobId: job.id }

    } catch (error: any) {
        console.error("createJob Error:", error)
        return { error: error.message || 'Det oppstod en ukjent feil ved opprettelse av jobb.', code: 'UNKNOWN_ERROR' }
    }
}

export async function activateJob(jobId: string) {
    const supabase = await createClient()
    const { data: jobData } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    const job = jobData as any

    if (!job) return { error: 'Job not found' }
    if (!job.stripe_payment_intent_id) return { error: 'No payment intent found' }

    // Verify Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(job.stripe_payment_intent_id)
    if (paymentIntent.status === 'canceled') return { error: 'Payment canceled' }

    // Update Status
    await (supabase.from('jobs') as any).update({ status: 'pending_contractor' }).eq('id', jobId)

    // Routing Logic using Matching Algorithm
    // We need to pass the job details. using cast to ANY to avoid strict type checks for now as types might be out of sync in runtime vs compile
    const matchedProviders = await findProviders({
        main_category: job.main_category || job.structured_data?.main_category || 'handyman', // Fallback
        customer_lat: job.customer_lat || 59.9139,
        customer_lng: job.customer_lng || 10.7522
    }, supabase)

    console.log(`Found ${matchedProviders.length} matching providers for job ${jobId}`)

    if (matchedProviders && matchedProviders.length > 0) {
        // Create Offers
        const offers = matchedProviders.map((c: any) => ({
            job_id: jobId,
            contractor_id: c.id,
            status: 'pending',
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins
        }))

        const { data: createdOffers } = await (supabase.from('job_offers') as any).insert(offers).select()

        // AUTO-ACCEPT Logic for Demo (if Benjamin/Dummy is in the list)
        const dummyContractor = matchedProviders.find((c: any) => c.company_name?.includes('Elara') || c.company_name?.includes('Dummy'))
        const dummyOffer = dummyContractor
            ? createdOffers?.find((o: any) => o.contractor_id === dummyContractor.id)
            : null

        if (dummyOffer) {
            // Simulate instant acceptance
            await (supabase
                .from('job_offers') as any)
                .update({ status: 'accepted' })
                .eq('id', dummyOffer.id)

            await (supabase
                .from('jobs') as any)
                .update({ status: 'assigned' })
                .eq('id', jobId)
        }
    } else {
        console.log('No providers found matching logic.')
    }

    return { success: true }
}

export async function getCustomerJobs() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('jobs')
        .select(`
            *,
            job_offers (
                status,
                contractors (
                    company_name
                )
            )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

    return data || []
}

export async function acceptJobOffer(offerId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Verify this offer belongs to the user
    const { data: offerData } = await supabase
        .from('job_offers')
        .select('*')
        .eq('id', offerId)
        .eq('contractor_id', user.id)
        .single()

    const offer = offerData as any

    if (!offer) return { error: 'Offer not found or not yours' }

    // 2. Update Offer to Accepted
    const { error: offerError } = await (supabase
        .from('job_offers') as any)
        .update({ status: 'accepted' })
        .eq('id', offerId)

    if (offerError) return { error: offerError.message }

    // 3. Update Job to Assigned
    await (supabase
        .from('jobs') as any)
        .update({ status: 'assigned' })
        .eq('id', offer.job_id)

    // 4. Decline other pending offers for this job (Optional but good practice)
    await (supabase.from('job_offers') as any)
        .update({ status: 'declined' })
        .eq('job_id', offer.job_id)
        .neq('id', offerId)
        .eq('status', 'pending')

    return { success: true }
}

export async function declineJobOffer(offerId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { error } = await (supabase
        .from('job_offers') as any)
        .update({ status: 'declined' })
        .eq('id', offerId)
        .eq('contractor_id', user.id)

    if (error) return { error: error.message }
    return { success: true }
}

