
import { PaymentClient } from './payment-client'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }> // Next 15+ compatible or current
}

export default async function PaymentPage({ searchParams }: Props) {
    const params = await searchParams
    const clientSecret = params.clientSecret as string
    const jobId = params.jobId as string

    if (!clientSecret || !jobId) return <div>Invalid Payment Link</div>

    const supabase = await createClient()
    const { data: job } = await (supabase
        .from('jobs') as any)
        .select('*')
        .eq('id', jobId)
        .single()

    // Fallback if not found or no structured data
    const summary = (job?.structured_data as any)?.summary || 'Håndverkerjobb'
    const priceMax = job?.price_max || 0
    const priceMin = job?.price_min || 0

    return (
        <div className="container flex min-h-screen items-center justify-center py-10">
            <div className="w-full max-w-md space-y-6">

                {/* Ordresammendrag */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ordresammendrag</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Beskrivelse</p>
                            <p>{summary}</p>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                            <span className="font-semibold">Total å reservere</span>
                            <span className="font-bold text-lg">{priceMax} NOK</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            (Prisestimat: {priceMin} - {priceMax} NOK)
                        </p>
                    </CardContent>
                </Card>

                {/* Betaling */}
                <div className="p-4 border rounded-lg shadow bg-card">
                    <h1 className="text-2xl font-bold mb-4">Fullfør din bestilling</h1>
                    <PaymentClient clientSecret={clientSecret} />
                </div>
            </div>
        </div>
    )
}
