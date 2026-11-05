import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCategories, useRemoveRSSRule, useRSSFeeds, useRSSRules, useSetRSSRule } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import type { RSSRule } from '@/types'
import { RuleExtras } from './RuleExtras'

const EMPTY_RULE: RSSRule = { enabled: true, mustContain: '', mustNotContain: '', useRegex: false, affectedFeeds: [], assignedCategory: '', savePath: '' }

interface Editing {
  name: string
  isNew: boolean
  rule: RSSRule
}

export function RSSRules() {
  const { data: rules } = useRSSRules()
  const { data: feedsData } = useRSSFeeds()
  const { data: categories } = useCategories()
  const setRule = useSetRSSRule()
  const removeRule = useRemoveRSSRule()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)

  const feeds = feedsData?.feeds ?? []
  const update = (patch: Partial<RSSRule>) => setEditing(current => current && { ...current, rule: { ...current.rule, ...patch } })

  const open = (next: Editing) => {
    setEditing(next)
    setEditorOpen(true)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const name = editing.name.trim()
    if (!name) return
    if (editing.isNew && rules?.[name]) {
      toast.error('A rule with this name already exists')
      return
    }
    // Newer qBittorrent versions keep these in torrentParams, which takes priority when present.
    const { rule } = editing
    const def: RSSRule = rule.torrentParams
      ? { ...rule, torrentParams: { ...rule.torrentParams, category: rule.assignedCategory, save_path: rule.savePath } }
      : rule
    try {
      await setRule.mutateAsync({ name, rule: def })
      toast.success('Rule saved')
      setEditorOpen(false)
    } catch (error) {
      toast.error('Failed to save rule', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const confirmRemove = async () => {
    if (!removing) return
    try {
      await removeRule.mutateAsync(removing)
      toast('Rule removed')
      setRemoveOpen(false)
    } catch (error) {
      toast.error('Failed to remove rule', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Card className="gap-2">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Download rules</CardTitle>
        <Button size="sm" variant="outline" aria-label="Add rule" title="Add rule" onClick={() => open({ name: '', isNew: true, rule: EMPTY_RULE })}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
      {Object.keys(rules ?? {}).length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules configured</p>
      ) : (
        <ul className="divide-y">
        {Object.entries(rules ?? {}).map(([name, rule]) => (
          <li key={name} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {rule.enabled ? 'On' : 'Off'}{rule.mustContain ? ` · Must contain: ${rule.mustContain}` : ''}
                </p>
              </div>
              <RuleExtras name={name} existing={Object.keys(rules ?? {})} />
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${name}`} title="Edit" onClick={() => open({
                name,
                isNew: false,
                rule: {
                  ...EMPTY_RULE,
                  ...rule,
                  assignedCategory: rule.torrentParams?.category ?? rule.assignedCategory ?? '',
                  savePath: rule.torrentParams?.save_path ?? rule.savePath ?? '',
                },
              })}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Delete ${name}`} title="Delete" onClick={() => { setRemoving(name); setRemoveOpen(true) }}>
                <Trash2 className="h-4 w-4" />
              </Button>
          </li>
        ))}
        </ul>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.isNew ? 'Add rule' : 'Edit rule'}</DialogTitle>
            <DialogDescription>Downloads matching articles from the selected feeds.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="rule-name">Name</Label>
                <Input id="rule-name" required disabled={!editing.isNew} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-contain">Must contain</Label>
                <Input id="rule-contain" value={editing.rule.mustContain} onChange={(e) => update({ mustContain: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-not-contain">Must not contain</Label>
                <Input id="rule-not-contain" value={editing.rule.mustNotContain} onChange={(e) => update({ mustNotContain: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-category">Category</Label>
                <select id="rule-category" value={editing.rule.assignedCategory} onChange={(e) => update({ assignedCategory: e.target.value })} className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2 text-sm">
                  <option value="">No category</option>
                  {editing.rule.assignedCategory && !categories?.[editing.rule.assignedCategory] && <option value={editing.rule.assignedCategory}>{editing.rule.assignedCategory}</option>}
                  {Object.keys(categories ?? {}).map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-path">Save location</Label>
                <Input id="rule-path" value={editing.rule.savePath} onChange={(e) => update({ savePath: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="rule-regex" checked={editing.rule.useRegex} onCheckedChange={(checked) => update({ useRegex: !!checked })} />
                <Label htmlFor="rule-regex">Use regular expressions</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="rule-enabled" checked={editing.rule.enabled} onCheckedChange={(checked) => update({ enabled: !!checked })} />
                <Label htmlFor="rule-enabled">Rule is on</Label>
              </div>
              <fieldset className="space-y-1">
                <legend className="text-sm font-medium">Feeds</legend>
                {feeds.length === 0 && <p className="text-xs text-muted-foreground">Add a feed first, so this rule has something to match.</p>}
                {feeds.map(feed => (
                  <div key={feed.uid} className="flex items-center gap-2">
                    <Checkbox
                      id={`rule-feed-${feed.uid}`}
                      checked={editing.rule.affectedFeeds.includes(feed.url)}
                      onCheckedChange={(checked) => update({
                        affectedFeeds: checked
                          ? [...editing.rule.affectedFeeds, feed.url]
                          : editing.rule.affectedFeeds.filter(url => url !== feed.url),
                      })}
                    />
                    <Label htmlFor={`rule-feed-${feed.uid}`} className="min-w-0 truncate">{feed.title}</Label>
                  </div>
                ))}
              </fieldset>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={setRule.isPending}>Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this rule?</DialogTitle>
            <DialogDescription>{removing}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={removeRule.isPending} onClick={confirmRemove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </CardContent>
    </Card>
  )
}
