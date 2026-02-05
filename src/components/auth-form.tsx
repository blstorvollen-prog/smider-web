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
import { login, signup } from '@/app/actions/auth'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export function AuthForm({ type }: { type: 'login' | 'signup' }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setError(null)
        setMessage(null)

        const formData = new FormData()
        formData.append('email', values.email)
        formData.append('password', values.password)

        startTransition(async () => {
            try {
                if (type === 'login') {
                    const res = await login(formData)
                    if (res?.error) setError(res.error)
                } else {
                    const res = await signup(formData)
                    if (res?.error) setError(res.error)
                    const msg = (res as any).message;
                    if (msg) setMessage(msg)
                }
            } catch (e) {
                setError('Something went wrong')
            }
        })
    }

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>{type === 'login' ? 'Logg inn' : 'Registrer deg'}</CardTitle>
                <CardDescription>
                    {type === 'login'
                        ? 'Logg inn med din bruker for å fortsette.'
                        : 'Opprett en konto for å komme i gang'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-post</FormLabel>
                                    <FormControl>
                                        <Input placeholder="m@example.com" {...field} />
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
                            {isPending ? 'Laster...' : type === 'login' ? 'Logg inn' : 'Registrer deg'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <div className="flex flex-col items-center gap-4 w-full px-6 pb-6">
                <div className="w-full border-t" />
                <div className="space-y-2 text-center w-full">
                    <p className="text-xs font-medium text-foreground">
                        Ønsker du tilgang?
                    </p>
                    <Button variant="outline" className="w-full text-xs" asChild>
                        <a href="mailto:pilot@smider.no?subject=Forespørsel om tilgang til Smider&body=Hei, jeg ønsker gjerne tilgang til testversjonen av Smider.%0D%0A%0D%0ANavn:%20%0D%0ATelefon:%20">
                            Send forespørsel til pilot@smider.no
                        </a>
                    </Button>
                </div>
            </div>
        </Card>
    )
}
