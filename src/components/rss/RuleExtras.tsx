import { useState, type FormEvent } from 'react'
import { Eye, TextCursorInput } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'

function MatchesDialog({ name, onClose }: { name: string; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({ queryKey: ['rss', 'matches', name], queryFn: () => qbitClient.getRSSMatchingArticles(name) })
  const feeds = Object.entries(data ?? {}).filter(([, titles]) => titles.length > 0)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Matches for {name}</DialogTitle>
          <DialogDescription>Articles already in your feeds that this rule matches.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Couldn't check this rule. Save it first if it's new.</p>
        ) : feeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing matches yet</p>
        ) : (
          feeds.map(([feed, titles]) => (
            <section key={feed} className="space-y-1">
              <h3 className="text-sm font-medium">{feed}</h3>
              <ul className="list-disc space-y-0.5 pl-5 text-xs">
                {titles.map((title, i) => <li key={`${title}-${i}`} className="break-words">{title}</li>)}
              </ul>
            </section>
          ))
        )}
      </DialogContent>
    </Dialog>
  )
}

function RenameDialog({ name, existing, onClose }: { name: string; existing: string[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(name)
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = value.trim()
    if (!next || next === name) return onClose()
    if (existing.includes(next)) return toast.error('A rule with this name already exists')
    setSaving(true)
    try {
      await qbitClient.renameRSSRule(name, next)
      await queryClient.invalidateQueries({ queryKey: ['rss', 'rules'] })
      toast.success('Rule renamed')
      onClose()
    } catch (err) {
      toast.error('Failed to rename rule', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename rule</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input aria-label="New rule name" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Preview and rename buttons for one rule in the list.
export function RuleExtras({ name, existing }: { name: string; existing: string[] }) {
  const [open, setOpen] = useState<'matches' | 'rename' | null>(null)
  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Show matches for ${name}`} title="Show matching articles" onClick={() => setOpen('matches')}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Rename ${name}`} title="Rename" onClick={() => setOpen('rename')}>
        <TextCursorInput className="h-4 w-4" />
      </Button>
      {open === 'matches' && <MatchesDialog name={name} onClose={() => setOpen(null)} />}
      {open === 'rename' && <RenameDialog name={name} existing={existing} onClose={() => setOpen(null)} />}
    </>
  )
}
