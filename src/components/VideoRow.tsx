import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Video } from './VideoCard'

interface VideoRowProps {
    title: string
    videos: Video[]
}

export default function VideoRow({ title, videos }: VideoRowProps) {
    const rowRef = useRef<HTMLDivElement>(null)

    const handleScroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current
            const scrollTo = direction === 'left'
                ? scrollLeft - clientWidth + 100
                : scrollLeft + clientWidth - 100

            rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
        }
    }

    return (
        <div className="py-4 md:py-6 pl-4 md:pl-12 group/row relative">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 select-none">
                {title}
            </h2>

            {/* Scroll Buttons */}
            <button
                onClick={() => handleScroll('left')}
                className="absolute left-0 top-0 bottom-0 z-40 bg-black/60 w-12 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity disabled:opacity-0 hover:bg-black/80"
            >
                <ChevronLeft className="w-8 h-8 text-white scale-150 transition-transform hover:scale-125" />
            </button>

            {/* Row container */}
            <div
                ref={rowRef}
                className="flex gap-2 overflow-x-auto hide-scrollbar scroll-smooth pr-12 pb-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {videos.map((video) => (
                    <div key={video.id} className="min-w-[280px] md:min-w-[320px] shrink-0 transition-transform duration-300 hover:scale-105 hover:z-30 origin-center relative cursor-pointer group/card">
                        <div className="aspect-video w-full rounded-md overflow-hidden relative">
                            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                        </div>
                        {/* Mini hover overlay */}
                        <div className="absolute inset-0 bg-black/80 p-4 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end rounded-md pointer-events-none">
                            <h3 className="text-sm font-bold truncate">{video.title}</h3>
                            <p className="text-xs text-green-500 font-semibold mt-1">98% Match</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs border border-white/40 px-1 rounded">HD</span>
                                <span className="text-xs text-white/70">{video.duration}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => handleScroll('right')}
                className="absolute right-0 top-0 bottom-0 z-40 bg-black/60 w-12 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/80"
            >
                <ChevronRight className="w-8 h-8 text-white scale-150 transition-transform hover:scale-125" />
            </button>

            <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </div>
    )
}
