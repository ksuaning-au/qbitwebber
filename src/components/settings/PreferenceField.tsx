import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { BannedPeers } from '@/components/BannedPeers'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PrefDef } from '@/lib/preferences'
import { ApiKeyField, CookiesEditor, InterfaceAddressField, NetworkInterfaceField, ScanDirsEditor, TestEmailButton, TrackerUrlList } from './CustomFields'
import { FolderPicker } from './FolderPicker'

const selectClass = 'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2 text-sm disabled:opacity-50'

interface PreferenceFieldProps {
  def: PrefDef
  value: unknown
  // The current value of any other preference, edited or not.
  getValue: (key: string) => unknown
  onChange: (value: unknown) => void
  disabled: boolean
  hasUnsavedChanges: boolean
}

export function PreferenceField({ def, value, getValue, onChange, disabled, hasUnsavedChanges }: PreferenceFieldProps) {
  const [picking, setPicking] = useState(false)
  const id = `pref-${def.key}`
  const help = def.help && <p className="text-xs text-muted-foreground">{def.help}</p>

  if (def.type === 'bool') {
    return (
      <div className={`flex items-start gap-2 ${disabled ? 'opacity-50' : ''}`}>
        <Checkbox id={id} className="mt-0.5" checked={!!value} disabled={disabled} onCheckedChange={(checked) => onChange(!!checked)} />
        <div className="space-y-0.5">
          <Label htmlFor={id} className="text-sm font-normal">{def.label}</Label>
          {help}
        </div>
      </div>
    )
  }

  const label = (
    <Label htmlFor={id} className="text-xs text-muted-foreground">
      {def.label}{def.unit ? ` (${def.unit})` : ''}
    </Label>
  )

  let control
  switch (def.type) {
    case 'select':
      control = (
        <select id={id} value={value === undefined || value === null ? '' : String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={selectClass}>
          {value !== undefined && !def.options?.some(o => String(o.value) === String(value)) && <option value={String(value)}>{String(value)}</option>}
          {def.options?.map(option => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
        </select>
      )
      break
    case 'textarea':
      control = (
        <textarea id={id} rows={3} value={String(value ?? '')} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="border-input dark:bg-input/30 w-full rounded-md border bg-transparent px-3 py-2 text-sm disabled:opacity-50" />
      )
      break
    case 'path':
    case 'file':
      control = (
        <div className="flex gap-2">
          <Input id={id} value={String(value ?? '')} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-9" />
          <Button type="button" size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" aria-label={`Browse for ${def.label}`} title="Browse" disabled={disabled} onClick={() => setPicking(true)}>
            <FolderOpen className="h-4 w-4" />
          </Button>
          {picking && (
            <FolderPicker open onOpenChange={setPicking} mode={def.type === 'path' ? 'dirs' : 'all'} start={String(value || '/')} onPick={(path) => onChange(path)} />
          )}
        </div>
      )
      break
    case 'custom':
      switch (def.custom) {
        case 'scanDirs':
          control = <ScanDirsEditor value={value} onChange={onChange} disabled={disabled} />
          break
        case 'webUiPassword':
          control = <Input id={id} type="password" autoComplete="new-password" placeholder="Leave blank to keep the current one" value={String(value ?? '')} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-9" />
          break
        case 'apiKey':
          control = <ApiKeyField value={value} />
          break
        case 'networkInterface':
          control = <NetworkInterfaceField value={value} onChange={onChange} disabled={disabled} />
          break
        case 'interfaceAddress':
          control = <InterfaceAddressField value={value} iface={String(getValue('current_network_interface') ?? '')} onChange={onChange} disabled={disabled} />
          break
        case 'testEmail':
          return <TestEmailButton disabled={disabled} unsaved={hasUnsavedChanges} />
        case 'trackerUrlList':
          control = <TrackerUrlList value={value} />
          break
        case 'bannedPeers':
          control = <BannedPeers />
          break
        case 'cookies':
          control = <CookiesEditor />
          break
      }
      break
    default:
      control = (
        <Input
          id={id}
          type={def.type === 'password' ? 'password' : def.type === 'int' || def.type === 'number' ? 'number' : 'text'}
          step={def.type === 'number' || def.scale ? 'any' : def.type === 'int' ? 1 : undefined}
          value={value === undefined || value === null ? '' : String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-9"
        />
      )
  }

  return (
    <div className={`space-y-1 ${disabled ? 'opacity-60' : ''}`}>
      {label}
      {control}
      {help}
    </div>
  )
}
