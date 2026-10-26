# Vibecn copy-and-own compositions

VibeAuth has no Vibecn dependency. The examples contain editable `.vibe` compositions using
copied Vibecn Button, Input, Field, Card, Checkbox, InputOTP, Avatar and native select parts.
The copy retains upstream headers and the full `examples/shared/vibecn.LICENSE` notice.
The Input copy adds native minimum/maximum length and pattern props for authentication forms.

| Composition                                              | File / behavior                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Login, signup, forgot/reset password                     | `examples/shared/components/Credentials.vibe`; validated values, async state, safe errors, visibility control |
| Profile and active sessions                              | `examples/shared/components/Account.vibe`; profile, password change, ID-based session revocation              |
| Email verification                                       | Better Auth verification link and the basic verification/resend view                                          |
| Social login buttons and second-factor challenge         | `examples/saas/ui/App.vibe`                                                                                   |
| TOTP enrollment, backup disclosure, passkeys             | `examples/saas/ui/Security.vibe`                                                                              |
| Organization switcher, settings, invitations and members | `examples/saas/ui/Organizations.vibe`                                                                         |

Copy a composition and its primitive imports into your application, preserve the license, and
adapt it to your routes/client instance. Compile with the matching Vibe.js compiler. Reuse
Vibecn's theme rather than introducing another token system. Examples support light/dark mode,
small screens, associated labels, autocomplete, explicit submit types, status/error messages,
focus states and disabled submission.

Vibecn's actual CLI installs only its own bundled registry. Authentication registry commands
such as `vibecn add login-form` are **not implemented** by this repository and are not advertised.
Existing primitive commands remain available through Vibecn. These compositions are an
optional source distribution in the repository, not an extra runtime UI package.
