import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Check user role to determine redirect
            const { data: { user } } = await supabase.auth.getUser()
            let target = next

            if (user) {
                // We could check metadata, but robust way is profiles table.
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if ((profile as any)?.role === 'contractor') {
                    target = '/dashboard/contractor'
                } else if ((profile as any)?.role === 'customer') {
                    // target = '/dashboard/customer' // Defaulting to root or next for now if not explicit
                }
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocal = origin.includes('localhost')
            if (isLocal) {
                return NextResponse.redirect(`${origin}${target}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${target}`)
            } else {
                return NextResponse.redirect(`${origin}${target}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
