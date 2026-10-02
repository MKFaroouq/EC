import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";

export type Role = "estimator" | "supervisor" | "legal_reviewer" | "project_manager" | "leader";

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  courtId?: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: SessionUser;
}

const configuredSecret = process.env.JUDICIAL_FEES_JWT_SECRET;
const configuredProjectManagerId = process.env.JUDICIAL_FEES_PROJECT_MANAGER_ID;
if (process.env.NODE_ENV === "production" && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error("JUDICIAL_FEES_JWT_SECRET must be set to at least 32 characters in production");
}
if (process.env.NODE_ENV === "production" && !configuredProjectManagerId) {
  throw new Error("JUDICIAL_FEES_PROJECT_MANAGER_ID must identify the sole global rule publisher in production");
}
export const PROJECT_MANAGER_ID = configuredProjectManagerId ?? "demo-project-manager";
const secret = new TextEncoder().encode(configuredSecret ?? randomBytes(32).toString("hex"));

const demoAccounts: Record<string, { user: SessionUser; passwordHash: string }> = {
  estimator: { user: { id: "demo-estimator", name: "أحمد محمود", role: "estimator", courtId: "cairo-north" }, passwordHash: "2fa584f21d8060f8a39bb447c24dc804a0fb3b9a0dcec8f1917f89aed1c460e3" },
  supervisor: { user: { id: "demo-supervisor", name: "منى إبراهيم", role: "supervisor", courtId: "cairo-north" }, passwordHash: "3411d6c144e5257fff53731ae8049e9e2823f389fe56431d3f90e64ca95080d7" },
  legal: { user: { id: "demo-legal", name: "المستشار القانوني", role: "legal_reviewer" }, passwordHash: "c6bf606643f725a6db1fd7e19b5e583e283315e2bcc26906b233eae8cbae5377" },
  "project.manager": { user: { id: "demo-project-manager", name: "مدير مشروع النظام", role: "project_manager" }, passwordHash: "852690333522fd476dca066ef1a6af80b3b5721bef5479a5c1a283f264b4e847" },
  leadership: { user: { id: "demo-leader", name: "مكتب المتابعة القيادية", role: "leader" }, passwordHash: "8e606bc7dff4dbb8ca818ace7a5e6330321bb2b15582c7870baf7c26c248211f" }
};
const allowedRoles = new Set<Role>(["estimator", "supervisor", "legal_reviewer", "project_manager", "leader"]);

export function isDemoLoginEnabled(): boolean {
  return process.env.JUDICIAL_FEES_ENABLE_DEMO_LOGIN === "true"
    || (process.env.NODE_ENV !== "production" && process.env.JUDICIAL_FEES_ENABLE_DEMO_LOGIN !== "false");
}

export async function createDemoToken(username: string, password: string): Promise<{ token: string; user: SessionUser } | undefined> {
  const account = demoAccounts[username.toLowerCase()];
  const received = createHash("sha256").update(password, "utf8").digest();
  const expected = account ? Buffer.from(account.passwordHash, "hex") : Buffer.alloc(received.length);
  if (!account || expected.length !== received.length || !timingSafeEqual(received, expected)) return undefined;
  const user = account.user;
  const token = await new SignJWT({ name: user.name, role: user.role, courtId: user.courtId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setAudience("judicial-fees-web")
    .setIssuer("judicial-fees-api")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return { token, user };
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    await reply.code(401).send({ error: "AUTH_REQUIRED", message: "يلزم تسجيل الدخول." });
    return;
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), secret, {
      audience: "judicial-fees-web",
      issuer: "judicial-fees-api"
    });
    const role = payload.role as Role;
    if (!allowedRoles.has(role) || !payload.sub || typeof payload.name !== "string") throw new Error("invalid claims");
    (request as AuthenticatedRequest).user = {
      id: payload.sub,
      name: payload.name,
      role,
      courtId: typeof payload.courtId === "string" ? payload.courtId : undefined
    };
  } catch {
    await reply.code(401).send({ error: "INVALID_SESSION", message: "انتهت الجلسة أو تعذر التحقق منها." });
  }
}

export function authorize(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await authenticate(request, reply);
    if (reply.sent) return;
    const user = (request as AuthenticatedRequest).user;
    if (!roles.includes(user.role)) {
      await reply.code(403).send({ error: "FORBIDDEN", message: "ليس لديك تصريح لتنفيذ هذه العملية." });
    }
  };
}
