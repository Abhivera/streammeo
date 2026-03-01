import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function Login() {
    const { login, isAuthenticated } = useAuth()

    // If already authenticated, redirect them to the home feed
    if (isAuthenticated) {
        return <Navigate to="/home" replace />
    }

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-black">
            {/* Background with Netflix-style dark overlay */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1595769816263-9b910be24d5f?q=80&w=2679&auto=format&fit=crop"
                    alt="Movies Background"
                    className="w-full h-full object-cover opacity-40 scale-105"
                />
                <div className="absolute inset-0 bg-black/60 sm:bg-transparent sm:bg-gradient-to-t sm:from-black sm:via-black/70 sm:to-black/40"></div>
            </div>

            <div className="absolute top-0 left-0 p-6 md:px-12 md:py-8 z-50">
                <span className="text-3xl md:text-5xl font-extrabold text-primary-600 tracking-tighter">
                    STREAMMEO
                </span>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-[450px] bg-black/80 sm:bg-black/75 p-10 sm:p-16 sm:rounded-md shadow-2xl backdrop-blur-sm mx-4">
                <h1 className="text-3xl font-bold text-white mb-8">Sign In</h1>

                <p className="text-gray-300 mb-8 leading-relaxed">
                    Welcome to Streammeo. Please sign in with your Google account to start watching premium content.
                </p>

                <button
                    onClick={() => login()}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 rounded transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_20px_rgba(220,38,38,0.6)]"
                >
                    <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign In with Google
                </button>

                <div className="mt-16 text-muted-foreground text-sm">
                    <p>
                        New to Streammeo? <span className="text-white hover:underline cursor-pointer">Sign up now.</span>
                    </p>
                    <p className="mt-4 text-xs">
                        This page is protected by Google reCAPTCHA to ensure you're not a bot. <span className="text-blue-500 hover:underline cursor-pointer">Learn more.</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
