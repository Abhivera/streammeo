import { CheckCircle2, MoreVertical } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface Video {
    id: string
    title: string
    thumbnailUrl: string
    channelName: string
    channelAvatarUrl: string
    views: string
    uploadedAt: string
    duration: string
    isVerified?: boolean
}

interface VideoCardProps {
    video: Video
}

export default function VideoCard({ video }: VideoCardProps) {
    return (
        <Link to={`/watch/${video.id}`} className="group flex flex-col gap-3">
            {/* Thumbnail */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted group-hover:rounded-none transition-all duration-300">
                <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ease-in-out"
                />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {video.duration}
                </div>
            </div>

            {/* Details */}
            <div className="flex gap-3 items-start pr-4">
                <img
                    src={video.channelAvatarUrl}
                    alt={video.channelName}
                    className="w-10 h-10 rounded-full object-cover mt-1 shrink-0 bg-muted ring-2 ring-transparent group-hover:ring-primary-500/30 transition-all"
                />

                <div className="flex flex-col overflow-hidden">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                        {video.title}
                    </h3>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 group-hover:text-foreground/80 transition-colors">
                        <span>{video.channelName}</span>
                        {video.isVerified && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <span>{video.views}</span>
                        <span className="w-1 h-1 bg-muted-foreground/30 rounded-full mx-1"></span>
                        <span>{video.uploadedAt}</span>
                    </div>
                </div>

                <button
                    className="ml-auto p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted rounded-full"
                    onClick={(e) => {
                        e.preventDefault()
                        // handle menu click
                    }}
                >
                    <MoreVertical className="w-5 h-5 text-foreground" />
                </button>
            </div>
        </Link>
    )
}
