
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatInterface } from '@/components/chat-interface'
import { createClient } from '@/utils/supabase/server'
import { Lock, Construction } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const suggestions = [
    "Bytte stikkontakt",
    "Montere elbillader",
    "Henge opp lampe",
    "Ny kurs til kjøkken",
    "Bytte dimmere"
  ]

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">

        <div className="max-w-md w-full space-y-8 p-10 border rounded-2xl bg-background/50 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-2xl">
              <Construction className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Smider
              </h1>
              <div className="flex items-center justify-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-500 px-3 py-1 rounded-full text-xs font-medium w-fit mx-auto border border-yellow-200 dark:border-yellow-800">
                <Lock className="w-3 h-3" />
                Under Utvikling
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-lg font-medium text-foreground">
              Vi bygger fremtidens håndverkertjeneste.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plattformen er foreløpig stengt for offentligheten mens vi optimaliserer opplevelsen.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/login" className="w-full block">
              <Button className="w-full h-11 text-base" size="lg">
                Logg inn for å teste
              </Button>
            </Link>
            <p className="mt-4 text-xs text-muted-foreground">
              Kun for inviterte testbrukere.
            </p>
          </div>
        </div>

        <div className="absolute bottom-8 text-xs text-muted-foreground/50">
          &copy; 2024 Smider. All rights reserved.
        </div>
      </main>
    )
  }

  // Logged In View (The App)
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-3xl space-y-8 text-center">

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            Få et AI-beregnet pristilbud
          </h1>
          <p className="text-xl text-muted-foreground">
            Bli matchet med kvalifiserte fagfolk på minutter.
          </p>
        </div>

        <div className="w-full text-left">
          <ChatInterface suggestions={suggestions} />
        </div>

      </div>
    </main>
  )
}
