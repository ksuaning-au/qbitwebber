import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'

export function SettingsView() {
  const { logout, host, username } = useAuth()
  const [newPassword, setNewPassword] = useState('')

  const handleLogout = async () => {
    await logout()
    toast('Logged out')
  }

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault()
    toast('Password update not implemented yet')
    setNewPassword('')
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>Current connection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Host</Label>
            <Input value={host} disabled />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} disabled />
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Disconnect
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your qBittorrent password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
