// Paths in a torrent use "/" between folders, whatever the server's system.
export function getRenamedPath(oldPath: string, newName: string): string {
  const slash = oldPath.lastIndexOf('/')
  return slash === -1 ? newName : `${oldPath.slice(0, slash + 1)}${newName}`
}

// Returns why a new file or folder name can't be used, or null if it can.
export function getNameProblem(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Enter a name'
  if (/[/\\]/.test(trimmed)) return 'Names can\'t contain / or \\'
  if (trimmed === '.' || trimmed === '..') return 'Choose a different name'
  return null
}
