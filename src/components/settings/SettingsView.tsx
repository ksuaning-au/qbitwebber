import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'
import { qbitClient } from '@/lib/api'
import { toast } from 'sonner'

interface Preferences {
  locale: string
  save_path: string
  temp_path: string
  temp_path_enabled: boolean
  create_subfolder_enabled: boolean
  start_paused_enabled: boolean
  auto_tmm_enabled: boolean
  queueing_enabled: boolean
  max_active_downloads: number
  max_active_torrents: number
  max_active_uploads: number
  dl_limit: number
  up_limit: number
  alt_dl_limit: number
  alt_up_limit: number
  listen_port: number
  upnp: boolean
  random_port: boolean
  dht: boolean
  pex: boolean
  lsd: boolean
  encryption: number
}

const defaultPreferences: Preferences = {
  locale: 'en',
  save_path: '',
  temp_path: '',
  temp_path_enabled: false,
  create_subfolder_enabled: true,
  start_paused_enabled: false,
  auto_tmm_enabled: false,
  queueing_enabled: false,
  max_active_downloads: 3,
  max_active_torrents: 5,
  max_active_uploads: 3,
  dl_limit: 0,
  up_limit: 0,
  alt_dl_limit: 1024,
  alt_up_limit: 1024,
  listen_port: 6881,
  upnp: true,
  random_port: false,
  dht: true,
  pex: true,
  lsd: true,
  encryption: 0,
}

export function SettingsView() {
  const { logout, username } = useAuth()
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const prefs = await qbitClient.getPreferences() as unknown as Preferences
      setPreferences({
        ...defaultPreferences,
        ...prefs,
        dl_limit: prefs.dl_limit > 0 ? Math.round(prefs.dl_limit / 1024) : prefs.dl_limit,
        up_limit: prefs.up_limit > 0 ? Math.round(prefs.up_limit / 1024) : prefs.up_limit,
        alt_dl_limit: prefs.alt_dl_limit > 0 ? Math.round(prefs.alt_dl_limit / 1024) : prefs.alt_dl_limit,
        alt_up_limit: prefs.alt_up_limit > 0 ? Math.round(prefs.alt_up_limit / 1024) : prefs.alt_up_limit,
      })
    } catch (error) {
      console.error('Failed to load preferences:', error)
      toast.error('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (section: string) => {
    setSaving(true)
    try {
      const prefsToSave: Record<string, unknown> = {}

      switch (section) {
        case 'general':
          prefsToSave.locale = preferences.locale
          prefsToSave.save_path = preferences.save_path
          prefsToSave.temp_path = preferences.temp_path
          prefsToSave.temp_path_enabled = preferences.temp_path_enabled
          prefsToSave.create_subfolder_enabled = preferences.create_subfolder_enabled
          prefsToSave.start_paused_enabled = preferences.start_paused_enabled
          prefsToSave.auto_tmm_enabled = preferences.auto_tmm_enabled
          break
        case 'queueing':
          prefsToSave.queueing_enabled = preferences.queueing_enabled
          prefsToSave.max_active_downloads = preferences.max_active_downloads
          prefsToSave.max_active_torrents = preferences.max_active_torrents
          prefsToSave.max_active_uploads = preferences.max_active_uploads
          break
        case 'speed':
          prefsToSave.dl_limit = preferences.dl_limit > 0 ? preferences.dl_limit * 1024 : preferences.dl_limit
          prefsToSave.up_limit = preferences.up_limit > 0 ? preferences.up_limit * 1024 : preferences.up_limit
          prefsToSave.alt_dl_limit = preferences.alt_dl_limit > 0 ? preferences.alt_dl_limit * 1024 : preferences.alt_dl_limit
          prefsToSave.alt_up_limit = preferences.alt_up_limit > 0 ? preferences.alt_up_limit * 1024 : preferences.alt_up_limit
          break
        case 'connection':
          prefsToSave.listen_port = preferences.listen_port
          prefsToSave.upnp = preferences.upnp
          prefsToSave.random_port = preferences.random_port
          prefsToSave.dht = preferences.dht
          prefsToSave.pex = preferences.pex
          prefsToSave.lsd = preferences.lsd
          prefsToSave.encryption = preferences.encryption
          break
      }

      await qbitClient.setPreferences(prefsToSave)
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved`)
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    toast('Logged out')
  }

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return <div className="p-4">Loading preferences...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>Current connection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} disabled />
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Disconnect
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="queueing">Queueing</TabsTrigger>
          <TabsTrigger value="speed">Speed</TabsTrigger>
          <TabsTrigger value="connection">Connection</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic download and file settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="locale">Language</Label>
                <Input
                  id="locale"
                  value={preferences.locale}
                  onChange={(e) => updatePreference('locale', e.target.value)}
                  placeholder="en"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="save_path">Default Save Path</Label>
                <Input
                  id="save_path"
                  value={preferences.save_path}
                  onChange={(e) => updatePreference('save_path', e.target.value)}
                  placeholder="/downloads"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp_path">Temp Folder</Label>
                <Input
                  id="temp_path"
                  value={preferences.temp_path}
                  onChange={(e) => updatePreference('temp_path', e.target.value)}
                  placeholder="/downloads/temp"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="temp_path_enabled"
                  checked={preferences.temp_path_enabled}
                  onCheckedChange={(checked) => updatePreference('temp_path_enabled', !!checked)}
                />
                <Label htmlFor="temp_path_enabled">Enable temp folder</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create_subfolder_enabled"
                  checked={preferences.create_subfolder_enabled}
                  onCheckedChange={(checked) => updatePreference('create_subfolder_enabled', !!checked)}
                />
                <Label htmlFor="create_subfolder_enabled">Create subfolder</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="start_paused_enabled"
                  checked={preferences.start_paused_enabled}
                  onCheckedChange={(checked) => updatePreference('start_paused_enabled', !!checked)}
                />
                <Label htmlFor="start_paused_enabled">Start paused</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto_tmm_enabled"
                  checked={preferences.auto_tmm_enabled}
                  onCheckedChange={(checked) => updatePreference('auto_tmm_enabled', !!checked)}
                />
                <Label htmlFor="auto_tmm_enabled">Auto torrent management</Label>
              </div>
              <Button onClick={() => handleSave('general')} disabled={saving}>
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queueing">
          <Card>
            <CardHeader>
              <CardTitle>Queueing Settings</CardTitle>
              <CardDescription>Configure download queue limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="queueing_enabled"
                  checked={preferences.queueing_enabled}
                  onCheckedChange={(checked) => updatePreference('queueing_enabled', !!checked)}
                />
                <Label htmlFor="queueing_enabled">Enable queueing</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_active_downloads">Max Active Downloads</Label>
                <Input
                  id="max_active_downloads"
                  type="number"
                  value={preferences.max_active_downloads}
                  onChange={(e) => updatePreference('max_active_downloads', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_active_torrents">Max Active Torrents</Label>
                <Input
                  id="max_active_torrents"
                  type="number"
                  value={preferences.max_active_torrents}
                  onChange={(e) => updatePreference('max_active_torrents', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_active_uploads">Max Active Uploads</Label>
                <Input
                  id="max_active_uploads"
                  type="number"
                  value={preferences.max_active_uploads}
                  onChange={(e) => updatePreference('max_active_uploads', parseInt(e.target.value) || 0)}
                />
              </div>
              <Button onClick={() => handleSave('queueing')} disabled={saving}>
                Save Queueing Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speed">
          <Card>
            <CardHeader>
              <CardTitle>Speed Settings</CardTitle>
              <CardDescription>Configure speed limits (KiB/s, 0 = unlimited)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dl_limit">Download Limit</Label>
                <Input
                  id="dl_limit"
                  type="number"
                  value={preferences.dl_limit}
                  onChange={(e) => updatePreference('dl_limit', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="up_limit">Upload Limit</Label>
                <Input
                  id="up_limit"
                  type="number"
                  value={preferences.up_limit}
                  onChange={(e) => updatePreference('up_limit', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alt_dl_limit">Alternative Download Limit</Label>
                <Input
                  id="alt_dl_limit"
                  type="number"
                  value={preferences.alt_dl_limit}
                  onChange={(e) => updatePreference('alt_dl_limit', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alt_up_limit">Alternative Upload Limit</Label>
                <Input
                  id="alt_up_limit"
                  type="number"
                  value={preferences.alt_up_limit}
                  onChange={(e) => updatePreference('alt_up_limit', parseInt(e.target.value) || 0)}
                />
              </div>
              <Button onClick={() => handleSave('speed')} disabled={saving}>
                Save Speed Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>Configure ports and network options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="listen_port">Listen Port</Label>
                <Input
                  id="listen_port"
                  type="number"
                  value={preferences.listen_port}
                  onChange={(e) => updatePreference('listen_port', parseInt(e.target.value) || 6881)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="upnp"
                  checked={preferences.upnp}
                  onCheckedChange={(checked) => updatePreference('upnp', !!checked)}
                />
                <Label htmlFor="upnp">UPnP / NAT-PMP</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="random_port"
                  checked={preferences.random_port}
                  onCheckedChange={(checked) => updatePreference('random_port', !!checked)}
                />
                <Label htmlFor="random_port">Random Port</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dht"
                  checked={preferences.dht}
                  onCheckedChange={(checked) => updatePreference('dht', !!checked)}
                />
                <Label htmlFor="dht">DHT</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pex"
                  checked={preferences.pex}
                  onCheckedChange={(checked) => updatePreference('pex', !!checked)}
                />
                <Label htmlFor="pex">PeX</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lsd"
                  checked={preferences.lsd}
                  onCheckedChange={(checked) => updatePreference('lsd', !!checked)}
                />
                <Label htmlFor="lsd">LSD</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="encryption">Encryption</Label>
                <select
                  id="encryption"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={preferences.encryption}
                  onChange={(e) => updatePreference('encryption', parseInt(e.target.value))}
                >
                  <option value={0}>Prefer encryption</option>
                  <option value={1}>Force encryption on</option>
                  <option value={2}>Force encryption off</option>
                </select>
              </div>
              <Button onClick={() => handleSave('connection')} disabled={saving}>
                Save Connection Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
