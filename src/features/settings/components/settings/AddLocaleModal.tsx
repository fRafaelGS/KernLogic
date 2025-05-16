import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import localeService, { Locale } from '@/services/localeService'
import { LOCALES } from '@/config/locale'

// Use the centralized locale configuration from config/locale.ts

const schema = z.object({
  locale: z.string().min(1, 'Locale is required')
})

interface AddLocaleModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (locale: Locale) => void
  existingLocales: string[] // codes already added to org
}

export function AddLocaleModal({ open, onClose, onSuccess, existingLocales }: AddLocaleModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Filter out already-added locales
  const availableLocales = React.useMemo(() =>
    LOCALES.filter(l => !existingLocales.includes(l.code)),
    [existingLocales]
  )

  // react-hook-form setup
  const form = useForm<{ locale: string }>({
    resolver: zodResolver(schema),
    defaultValues: { locale: '' }
  })

  // Reset form and error on open/close
  React.useEffect(() => {
    if (!open) {
      form.reset()
      setError(null)
    }
  }, [open, form])

  // Handle form submit
  async function onSubmit(data: { locale: string }) {
    setLoading(true)
    setError(null)
    const selected = availableLocales.find(l => l.code === data.locale)
    if (!selected) {
      setError('Invalid locale selected')
      setLoading(false)
      return
    }
    try {
      const newLocale = await localeService.createLocale(selected.code, selected.label)
      onSuccess(newLocale)
      onClose()
      form.reset()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create locale')
    } finally {
      setLoading(false)
    }
  }

  // Search filter state
  const [search, setSearch] = React.useState('')
  const filteredLocales = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return availableLocales
    return availableLocales.filter(l =>
      l.code.toLowerCase().includes(q) || l.label.toLowerCase().includes(q)
    )
  }, [search, availableLocales])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Locale</DialogTitle>
          <DialogDescription>Select a locale to add to your organization.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="locale-search">Search Locale</Label>
            <Input
              id="locale-search"
              placeholder="Type to search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="locale-select">Locale</Label>
            <select
              id="locale-select"
              {...form.register('locale', { required: true })}
              disabled={loading || filteredLocales.length === 0}
              className="w-full border rounded px-2 py-2 mt-1"
            >
              <option value="" disabled>Select a locale...</option>
              {filteredLocales.map(l => (
                <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
              ))}
            </select>
            {filteredLocales.length === 0 && (
              <div className="text-xs text-muted-foreground mt-1">No locales match your search.</div>
            )}
            {form.formState.errors.locale && (
              <span className="text-destructive text-xs">{form.formState.errors.locale.message}</span>
            )}
          </div>
          {error && <div className="text-destructive text-xs">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || filteredLocales.length === 0}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Locale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 