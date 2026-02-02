import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HighValueJobPage({ searchParams }: Props) {
    const params = await searchParams
    const jobId = params.jobId as string

    if (!jobId) return <div>Ugyldig lenke</div>

    const supabase = await createClient()
    const { data: job } = await (supabase
        .from('jobs') as any)
        .select('*')
        .eq('id', jobId)
        .single()

    // Fallback if not found or no structured data
    const summary = (job?.structured_data as any)?.summary || 'Stort håndverkerprosjekt'
    const priceMin = job?.price_min || 0
    const priceMax = job?.price_max || 0

    return (
        <div className="container flex min-h-screen items-center justify-center py-10">
            <div className="w-full max-w-md space-y-6">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-2xl text-primary">Prosjekt registrert</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-lg font-medium">
                            Takk for din forespørsel!
                        </p>
                        <p className="text-muted-foreground">
                            Dette prosjektet har et estimat på over 100 000 NOK.
                            For jobber av denne størrelsen kobler vi deg direkte med våre største leverandører for manuell oppfølging.
                        </p>

                        <div className="bg-background p-4 rounded-lg border my-4">
                            <h3 className="font-semibold mb-2">Sammendrag</h3>
                            <p className="text-sm text-muted-foreground mb-2">{summary}</p>
                            <p className="text-sm font-medium">Estimert ramme: {priceMin.toLocaleString()} - {priceMax.toLocaleString()} NOK</p>
                        </div>

                        <p className="text-sm">
                            En rådgiver vil kontakte deg innen 24 timer for å gjennomgå detaljene. Betaling skjer ikke via denne portalen.
                        </p>

                        <div className="pt-4">
                            <Link href="/dashboard/customer">
                                <Button className="w-full">Gå til min side</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
