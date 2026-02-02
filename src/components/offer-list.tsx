'use client'

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { acceptJobOffer, declineJobOffer } from '@/app/actions/job'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function OfferList({ offers }: { offers: any[] }) {
    const [loading, setLoading] = useState<string | null>(null)
    const router = useRouter()

    const handleAccept = async (offerId: string) => {
        setLoading(offerId)
        try {
            const res = await acceptJobOffer(offerId)
            if (res.error) {
                alert(res.error)
            } else {
                router.refresh()
            }
        } finally {
            setLoading(null)
        }
    }

    const handleDecline = async (offerId: string) => {
        setLoading(offerId)
        try {
            const res = await declineJobOffer(offerId)
            if (res.error) {
                alert(res.error)
            } else {
                router.refresh()
            }
        } finally {
            setLoading(null)
        }
    }

    if (!offers || offers.length === 0) {
        return <p className="text-muted-foreground">Ingen nye tilbud.</p>
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {offers.map((offer: any) => (
                <Card key={offer.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Jobbforespørsel</span>
                            <Badge>Ny</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-lg">
                                {(offer.job?.structured_data as any)?.summary || 'Håndverkerjobb'}
                            </h4>
                            <p className="font-medium text-sm text-muted-foreground">{offer.job?.description_raw}</p>
                            <div className="flex justify-between items-center mt-4 p-3 bg-muted rounded-md">
                                <span className="text-sm">Estimat:</span>
                                <span className="font-bold text-lg">{offer.job?.price_min}-{offer.job?.price_max} NOK</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">📍 {offer.job?.location_address || 'Ukjent sted'}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleAccept(offer.id)}
                            disabled={loading === offer.id}
                        >
                            {loading === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Godta Jobb'}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleDecline(offer.id)}
                            disabled={loading === offer.id}
                        >
                            Avslå
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
