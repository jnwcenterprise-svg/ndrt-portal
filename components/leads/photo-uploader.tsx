"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, Loader2, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Photo {
  id: string
  url: string | null
  caption: string | null
  uploaded_at: string
}

export function PhotoUploader({ contractorLeadId }: { contractorLeadId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const captionRef = useRef<HTMLInputElement>(null)

  const base = `/api/leads/${contractorLeadId}/photos`

  useEffect(() => {
    fetch(base)
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []))
      .catch(() => setError("Could not load photos"))
      .finally(() => setLoading(false))
  }, [base])

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return
      setUploading(true)
      setError(null)
      const caption = captionRef.current?.value.trim() ?? ""
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append("file", file)
        if (caption) form.append("caption", caption)
        const res = await fetch(base, { method: "POST", body: form })
        if (!res.ok) {
          const { error: msg } = await res.json().catch(() => ({}))
          setError(msg ?? "Upload failed")
          break
        }
        const { photo } = await res.json()
        setPhotos((prev) => [...prev, photo])
      }
      if (captionRef.current) captionRef.current.value = ""
      if (fileRef.current) fileRef.current.value = ""
      setUploading(false)
    },
    [base]
  )

  async function handleDelete(photo: Photo) {
    if (!confirm("Delete this photo?")) return
    if (lightbox?.id === photo.id) setLightbox(null)
    const res = await fetch(`${base}/${photo.id}`, { method: "DELETE" })
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    else setError("Could not delete photo")
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload controls */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={captionRef}
              placeholder="Caption (optional)"
              className="sm:max-w-xs"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Camera className="mr-1.5 h-3.5 w-3.5" />
                  Add Photos
                </>
              )}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WEBP, HEIC — up to 20 MB each. Tap "Add Photos" to use your camera or choose from your gallery.
          </p>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {/* Grid */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading photos…
            </div>
          ) : photos.length === 0 ? (
            <p className="text-sm text-gray-400">No photos yet — add your first one above.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-lg border bg-gray-50">
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={p.caption ?? "Lead photo"}
                      className="aspect-square w-full cursor-pointer object-cover transition-opacity group-hover:opacity-90"
                      onClick={() => setLightbox(p)}
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-xs text-gray-400">
                      Unavailable
                    </div>
                  )}
                  {p.caption && (
                    <p className="truncate px-2 py-1 text-xs text-gray-600">{p.caption}</p>
                  )}
                  <button
                    onClick={() => handleDelete(p)}
                    className="absolute right-1 top-1 hidden rounded bg-black/60 p-1 text-white group-hover:flex"
                    aria-label="Delete photo"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {lightbox.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? "Lead photo"}
              className="max-h-[90vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {lightbox.caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-sm text-white">
              {lightbox.caption}
            </p>
          )}
        </div>
      )}
    </>
  )
}
