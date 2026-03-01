import { Play, Info } from 'lucide-react'
import { Link } from 'react-router-dom'

interface HeroMovie {
    id: string
    title: string
    description: string
    backdropUrl: string
    logoUrl?: string
}

interface HeroHeaderProps {
    movie: HeroMovie
}

export default function HeroHeader({ movie }: HeroHeaderProps) {
    return (
        <div className="relative w-full h-[50vh] md:h-[80vh] min-h-[400px]">
            {/* Background Image */}
            <div className="absolute inset-0 w-full h-full">
                <img
                    src={movie.backdropUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                />
                {/* Gradient overlays for the Netflix look */}
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"></div>
                <div className="absolute inset-x-0 bottom-0 h-32 netflix-gradient"></div>
                <div className="absolute inset-0 bg-black/20"></div>
            </div>

            {/* Content */}
            <div className="relative h-full flex flex-col justify-end px-4 md:px-12 pb-24 max-w-3xl space-y-4">
                {movie.logoUrl ? (
                    <img src={movie.logoUrl} alt={movie.title} className="w-full max-w-md drop-shadow-2xl" />
                ) : (
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground drop-shadow-2xl">
                        {movie.title}
                    </h1>
                )}

                <p className="text-foreground/90 text-sm md:text-lg lg:text-xl drop-shadow-md line-clamp-3 max-w-2xl font-medium">
                    {movie.description}
                </p>

                <div className="flex items-center gap-3 pt-4">
                    <Link
                        to={`/watch/${movie.id}`}
                        className="flex items-center justify-center gap-2 bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded md:rounded-md font-bold hover:bg-white/80 transition-colors"
                    >
                        <Play className="w-5 h-5 md:w-6 md:h-6 fill-black" />
                        Play
                    </Link>
                    <button className="flex items-center justify-center gap-2 bg-gray-500/70 text-white px-6 md:px-8 py-2 md:py-3 rounded md:rounded-md font-bold hover:bg-gray-500/50 transition-colors backdrop-blur-sm">
                        <Info className="w-5 h-5 md:w-6 md:h-6" />
                        More Info
                    </button>
                </div>
            </div>
        </div>
    )
}
