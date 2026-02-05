'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMutation } from '@tanstack/react-query'
import { createJob } from '@/app/actions/job'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Message {
    role: 'user' | 'assistant'
    content: string
    analysis?: any
}

import { Badge } from '@/components/ui/badge'

interface ChatInterfaceProps {
    suggestions?: string[]
}

export function ChatInterface(props: ChatInterfaceProps) {
    const router = useRouter()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [hasStarted, setHasStarted] = useState(false)

    // Login State
    const [loginEmail, setLoginEmail] = useState('')
    const [loginPassword, setLoginPassword] = useState('')
    const [loginLoading, setLoginLoading] = useState(false)
    const [loginError, setLoginError] = useState<string | null>(null)
    const [authError, setAuthError] = useState(false)

    // Booking State - Store the analysis to be booked in a separate state,
    // but the UI for it is rendered inside the message list.
    const [bookingLoading, setBookingLoading] = useState(false)
    const [activeAnalysis, setActiveAnalysis] = useState<any>(null)

    const mutation = useMutation({
        mutationFn: async (history: Message[]) => {
            const res = await fetch('/api/analyze-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history }),
            })
            if (!res.ok) throw new Error('Failed to analyze')
            return res.json()
        },
        onSuccess: (data) => {
            const aiMsg = {
                role: 'assistant',
                content: data.message,
                analysis: data.analysis // Attach specific analysis to this message
            } as Message
            setMessages((prev) => [...prev, aiMsg])
        },
    })

    const handleBook = async (analysisToBook: any) => {
        setBookingLoading(true)
        setAuthError(false)
        setActiveAnalysis(analysisToBook) // Track which one we are booking

        const res = await createJob(analysisToBook)
        setBookingLoading(false)
        if (res?.error) {
            if (res.code === 'UNAUTHORIZED' || res.error.toLowerCase().includes('logget inn')) {
                setAuthError(true)
            } else {
                alert(res.error)
            }
        } else if (res?.highValue && res?.jobId) {
            window.location.href = `/high-value-job?jobId=${res.jobId}`
        } else if (res?.clientSecret && res?.jobId) {
            window.location.href = `/payment?clientSecret=${res.clientSecret}&jobId=${res.jobId}`
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginLoading(true)
        setLoginError(null)

        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword,
        })

        setLoginLoading(false)

        if (error) {
            setLoginError('Feil e-post eller passord.')
        } else {
            setAuthError(false)
            router.refresh()
            setLoginEmail('')
            setLoginPassword('')
            // Retry booking with stored active analysis
            if (activeAnalysis) {
                handleBook(activeAnalysis)
            }
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        const userMsg = { role: 'user', content: input } as Message
        const newHistory = [...messages, userMsg]
        setMessages(newHistory)
        setInput('')

        if (!hasStarted) {
            setHasStarted(true)
        }

        mutation.mutate(newHistory)
    }

    if (!hasStarted) {
        return (
            <div className="space-y-8">
                <Card className="w-full shadow-lg border-0 ring-1 ring-gray-200">
                    <CardContent className="p-2">
                        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
                            <Input
                                className="flex-1 border-0 bg-transparent text-lg focus-visible:ring-0 focus-visible:ring-offset-0 px-4 h-12"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Beskriv jobben (f.eks. 'Montere kjøkkenarmatur')..."
                                autoFocus
                            />
                            <Button type="submit" size="lg" className="h-10 px-8">
                                Få tilbud
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {props.suggestions && props.suggestions.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                        {props.suggestions.map((suggestion) => (
                            <Badge
                                key={suggestion}
                                variant="secondary"
                                className="text-sm py-1 px-3 cursor-pointer hover:bg-secondary/80 transition-colors"
                                onClick={() => setInput(suggestion)}
                            >
                                {suggestion}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <Card className="h-[600px] flex flex-col w-full shadow-xl animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg">Din forespørsel</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${m.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                        }`}
                                >
                                    {m.content}
                                </div>

                                {/* Render Analysis if attached to this message */}
                                {m.role === 'assistant' && m.analysis && (
                                    <Card className="w-full max-w-[85%] border-primary/50 shadow-sm mt-1">
                                        <CardHeader className="bg-primary/5 py-2 px-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-primary capitalize">
                                                        {m.analysis.subcategory || m.analysis.main_category || 'Oppdrag'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded-full border">
                                                        Estimat
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-xs text-muted-foreground">Totalpris inkl. mva</span>
                                                    <span className="font-bold text-lg">
                                                        {m.analysis.estimated_price_min} - {m.analysis.estimated_price_max} kr
                                                    </span>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="py-2 px-3 text-xs space-y-1">
                                            {m.analysis.line_items?.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-muted-foreground">
                                                    <span>{item.name}</span>
                                                    <span>{item.amount} {item.type === 'range' ? 'kr' : ''}</span>
                                                </div>
                                            ))}
                                        </CardContent>
                                        <CardFooter className="py-2 px-3 bg-muted/20">
                                            {authError && activeAnalysis === m.analysis ? (
                                                <div className="w-full space-y-2">
                                                    <p className="text-xs text-red-500 font-medium">Logg inn for å bestille</p>
                                                    <form onSubmit={handleLogin} className="flex flex-col gap-2">
                                                        <Input placeholder="E-post" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="h-8 text-xs" />
                                                        <Input placeholder="Passord" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="h-8 text-xs" />
                                                        <Button size="sm" type="submit" disabled={loginLoading}>{loginLoading ? '...' : 'Logg inn'}</Button>
                                                    </form>
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => handleBook(m.analysis)}
                                                    disabled={bookingLoading}
                                                    className="w-full h-8 text-xs"
                                                    size="sm"
                                                >
                                                    {bookingLoading && activeAnalysis === m.analysis ? 'Behandler...' : 'Bestill Jobb'}
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                )}
                            </div>
                        ))}
                        {mutation.isPending && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg p-3 text-sm flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 border-t bg-background">
                <form onSubmit={handleSubmit} className="flex w-full space-x-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Skriv mer info..."
                        disabled={mutation.isPending}
                    />
                    <Button type="submit" disabled={mutation.isPending}>Send</Button>
                </form>
            </CardFooter>
        </Card>
    )
}
