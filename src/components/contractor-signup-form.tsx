'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { signupContractor } from '@/app/actions/auth'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
    orgNr: z.string().length(9, 'Organisasjonsnummer må være 9 siffer'),
    companyName: z.string().min(2, 'Firmanavn må være minst 2 tegn'),
    address: z.string().min(2, 'Adresse må fylles ut'),
    contactPerson: z.string().min(2, 'Kontaktperson må fylles ut'),
    phone: z.string().min(8, 'Telefonnummer må være minst 8 siffer'),
    email: z.string().email('Ugyldig e-post'),
    password: z.string().min(6, 'Passordet må være minst 6 tegn'),
})

export function ContractorSignupForm() {
    const [isPending, startTransition] = useTransition()
    const [isFetching, setIsFetching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            orgNr: '',
            companyName: '',
            address: '',
            contactPerson: '',
            phone: '',
            email: '',
            password: '',
        },
    })

    async function fetchOrgData() {
        const orgNr = form.getValues('orgNr')
        if (orgNr.length !== 9) {
            form.setError('orgNr', { message: 'Organisasjonsnummer må være 9 siffer' })
            return
        }

        setIsFetching(true)
        setError(null)
        try {
            const res = await fetch(`/api/brreg?orgNr=${orgNr}`)
            if (!res.ok) {
                if (res.status === 404) throw new Error('Fant ikke bedriften')
                throw new Error('Kunne ikke hente data')
            }
            const data = await res.json()

            form.setValue('companyName', data.navn || '')
            // Brreg returns address as object/list usually, checking my API route logic
            // My API route returns: { navn: data.navn, forretningsadresse: data.forretningsadresse }
            // forretningsadresse is usually an object with adresse (array), poststed, postnummer
            const addr = data.forretningsadresse
            if (addr) {
                const street = addr.adresse ? addr.adresse.join(', ') : ''
                const city = addr.poststed || ''
                const zip = addr.postnummer || ''
                form.setValue('address', `${street}, ${zip} ${city}`)
            }

        } catch (e: any) {
            setError(e.message)
        } finally {
            setIsFetching(false)
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setError(null)
        setMessage(null)

        const formData = new FormData()
        Object.keys(values).forEach(key => {
            formData.append(key, values[key as keyof typeof values])
        })

        startTransition(async () => {
            try {
                const res = await signupContractor(formData)
                if (res?.error) setError(res.error)
                const msg = (res as any).message
                if (msg) setMessage(msg)
            } catch (e) {
                setError('Noe gikk galt')
            }
        })
    }

    return (
        <Card className="w-[450px]">
            <CardHeader>
                <CardTitle>Registrer bedrift</CardTitle>
                <CardDescription>
                    Registrer din håndtverkerbedrift for å få oppdrag
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex gap-2 items-end">
                            <FormField
                                control={form.control}
                                name="orgNr"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Organisasjonsnummer</FormLabel>
                                        <FormControl>
                                            <Input placeholder="999888777" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={fetchOrgData}
                                disabled={isFetching}
                            >
                                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hent data'}
                            </Button>
                        </div>

                        <FormField
                            control={form.control}
                            name="companyName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Firmanavn</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Bedrift AS" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Adresse</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Storgata 1, 0101 Oslo" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="contactPerson"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kontaktperson</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ola Nordmann" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefon</FormLabel>
                                        <FormControl>
                                            <Input placeholder="12345678" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-post (Innlogging)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="post@bedrift.no" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Passord</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {message && <p className="text-sm text-green-500">{message}</p>}

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrerer... </> : 'Registrer bedrift'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:underline"
                >
                    Har du allerede en konto? Logg inn
                </Link>
            </CardFooter>
        </Card>
    )
}
