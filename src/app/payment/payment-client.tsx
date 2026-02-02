'use client'

import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm() {
    const stripe = useStripe()
    const elements = useElements()
    const [message, setMessage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) return

        setIsLoading(true)

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/dashboard/customer`,
            },
        })

        if (error.type === "card_error" || error.type === "validation_error") {
            setMessage(error.message ?? "Det oppstod en feil.")
        } else {
            setMessage("Det oppstod en uventet feil.")
        }

        setIsLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            <Button disabled={isLoading || !stripe || !elements} className="w-full">
                {isLoading ? "Behandler..." : "Betal og bekreft"}
            </Button>
            {message && <div className="text-red-500 text-sm">{message}</div>}
        </form>
    )
}

export function PaymentClient({ clientSecret }: { clientSecret: string }) {
    return (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
        </Elements>
    )
}
