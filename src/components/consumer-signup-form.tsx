'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { signupConsumer } from '@/app/actions/auth'
import { Loader2 } from 'lucide-react'

export function ConsumerSignupForm() {
    const [isPending, setIsPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setIsPending(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await signupConsumer(formData)
            if (res.error) {
                setError(res.error)
            } else if (res.message) {
                setSuccess(res.message)
            }
        } catch (err) {
            setError('Noe gikk galt. Prøv igjen senere.')
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>Registrer Deg (Privat)</CardTitle>
                <CardDescription>Opprett konto for å legge ut oppdrag</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Fornavn</Label>
                            <Input id="firstName" name="firstName" required placeholder="Ola" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Etternavn</Label>
                            <Input id="lastName" name="lastName" required placeholder="Nordmann" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">E-post</Label>
                        <Input id="email" name="email" type="email" required placeholder="ola@example.com" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input id="phone" name="phone" required placeholder="99887766" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="address">Adresse</Label>
                            <Input id="address" name="address" required placeholder="Storgata 1" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="zipCode">Postnummer</Label>
                            <Input id="zipCode" name="zipCode" required placeholder="0123" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Passord</Label>
                        <Input id="password" name="password" type="password" required />
                    </div>

                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    {success && <div className="text-green-500 text-sm">{success}</div>}

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Registrerer...
                            </>
                        ) : (
                            'Registrer'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
