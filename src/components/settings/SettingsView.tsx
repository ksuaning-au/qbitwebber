import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import { ConfirmAction } from '@/components/ConfirmAction'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { useAppVersion, usePreferences, useSavePreferences, useWebApiVersion } from '@/hooks/useApi'
import { formatDuration } from '@/lib/format'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import { PREFERENCE_SECTIONS, getChangedPreferences, toFormValue, type PrefDef } from '@/lib/preferences'
import { PreferenceField } from './PreferenceField'

// System is the default, so it comes first.
const themeOptions = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

const SECTIONS = [{ id: 'app', title: 'App' }, ...PREFERENCE_SECTIONS.map(({ id, title }) => ({ id, title }))]

function AppSection() {
  const { theme, setTheme } = useTheme()
  const { data: qbittorrentVersion } = useAppVersion()
  const { data: webApiVersion } = useWebApiVersion()
  const { data: build } = useQuery({ queryKey: ['app', 'buildInfo'], queryFn: () => qbitClient.getBuildInfo() })
  const { data: process } = useQuery({ queryKey: ['app', 'processInfo'], queryFn: () => qbitClient.getProcessInfo() })
  const [reverting, setReverting] = useState(false)

  const about: [string, string | undefined][] = [
    ['qbitwebber', `v${__APP_VERSION__}`],
    ['qBittorrent', qbittorrentVersion],
    ['Web API', webApiVersion],
    ['Running for', process?.launch_time ? formatDuration(Math.floor(Date.now() / 1000) - process.launch_time) : undefined],
    ['Platform', build ? `${build.platform}, ${build.bitness}-bit` : undefined],
    ['libtorrent', build?.libtorrent as string | undefined],
    ['Qt', build?.qt as string | undefined],
    ['Boost', build?.boost as string | undefined],
    ['OpenSSL', build?.openssl as string | undefined],
    ['zlib', build?.zlib as string | undefined],
  ]

  const shutdown = async () => {
    try {
      await qbitClient.shutdown()
      toast.success('qBittorrent is shutting down', { description: 'This page stops working until qBittorrent is started again.' })
    } catch (e) {
      toast.error("Couldn't shut down qBittorrent", { description: e instanceof Error ? e.message : undefined })
    }
  }

  const revert = async () => {
    setReverting(true)
    try {
      await qbitClient.revertToDefaultWebUI()
      toast.success("Switched to qBittorrent's own Web UI", { description: 'Reload the page to open it.' })
    } catch (e) {
      toast.error("Couldn't switch", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setReverting(false)
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Follows your device unless you choose light or dark</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Theme</Label>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Theme">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <Button key={value} variant={theme === value ? 'secondary' : 'outline'} size="sm" aria-pressed={theme === value} onClick={() => setTheme(value)} className="gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1 text-sm">
            {about.filter((row): row is [string, string] => !!row[1]).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>qBittorrent</CardTitle>
          <CardDescription>These affect qBittorrent itself</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ConfirmAction
            buttonLabel={reverting ? 'Switching...' : "Use qBittorrent's own Web UI"}
            label="Switch back to qBittorrent's built-in Web UI"
            title="Switch to qBittorrent's own Web UI?"
            message="This turns off qbitwebber. To use it again, turn the alternative Web UI back on in qBittorrent's settings."
            confirmLabel="Switch"
            disabled={reverting}
            onConfirm={revert}
          />
          <ConfirmAction
            buttonLabel="Shut down qBittorrent"
            label="Shut down qBittorrent"
            title="Shut down qBittorrent?"
            message="All downloads and seeding stop, and this page can't start it again. You'll need to start qBittorrent on its machine, or from your provider's control panel."
            confirmLabel="Shut down"
            onConfirm={shutdown}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// Edits live in SettingsView, so they survive switching sections and are all saved together.
function PreferencesSection({ sectionId, edits, setEdits }: { sectionId: string; edits: Record<string, unknown>; setEdits: (update: (prev: Record<string, unknown>) => Record<string, unknown>) => void }) {
  const { data: original, isLoading, isError } = usePreferences()
  const save = useSavePreferences()
  const section = PREFERENCE_SECTIONS.find(s => s.id === sectionId)

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Loading settings...</p>
  if (isError || !original || !section) return <p className="py-8 text-center text-muted-foreground">Couldn't load qBittorrent's settings</p>

  const valueFor = (def: PrefDef) => (def.key in edits ? edits[def.key] : toFormValue(def, original[def.key]))
  const getValue = (key: string) => (key in edits ? edits[key] : original[key])
  const { changes: allChanges, invalid } = getChangedPreferences(original, edits)
  // A cleared password box means "keep the current password".
  const changes = Object.fromEntries(Object.entries(allChanges).filter(([key, value]) => !(key === 'web_ui_password' && value === '')))
  const changeCount = Object.keys(changes).length

  const submit = () => {
    if (invalid.length) {
      toast.error('Check these settings', { description: invalid.join(', ') })
      return
    }
    const password = changes.web_ui_password
    if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
      toast.error('The new password needs at least 6 characters')
      return
    }
    if (!Object.keys(changes).length) return
    save.mutate(changes, {
      onSuccess: () => {
        setEdits(() => ({}))
        toast.success('Settings saved')
      },
    })
  }

  return (
    <div className="space-y-3 pb-16">
      {section.groups.map(group => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="text-base">{group.title}</CardTitle>
            {group.warning && <CardDescription className="text-amber-600 dark:text-amber-400">{group.warning}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {group.prefs.map(def => {
              const disabled = !!def.dependsOn && !getValue(def.dependsOn)
              return (
                <PreferenceField
                  key={def.key}
                  def={def}
                  value={valueFor(def)}
                  getValue={getValue}
                  onChange={(value) => setEdits(prev => ({ ...prev, [def.key]: value }))}
                  disabled={disabled}
                  hasUnsavedChanges={changeCount > 0}
                />
              )
            })}
          </CardContent>
        </Card>
      ))}

      {(changeCount > 0 || invalid.length > 0) && (
        <div className="sticky bottom-2 z-10 flex items-center justify-between gap-2 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm">{changeCount === 1 ? '1 unsaved change' : `${changeCount} unsaved changes`}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEdits(() => ({}))}>Discard</Button>
            <Button size="sm" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SettingsView() {
  const [sectionId, setSectionId] = useState('app')
  const [edits, setEdits] = useState<Record<string, unknown>>({})

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <nav aria-label="Settings sections" className="flex flex-wrap gap-1">
        {SECTIONS.map(section => (
          <Button key={section.id} size="sm" variant={sectionId === section.id ? 'secondary' : 'ghost'} aria-current={sectionId === section.id ? 'page' : undefined} onClick={() => setSectionId(section.id)}>
            {section.title}
          </Button>
        ))}
      </nav>
      {sectionId === 'app' ? <AppSection /> : <PreferencesSection sectionId={sectionId} edits={edits} setEdits={setEdits} />}
    </div>
  )
}
