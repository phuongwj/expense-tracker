import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { getGroups, createGroup, joinGroup } from '../services/groupService'
import type { GroupSummary } from '@expense-tracker/shared/groups'
import { getErrorMessage, SUPPORT_EMAIL } from '../utils/errors'

export default function Groups() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    getGroups()
      .then(setGroups)
      .catch((err) => {
        setError(getErrorMessage(err, `Unable to load your groups. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`))
      })
      .finally(() => setIsLoading(false))
  }, [])

  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleCreateSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const name = formName.trim()
    if (!name) {
      setFormError('Please enter a group name.')
      return
    }
    setFormError(null)
    setCreating(true)
    try {
      const group = await createGroup({ name })
      setGroups((cur) => [group, ...cur])
      setCreateOpen(false)
      setFormName('')
      navigate(`/groups/${group.id}`)
    } catch (err) {
      setFormError(getErrorMessage(err, `Unable to create group due to unforeseen error. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`))
    } finally {
      setCreating(false)
    }
  }

  async function handleJoinSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const joinCode = formCode.trim()
    if (!joinCode) {
      setFormError('Enter the 8-character join code.')
      return
    }
    setFormError(null)
    setJoining(true)
    try {
      const group = await joinGroup({ joinCode })
      const updated = await getGroups()
      setGroups(updated)
      setJoinOpen(false)
      setFormCode('')
      navigate(`/groups/${group.id}`)
    } catch (err: any) {
      setFormError(getErrorMessage(err, `Unable to join group. Check code and try again, or contact ${SUPPORT_EMAIL} if the problem persists.`))
    } finally {
      setJoining(false)
    }
  }

  return (
    <Layout
      title="My Groups"
      headerActions={
        <>
          <button
            onClick={() => { setJoinOpen(true); setFormError(null) }}
            className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:shadow-sm flex items-center gap-2"
          >
            <span className="text-sm">🔑</span>
            <span className="hidden sm:inline">Join by code</span>
          </button>

          <button
            onClick={() => { setCreateOpen(true); setFormError(null) }}
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#3D6B4F] to-[#2F7A5F] text-white text-sm font-semibold hover:opacity-95 flex items-center gap-2"
          >
            <span className="text-lg">＋</span>
            <span className="hidden sm:inline">Create Group</span>
          </button>
        </>
      }
    >
      {/* Create Group Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a new group">
        <form onSubmit={handleCreateSubmit}>
          <p className="text-sm text-gray-500 mb-4">Give your group a memorable name so members recognise it.</p>
          <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-2">Group name</label>
          <input id="group-name" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#3D6B4F]" placeholder="e.g. Dal Apartment 2B" />
          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              ⚠ {formError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCreateOpen(false)} className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={creating} className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] disabled:opacity-50">{creating ? 'Creating…' : 'Create group'}</button>
          </div>
        </form>
      </Modal>

      {/* Join Group Modal */}
      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join a group by code">
        <form onSubmit={handleJoinSubmit}>
          <p className="text-sm text-gray-500 mb-4">Ask the group leader for the join code and enter it below.</p>
          <label htmlFor="join-code" className="block text-sm font-medium text-gray-700 mb-2">Join code</label>
          <input id="join-code" value={formCode} onChange={(e) => setFormCode(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#3D6B4F]" placeholder="AB12CD34" />
          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              ⚠ {formError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setJoinOpen(false)} className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={joining} className="h-11 px-6 rounded-xl bg-white text-sm font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50">{joining ? 'Joining…' : 'Join group'}</button>
          </div>
        </form>
      </Modal>

      <p className="text-sm text-gray-500 mb-6">
        {isLoading ? 'Loading groups…' : `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`}
      </p>

      {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-col gap-4">
        {isLoading && <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">Please wait while your groups load.</div>}

        {!isLoading && groups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">You don't have any groups yet.</div>
        )}

        {!isLoading && groups.map((g) => (
          <div key={g.id} onClick={() => navigate(`/groups/${g.id}`)} className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-sm transition">
            <div className="font-semibold text-gray-900 text-lg">{g.name}</div>
            <div className="text-xs text-gray-400 mt-1">Role: {g.role}</div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
