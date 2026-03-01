import { useState } from 'react'
import { UploadCloud, X, CheckCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Upload() {
    const [dragActive, setDragActive] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')

    // Upload States
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadSuccess, setUploadSuccess] = useState(false)
    const [error, setError] = useState('')

    const { } = useAuth()
    const navigate = useNavigate()

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelection(e.dataTransfer.files[0])
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelection(e.target.files[0])
        }
    }

    const handleFileSelection = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('video/')) {
            setError("Please select a valid video file.")
            return
        }
        setError("")
        setFile(selectedFile)
        // Auto-fill title from filename
        if (!title) {
            setTitle(selectedFile.name.replace(/\.[^/.]+$/, "")) // Remove extension
        }
    }

    const handlePublish = async () => {
        if (!file || !title) {
            setError("Please provide a video file and a title.")
            return
        }

        setIsUploading(true)
        setError('')
        setUploadProgress(10)

        try {
            // Step 1: Initiate upload with backend to get Presigned URL
            const initResponse = await fetch('http://localhost:8000/upload/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Authorization: `Bearer ${token}` // Assuming backend uses this soon
                },
                body: JSON.stringify({
                    title,
                    description
                })
            })

            if (!initResponse.ok) {
                throw new Error(`Initiate failed: ${initResponse.statusText}`)
            }

            const { upload_url, video_id } = await initResponse.json()
            setUploadProgress(30)

            // Step 2: Upload directly to S3 (or mock endpoint)
            // Note: fetch doesn't support progress tracking natively well without XMLHttpRequest, 
            // so we'll simulate progress for the UI or just wait for it.
            const uploadResponse = await fetch(upload_url, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                }
            })

            if (!uploadResponse.ok) {
                throw new Error(`S3 Upload failed: ${uploadResponse.statusText}`)
            }

            setUploadProgress(80)

            // Step 3: Notify backend of completion
            const completeResponse = await fetch(`http://localhost:8000/upload/${video_id}/complete`, {
                method: 'POST',
                // headers: { Authorization: `Bearer ${token}` }
            })

            if (!completeResponse.ok) {
                throw new Error(`Completion callback failed: ${completeResponse.statusText}`)
            }

            setUploadProgress(100)
            setUploadSuccess(true)

            // Redirect after a short delay
            setTimeout(() => {
                navigate('/home')
            }, 2000)

        } catch (err: any) {
            console.error("Upload error:", err)
            setError(err.message || "An error occurred during upload.")
            setIsUploading(false)
            setUploadProgress(0)
        }
    }

    return (
        <div className="min-h-screen bg-background pt-24 pb-12 px-4 md:px-12 flex justify-center">
            <div className="w-full max-w-4xl bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col relative text-foreground">

                {/* Loading Overlay */}
                {isUploading && !uploadSuccess && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                        <h2 className="text-xl font-bold mb-2">Uploading Video...</h2>
                        <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-500 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="mt-2 text-sm text-gray-400">{uploadProgress}% Complete</p>
                    </div>
                )}

                {/* Success Overlay */}
                {uploadSuccess && (
                    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2 text-white">Upload Successful!</h2>
                        <p className="text-gray-400">Your video is now processing. Redirecting to home...</p>
                    </div>
                )}


                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-card text-foreground">
                    <h1 className="text-2xl font-bold text-foreground">Upload Video</h1>
                    <button onClick={() => navigate('/home')} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 flex flex-col md:flex-row gap-8">

                    {/* Drag & Drop Zone */}
                    <div
                        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 text-center transition-colors ${dragActive ? 'border-primary-500 bg-primary-500/10' : 'border-border hover:border-muted-foreground/50'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {file ? (
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle className="w-10 h-10 text-primary-500" />
                                </div>
                                <p className="font-semibold text-lg text-primary-400 truncate max-w-[200px]">{file.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                <button
                                    onClick={() => setFile(null)}
                                    className="mt-4 text-sm text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Remove file
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                                    <UploadCloud className="w-10 h-10 text-primary-500" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-foreground">Drag and drop video files to upload</h3>
                                <p className="text-muted-foreground text-sm mb-6">Your videos will be private until you publish them.</p>

                                <label className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded font-medium cursor-pointer transition-colors">
                                    Select Files
                                    <input type="file" className="hidden" accept="video/mp4,video/x-m4v,video/*" onChange={handleFileInput} />
                                </label>
                            </>
                        )}
                    </div>

                    {/* Details Form Placeholder */}
                    <div className="flex-1 flex flex-col gap-6">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 text-foreground">Details</h3>

                        {error && (
                            <div className="bg-red-900/20 border border-red-500/50 text-red-500 px-4 py-3 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Title (required)</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    placeholder="Add a title that describes your video"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground h-32 resize-none focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    placeholder="Tell your viewers about your video"
                                ></textarea>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 flex justify-end">
                            <button
                                onClick={handlePublish}
                                disabled={!file || !title || isUploading}
                                className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-2.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Publish
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
