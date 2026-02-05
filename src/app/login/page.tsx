import { AuthForm } from '@/components/auth-form'
import { ChatInterface } from '@/components/chat-interface'

export default function LoginPage() {
    const suggestions = [
        "Bytte stikkontakt",
        "Montere elbillader",
        "Henge opp lampe",
        "Ny kurs til kjøkken",
        "Bytte dimmere"
    ]

    const BackgroundContent = () => (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gradient-to-b from-background to-muted/20">
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
        </div>
    )

    return (
        <div className="relative min-h-screen">
            {/* Blurred Background */}
            <div className="absolute inset-0 filter blur-sm pointer-events-none select-none opacity-60 overflow-hidden">
                <BackgroundContent />
            </div>

            {/* Login Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-background/20 backdrop-blur-[2px]">
                <AuthForm type="login" />
            </div>
        </div>
    )
}
