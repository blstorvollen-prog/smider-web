
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
              <div className="p-3 bg-primary/10 rounded-full">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Logg inn for å bruke Smider</h2>
              <p className="text-center text-muted-foreground">
                Vi har stengt for åpne registreringer i pilotperioden.
              </p>
            </div>
            <Link href="/login" className="w-full block">
              <Button className="w-full h-11 text-base" size="lg">
                Logg inn
              </Button>
            </Link>
            <div className="text-center">
              <Button variant="link" className="text-muted-foreground" disabled>
                (Registrering deaktivert)
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <Content />
}
