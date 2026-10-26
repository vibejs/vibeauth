// oxlint-disable typescript/no-extraneous-class -- Vibe.js modules are plain classes registered with Module.
import {
  Controller,
  Handle,
  HttpError,
  Module,
  UseGuards,
  VibeFactory,
  type Ctx,
} from '@usevibejs/server';
import { APIError } from 'better-auth/api';
import {
  createAuthGuard,
  createAuthMiddleware,
  createMutationOriginGuard,
  requireAuthSession,
} from '@usevibejs/auth/server';
import { accountController } from '../../shared/server.ts';
import { workspace } from '../../shared/contracts.ts';
import type { createSaasAuth } from './auth.ts';

export function createSaasApplication({
  auth,
  config,
  database,
}: ReturnType<typeof createSaasAuth>) {
  const originGuard = new (createMutationOriginGuard(config.trustedOrigins))();
  function projectGuard(action: 'read' | 'create' | 'update') {
    return createAuthGuard(auth, {
      policy: async (_identity, ctx) => {
        try {
          originGuard.canActivate(ctx);
          return (
            await auth.api.hasPermission({
              headers: ctx.req.headers,
              body: {
                organizationId: String(ctx.params.organizationId),
                permissions: { project: [action] },
              },
            })
          ).success;
        } catch (error) {
          if (error instanceof APIError && [401, 403].includes(error.statusCode)) return false;
          throw error;
        }
      },
    });
  }
  const ReadProjects = projectGuard('read');
  const CreateProjects = projectGuard('create');
  const UpdateProjects = projectGuard('update');
  @Controller(workspace)
  class ProjectsController {
    @Handle(workspace.projects)
    @UseGuards(ReadProjects)
    list(ctx: Ctx<typeof workspace.projects>) {
      // Both membership policy AND resource query are scoped to the requested tenant.
      return database
        .prepare('SELECT id, name FROM project WHERE organizationId = ?')
        .all(ctx.params.organizationId) as { id: string; name: string }[];
    }
    @Handle(workspace.createProject)
    @UseGuards(CreateProjects)
    async create(ctx: Ctx<typeof workspace.createProject>) {
      const identity = await requireAuthSession(auth, ctx);
      const project = { id: crypto.randomUUID(), name: ctx.body.name };
      database
        .prepare('INSERT INTO project (id, name, organizationId, createdBy) VALUES (?, ?, ?, ?)')
        .run(project.id, project.name, ctx.params.organizationId, identity.userId);
      return project;
    }
    @Handle(workspace.updateProject)
    @UseGuards(UpdateProjects)
    update(ctx: Ctx<typeof workspace.updateProject>) {
      const result = database
        .prepare('UPDATE project SET name = ? WHERE id = ? AND organizationId = ?')
        .run(ctx.body.name, ctx.params.id, ctx.params.organizationId);
      if (!result.changes) throw new HttpError(403, 'FORBIDDEN', 'Access denied.');
      return { id: ctx.params.id, name: ctx.body.name };
    }
  }
  class AppModule {}
  Module({ controllers: [accountController(auth, config.trustedOrigins), ProjectsController] })(
    AppModule,
  );
  return VibeFactory.create(AppModule, {
    basePath: '/api',
    middleware: [createAuthMiddleware(auth)],
  });
}
