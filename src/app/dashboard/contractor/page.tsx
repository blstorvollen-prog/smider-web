import { createClient } from '@/utils/supabase/server'
import { OfferList } from '@/components/offer-list'

export default async function ContractorDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Vennligst logg inn</div>

    // Fetch incoming offers
    const { data: offers } = await supabase
        .from('job_offers')
        .select(`
          *,
          job:jobs (
            description_raw,
            price_min,
            price_max,
            location_address,
            structured_data
          )
        `)
        .eq('contractor_id', user.id)
        .eq('status', 'pending')

    // Fetch active jobs
    const { data: activeJobs } = await supabase
        .from('job_offers')
        .select(`
            *,
            job:jobs (
                description_raw,
                structured_data
            )
        `)
        .eq('contractor_id', user.id)
        .eq('status', 'accepted')

    return (
        <div className="container py-10 space-y-8">
            <h1 className="text-3xl font-bold">Håndverker Panel</h1>

            <section>
                <h2 className="text-xl font-semibold mb-4">Nye Jobbtilbud</h2>
                {/* We pass the server actions AND data to the client component */}
                <OfferList offers={offers || []} />
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4">Aktive Jobber</h2>
                {/* Active jobs list can remain simple or also be a component */}
                <div className="grid gap-4 md:grid-cols-2">
                    {activeJobs?.map((offer: any) => (
                        <div key={offer.id} className="border-l-4 border-l-green-500 rounded bg-white p-4 shadow-sm">
                            <h3 className="font-bold text-lg mb-1">Aktiv Jobb</h3>
                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded-full">Pågår</span>
                            <p className="mt-2">{(offer.job?.structured_data as any)?.summary || offer.job?.description_raw}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {new Date(offer.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                    {(!activeJobs || activeJobs.length === 0) && <p className="text-muted-foreground">Ingen aktive jobber.</p>}
                </div>
            </section>
        </div>
    )
}
