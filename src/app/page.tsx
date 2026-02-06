
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatInterface } from '@/components/chat-interface'
import { createClient } from '@/utils/supabase/server'
import { Lock, Construction } from 'lucide-react'

export const dynamic = "force-dynamic";

// ... imports

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

  const Content = () => (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            Få et smart prisestimat på minutter
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

  if (!user) {
    return (
      <div className="relative min-h-screen">
        {/* Background (Blurred) */}
        <div className="absolute inset-0 filter blur-sm pointer-events-none select-none opacity-60 overflow-hidden">
          <Content />
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-background/20 backdrop-blur-[2px]">
          <div className="max-w-md w-full space-y-8 p-10 border rounded-2xl bg-background/80 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-2xl">
                <Construction className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-center">
                  Smider
                </h1>
                <div className="flex items-center justify-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-500 px-3 py-1 rounded-full text-xs font-medium w-fit mx-auto border border-yellow-200 dark:border-yellow-800">
                  <Lock className="w-3 h-3" />
                  Under Utvikling
                </div>
              </div>
            </div>

            <div className="space-y-4 text-center">
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
              <p className="mt-4 text-xs text-muted-foreground text-center">
                Kun for inviterte testbrukere.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <Content />
}
