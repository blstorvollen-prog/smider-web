import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'
import { signout } from '@/app/actions/auth'

export async function Navbar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let dashboardLink = '/dashboard/customer'
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        if ((profile as any)?.role === 'contractor') {
            dashboardLink = '/dashboard/contractor'
        }
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-32 items-center justify-between">
                <div className="mr-4 flex">
                    <Link className="mr-6 flex items-center space-x-2 font-bold" href="/">
                        <Image
                            src="/logo.png"
                            alt="Smider"
                            width={600}
                            height={200}
                            className="h-24 w-auto dark:invert"
                            priority
                        />
                    </Link>
                </div>
                <div className="flex items-center space-x-2">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link href={dashboardLink}>
                                <Button variant="ghost" size="sm">Min Side</Button>
                            </Link>
                            <form action={signout}>
                                <Button variant="outline" size="sm">Logg ut</Button>
                            </form>
                        </div>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" size="sm">Logg inn</Button>
                            </Link>
                            <Link href="/signup">
                                <Button size="sm">Kom i gang</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}
