import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'

export default function ProtectedRoute() {
    const { isAuthenticated } = useAuth()

    if (!isAuthenticated) {
        // Redirect to the login page if not authenticated
        return <Navigate to="/" replace />
    }

    // If authenticated, render the layout (Navbar + child routes)
    return (
        <>
            <Navbar />
            <Outlet />
        </>
    )
}
