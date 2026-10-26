import { defineContract, get, post } from '@usevibejs/contract';
import * as v from 'valibot';

const errors = { UNAUTHORIZED: 401, FORBIDDEN: 403 } as const;
export const account = defineContract('/account', {
  profile: get('/profile', {
    response: v.object({
      id: v.string(),
      name: v.string(),
      email: v.string(),
      emailVerified: v.boolean(),
    }),
    errors,
  }),
  sessions: get('/sessions', {
    response: v.array(
      v.object({
        id: v.string(),
        current: v.boolean(),
        createdAt: v.string(),
        expiresAt: v.string(),
        userAgent: v.nullable(v.string()),
      }),
    ),
    errors,
  }),
  revoke: post('/sessions/:id/revoke', { response: v.boolean(), errors }),
});
export const workspace = defineContract('/workspaces', {
  projects: get('/:organizationId/projects', {
    response: v.array(v.object({ id: v.string(), name: v.string() })),
    errors,
  }),
  createProject: post('/:organizationId/projects', {
    body: v.object({ name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)) }),
    response: v.object({ id: v.string(), name: v.string() }),
    errors,
  }),
  updateProject: post('/:organizationId/projects/:id', {
    body: v.object({ name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)) }),
    response: v.object({ id: v.string(), name: v.string() }),
    errors,
  }),
});
