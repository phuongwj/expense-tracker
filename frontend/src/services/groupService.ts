import api from './api'
import type { CreateGroupInput, JoinGroupInput, GroupSummary, GroupDetailResponse } from '@expense-tracker/shared/groups'

export async function getGroups(): Promise<GroupSummary[]> {
  const res = await api.get('/groups')
  return res.data.groups as GroupSummary[]
}

export async function getGroup(id: string): Promise<GroupDetailResponse> {
  const res = await api.get(`/groups/${id}`)
  return res.data as GroupDetailResponse
}

export async function createGroup(data: CreateGroupInput): Promise<GroupSummary> {
  const res = await api.post('/groups', data)
  return res.data.group as GroupSummary
}

export async function joinGroup(data: JoinGroupInput): Promise<GroupSummary> {
  const res = await api.post('/groups/join', data)
  return res.data.group as GroupSummary
}

export async function regenerateGroupJoinCode(groupId: string): Promise<string> {
  const res = await api.patch(`/groups/${groupId}/regenerate-code`)
  return res.data.joinCode as string
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  await api.delete(`/groups/${groupId}/members/${userId}`)
}

export async function deleteGroup(groupId: string): Promise<void> {
  await api.delete(`/groups/${groupId}`)
}

export default {
  getGroups,
  getGroup,
  createGroup,
  joinGroup,
  regenerateGroupJoinCode,
  removeMember,
  deleteGroup,
}
