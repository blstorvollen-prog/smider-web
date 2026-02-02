'use client'

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search } from 'lucide-react'

export function JobList({ jobs }: { jobs: any[] }) {
    if (!jobs || jobs.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
                Ingen aktive jobber. Bruk skjemaet ovenfor til å legge ut en!
            </div>
        )
    }

    const translateStatus = (status: string) => {
        switch (status) {
            case 'draft': return 'Utkast (Venter på betaling)';
            case 'pending_contractor': return 'Søker etter håndverker...';
            case 'assigned': return 'Tildelt / Pågår';
            case 'completed': return 'Fullført';
            default: return status.replace('_', ' ');
        }
    }

    return (
        <div className="space-y-4">
            {jobs.map((job) => {
                const acceptedOffer = job.job_offers?.find((o: any) => o.status === 'accepted');
                const contractorName = acceptedOffer?.contractors?.company_name;
                const isSearching = job.status === 'pending_contractor';

                return (
                    <Card key={job.id} className={isSearching ? "border-primary/50 animate-pulse-subtle" : ""}>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {(job.structured_data as any)?.summary || 'Håndverkerjobb'}
                                    {isSearching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                </CardTitle>
                                <Badge variant={
                                    job.status === 'completed' ? 'default' :
                                        job.status === 'assigned' ? 'secondary' :
                                            isSearching ? 'default' : 'outline'
                                }>
                                    {translateStatus(job.status)}
                                </Badge>
                            </div>
                            <CardDescription>{new Date(job.created_at).toLocaleDateString()}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm"><strong>Prisestimat:</strong> {job.price_min}-{job.price_max} NOK</p>

                            {isSearching && (
                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-center gap-3">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                                        <div className="relative bg-white rounded-full p-2 border border-primary/20">
                                            <Search className="h-5 w-5 text-primary animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-primary">Søker etter ledige håndverkere i ditt område...</span>
                                        <span className="text-xs text-muted-foreground">Vi varsler deg så fort noen tar jobben!</span>
                                    </div>
                                </div>
                            )}

                            {contractorName && (
                                <div className="p-3 bg-green-50 rounded-md space-y-1 border border-green-100">
                                    <p className="text-sm"><strong>Utføres av:</strong> {contractorName}</p>
                                    <p className="text-sm"><strong>Tidspunkt:</strong> Kommer (Avtales med håndverker)</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
