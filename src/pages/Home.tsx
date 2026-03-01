import { useState, useEffect } from 'react'
import HeroHeader from '../components/HeroHeader'
import VideoRow from '../components/VideoRow'
import { Video } from '../components/VideoCard'

const SAMPLE_HERO_MOVIE = {
    id: 'featured-1',
    title: 'STRANGER THINGS',
    description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    backdropUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2670&auto=format&fit=crop',
}

const generateMockVideos = (count: number, seedOffset: number): Video[] =>
    Array.from({ length: count }).map((_, i) => ({
        id: `video-${seedOffset}-${i}`,
        title: `Amazing Movie Title ${seedOffset + i}`,
        thumbnailUrl: `https://picsum.photos/seed/${seedOffset + i}/640/360`,
        channelName: 'Streammeo Originals',
        channelAvatarUrl: `https://i.pravatar.cc/150?u=${i + 10}`,
        views: `${Math.floor(Math.random() * 900) + 12}K views`,
        uploadedAt: '2026',
        duration: '1h 45m',
        isVerified: true
    }))

export default function Home() {
    const [recentVideos, setRecentVideos] = useState<Video[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const res = await fetch('http://localhost:8000/videos/')
                if (res.ok) {
                    const data = await res.json()
                    // Add full backend URL to the relative video path for testing, though in Home view we don't play it yet.
                    setRecentVideos(data)
                }
            } catch (err) {
                console.error("Failed to fetch videos", err)
            } finally {
                setLoading(false)
            }
        }
        fetchVideos()
    }, [])

    return (
        <div className="w-full bg-background min-h-screen pb-12">
            {/* Hero Section */}
            <HeroHeader movie={SAMPLE_HERO_MOVIE} />

            {/* Rows Container - pulled up over the hero gradient slightly */}
            <div className="relative z-10 -mt-20 md:-mt-32 space-y-4 md:space-y-8">
                {recentVideos.length > 0 && (
                    <VideoRow title="Recently Uploaded" videos={recentVideos} />
                )}
                {loading && (
                    <div className="px-4 md:px-12 py-8 text-primary-500 text-sm">Loading recent videos...</div>
                )}
                <VideoRow title="Trending Now" videos={generateMockVideos(10, 100)} />
                <VideoRow title="Streammeo Originals" videos={generateMockVideos(12, 200)} />
                <VideoRow title="New Releases" videos={generateMockVideos(8, 300)} />
                <VideoRow title="Action & Adventure" videos={generateMockVideos(15, 400)} />
            </div>
        </div>
    )
}
