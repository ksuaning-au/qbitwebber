import { useState, useEffect, useMemo, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { qbitClient } from '@/lib/api'
import { toast } from 'sonner'
import { Columns, Preferences } from '@/types'
import { columnsDictionary, defaultPreferences } from "@/constants";
import { getStoredTableSettings } from "@/components/helpers";


export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revertDialogOpen, setRevertDialogOpen] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<keyof typeof defaultPreferences.columns | null>(null)
  const dragOverRef = useRef<string | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])


  const loadPreferences = async () => {
    try {
      const prefs = await qbitClient.getPreferences() as unknown as Preferences
      setPreferences({
        ...defaultPreferences,
        ...prefs,
        columns: getStoredTableSettings(),
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

  const handleSaveTableSettings = () => {
    localStorage.setItem('qbitwebber_tableViewSettings', JSON.stringify(preferences.columns))
  };

  const resetTableSettings = () => {
    const defaultColumns = defaultPreferences.columns
    setPreferences(prev => ({ ...prev, columns: defaultColumns }))
    localStorage.removeItem('qbitwebber_tableViewSettings')
  }

  const handleSave = async (section: string) => {
    setSaving(true)
    try {
      const prefsToSave: Record<string, unknown> = {}

      switch (section) {
        case 'table_view':
          prefsToSave.columns = preferences.columns
          break
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


  const handleRevert = async () => {
    setReverting(true)
    try {
      await qbitClient.revertToDefaultWebUI()
      setRevertDialogOpen(false)
      toast.success('Reverted to default Web UI. Reload the page or visit the root URL to access the default interface.')
    } catch (error) {
      console.error('Failed to revert to default Web UI:', error)
      toast.error('Failed to revert to default Web UI')
    } finally {
      setReverting(false)
    }
  }

  const handleDragStart = (columnId: keyof typeof defaultPreferences.columns) => {
    setDraggedColumn(columnId)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetColumn: keyof typeof defaultPreferences.columns) => {
    e.preventDefault()
    if (!draggedColumn || draggedColumn === targetColumn) {
      dragOverRef.current = null
      return
    }

    dragOverRef.current = targetColumn

    // Swap dynamically during drag
    const draggedOrder = preferences.columns[draggedColumn as keyof typeof defaultPreferences.columns]!.order
    const targetOrder = preferences.columns[targetColumn]!.order

    const newColumns = { ...preferences.columns }
    newColumns[draggedColumn] = {
      ...newColumns[draggedColumn]!,
      order: targetOrder
    }
    newColumns[targetColumn] = {
      ...newColumns[targetColumn!],
      order: draggedOrder
    }

    updatePreference('columns', newColumns)
  }

  const handleDragLeave = () => {
    dragOverRef.current = null
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragOverRef.current = null
    setDraggedColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
    dragOverRef.current = null
  }

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

    const orderedColumns = useMemo(() => Object.entries(preferences.columns)
    .sort(([, a], [, b]) => a.order - b.order)
    .reduce((acc, [key, value]) => {
      acc[key as keyof typeof preferences.columns] = value
      return acc
    }, {} as typeof preferences.columns)
  , [preferences]);

  if (loading) {
    return <div className="p-4">Loading preferences...</div>
  }


  return (
    <div className="max-w-4xl mx-auto space-y-4">
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

          <Card className="mt-3">
            <CardHeader>
              <CardTitle>Table View Settings</CardTitle>
              <CardDescription>Configure which columns are displayed in the torrent list. Drag to reorder columns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Columns</Label>
                <div className="flex flex-col space-y-2 border rounded-lg p-4 bg-muted/30">
                  {Object.entries(orderedColumns).map(([column, config]) => (
                    <div
                      key={column}
                      draggable
                      onDragStart={() => handleDragStart(column as keyof typeof defaultPreferences.columns)}
                      onDragOver={(e) => handleDragOver(e, column as keyof typeof defaultPreferences.columns)}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center space-x-3 p-3 pl-0 rounded-md transition-all ${
                        draggedColumn === column
                          ? 'border border-primary bg-primary/10 opacity-70'
                          : 'border border-transparent hover:bg-muted/20'
                      } cursor-move`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Checkbox
                        id={column}
                        checked={config.active}
                        onCheckedChange={(checked) => updatePreference('columns', {
                          ...preferences.columns,
                          [column]: { ...config, active: !!checked }
                        })}
                      />
                      <Label htmlFor={column} className="flex-1 cursor-pointer">
                        {columnsDictionary[column as Columns] || column}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="m-2" variant="destructive" onClick={() => resetTableSettings()}>
                Reset Table View Settings
              </Button>
              <Button onClick={() => handleSaveTableSettings()}>
                Save Table View Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-3">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Toggle between light and dark mode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label>Theme</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="gap-2"
                >
                  {theme === 'dark' ? (
                    <><Moon className="h-4 w-4" /><span>Dark</span></>
                  ) : (
                    <><Sun className="h-4 w-4" /><span>Light</span></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-3">
            <CardHeader>
              <CardTitle>Default Web UI</CardTitle>
              <CardDescription>Disable qbitwebber and revert to qBittorrent's built-in Web UI</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="default" className="gap-2">
                    Revert to Default Web UI
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Revert to Default Web UI?</DialogTitle>
                    <DialogDescription>
                      This will disable qbitwebber. You will need to re-enable the alternative Web UI in qBittorrent's settings to use qbitwebber again.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRevertDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleRevert} disabled={reverting}>
                      {reverting ? 'Reverting...' : 'Confirm'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
