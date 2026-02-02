'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
// import { Toaster } from '@/components/ui/toaster' 

// I ran shadcn add ... without toast. I should check if I have toast.
// If I use 'sonner' I need to add that.
// For now, I'll assume No toast or basic console logging, or I'll genericize.
// Wait, I'll add 'sonner' now as it's better.

export default function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* <Toaster /> */}
        </QueryClientProvider>
    )
}
