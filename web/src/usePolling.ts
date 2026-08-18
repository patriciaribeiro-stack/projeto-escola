import { useEffect, useState, useCallback, useRef } from 'react'

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 4000, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const reload = useCallback(async () => {
    try {
      const result = await fetcherRef.current()
      setData(result)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    const tick = async () => {
      try {
        const result = await fetcherRef.current()
        if (alive) setData(result)
      } finally {
        if (alive) setLoading(false)
      }
    }
    tick()
    const int = setInterval(tick, intervalMs)
    return () => {
      alive = false
      clearInterval(int)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, reload, setData }
}
