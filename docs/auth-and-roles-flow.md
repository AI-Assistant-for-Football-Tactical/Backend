### Auth & Roles Flow

---

## 🛡️ Security Overview

The application uses **Security by Default**. Because the `JwtAuthGuard` and `RolesGuard` are registered globally, every endpoint is locked unless explicitly opened.

### 1. The Guard Chain (Execution Order)

1. **`JwtAuthGuard` (Global)**: Validates the JWT and attaches the user payload to `request.user`.
2. **`RolesGuard` (Global)**: Reads metadata from decorators and compares it against the user's `sys_role` and `mem_role`.
3. **`LocalAuthGuard` (Route-specific)**: Only runs on the login route to verify credentials.

---

## 🛠️ Decorator Toolbox

| Decorator            | Purpose                                        | Usage                            |
| -------------------- | ---------------------------------------------- | -------------------------------- |
| **`@Public()`**      | Bypasses all security execpt for `LocalGuard`. | `@Public()`                      |
| **`@SystemRoles()`** | Filters by platform role.                      | `@SystemRoles(SystemRole.ADMIN)` |
| **`@MemberRoles()`** | Filters by club/group role.                    | `@MemberRoles(MemberRole.COACH)` |

---

## Scenario Logic

### Case 1: Public Routes (Login/Register)

**Must** be `@Public()` here. This tells the global guards to ignore the request, allowing the `LocalAuthGuard` or the registration logic to proceed without a token.

### Case 2: Standard Protected Route

If no roles are specified, the request only needs a valid JWT. The `RolesGuard` will see no metadata and return `true`.

### Case 3: Role Protected Route

If `@SystemRoles(ADMIN)` is present, the `RolesGuard` checks the `sys_role` property in the JWT. If the user doesn't have it, they receive a `403 Forbidden`.

---

## Code Snippets

### Standard Admin Route

```typescript
@Get('admin/settings')
@SystemRoles(SystemRole.ADMIN)
findAll() {
  return this.service.getSettings();
}

```

### Club Member Route

```typescript
@Post('club/strategy')
@MemberRoles(MemberRole.COACH, MemberRole.OWNER)
createStrategy() {
  return this.service.save();
}

```

### The Login Route

```typescript
@Public()
@UseGuards(LocalAuthGuard)
@Post('auth/login')
async login(@Request() req) {
  return this.authService.login(req.user);
}

```

---

## ⚠️ Critical Rules

1. **Order Matters**: In `AppModule`, provide `JwtAuthGuard` **before** `RolesGuard`.
2. **Payload Consistency**: The `JwtStrategy` must return an object containing `sys_role` and `mem_role` for the `RolesGuard` to work.
3. **Public Exception**: Always mark login/register as `@Public()`.
