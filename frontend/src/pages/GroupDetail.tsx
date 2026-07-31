import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { useAuth } from '../context/AuthContext'
import { getGroup, regenerateGroupJoinCode, removeMember, deleteGroup } from '../services/groupService'
import type { GroupDetailResponse } from '@expense-tracker/shared/groups'

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<GroupDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    getGroup(id)
      .then(setData)
      .catch((err: any) => {
        // If backend returns 404 for non-members or missing group, show a friendly message
        if (err?.response?.status === 404) {
          setError('No group to display.')
        } else {
          setError('Unable to load group details.')
        }
        setData(null)
      })
      .finally(() => setIsLoading(false))
  }, [id])

  const { user } = useAuth()
  const isLeader = !!(data && user && data.members.find((m) => m.userId === user.id && m.role === 'leader'))
  const isMember = !!(data && user && data.members.find((m) => m.userId === user.id))

  const handleLeave = async () => {
    if (!id || !user) return
    try {
      await removeMember(id, user.id)
      navigate('/groups')
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Unable to leave group.'
      setInfoModal({ title: 'Error', message: msg })
    } finally {
      setConfirmLeaveOpen(false)
    }
  }

  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null)

  const handleRegenerate = async () => {
    if (!id) return
    try {
      const joinCode = await regenerateGroupJoinCode(id)
      setData((cur) => cur ? { ...cur, group: { ...cur.group, joinCode } } : cur)
      setInfoModal({ title: 'New join code', message: joinCode })
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Unable to regenerate join code.'
      setInfoModal({ title: 'Error', message: msg })
    }
  }

  const performRemove = async (userId: string) => {
    if (!id) return
    try {
      await removeMember(id, userId)
      setData((cur) => cur ? { ...cur, members: cur.members.filter((m) => m.userId !== userId) } : cur)
      setConfirmRemoveUserId(null)
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Unable to remove member.'
      setInfoModal({ title: 'Error', message: msg })
    }
  }

  const performDelete = async () => {
    if (!id) return
    try {
      await deleteGroup(id)
      setConfirmDeleteOpen(false)
      navigate('/groups')
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Unable to delete group.'
      setInfoModal({ title: 'Error', message: msg })
    }
  }

  if (!id) {
    navigate('/groups')
    return null
  }

  return (
    <Layout title={data?.group.name ?? 'Group'} headerActions={
      <>
        <button onClick={() => navigate('/groups')} className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">← Back</button>
        {isLeader && data?.group.joinCode && <button onClick={handleRegenerate} className="h-9 px-4 rounded-lg bg-white text-sm font-medium text-gray-700 border border-gray-200 ml-2">Regenerate code</button>}
        {isLeader && <button onClick={() => setConfirmDeleteOpen(true)} className="h-9 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold ml-2">Delete Group</button>}
        {!isLeader && isMember && <button onClick={() => setConfirmLeaveOpen(true)} className="h-9 px-4 rounded-lg bg-white text-sm font-medium text-gray-700 border border-gray-200 ml-2">Leave Group</button>}
      </>
    }>
      <div className="text-sm text-gray-400 mb-4">
        <Link to="/groups" className="hover:underline">← My Groups</Link> / <span className="text-gray-700 font-medium">{data?.group.name ?? 'Loading...'}</span>
      </div>

      {isLoading && <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">Loading group details…</div>}
      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{error}</div>}

      {data && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <div className="text-lg font-semibold">{data.group.name}</div>
            <div className="text-sm text-gray-500">Created on {new Date(data.group.createdAt).toLocaleDateString()}</div>
            {data.group.joinCode && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-2">Join code</div>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-lg bg-white text-gray-900 px-4 py-2 rounded-md border border-gray-200 shadow-sm select-all tracking-widest" style={{ letterSpacing: '0.12em' }}>{data.group.joinCode}</div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(data.group.joinCode!)
                        setInfoModal({ title: 'Copied', message: 'Join code copied to clipboard' })
                      } catch (err) {
                        setInfoModal({ title: 'Error', message: 'Unable to copy join code' })
                      }
                    }}
                    className="h-10 px-4 rounded-md border border-transparent bg-[#3D6B4F] text-white text-sm font-medium hover:bg-[#2D5240]"
                    aria-label="Copy join code"
                  >
                    Copy
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-2">Share this code with other members.</div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Members ({data.members.length})</h2>
            <div className="divide-y divide-gray-100">
              {data.members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{m.firstName} {m.lastName}</div>
                    <div className="text-xs text-gray-400">Role: {m.role}</div>
                  </div>
                  {isLeader ? (
                    <button onClick={() => setConfirmRemoveUserId(m.userId)} className="text-xs text-red-600 font-medium hover:underline">Remove</button>
                  ) : (
                    <div className="text-xs text-gray-300">&nbsp;</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
                    <ConfirmModal open={!!confirmRemoveUserId} title="Remove member" message="Remove this member from the group?" onConfirm={() => performRemove(confirmRemoveUserId!)} onClose={() => setConfirmRemoveUserId(null)} />
                    <ConfirmModal open={confirmDeleteOpen} title="Delete group" message="Delete this group permanently?" onConfirm={performDelete} onClose={() => setConfirmDeleteOpen(false)} />
                    <ConfirmModal open={confirmLeaveOpen} title="Leave group" message="Are you sure you want to leave this group?" onConfirm={handleLeave} onClose={() => setConfirmLeaveOpen(false)} />

                    {infoModal && (
                      <Modal open={true} onClose={() => setInfoModal(null)} title={infoModal.title}>
                        <p className="text-sm text-gray-700 mb-4">{infoModal.message}</p>
                        <div className="flex justify-end">
                          <button onClick={() => setInfoModal(null)} className="h-10 px-5 rounded-xl border border-gray-200 text-sm">Close</button>
                        </div>
                      </Modal>
                    )}
        </>
      )}
    </Layout>
  )
}
