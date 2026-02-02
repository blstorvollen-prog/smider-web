import { AuthForm } from '@/components/auth-form'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Opprett Konto</CardTitle>
                    <CardDescription>Velg kontotype for å komme i gang</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Link href="/signup/consumer">
                        <Button className="w-full" variant="default" size="lg">
                            Jeg er Privatkunde
                        </Button>
                    </Link>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Eller</span>
                        </div>
                    </div>
                    <Link href="/signup/contractor">
                        <Button className="w-full" variant="outline" size="lg">
                            Jeg er Håndverker
                        </Button>
                    </Link>
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        Har du allerede konto? <Link href="/login" className="underline">Logg inn</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
