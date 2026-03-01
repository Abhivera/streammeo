import { Home, Compass, PlaySquare, Clock, ThumbsUp, Flame, Gamepad2, Music2, Trophy } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface SidebarProps {
    className?: string
}

const mainNavItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: PlaySquare, label: 'Subscriptions', path: '/subscriptions' },
]

const libraryItems = [
    { icon: Clock, label: 'History', path: '/history' },
    { icon: PlaySquare, label: 'Your Videos', path: '/your-videos' },
    { icon: ThumbsUp, label: 'Liked Videos', path: '/liked' },
]

const exploreItems = [
    { icon: Flame, label: 'Trending', path: '/trending' },
    { icon: Music2, label: 'Music', path: '/music' },
    { icon: Gamepad2, label: 'Gaming', path: '/gaming' },
    { icon: Trophy, label: 'Sports', path: '/sports' },
]

export default function Sidebar({ className = '' }: SidebarProps) {
    const location = useLocation()

    const NavSection = ({ title, items }: { title?: string, items: typeof mainNavItems }) => (
        <div className="py-3 mt-2 border-b border-border last:border-0 last:pb-0">
            {title && <h3 className="px-5 text-sm font-semibold text-muted-foreground mb-2 mt-4 uppercase tracking-wider">{title}</h3>}
            <ul className="space-y-1">
                {items.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                        <li key={item.label} className="px-3">
                            <Link
                                to={item.path}
                                className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all ${isActive
                                    ? 'bg-primary-50 text-primary-600 font-medium'
                                    : 'text-foreground hover:bg-muted'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-muted-foreground'}`} />
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </div>
    )

    return (
        <aside className={`bg-background overflow-y-auto ${className} custom-scrollbar`}>
            <NavSection items={mainNavItems} />
            <NavSection title="Library" items={libraryItems} />
            <NavSection title="Explore" items={exploreItems} />

            <div className="p-6 mt-4 opacity-50 text-xs text-muted-foreground">
                <p>© 2026 Streammeo, Inc.</p>
                <div className="mt-2 space-x-2">
                    <a href="#" className="hover:text-foreground">Terms</a>
                    <a href="#" className="hover:text-foreground">Privacy</a>
                </div>
            </div>
        </aside>
    )
}
