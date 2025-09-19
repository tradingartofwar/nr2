import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
const looksLikeUUID = (value: string): boolean => UUID_PATTERN.test(value)

type RoomRecord = {
  id: string
  name: string
  project_id: string
  created_by: string
  created_at: string
  owner_id: string
}

type ProblemSubmissionRecord = {
  id: string
  room_id: string
  author_id: string
  content_json: unknown
  evidence_json: unknown
  anonymity: boolean
  state: string
  created_at: string
  owner_id: string
}

export const registerRoomsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // List rooms (limit to 100)
  fastify.get('/rooms', async (request, reply) => {
    const user = request.user
    if (!user) return reply.code(401).send({ ok: false, error: { message: 'Unauthorized' } })

    const { data, error } = await fastify.supabase
      .from('rooms')
      .select('id, name, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) {
      fastify.log.error({ err: error }, 'Failed to list rooms')
      return { ok: false, error }
    }
    const rows = (data as RoomRecord[] | null) ?? []
    return { ok: true, data: rows }
  })

  // Create or get a room by name
  fastify.post('/rooms', async (request, reply) => {
    const user = request.user
    if (!user) return reply.code(401).send({ ok: false, error: { message: 'Unauthorized' } })

    const body = request.body as { name?: string } | undefined
    const name = body?.name?.trim()
    if (!name) return reply.code(400).send({ ok: false, error: { message: 'Missing room name' } })

    // Try to find by exact name first
    const { data: existingRaw, error: selErr } = await fastify.supabase
      .from('rooms')
      .select('*')
      .eq('name', name)
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()
    if (selErr) {
      fastify.log.error({ err: selErr }, 'Failed to query room')
      return reply.code(500).send({ ok: false, error: selErr })
    }
    const existing = (existingRaw as RoomRecord | null) ?? null
    if (existing) return { ok: true, data: existing }

    // Insert minimal required fields. Use generated UUIDs for project_id and created_by for now.
    const insert = {
      project_id: randomUUID(),
      name,
      created_by: user.id,
      owner_id: user.id
    }
    const { data: created, error: insErr } = await fastify.supabase.from('rooms').insert(insert).select().single()
    if (insErr) {
      fastify.log.error({ err: insErr }, 'Failed to create room')
      return reply.code(500).send({ ok: false, error: insErr })
    }
    return { ok: true, data: created }
  })

  // Post a submission to a room (by id or name)
  fastify.post('/rooms/:id/submissions', async (request, reply) => {
    const user = request.user
    if (!user) return reply.code(401).send({ ok: false, error: { message: 'Unauthorized' } })

    const idOrName = (request.params as { id: string }).id
    if (!idOrName) return reply.code(400).send({ ok: false, error: { message: 'Missing room identifier' } })

    // Find room by id first (only if the param looks like a UUID), then by name
    let room: RoomRecord | null = null
    if (looksLikeUUID(idOrName)) {
      const { data: roomByIdRaw, error: queryByIdError } = await fastify.supabase
        .from('rooms')
        .select('*')
        .eq('id', idOrName)
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()
      if (queryByIdError) {
        fastify.log.error({ err: queryByIdError }, 'Failed to query room by id')
        return reply.code(500).send({ ok: false, error: queryByIdError })
      }
      room = (roomByIdRaw as RoomRecord | null) ?? null
    }
    if (!room) {
      const { data: byNameRaw, error: byNameErr } = await fastify.supabase
        .from('rooms')
        .select('*')
        .eq('name', idOrName)
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()
      if (byNameErr) {
        fastify.log.error({ err: byNameErr }, 'Failed to query room by name')
        return reply.code(500).send({ ok: false, error: byNameErr })
      }
      room = (byNameRaw as RoomRecord | null) ?? null
    }
    if (!room) return reply.code(404).send({ ok: false, error: { message: 'Room not found' } })

    const body = request.body as { payload?: unknown } | undefined
    if (!body?.payload) return reply.code(400).send({ ok: false, error: { message: 'Missing payload' } })

    // Create a people record for this submission author (minimal required fields)
    const personInsert = { room_id: room.id, user_id: user.id }
    const { data: personRaw, error: personErr } = await fastify.supabase.from('people').insert(personInsert).select().single()
    if (personErr) {
      fastify.log.error({ err: personErr }, 'Failed to create person record')
      return reply.code(500).send({ ok: false, error: personErr })
    }
    const person = personRaw as { id: string }

    const submissionInsert = {
      room_id: room.id,
      author_id: person.id,
      content_json: body.payload,
      evidence_json: [],
      anonymity: true,
      state: 'submitted',
      owner_id: user.id
    }
    const { data: createdRaw, error: subErr } = await fastify.supabase
      .from('problem_submissions')
      .insert(submissionInsert)
      .select()
      .single()
    if (subErr) {
      fastify.log.error({ err: subErr }, 'Failed to insert submission')
      return reply.code(500).send({ ok: false, error: subErr })
    }

    return { ok: true, data: { roomId: room.id, submission: createdRaw as ProblemSubmissionRecord } }
  })

  // List submissions for a room (by id or name)
  fastify.get('/rooms/:id/submissions', async (request, reply) => {
    const user = request.user
    if (!user) return reply.code(401).send({ ok: false, error: { message: 'Unauthorized' } })

    const idOrName = (request.params as { id: string }).id
    if (!idOrName) return reply.code(400).send({ ok: false, error: { message: 'Missing room identifier' } })

    // Find room by id first (only if the param looks like a UUID), then by name
    let room: RoomRecord | null = null
    if (looksLikeUUID(idOrName)) {
      const { data: roomByIdRaw, error: queryByIdError } = await fastify.supabase
        .from('rooms')
        .select('*')
        .eq('id', idOrName)
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()
      if (queryByIdError) {
        fastify.log.error({ err: queryByIdError }, 'Failed to query room by id')
        return reply.code(500).send({ ok: false, error: queryByIdError })
      }
      room = (roomByIdRaw as RoomRecord | null) ?? null
    }
    if (!room) {
      const { data: byNameRaw, error: byNameErr } = await fastify.supabase
        .from('rooms')
        .select('*')
        .eq('name', idOrName)
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()
      if (byNameErr) {
        fastify.log.error({ err: byNameErr }, 'Failed to query room by name')
        return reply.code(500).send({ ok: false, error: byNameErr })
      }
      room = (byNameRaw as RoomRecord | null) ?? null
    }
    if (!room) return reply.code(404).send({ ok: false, error: { message: 'Room not found' } })

    const { data: rows, error: rowsErr } = await fastify.supabase
      .from('problem_submissions')
      .select('*')
      .eq('room_id', room.id)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    if (rowsErr) {
      fastify.log.error({ err: rowsErr }, 'Failed to query submissions')
      return reply.code(500).send({ ok: false, error: rowsErr })
    }

    return { ok: true, data: rows ?? [], roomId: room.id }
  })
}

export default registerRoomsRoutes
