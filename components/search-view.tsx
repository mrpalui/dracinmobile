'use client'

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Loader2, Film, ArrowLeft, Flame, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatNumber, cn } from "@/lib/utils"

// Kalo CORS udah allow all, langsung tembak. Gak usah pake proxy cengeng.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://sapi.dramabox.be";

interface BookItem {
  bookId: string
  bookName: string
  cover: string
  introduction?: string
  tags?: string[]
  tagNames?: string[]
  playCount?: string | number
}

// HELPER PENTING: Normalisasi data dari berbagai format JSON bangsat itu
const extractList = (data: any): BookItem[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  // Cek prioritas: searchList -> rankList -> list
  if (Array.isArray(data.searchList)) return data.searchList;
  if (Array.isArray(data.rankList)) return data.rankList;
  if (Array.isArray(data.list)) return data.list;
  return [];
}

interface SearchViewProps {
  initialQuery?: string
  autoFocus?: boolean
  onClose?: () => void
  isDialog?: boolean
}

export function SearchView({ initialQuery = "", autoFocus = false, onClose, isDialog = false }: SearchViewProps) {
  const router = useRouter()
  
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<BookItem[]>([])
  const [popularList, setPopularList] = useState<BookItem[]>([])
  
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 1. Fetch Popular saat pertama buka (Rank Endpoint)
  useEffect(() => {
    if (autoFocus && inputRef.current) setTimeout(() => inputRef.current?.focus(), 150) 
    
    const fetchPopular = async () => {
        try {
            // Endpoint Rank biasanya return { data: { rankList: [...] } }
            const res = await fetch(`${API_BASE}/api/rank/1?lang=in`)
            const json = await res.json()
            if (json.success) {
                const list = extractList(json.data); // Pakai helper sakti
                setPopularList(list)
            }
        } catch (e) {
            console.error("Popular fetch failed", e)
        }
    }
    fetchPopular()

    if (initialQuery) performSearch(initialQuery)
  }, [])

  // 2. Fetch Search (Search Endpoint)
  const performSearch = async (keyword: string) => {
      if (keyword.length < 2) {
          setResults([])
          setLoading(false)
          return
      }
      setLoading(true)
      try {
        // Endpoint Search return { data: { searchList: [...] } }
        const res = await fetch(`${API_BASE}/api/search/${encodeURIComponent(keyword)}/1?lang=in`)
        const json = await res.json()
        
        if (json.success) {
          const list = extractList(json.data); // Helper lagi
          setResults(list)
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
  }

  useEffect(() => {
    if (query === initialQuery) return 
    if (query.length < 2) { setResults([]); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { performSearch(query) }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const goToWatch = (bookId: string) => {
    if (onClose) onClose()
    router.push(`/watch?bookId=${bookId}&source=search_view`)
  }

  const handleSearchSubmit = () => {
      router.push(`/?q=${encodeURIComponent(query)}`)
      performSearch(query)
  }

  const getTag = (item: BookItem) => {
    // Normalisasi Tag yang berantakan (tags vs tagNames)
    const t = item.tagNames || item.tags || [];
    return t.length > 0 ? t[0] : "Drama";
  }

  return (
    <div className="flex flex-col h-full w-full bg-black text-white">
      <div className="flex items-center gap-2 p-2 bg-zinc-900/80 m-2 rounded-md sticky top-2 z-10 border border-zinc-800/50 backdrop-blur-md">
        {isDialog && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="-ml-2 rounded-full hover:bg-white/10 text-white"><ArrowLeft className="w-5 h-5" /></Button>
        )}
        <Search className="w-5 h-5 text-zinc-400 ml-2" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
          placeholder="Cari drama..."
          className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-zinc-500 h-10 text-base shadow-none"
          autoComplete="off"
        />
        {query && (
          <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white rounded-full" onClick={() => { setQuery(""); setResults([]); router.push("/"); inputRef.current?.focus() }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-0 pb-10 scrollbar-hide">
        {loading && (
          <div className="flex justify-center py-20 text-zinc-500"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>
        )}

        {!loading && query.length < 2 && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="px-4 py-3 flex items-center gap-2 text-zinc-400">
                 <TrendingUp className="w-4 h-4 text-red-600" />
                 <h3 className="text-sm font-bold uppercase tracking-wider">Top Trending</h3>
              </div>
              <div className="flex flex-col">
                 {popularList.map((book, index) => (
                    <button key={book.bookId} onClick={() => goToWatch(book.bookId)} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 border-b border-zinc-900/50 last:border-0 group">
                        <div className={cn("w-6 text-center font-black text-lg italic", index < 3 ? "text-red-600" : "text-zinc-600")}>{index + 1}</div>
                        <div className="w-10 h-14 bg-zinc-800 rounded overflow-hidden shrink-0"><img src={book.cover} className="w-full h-full object-cover" loading="lazy" alt="" /></div>
                        <div className="flex-1 min-w-0 text-left">
                            <h4 className="text-sm font-medium text-white line-clamp-1 group-hover:text-red-500">{book.bookName}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{getTag(book)}</span>
                                <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" />{formatNumber(book.playCount)}</span>
                            </div>
                        </div>
                    </button>
                 ))}
              </div>
           </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-col py-2">
            <div className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase">Hasil Pencarian</div>
            {results.map((item) => (
              <button key={item.bookId} onClick={() => goToWatch(item.bookId)} className="flex items-center gap-4 px-4 py-3 text-left hover:bg-zinc-900 border-b border-zinc-900/50">
                <div className="w-16 h-[5.5rem] bg-zinc-800 rounded-md overflow-hidden shrink-0"><img src={item.cover} alt="" className="w-full h-full object-cover" /></div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <span className="font-bold text-base text-zinc-100 line-clamp-1">{item.bookName}</span>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                     {item.playCount && <span className="flex items-center gap-1 text-zinc-400"><Flame className="w-3 h-3 text-zinc-600" /> {formatNumber(item.playCount)}</span>}
                     <span>•</span>
                     <span className="truncate max-w-[150px] text-zinc-400">{getTag(item)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{item.introduction || "No description."}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
