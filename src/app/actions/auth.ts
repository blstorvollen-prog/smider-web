'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // Validate form data
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    // Additional fields for profile creation could be handled here or via triggers
    // For MVP, we'll just sign up and user can update profile later or we auto-create via trigger

    const headersList = await headers()
    const origin = headersList.get('origin')

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }


    return { message: 'Check email to continue sign in process' }
}


export async function signupContractor(formData: FormData) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const orgNr = formData.get('orgNr') as string
    const companyName = formData.get('companyName') as string
    const contactPerson = formData.get('contactPerson') as string
    const phone = formData.get('phone') as string

    if (!email || !password || !orgNr || !companyName) {
        return { error: 'Mangler påkrevde felt' }
    }

    const headersList = await headers()
    const origin = headersList.get('origin')

    // 1. Sign up auth user (Client side trigger of auth, but we need the ID)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: contactPerson,
                role: 'contractor',
            },
            emailRedirectTo: `${origin}/auth/callback`,
        },
    })

    if (authError) {
        console.error('Auth signup failed:', authError)
        return { error: 'Kunne ikke opprette bruker: ' + authError.message }
    }

    if (!authData.user) {
        return { error: 'Kunne ikke opprette bruker (Ingen data)' }
    }

    let userId = authData.user.id

    // Verify user actually exists in auth.users (Supabase security might return fake user if email taken)
    // We use the admin client's auth API to verify.
    const { data: realUser, error: realUserError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (realUserError || !realUser.user) {
        console.error('Real user check failed:', realUserError)
        // If we can't find the user, it is likely because Supabase returned a fake user for an existing email.
        return { error: 'En bruker med denne e-posten eksisterer allerede. Vennligst logg inn.' }
    }

    // 2. Create Profile using Admin Client to bypass RLS
    // We try to insert, but handle duplicates if auth trigger already created it
    const { error: profileError } = await (supabaseAdmin
        .from('profiles') as any) // Type bypass intact
        .insert({
            id: userId,
            role: 'contractor',
            full_name: contactPerson,
            phone: phone,
        })
        .select()

    if (profileError) {
        if (profileError.code === '23505') { // Unique violation
            const { error: updateProfileError } = await (supabaseAdmin
                .from('profiles') as any)
                .update({
                    role: 'contractor',
                    full_name: contactPerson,
                    phone: phone
                })
                .eq('id', userId)

            if (updateProfileError) {
                console.error('Profile update failed:', updateProfileError)
                return { error: 'Kunne ikke oppdatere profil' }
            }
        } else {
            console.error('Profile creation failed:', profileError)
            return { error: 'Kunne ikke opprette profil: ' + profileError.message }
        }
    }

    // 3. Create Contractor Entry using Admin Client
    const { error: contractorError } = await (supabaseAdmin
        .from('contractors') as any)
        .insert({
            id: userId,
            company_name: companyName,
            org_nr: orgNr,
            is_available: true
        })

    if (contractorError) {
        // If contractor entry already exists, consider it a success or update
        if (contractorError.code === '23505') {
            // Already registered as contractor, maybe update info?
            const { error: updateContractorError } = await (supabaseAdmin
                .from('contractors') as any)
                .update({
                    company_name: companyName,
                    org_nr: orgNr
                })
                .eq('id', userId)

            if (updateContractorError) console.error('Contractor update failed:', updateContractorError)
        } else {
            console.error('Contractor creation failed:', contractorError)
            return { error: 'Kunne ikke opprette bedriftsdetaljer: ' + contractorError.message }
        }
    }

    return { message: 'Registrering vellykket! Sjekk e-posten din for å bekrefte.' }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signupConsumer(formData: FormData) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phone = formData.get('phone') as string

    if (!email || !password || !firstName || !lastName) {
        return { error: 'Mangler påkrevde felt' }
    }

    const headersList = await headers()
    const origin = headersList.get('origin')

    // 1. Sign up auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: `${firstName} ${lastName}`,
                role: 'customer',
            },
            emailRedirectTo: `${origin}/auth/callback`,
        },
    })

    if (authError) {
        console.error('Auth signup failed:', authError)
        return { error: 'Kunne ikke opprette bruker: ' + authError.message }
    }

    if (!authData.user) {
        return { error: 'Kunne ikke opprette bruker (Ingen data)' }
    }

    let userId = authData.user.id

    // 2. Create/Update Profile
    const { error: profileError } = await (supabaseAdmin
        .from('profiles') as any)
        .insert({
            id: userId,
            role: 'customer',
            full_name: `${firstName} ${lastName}`,
            phone: phone,
        })
        .select()

    if (profileError) {
        if (profileError.code === '23505') {
            const { error: updateError } = await (supabaseAdmin
                .from('profiles') as any)
                .update({
                    role: 'customer',
                    full_name: `${firstName} ${lastName}`,
                    phone: phone,
                })
                .eq('id', userId)

            if (updateError) {
                console.error('Profile update failed', updateError)
                return { error: 'Kunne ikke oppdatere profil' }
            }
        } else {
            console.error('Profile creation failed:', profileError)
            return { error: 'Kunne ikke opprette profil' }
        }
    }

    return { message: 'Registrering vellykket! Sjekk e-posten din.' }
}
