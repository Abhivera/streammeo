import { useEffect, useState } from 'react'
import { Search, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false)
    const { user, logout } = useAuth()

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-colors duration-500 flex items-center justify-between px-4 md:px-12 h-16 ${isScrolled ? 'bg-background shadow-md' : 'bg-transparent'
                }`}
        >
            <div className="flex items-center gap-8">
                <Link to="/home" className="text-3xl font-extrabold text-primary-600 tracking-tighter hover:text-primary-500 transition-colors">
                    STREAMMEO
                </Link>
                <div className="hidden md:flex items-center gap-5 text-sm font-medium text-foreground/80">
                    <Link to="/home" className="hover:text-foreground transition-colors">Home</Link>
                    <Link to="/tv" className="hover:text-foreground transition-colors">TV Shows</Link>
                    <Link to="/movies" className="hover:text-foreground transition-colors">Movies</Link>
                    <Link to="/new" className="hover:text-foreground transition-colors">New & Popular</Link>
                    <Link to="/mylist" className="hover:text-foreground transition-colors">My List</Link>
                </div>
            </div>

            <div className="flex items-center gap-6 text-foreground">
                <button className="hover:text-gray-300 transition-colors">
                    <Search className="w-5 h-5" />
                </button>
                <button className="hover:text-gray-300 transition-colors relative hidden sm:block">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-primary-600 rounded-full"></span>
                </button>

                {user && (
                    <div className="relative group">
                        <button className="flex items-center gap-2 hover:text-gray-300 transition-colors">
                            <img
                                src={user.profile_picture_url || "https://i.pravatar.cc/150?img=3"}
                                alt={user.name}
                                className="w-8 h-8 rounded shrink-0 ring-2 ring-transparent group-hover:ring-primary-600 transition-all border border-border"
                            />
                            <div className="hidden md:block transition-transform group-hover:rotate-180">
                                ▼
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-2 w-48 bg-black/90 border border-gray-800 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <div className="p-3 border-b border-gray-800">
                                <p className="text-sm font-semibold truncate">{user.name}</p>
                            </div>
                            <div className="p-2">
                                <Link to="/upload" className="block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors">Upload Video</Link>
                                <button
                                    onClick={() => logout()}
                                    className="w-full text-left px-3 py-2 text-sm text-primary-500 hover:text-white hover:bg-primary-600 rounded transition-colors mt-1"
                                >
                                    Sign out of Streammeo
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}
