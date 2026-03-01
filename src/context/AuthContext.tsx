import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useGoogleLogin } from '@react-oauth/google'

interface User {
    email: string
    name: string
    profile_picture_url: string
}

interface AuthContextType {
    user: User | null
    token: string | null
    login: () => void
    logout: () => void
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'))

    useEffect(() => {
        // In a real app, you would fetch the user profile here if you have a token but no user object
        if (token && !user) {
            const savedUser = localStorage.getItem('user')
            if (savedUser) {
                setUser(JSON.parse(savedUser))
            }
        }
    }, [token, user])

    const goLogin = useGoogleLogin({
        onSuccess: async (codeResponse) => {
            try {
                // Send the access token to our backend for verification and JWT creation
                // The backend `authlib` implementation expects the OAuth redirect, but for SPAs, 
                // passing the token directly to a backend endpoint is usually cleaner.
                // Currently, the backend `/auth/callback/google` expects standard OAuth callback.
                // For the sake of this OTT UI implementation, we will simulate storing a token
                // if the backend isn't fully configured for SPA implicit flow yet.
                console.log("Google Auth Success", codeResponse)

                // Simulating Backend Response for UI implementation
                const mockResponse = {
                    access_token: codeResponse.access_token, // using google token temporarily
                    user: {
                        email: "user@example.com",
                        name: "Streammeo User",
                        profile_picture_url: "https://i.pravatar.cc/150?img=3"
                    }
                }

                setToken(mockResponse.access_token)
                setUser(mockResponse.user)
                localStorage.setItem('token', mockResponse.access_token)
                localStorage.setItem('user', JSON.stringify(mockResponse.user))

            } catch (error) {
                console.error("Login failed:", error)
            }
        },
        flow: 'implicit',
    })

    const logout = () => {
        setToken(null)
        setUser(null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    return (
        <AuthContext.Provider value={{ user, token, login: goLogin, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
