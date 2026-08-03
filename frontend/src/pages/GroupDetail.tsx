import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { useAuth } from '../context/AuthContext'
import { getGroup, regenerateGroupJoinCode, removeMember, deleteGroup } from '../services/groupService'
import type { GroupDetailResponse } from '@expense-tracker/shared/groups'
import { getGroupTransactions, type GroupTransaction, getGroupBalances, type Balance } from '../services/transactions'
import AddGroupExpenseModal from '../components/AddGroupExpenseModal'
import SettleBalancesModal from '../components/SettleBalancesModal'
import { SUPPORT_EMAIL, getErrorMessage } from '../utils/errors'

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<GroupDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<GroupTransaction[]>([])
  const [addTxOpen, setAddTxOpen] = useState(false)
  const [balances, setBalances] = useState<Balance[]>([])
  const [settleTarget, setSettleTarget] = useState<Balance | null>(null)
  

  async function loadTransactions() {
    if (!id) return
    const data = await getGroupTransactions(id)
    setTransactions(
      data.map((t: GroupTransaction) => ({
        ...t,
        amount: Number(t.amount),
        splits: t.splits?.map((s) => ({ ...s, amount: Number(s.amount) })),
      }))
    )
  }

  async function loadBalances() {
    if (!id) { 
      return 
    }
    const res = await getGroupBalances(id)
    setBalances(res.balances)
  }

  useEffect(() => {
    if (!id)  {
      return;
    }

    setIsLoading(true)
    getGroup(id)
      .then(setData)
      .catch((err: any) => {
        if (err?.response?.status === 404) {
          setError('No group to display.')
        } else {
          setError('Unable to load group details.')
        }
        setData(null)
      })
      .finally(() => setIsLoading(false))
    loadTransactions()
    loadBalances()
  }, [id])

  //helper function to get the name of a group member by their userId
  function memberName(userId: string) {
    const m = data?.members.find((mem) => mem.userId === userId)
    return m ? `${m.firstName} ${m.lastName}` : 'Unknown'
  }

  const { user } = useAuth()
  const isLeader = !!(data && user && data.members.find((m) => m.userId === user.id && m.role === 'leader'))
  const isMember = !!(data && user && data.members.find((m) => m.userId === user.id))

  const handleLeave = async () => {
    if (!id || !user) {
      return
    }

    try {
      await removeMember(id, user.id)
      navigate('/groups')
    } catch (err: any) {
      setInfoModal({ title: 'Error', message: getErrorMessage(err, `Unable to leave group. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`) })
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
      setInfoModal({ title: 'Error', message: getErrorMessage(err, `Unable to regenerate join code. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`) })
    }
  }

  const performRemove = async (userId: string) => {
    if (!id) return
    try {
      await removeMember(id, userId)
      setData((cur) => cur ? { ...cur, members: cur.members.filter((m) => m.userId !== userId) } : cur)
      setConfirmRemoveUserId(null)
    } catch (err: any) {
      setInfoModal({ title: 'Error', message: getErrorMessage(err, `Unable to remove member. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`) })
    }
  }

  const performDelete = async () => {
    if (!id) return
    try {
      await deleteGroup(id)
      setConfirmDeleteOpen(false)
      navigate('/groups')
    } catch (err: any) {
      setInfoModal({ title: 'Error', message: getErrorMessage(err, `Unable to delete group. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`) })
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
        {!isLeader && isMember && <button onClick={() => setConfirmLeaveOpen(true)} className="h-9 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold ml-2">Leave Group</button>}
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
              {data.members.map((m) => {
                const isCurrentUser = !!user && m.userId === user.id
                const canRemoveMember = isLeader && !isCurrentUser

                return (
                  <div key={m.userId} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.firstName} {m.lastName}</div>
                      <div className="text-xs text-gray-400">Role: {m.role}</div>
                    </div>
                    {canRemoveMember ? (
                      <button onClick={() => setConfirmRemoveUserId(m.userId)} className="text-xs text-red-600 font-medium hover:underline">Remove</button>
                    ) : (
                      <div className="text-xs text-gray-300">&nbsp;</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-900">Transactions</h2>
              <button
                onClick={() => setAddTxOpen(true)}
                className="h-9 px-4 rounded-lg bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]"
              >
                + Add Transaction
              </button>
            </div>
            {transactions.length === 0 && (
              <div className="text-sm text-gray-400">No transactions yet.</div>
            )}
            <div className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t.description}</div>
                    <div className="text-xs text-gray-400">
                      Paid by {memberName(t.paidBy)} · {new Date(t.transactionDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${t.type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
                    {t.type === 'expense' ? '−' : '+'}${t.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Balances</h2>
            {balances.length === 0 && (
              <div className="text-sm text-gray-400">All settled up ✓</div>
            )}
            <div className="flex flex-col gap-2">
              {balances.map((b) => (
                <div
                  key={b.userId}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    b.direction === 'you_owe' ? 'bg-red-50' : 'bg-green-50'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{memberName(b.userId)}</div>
                    <div className={`text-sm font-semibold ${b.direction === 'you_owe' ? 'text-red-700' : 'text-green-700'}`}>
                      {b.direction === 'you_owe' ? `You owe $${b.amount.toFixed(2)}` : `Owes you $${b.amount.toFixed(2)}`}
                    </div>
                  </div>
                  {b.direction === 'owes_you' && (
                    <button
                      onClick={() => setSettleTarget(b)}
                      className="h-9 px-4 rounded-lg bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]"
                    >
                      Settle up
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <AddGroupExpenseModal
            open={addTxOpen}
            onClose={() => setAddTxOpen(false)}
            onCreated={() => {
              loadTransactions();
              loadBalances();
            }}
            groupId={id!}
            members={data.members}
          />
          {settleTarget && (
            <SettleBalancesModal
              open={!!settleTarget}
              onClose={() => setSettleTarget(null)}
              onSettled={() => {
                loadBalances()
                loadTransactions()
              }}
              groupId={id!}
              repayingUserId={settleTarget.userId}
              repayingUserName={memberName(settleTarget.userId)}
              amount={settleTarget.amount}
            />
          )}
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
