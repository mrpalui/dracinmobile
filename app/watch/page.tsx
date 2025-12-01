// app/watch/page.tsx

"use client"

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipForward, List, ChevronLeft, Loader2, Maximize, Minimize, Scan, MonitorPlay, X, Lock, Settings } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// CORS udah allow all kan? Yaudah langsung tembak.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "https://sapi.dramabox.be"; 

interface VideoQuality {
  quality: number
  videoPath: string
  isDefault: number
  isEntry: number
  isVipEquity: number
}

interface WatchData {
  bookId: string
  chapterIndex: number
  videoUrl: string
  qualities: VideoQuality[]
  cover: string
  unlockedNow: boolean
}

function WatchPlayer() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const bookId = searchParams?.get("bookId")
  const urlIndex = parseInt(searchParams?.get("index") || "0")
  const sourceParam = searchParams?.get("source") || "search_result"
  const keywordParam = searchParams?.get("keyword") || ""

  const [currentIndex, setCurrentIndex] = useState(isNaN(urlIndex) ? 0 : urlIndex)
  const [videoData, setVideoData] = useState<WatchData | null>(null)
  const [bookDetails, setBookDetails] = useState<any>(null) 
  
  const [loading, setLoading] = useState(true)
  const [buffering, setBuffering] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentQuality, setCurrentQuality] = useState<number | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover")

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevIndexRef = useRef<number | null>(null)

  // Fetch Video
  useEffect(() => {
    if (!bookId) return

    const fetchVideo = async () => {
      setLoading(true)
      setIsPlaying(false)
      try {
        let direction = 0; 
        if (prevIndexRef.current !== null) {
            direction = currentIndex > prevIndexRef.current ? 2 : (currentIndex < prevIndexRef.current ? 1 : 0);
        }
        prevIndexRef.current = currentIndex;

        // FETCH LANGSUNG KE API LU
        const url = `${API_BASE_URL}/api/watch/${bookId}/${currentIndex}?source=${sourceParam}&keyword=${encodeURIComponent(keywordParam)}&direction=${direction}`;
        console.log("Fetching Watch:", url); // Debugging buat lu liat di console

        const res = await fetch(url)
        const json = await res.json()
        
        if (json.success && json.data) {
          setVideoData(json.data)
          
          const qualities = json.data.qualities || []
          const defaultQ = qualities.find((q: any) => q.isDefault === 1)
          const initialQ = defaultQ ? defaultQ.quality : (qualities[0]?.quality || null)
          setCurrentQuality(initialQ)

          if (json.data.unlockedNow) toast.success("Episode terbuka!")
        } else {
          toast.error(json.error || "Gagal memuat video.")
        }
      } catch (e) {
        console.error(e)
        toast.error("Kesalahan jaringan.")
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
    
    const newUrl = `/watch?bookId=${bookId}&index=${currentIndex}&source=${sourceParam}`
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl)
  }, [bookId, currentIndex, sourceParam])

  // Fetch Sidebar Chapters
  useEffect(() => {
    if (!bookId) return
    fetch(`${API_BASE_URL}/api/chapters/${bookId}?lang=in`)
      .then(res => res.json())
      .then(json => { 
          if(json.success && json.data) {
             // HANDLE VARIANT LIST BANGSAT ITU
             const list = json.data.list || json.data.chapterList || [];
             setBookDetails({ list });
          }
      })
      .catch(() => {})
  }, [bookId])

  // Player Handlers (Sama persis kayak sebelumnya, gak ada yang diubah logikanya)
  const handleQualityChange = (newQuality: number) => {
    if (!videoData || !videoRef.current) return;
    const selectedQ = videoData.qualities.find(q => q.quality === newQuality);
    if (selectedQ) {
      const ct = videoRef.current.currentTime;
      const wasPlaying = !videoRef.current.paused;
      videoRef.current.src = selectedQ.videoPath;
      videoRef.current.currentTime = ct;
      setCurrentQuality(newQuality);
      if (wasPlaying) videoRef.current.play().catch(() => {});
      toast.success(`Kualitas: ${newQuality}p`);
    }
  };

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause()
      else videoRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime
      const dur = videoRef.current.duration
      if (isFinite(curr)) setCurrentTime(curr)
      if (isFinite(dur) && dur > 0) {
        setDuration(dur)
        setProgress((curr / dur) * 100)
      }
    }
  }

  const handleSeek = (val: number[]) => {
    if (videoRef.current && duration > 0) {
      const newTime = (val[0] / 100) * duration
      if (isFinite(newTime)) {
        videoRef.current.currentTime = newTime
        setProgress(val[0])
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const resetControlsTimeout = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "f": toggleFullscreen(); break;
        case "ArrowRight": if(videoRef.current) videoRef.current.currentTime += 5; break;
        case "ArrowLeft": if(videoRef.current) videoRef.current.currentTime -= 5; break;
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [togglePlay])

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00"
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (!bookId) return <div className="bg-black h-screen flex items-center justify-center text-white">Invalid Book ID</div>

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[100dvh] bg-black overflow-hidden group font-sans select-none"
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
    >
      <video
        ref={videoRef}
        src={videoData?.videoUrl} 
        poster={videoData?.cover}
        className={cn("w-full h-full transition-all duration-500 ease-in-out", fitMode === "cover" ? "object-cover" : "object-contain")}
        autoPlay playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setCurrentIndex(prev => prev + 1)} 
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
      />

      {(loading || buffering) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40 backdrop-blur-sm pointer-events-none gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-white/80" />
          <div className="px-3 h-8 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-xs font-medium">Ep {currentIndex + 1}</div>
        </div>
      )}

      <div className={cn("absolute inset-0 flex flex-col justify-between z-20 transition-opacity duration-500", showControls ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <div className="bg-gradient-to-b from-black/90 via-black/50 to-transparent p-4 pt-6 flex justify-between items-center pointer-events-auto">
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="text-white hover:bg-white/10 rounded-full w-10 h-10 backdrop-blur-md bg-black/20 border border-white/5"><ChevronLeft /></Button>
              <Badge variant="secondary" className="text-white hover:bg-white/10 backdrop-blur-md bg-black/20 border border-white/5 h-10 px-3 rounded-full text-xs font-medium">Ep {currentIndex + 1}</Badge>
          </div>
          <div className="flex items-center gap-2">
             {videoData?.qualities && videoData.qualities.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} className="text-white hover:bg-white/10 backdrop-blur-md bg-black/20 border border-white/5 h-10 px-3 rounded-full gap-2">
                      <Settings size={16} /><span className="text-xs font-medium">{currentQuality ? `${currentQuality}p` : 'Auto'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black/90 border-white/10 text-white backdrop-blur-xl w-32">
                    {videoData.qualities.sort((a, b) => b.quality - a.quality).map((q) => (
                      <DropdownMenuItem key={q.quality} onClick={(e) => { e.stopPropagation(); handleQualityChange(q.quality); }} className={cn("cursor-pointer text-xs py-2.5 focus:bg-white/20 focus:text-white flex justify-between", currentQuality === q.quality && "bg-white/10 font-bold text-red-500")}>
                        <span>{q.quality}p</span>{q.isVipEquity === 1 && <span className="text-[10px] text-amber-400 font-bold ml-1">VIP</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
             )}
             <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setFitMode(m => m === "cover" ? "contain" : "cover"); }} className="text-white hover:bg-white/10 rounded-full w-10 h-10 backdrop-blur-md bg-black/20 border border-white/5">{fitMode === "cover" ? <Scan size={18} /> : <MonitorPlay size={18} />}</Button>
             <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setShowSidebar(true); }} className="text-white hover:bg-white/10 rounded-full w-10 h-10 backdrop-blur-md bg-black/20 border border-white/5"><List size={18} /></Button>
          </div>
        </div>

        {!isPlaying && !loading && !buffering && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
               <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-full border border-white/20 hover:bg-white/20 hover:scale-110 transition-all duration-300 group shadow-2xl">
                  <Play className="w-10 h-10 md:w-12 md:h-12 text-white fill-white translate-x-1" />
               </button>
            </div>
        )}

        <div className="bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-8 pt-20 pointer-events-auto">
          <div className="group/slider relative flex items-center cursor-pointer py-2" onClick={(e) => e.stopPropagation()}>
             <Slider value={[progress]} max={100} step={0.1} onValueChange={handleSeek} className="cursor-pointer relative z-10" />
          </div>
          <div className="flex justify-between items-center mt-2">
             <div className="flex gap-4 items-center">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:text-white hover:bg-white/10 rounded-full w-10 h-10">{isPlaying ? <Pause className="fill-white" /> : <Play className="fill-white" />}</Button>
                <span className="text-xs text-white/70 font-mono tracking-wider">{formatTime(currentTime)} / {formatTime(duration)}</span>
             </div>
             <div className="flex gap-3 items-center">
                <Button variant="outline" className="text-white text-xs h-8 px-4 rounded-full border-white/10 bg-white/5 hover:bg-white/15 backdrop-blur-md hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev + 1); }}>Next <SkipForward className="w-3 h-3 ml-2 opacity-70" /></Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white hover:bg-white/10 rounded-full w-10 h-10">{isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</Button>
             </div>
          </div>
        </div>
      </div>

      <div className={cn("absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30 transition-opacity duration-500", showSidebar ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => setShowSidebar(false)} />
      <div className={cn("absolute top-0 right-0 h-full w-full sm:w-[400px] bg-zinc-950/80 backdrop-blur-2xl border-l border-white/5 z-40 transition-transform duration-500 shadow-2xl flex flex-col", showSidebar ? "translate-x-0" : "translate-x-full")}>
         <div className="flex justify-between items-center px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div><h2 className="text-white font-semibold text-lg">Episodes</h2><p className="text-xs text-white/40 font-medium mt-0.5">{bookDetails?.list?.length || 0} Available</p></div>
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)} className="text-white/50 hover:text-white hover:bg-white/10 rounded-full"><X size={20} /></Button>
         </div>
         <ScrollArea className="flex-1 min-h-0 overflow-hidden h-full w-full">
            <div className="p-6 grid grid-cols-4 gap-3 content-start pb-20">
                {bookDetails?.list?.map((ep: any) => {
                    const isActive = ep.chapterIndex === currentIndex
                    return (
                        <button key={ep.chapterId || ep.chapterIndex} onClick={() => { setCurrentIndex(ep.chapterIndex); if (window.innerWidth < 768) setShowSidebar(false) }} className={cn("relative aspect-[4/3] rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all duration-300 group border", isActive ? "bg-white text-black border-white scale-105 z-10 font-bold" : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-105")}>
                            <span className={cn("text-lg", isActive ? "tracking-tight" : "font-mono")}>{ep.chapterIndex + 1}</span>
                            {ep.isCharge === 1 && <div className="absolute top-1 right-1 text-amber-500/80"><Lock size={10} /></div>}
                        </button>
                    )
                })}
            </div>
         </ScrollArea>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div className="bg-black h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin"/></div>}><WatchPlayer /></Suspense>
}
