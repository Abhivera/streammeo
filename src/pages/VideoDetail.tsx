import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, ThumbsUp } from 'lucide-react'
import { useParams, Link } from 'react-router-dom'
import { Video } from '../components/VideoCard'
import VideoRow from '../components/VideoRow'

const SAMPLE_RECOMMENDATIONS: Video[] = Array.from({ length: 12 }).map((_, i) => ({
    id: `rec-${i}`,
    title: `Similar Title ${i + 1}`,
    thumbnailUrl: `https://picsum.photos/seed/${i + 888}/640/360`,
    channelName: 'Streammeo Network',
    channelAvatarUrl: `https://i.pravatar.cc/150?u=${i + 20}`,
    views: 'New',
    uploadedAt: '2026',
    duration: '45m',
    isVerified: true
}))

export default function VideoDetail() {
    const { id } = useParams()
    const [video, setVideo] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const res = await fetch(`http://localhost:8000/videos/${id}`)
                if (res.ok) {
                    const data = await res.json()
                    setVideo(data)
                } else {
                    setError(true)
                }
            } catch (err) {
                console.error("Failed to fetch video", err)
                setError(true)
            } finally {
                setLoading(false)
            }
        }
        if (id) {
            fetchVideo()
        }
    }, [id])

    return (
        <div className="min-h-screen bg-background text-foreground pb-12">
            {/* Top Navigation Overlay */}
            <div className="absolute top-0 w-full p-6 z-50 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                <Link to="/home" className="text-white hover:text-gray-300 transition-colors">
                    <ArrowLeft className="w-8 h-8" />
                </Link>
            </div>

            {/* Cinematic Player Section */}
            <div className="relative w-full h-[60vh] md:h-[80vh] bg-black group flex items-center justify-center">
                {loading ? (
                    <div className="text-white">Loading video...</div>
                ) : error || !video ? (
                    <div className="text-red-500">Failed to load video.</div>
                ) : (
                    <video
                        src={video.videoUrl ? `http://localhost:8000${video.videoUrl}` : undefined}
                        controls
                        autoPlay
                        className="w-full h-full object-contain outline-none"
                    >
                        Your browser does not support the video tag.
                    </video>
                )}
            </div>

            {/* Metadata & Actions Section */}
            <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                        <span className="text-primary-500">100% Match</span>
                        <span>{video?.uploadedAt ? new Date(video.uploadedAt).getFullYear() : '2026'}</span>
                        <span className="border border-gray-600 px-1.5 rounded">HD</span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-extrabold text-white">
                        {video?.title || `Loading...`}
                    </h1>

                    <p className="text-lg text-gray-300 leading-relaxed max-w-3xl">
                        {video?.description || "No description provided."}
                    </p>
                </div>

                <div className="flex flex-row lg:flex-col gap-4 justify-start">
                    <button className="flex flex-col items-center justify-center gap-2 p-3 text-gray-400 hover:text-white transition-colors">
                        <Plus className="w-8 h-8 rounded-full border-2 border-current p-1" />
                        <span className="text-xs font-semibold">My List</span>
                    </button>
                    <button className="flex flex-col items-center justify-center gap-2 p-3 text-gray-400 hover:text-white transition-colors">
                        <ThumbsUp className="w-8 h-8 rounded-full border-2 border-current p-1" />
                        <span className="text-xs font-semibold">Rate</span>
                    </button>
                </div>
            </div>

            {/* More Like This (Rows) */}
            <div className="max-w-7xl mx-auto">
                <VideoRow title="More Like This" videos={SAMPLE_RECOMMENDATIONS} />
            </div>
        </div>
    )
}
