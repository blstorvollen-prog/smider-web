import Image from 'next/image'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

import { ChatInterface } from '@/components/chat-interface'


export default function Home() {
  const suggestions = [
    "Bytte stikkontakt",
    "Montere elbillader",
    "Henge opp lampe",
    "Ny kurs til kjøkken",
    "Bytte dimmere"
  ]

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
