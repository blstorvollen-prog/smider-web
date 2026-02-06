
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

    const structuredData = job?.structured_data as any
    // Handle potential nesting (analysis wrapper vs direct payload)
    const deepPayload = structuredData?.structured_data || structuredData
    const lineItems = structuredData?.line_items || deepPayload?.line_items || []

    // Description fallback
    const description = job?.description_raw || deepPayload?.task_details || deepPayload?.customer_description || 'Håndverkerjobb'

    const priceMax = job?.price_max || 0
    const priceMin = job?.price_min || 0

    // Ensure we have at least one line item for display
    const displayItems = lineItems.length > 0 ? lineItems : [
        { name: "Estimert oppdrag (Arbeid + Materiell)", amount: `${priceMax} kr` }
    ]

    return (
        <div className="container flex min-h-screen items-center justify-center py-10 bg-slate-50/50">
            <div className="w-full max-w-4xl grid gap-8 md:grid-cols-2">

                {/* Ordresammendrag */}
                <Card className="h-fit shadow-lg border-muted">
                    <CardHeader className="bg-slate-100/50 pb-4 border-b">
                        <CardTitle className="text-xl flex items-center justify-between">
                            <span>Ordresammendrag</span>
                            <span className="text-sm font-normal text-muted-foreground bg-white px-2 py-1 rounded border">Ref: {jobId.slice(0, 8)}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">

                        {/* Detaljer */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="block text-xs text-muted-foreground uppercase tracking-wider">Dato</span>
                                <span className="font-medium">{new Date(job?.created_at || Date.now()).toLocaleDateString('no-NO')}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-muted-foreground uppercase tracking-wider">Sted</span>
                                <span className="font-medium">{job?.location_address || 'Oslo'}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-muted-foreground uppercase tracking-wider">Kategori</span>
                                <span className="font-medium capitalize">{job?.main_category || 'Håndverker'} - {job?.subcategory || 'Generelt'}</span>
                            </div>
                        </div>

                        {/* Beskrivelse */}
                        <div className="pt-4 border-t border-dashed">
                            <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">Oppdragsbeskrivelse</h3>
                            <p className="text-sm italic text-foreground/80 bg-slate-50 p-3 rounded-md border text-muted-foreground">
                                "{description}"
                            </p>
                        </div>

                        {/* Spesifikasjon (Line Items) */}
                        <div className="space-y-3 pt-4 border-t border-dashed">
                            <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Kostnadsoverslag</h3>
                            <div className="space-y-2 text-sm">
                                {displayItems.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0 border-slate-100">
                                        <span className="text-foreground/90">{item.name}</span>
                                        <span className="font-mono font-medium text-foreground/80">{item.amount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total Summary */}
                        <div className="pt-4 mt-2 border-t-2 border-slate-200 flex flex-col gap-1">
                            <div className="flex justify-between items-baseline">
                                <span className="font-bold text-lg">Total å reservere</span>
                                <span className="font-extrabold text-2xl text-primary">{priceMax} kr</span>
                            </div>
                            <p className="text-xs text-muted-foreground text-right">
                                (Estimert sluttpris: {priceMin} - {priceMax} kr)
                            </p>
                            <div className="flex gap-2 mt-4 bg-blue-50/80 text-blue-800 p-3 rounded-md items-start">
                                <span className="text-lg">ℹ️</span>
                                <p className="text-xs leading-relaxed">
                                    Beløpet reserveres på kortet ditt, men trekkes ikke før jobben er utført og godkjent av deg.
                                </p>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Betaling */}
                <div className="space-y-6">
                    <Card className="border-primary/20 shadow-md">
                        <CardHeader>
                            <CardTitle>Betaling</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PaymentClient clientSecret={clientSecret} />
                            <p className="text-xs text-center text-muted-foreground mt-4">
                                Betalingen behandles sikkert av Stripe.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
