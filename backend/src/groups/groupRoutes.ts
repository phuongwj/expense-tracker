import express from 'express'
import {
    createGroup,
    joinGroup,
    listGroups,
    getGroup,
    regenerateCode,
    removeMember,
    deleteGroup,
} from "./groupController.ts"
import { validateBody, validateParams } from "../middleware/validateRequest.ts"
import { createGroupSchema, joinGroupSchema, groupIdParamSchema, memberRemoveParamSchema } from "./groupSchemas.ts"
import { requireAuth } from "../middleware/authMiddleware.ts"

const router = express.Router()

router.post('/', requireAuth, validateBody(createGroupSchema), createGroup)
router.post('/join', requireAuth, validateBody(joinGroupSchema), joinGroup)
router.get('/', requireAuth, listGroups)
router.get('/:id', requireAuth, validateParams(groupIdParamSchema), getGroup)
router.patch('/:id/regenerate-code', requireAuth, validateParams(groupIdParamSchema), regenerateCode)
router.delete('/:id/members/:userId', requireAuth, validateParams(memberRemoveParamSchema), removeMember)
router.delete('/:id', requireAuth, validateParams(groupIdParamSchema), deleteGroup)

export default router
