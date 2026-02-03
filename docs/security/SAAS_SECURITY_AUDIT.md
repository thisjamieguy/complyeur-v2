# Comprehensive Web Application & SaaS Security Audit Report
## Complete Security Checklist for MVP to 10K+ Customers

**Report Generated:** January 2026  
**Scope:** SaaS Application Security Assessment  
**Compliance Focus:** GDPR, CCPA, PCI-DSS, HIPAA, ISO 27001, SOC 2  
**Target Audience:** SaaS Founders, Development Teams, Security Officers

---

## Executive Summary

This report provides a comprehensive security audit framework for SaaS applications from initial development through scaling to 10,000+ customers. It covers technical implementations, compliance requirements, and operational security practices that must be considered at different growth stages.

The security landscape for web applications continues to evolve with sophisticated attack vectors targeting personal data, payment information, and intellectual property. This audit covers:

- **Current threat landscape (2024-2025)** based on OWASP Top 10 vulnerabilities
- **Technical security requirements** including encryption, authentication, and data protection
- **Compliance mandates** (GDPR, CCPA, HIPAA, SOC 2, ISO 27001, PCI-DSS)
- **Operational security practices** including monitoring, logging, and incident response
- **Scalability considerations** for 10K+ customer deployments

---

## SECTION 1: CRITICAL FOUNDATION REQUIREMENTS
### (Implement at MVP Stage - Before First Customer)

These are non-negotiable security requirements that must be in place before launching any customer-facing application.

### 1.1 HTTPS/TLS Encryption - Transport Security

**Quick Reference:** Ensures data in transit is encrypted and unreadable to attackers  
**Why:** Without TLS, passwords, personal data, and session tokens are sent in plain text and can be intercepted (Man-in-the-Middle attacks)

**MUST-HAVES:**
- [ ] Enforce HTTPS across entire application (no HTTP fallback)
- [ ] Use TLS 1.3 (minimum TLS 1.2, but TLS 1.3 is current standard)
- [ ] Obtain SSL certificate from trusted Certificate Authority (Let's Encrypt is free and trusted)
- [ ] Use HTTP Strict Transport Security (HSTS) header with max-age=31536000 (1 year minimum)
  - Include `includeSubDomains` directive
  - Include `preload` directive for browser preload lists
- [ ] Disable deprecated SSL/TLS versions and weak cipher suites
- [ ] Renew certificates before expiration (set up automated renewal)
- [ ] Implement HSTS preload list submission for maximum browser protection

**GOOD-TO-HAVES:**
- Use strong cipher suites (ECDHE, ChaCha20-Poly1305)
- Regular SSL/TLS configuration audits (SSL Labs test monthly)
- Certificate pinning for API clients (advanced protection)

**Compliance Mapping:** GDPR Article 32, HIPAA Safeguards, PCI-DSS 4.1, ISO 27001 A.10.1.1

**Implementation Resources:**
- Let's Encrypt: Free certificates with 90-day validity
- SSL Labs Configuration: https://mozilla.github.io/server-side-tls/
- HSTS Header: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

---

### 1.2 Password Hashing & Storage

**Quick Reference:** Passwords must be hashed with strong algorithms, never stored in plain text  
**Why:** If your database is breached, hashed passwords are useless to attackers without the algorithm and salt

**MUST-HAVES:**
- [ ] Never store passwords in plain text, even with "security" justifications
- [ ] Use modern hashing algorithms ONLY:
  - **Argon2id** (recommended - memory-hard, resists GPU/ASIC attacks)
    - Memory cost: 65,536 KB (64 MB)
    - Time cost: 3 iterations (2 minimum)
    - Parallelism: 4 threads
  - **bcrypt** (alternative - battle-tested, widely available)
    - Work factor: 12 (targeting ~250ms hash time on modern hardware)
- [ ] NEVER use SHA-256, SHA-512, MD5, or unsalted hashing for passwords
- [ ] Implement automatic salt generation (cryptographically random, minimum 16 bytes)
- [ ] Set password length requirements: minimum 8 characters, recommend 12+
- [ ] Enforce strong password policy (complexity, no common patterns)

**GOOD-TO-HAVES:**
- Passwordless authentication (passkeys, WebAuthn/FIDO2)
- Password strength meter for user guidance
- Breach database checking (e.g., Have I Been Pwned API)
- Force password reset on account compromise

**Compliance Mapping:** GDPR Article 32, HIPAA 164.308, PCI-DSS 8.2.3, ISO 27001 A.9.2.1

**Implementation:**
```
bcrypt: work_factor = 12
Argon2id: memory=65536, time=3, parallelism=4

DON'T: SHA256(password + salt)
DO: Argon2id with unique salt per user
```

---

### 1.3 Multi-Factor Authentication (MFA)

**Quick Reference:** Requires second verification method beyond password  
**Why:** Most account compromises succeed with passwords alone; MFA blocks 99%+ of attacks

**MUST-HAVES:**
- [ ] Implement MFA as mandatory option for all user accounts
- [ ] Support TOTP (Time-based One-Time Password) apps:
  - Google Authenticator, Microsoft Authenticator, Authy
  - Standards: RFC 6238, 6-digit codes, 30-second window
- [ ] Support authenticator apps for higher security than SMS
- [ ] SMS fallback if authenticator app unavailable (less secure but better than nothing)
- [ ] Backup codes for account recovery (8-12 single-use codes, securely stored)
- [ ] Rate limit MFA attempts to prevent brute force
- [ ] Secure backup code storage (hashed, never in plain text)

**GOOD-TO-HAVES:**
- Hardware security keys (FIDO2/WebAuthn)
- Biometric authentication (fingerprint, face ID)
- Push notifications to trusted devices
- MFA requirement for sensitive actions (API key generation, user deletion)
- Conditional MFA based on risk factors (new device, unusual location)

**Compliance Mapping:** GDPR Article 32, HIPAA 164.312, PCI-DSS 8.3, ISO 27001 A.9.4.2

**Implementation:**
- Libraries: pyotp, speakeasy, google-authenticator-library
- Use standard TOTP algorithms, 30-second time windows
- Never store MFA secrets in plain text (encrypt at rest)

---

### 1.4 Input Validation & Output Encoding

**Quick Reference:** Prevent injection attacks (SQL injection, XSS, command injection)  
**Why:** Injection attacks are #1 in OWASP Top 10; allow attackers to extract/manipulate all data

**MUST-HAVES:**
- [ ] Validate ALL user inputs on server-side (never trust client-side validation)
- [ ] Validate input format, length, type, allowed characters
  - Email: RFC 5322 compliant regex
  - Phone: Country-specific format validation
  - Numbers: Range validation, no alphanumeric injection
  - Dates: RFC 3339 format validation
- [ ] Sanitize inputs to remove/escape dangerous characters
- [ ] Use parameterized queries/prepared statements for ALL database interactions
  ```sql
  -- WRONG (vulnerable to SQL injection):
  query = "SELECT * FROM users WHERE email = '" + user_email + "'"
  
  -- CORRECT (parameterized):
  query = "SELECT * FROM users WHERE email = ?"
  execute(query, [user_email])
  ```
- [ ] HTML encode output before rendering to browser
  ```
  & → &amp;
  < → &lt;
  > → &gt;
  " → &quot;
  ' → &#x27;
  ```
- [ ] Use templating engines with auto-escaping enabled
- [ ] Implement Content Security Policy (CSP) headers (see Section 1.6)

**GOOD-TO-HAVES:**
- Use ORM frameworks that provide built-in parameterization
- Whitelist allowed input characters instead of blacklisting dangerous ones
- Regular expression validation (but combined with length checks)
- Automated input validation testing

**Compliance Mapping:** GDPR Article 32, HIPAA 164.308, PCI-DSS 6.5.1, ISO 27001 A.14.2.1

**Common Attack Vectors:**
- SQL Injection: Modify database queries
- XSS (Cross-Site Scripting): Inject malicious JavaScript
- Command Injection: Execute system commands
- LDAP Injection: Modify directory queries
- NoSQL Injection: Modify NoSQL queries

---

### 1.5 API Authentication & Authorization

**Quick Reference:** Secure API endpoints with strong authentication and minimal access permissions  
**Why:** APIs are primary attack vectors; unprotected APIs expose all application data

**MUST-HAVES:**
- [ ] Require authentication for ALL API endpoints (no public APIs unless intentional)
- [ ] Use OAuth 2.0 for delegated access (industry standard)
- [ ] Use JWT (JSON Web Tokens) for stateless authentication
  - Implement RS256 (asymmetric) or HS256 (symmetric with strong secret, minimum 256 bits)
  - NEVER use "none" algorithm or allow algorithm switching
  - Include expiration claim (`exp`), issue time (`iat`), subject (`sub`)
  - Short expiration time: 15 minutes for access tokens, refresh tokens for longer sessions
  - Include token type (`typ: "JWT"`), issuer (`iss`), and audience (`aud`)
- [ ] Validate JWT signature on every request
  - Fetch public key from authorization server
  - Verify signature hasn't been tampered with
  - Verify token expiration
  - Verify issuer and audience claims
- [ ] Implement token refresh mechanism (rotate tokens regularly)
- [ ] Never store secrets in query parameters (use Authorization header only)
  - `Authorization: Bearer <token>`
- [ ] Implement role-based access control (RBAC) or attribute-based access control (ABAC)
  - Grant minimum permissions necessary (principle of least privilege)
  - Define roles: Admin, User, Moderator, etc.
  - Map API endpoints to required roles/permissions
- [ ] Rate limit API requests to prevent abuse
  - Per-user rate limits
  - Per-IP rate limits
  - Exponential backoff for failed attempts

**GOOD-TO-HAVES:**
- API Gateway for centralized authentication/rate limiting
- API key rotation policies
- Scope-based permissions (OAuth 2.0 scopes)
- Audit logging of all API access
- API versioning to deprecate old authentication methods
- Webhook signature verification (if offering webhooks)

**Compliance Mapping:** GDPR Article 32, HIPAA 164.312, PCI-DSS 6.5.10, ISO 27001 A.9.2.1

**JWT Best Practices:**
```
✓ Short-lived access tokens (15 mins)
✓ Refresh token for obtaining new access tokens
✓ RS256 (asymmetric) for distributed verification
✓ Validate signature, expiration, issuer, audience
✓ Never trust client-side validation

✗ Long-lived tokens
✗ "none" algorithm
✗ Algorithm switching attacks
✗ Storing secrets in JWT payload
```

---

### 1.6 Security Headers

**Quick Reference:** HTTP headers that tell browsers to enforce security protections  
**Why:** Prevent clickjacking, XSS, MIME-type attacks, and man-in-the-middle attacks

**MUST-HAVES:**
- [ ] **Strict-Transport-Security (HSTS)**
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  ```
  - Forces HTTPS for 1 year
  - Applies to all subdomains
  - Adds to browser preload list

- [ ] **Content-Security-Policy (CSP)**
  ```
  default-src 'self'
  script-src 'self' cdn.example.com
  style-src 'self' 'unsafe-inline'
  img-src 'self' data: https:
  frame-ancestors 'none'
  ```
  - Whitelist trusted sources for scripts, styles, images
  - Disable inline scripts (require script files)
  - Report CSP violations to monitoring endpoint

- [ ] **X-Frame-Options**
  ```
  X-Frame-Options: SAMEORIGIN
  ```
  - Prevent clickjacking attacks
  - Allow embedding only in same domain
  - Options: DENY, SAMEORIGIN, ALLOW-FROM

- [ ] **X-Content-Type-Options**
  ```
  X-Content-Type-Options: nosniff
  ```
  - Prevent MIME-type attacks
  - Browser must trust Content-Type header

- [ ] **Referrer-Policy**
  ```
  Referrer-Policy: strict-origin-when-cross-origin
  ```
  - Control what referrer info is sent to other sites
  - Balance privacy and functionality

- [ ] **Permissions-Policy** (formerly Feature-Policy)
  ```
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  ```
  - Disable unused browser features
  - Prevent malicious scripts from accessing sensitive APIs

**GOOD-TO-HAVES:**
- Subresource Integrity (SRI) for external scripts
- Report-Only CSP mode before enforcement
- Regular security header audits

**Compliance Mapping:** GDPR Article 32, HIPAA 164.308, PCI-DSS 6.5.10, ISO 27001 A.14.2.1

**Testing:** Use Mozilla Observatory, Security Headers tool, or curl:
```bash
curl -I https://yourdomain.com | grep -i "security\|strict\|content-security"
```

---

### 1.7 Access Control (Authorization)

**Quick Reference:** Ensure users can only access their own data and authorized resources  
**Why:** Broken access control is OWASP #1; allows users to access others' personal data

**MUST-HAVES:**
- [ ] Implement explicit access checks on EVERY endpoint
- [ ] Never rely on hiding admin features (they will be found)
- [ ] Verify user owns the resource before returning data
  ```
  DON'T: return user_data where user_id = request.user.id
  DO: verify(request.user.id == resource.owner_id) before returning
  ```
- [ ] Implement role-based access control (RBAC)
  - Define clear roles: Admin, Manager, User, Guest
  - Assign minimum permissions needed for role
  - Regular role audits
- [ ] Prevent privilege escalation
  - Users cannot change their own role
  - Admin approval required for role changes
  - Audit log all permission changes
- [ ] Implement horizontal access control (users can't access others' data)
- [ ] Implement vertical access control (users can't access higher-level resources)
- [ ] Hide sensitive API endpoints from public discovery
- [ ] Disable HTTP methods not needed (DELETE, PUT if only GET required)

**GOOD-TO-HAVES:**
- Attribute-based access control (ABAC) for complex permissions
- Time-based access (e.g., access only during business hours)
- Location-based access (e.g., admin from office only)
- Geolocation verification

**Compliance Mapping:** GDPR Article 32, HIPAA 164.308, PCI-DSS 7.1, ISO 27001 A.9.1.1

**Red Flags (Common Access Control Failures):**
- User ID in URL that can be changed (1 → 2 accesses another user)
- Admin endpoints at /admin/users without permission checks
- API that returns all data without authorization verification
- Users can modify own role/permissions

---

### 1.8 Session Management & CSRF Protection

**Quick Reference:** Securely manage authenticated sessions and prevent cross-site attacks  
**Why:** Attackers can hijack sessions or trick users into performing unintended actions

**MUST-HAVES:**
- [ ] Use secure HTTP-only cookies for session tokens
  - `HttpOnly` flag: JavaScript cannot access (prevents XSS token theft)
  - `Secure` flag: Only transmitted over HTTPS (prevents interception)
  - `SameSite` flag: `Strict` or `Lax` (prevents CSRF attacks)
  - Set expiration time (shorter = more secure, e.g., 24 hours)
- [ ] Implement CSRF (Cross-Site Request Forgery) protection
  - Unique, unpredictable CSRF tokens for state-changing operations
  - Validate CSRF token on every POST, PUT, DELETE request
  - Tokens valid for single use or time-limited
- [ ] Session timeout after inactivity (15-30 minutes typical)
- [ ] Invalidate session on logout
- [ ] Prevent session fixation attacks
  - Generate new session ID on login
  - Invalidate old session IDs after authentication
- [ ] Bind session to user's IP address (optional, can break legitimate use)
- [ ] Implement secure session storage
  - Sessions on server-side (not client-side)
  - Use database or Redis, encrypted at rest
  - Never store sensitive data in session (use IDs to retrieve from database)

**GOOD-TO-HAVES:**
- Detect unusual session activity (different browser, location, time)
- Multi-session management (logout all other sessions)
- Remember-me functionality with separate token
- Device fingerprinting to detect compromised sessions

**Compliance Mapping:** GDPR Article 32, HIPAA 164.308, PCI-DSS 6.5.9, ISO 27001 A.9.4.3

**Cookie Example:**
```
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/
```

---

### 1.9 Error Handling & Logging

**Quick Reference:** Don't reveal sensitive info in error messages; log security events  
**Why:** Error messages can leak system information; logging enables incident response

**MUST-HAVES:**
- [ ] Return generic error messages to users (no sensitive details)
  - User sees: "Invalid login credentials"
  - System logs: "SQL syntax error: SELECT * FROM users..."
- [ ] Log all authentication attempts (success and failure)
- [ ] Log all authorization failures and permission checks
- [ ] Log all data access by users (for audit trails)
- [ ] Log all administrative actions
- [ ] Log all security-related events:
  - Failed login attempts
  - Password changes
  - Permission changes
  - Account lockouts
  - MFA changes
  - API key generation
- [ ] Never log passwords, credit card numbers, or other sensitive data
- [ ] Implement proper error logging format
  - Timestamp (UTC ISO 8601)
  - Event type/severity level
  - User ID (if applicable)
  - Resource affected
  - Error code
  - Error message (generic for users, detailed for logs)
- [ ] Store logs securely (encrypted at rest and in transit)
- [ ] Retain logs for compliance requirements:
  - GDPR: Typically 1 year minimum
  - HIPAA: 6 years minimum
  - PCI-DSS: 1 year minimum
  - ISO 27001: Per organization policy (recommend 1-3 years)
- [ ] Implement centralized logging (don't rely on individual server logs)
  - SIEM tools: Splunk, DataDog, ELK Stack, Sumo Logic
  - Cloud logging: AWS CloudWatch, Google Cloud Logging, Azure Monitor

**GOOD-TO-HAVES:**
- Real-time alerting for suspicious activity patterns
- Log correlation across multiple services
- Automated incident response triggers
- Log archival for long-term retention
- Tamper-proof logging (immutable logs)

**Compliance Mapping:** GDPR Article 5 (accountability), HIPAA 45 CFR 164.312(b), PCI-DSS 10.2, ISO 27001 A.12.4.1

**Logging Example:**
```
[2026-01-14T08:30:45Z] EVENT_TYPE: FAILED_LOGIN
  user_id: [REDACTED]
  ip_address: 192.168.1.100
  failure_reason: INVALID_CREDENTIALS
  attempt_number: 3
  timestamp: 2026-01-14T08:30:45Z
```

---

### 1.10 Dependency Management & Vulnerability Scanning

**Quick Reference:** Keep frameworks, libraries, and dependencies updated; scan for known vulnerabilities  
**Why:** 40%+ of breaches exploit known vulnerabilities in unpatched software

**MUST-HAVES:**
- [ ] Maintain inventory of all dependencies (frameworks, libraries, OS packages)
- [ ] Subscribe to security advisories for all dependencies
- [ ] Scan dependencies for known vulnerabilities:
  - npm: `npm audit`, Snyk, WhiteSource
  - Python: `pip-audit`, Safety, Snyk
  - Java: Dependency-Check, Black Duck
  - Container images: Trivy, Clair
- [ ] Update vulnerable dependencies immediately (critical within 24-48 hours)
- [ ] Test updates in development/staging before production
- [ ] Implement automated scanning in CI/CD pipeline
- [ ] Remove unused dependencies (reduces attack surface)
- [ ] Keep operating system and infrastructure updated
  - OS patches within 30 days of release
  - Security patches within 7 days (critical)

**GOOD-TO-HAVES:**
- Software Composition Analysis (SCA) tools integrated into development
- Dependency pinning to control update timing
- Security monitoring of zero-day vulnerabilities
- Automated patch management
- Container image signing and verification

**Compliance Mapping:** GDPR Article 32, HIPAA 164.308, PCI-DSS 6.2, ISO 27001 A.14.2.1

**Tools:**
- Snyk (npm, Python, Java, Go, Docker)
- OWASP Dependency-Check
- GitHub security alerts
- GitLab dependency scanning

---

## SECTION 2: AUTHENTICATION & IDENTITY

### 2.1 User Registration & Account Creation

**Quick Reference:** Safely onboard new users with email verification  
**Why:** Prevent spam, fake accounts, and ensure users control their own accounts

**MUST-HAVES:**
- [ ] Verify email ownership via confirmation link or code
  - Send email with unique token or code
  - Token expires after 24 hours
  - User confirms email by clicking link or entering code
  - Only then is account fully active
- [ ] Rate limit registration attempts to prevent spam
  - Maximum 5 registrations per IP per hour
  - CAPTCHA after suspicious activity
- [ ] Validate password strength on registration
  - Minimum 8 characters (12+ recommended)
  - Mix of uppercase, lowercase, numbers, special characters
  - Not in common password list (check against Have I Been Pwned)
- [ ] Collect only necessary personal information
  - Username/email, password, name (if needed)
  - Don't ask for phone, address, DOB unless required for service
- [ ] Accept terms of service and privacy policy
  - Get explicit consent before processing personal data
  - Store proof of acceptance with timestamp

**GOOD-TO-HAVES:**
- Social login integration (Google, GitHub, Microsoft)
- Passwordless registration (magic link, passkeys)
- Email deliverability monitoring

---

### 2.2 Password Recovery & Reset

**Quick Reference:** Securely help users regain access without compromising security  
**Why:** Improper password recovery is common attack vector

**MUST-HAVES:**
- [ ] Password reset via email verification
  - Generate unique, cryptographically random token
  - Token expires after 1 hour (short expiration)
  - Token is single-use (valid only once)
  - Send reset link via email to verified address
  - User must create new password after token verification
- [ ] Never email current password or temporary password
- [ ] Do NOT disclose whether email exists in system
  - Always return: "If email exists, reset link sent" (prevents user enumeration)
- [ ] Rate limit password reset attempts
  - Maximum 3 reset emails per hour
  - After multiple attempts, require manual verification
- [ ] Implement CAPTCHA if multiple reset attempts
- [ ] Notify user of password reset attempt (security email)
- [ ] Require re-authentication for sensitive actions after password reset
- [ ] Invalidate all existing sessions after password reset

**GOOD-TO-HAVES:**
- Security questions as backup recovery method
- SMS verification as alternative to email
- Time-delayed password resets (send link now, reset effective after 24 hours)

---

### 2.3 Account Lockout & Brute Force Protection

**Quick Reference:** Lock accounts after multiple failed login attempts  
**Why:** Prevent brute force attacks that test millions of password combinations

**MUST-HAVES:**
- [ ] Implement progressive delays after failed login attempts
  - Attempt 1-3: Immediate login attempt
  - Attempt 4-5: 1 second delay
  - Attempt 6+: Exponential delay (1s, 2s, 4s, 8s...)
- [ ] Temporary account lockout after threshold
  - Lock account after 5-10 failed attempts
  - Lock duration: 15-30 minutes
  - Auto-unlock or require email verification to unlock
- [ ] Rate limit by IP address
  - Limit login attempts from single IP
  - Distribute rate limits across attempts (not just per-user)
- [ ] Notify user of failed login attempts
  - Email alert after 3 failed attempts
  - Alert for successful login from new IP/location
- [ ] CAPTCHA requirement after failed attempts
- [ ] Never reveal whether account exists during lockout
  - "Account locked. If this is your account, check email to unlock"

**GOOD-TO-HAVES:**
- Anomaly detection (unusual login time, location, device)
- Risk-based authentication (require MFA for suspicious logins)
- Behavioral analysis (learning normal user patterns)

---

## SECTION 3: DATA PROTECTION & PRIVACY

### 3.1 Data at Rest Encryption

**Quick Reference:** Encrypt sensitive data stored in database  
**Why:** If database is breached, encrypted data is unreadable without decryption keys

**MUST-HAVES:**
- [ ] Encrypt all personally identifiable information (PII) at rest
  - Encryption algorithm: AES-256 (Advanced Encryption Standard, 256-bit keys)
  - Minimum: AES-128, but AES-256 is standard
- [ ] Encrypt payment card data (if storing):
  - PCI-DSS requires AES-256 or equivalent
  - Better: Don't store card data (use Stripe, Payment gateway for tokenization)
- [ ] Encrypt health information (HIPAA requires encryption)
- [ ] Implement robust key management
  - Never store encryption keys with encrypted data
  - Use separate key management system or service
  - Rotate encryption keys at least annually
  - Access to keys highly restricted (minimally 2 people)
- [ ] Use database-level encryption if available
  - PostgreSQL: pgcrypto extension
  - MySQL: Transparent Data Encryption (TDE)
  - MongoDB: Field-level encryption
- [ ] Apply encryption at application level (application controls encryption)
- [ ] Document what data is encrypted and why

**GOOD-TO-HAVES:**
- Hardware security modules (HSM) for key storage
- Key rotation automation
- Encryption of backups (double encryption)
- Tokenization of sensitive data (replace with non-sensitive tokens)

**Compliance Mapping:** GDPR Article 32, HIPAA 164.312(a)(2)(ii), PCI-DSS 3.2.1, ISO 27001 A.10.1.1

**Encryption Standards:**
```
✓ AES-256 (Advanced Encryption Standard)
✓ ChaCha20-Poly1305
✗ DES (deprecated)
✗ RC4 (broken)
✗ Blowfish (outdated)
```

---

### 3.2 Key Management

**Quick Reference:** Securely generate, store, rotate, and destroy encryption keys  
**Why:** Weak key management defeats purpose of encryption

**MUST-HAVES:**
- [ ] Generate keys using cryptographically secure random generators
- [ ] Use minimum key length:
  - 128-bit for symmetric encryption (256-bit preferred)
  - 2048-bit for RSA asymmetric (4096-bit preferred)
  - 256-bit for ECDSA asymmetric (current standard)
- [ ] Store keys separately from encrypted data
  - If attacker gets encrypted data + key, encryption is useless
  - Use dedicated key management system (KMS):
    - AWS KMS
    - Azure Key Vault
    - Google Cloud KMS
    - HashiCorp Vault
- [ ] Restrict key access to minimal set of people/systems
  - Admin access only
  - Multi-person authorization for key access (dual control)
  - Audit all key access
- [ ] Implement key rotation policy
  - Rotate keys at least annually
  - Rotate keys immediately if compromise suspected
  - Maintain old keys for decryption of historical data
- [ ] Document key lifecycle
  - Creation date and method
  - Rotation schedule
  - Destruction process and date
- [ ] Implement secure key destruction
  - When key is retired, cryptographically destroy it
  - Document destruction with witness verification

**GOOD-TO-HAVES:**
- Hardware Security Modules (HSM) for key storage
- Automated key rotation
- Key versioning system
- Key redundancy (backup keys in separate secure location)

**Key Management Best Practices:**
```
✓ Keys in separate system from encrypted data
✓ Multi-person approval for key access
✓ Automatic key rotation annually
✓ Audit logging of all key operations

✗ Keys hardcoded in source code
✗ Keys in version control
✗ Keys in environment variables (exposed in logs)
✗ Keys shared between systems
```

---

### 3.3 Data Minimization & Collection

**Quick Reference:** Collect only data necessary for application to function  
**Why:** Less data = smaller attack surface, easier GDPR compliance, lower breach impact

**MUST-HAVES:**
- [ ] Document all data collected from users
  - Create Data Inventory (required for GDPR, HIPAA, etc.)
  - List: Data type, purpose, retention period, sharing
- [ ] Collect ONLY data necessary for stated purpose
  - Don't collect "just in case" data
  - Ask "Do we need this?" before adding any field
- [ ] Clearly disclose data collection in privacy policy
  - What data is collected
  - Why it's collected
  - How long it's retained
  - Who it's shared with
- [ ] Get explicit consent for non-essential data collection
  - Optional fields must be clearly marked
  - Pre-checked boxes = NOT valid consent
  - Separate consent for different purposes (analytics, marketing, etc.)
- [ ] Implement data deletion after retention period expires
  - Automatically delete old data
  - Provide user interface to delete own data
- [ ] Regular data audits to identify unnecessary data
  - Quarterly review of collected data
  - Remove fields that are unused

**GOOD-TO-HAVES:**
- Privacy-preserving analytics (aggregate data, anonymization)
- Differential privacy techniques
- Data classification (public, internal, confidential, restricted)

**Compliance Mapping:** GDPR Article 5 (minimization), HIPAA minimum necessary standard, ISO 27001 A.5.1.2

---

### 3.4 Right to Erasure (GDPR Right to Be Forgotten)

**Quick Reference:** Allow users to request permanent deletion of their data  
**Why:** GDPR mandates users can request erasure; required for compliance

**MUST-HAVES:**
- [ ] Implement user-initiated data deletion
  - Users can request erasure of their personal data
  - Simple interface to initiate deletion request
- [ ] Process erasure requests within 30 days (GDPR timeline)
- [ ] Erase data from:
  - Primary database
  - Backups (or backup with redacted user)
  - Third-party services (Google Analytics, payment processors)
  - Logs (pseudonymize or delete)
- [ ] Exception handling for:
  - Legal/contractual obligations (receipts, audit trails)
  - Ongoing legal proceedings
  - Security/fraud investigation in progress
  - Financial records (typically 7 years for tax compliance)
- [ ] Provide confirmation of deletion to user
- [ ] Document deletion requests for compliance audits
- [ ] Inform linked data processors of erasure request
  - If using third-party services, request they delete user data

**GOOD-TO-HAVES:**
- Automated cascading deletion (delete user → delete all related records)
- Scheduled batch deletions
- Data anonymization as alternative to deletion (aggregate reports)
- User notification of deletion completion with details

**Compliance Mapping:** GDPR Article 17, CCPA § 1798.100, ISO 27001 A.5.1.2

---

### 3.5 Right to Access & Data Portability

**Quick Reference:** Allow users to download their data and export to another service  
**Why:** GDPR/CCPA mandate; builds user trust; enables data freedom

**MUST-HAVES:**
- [ ] Provide download of personal data in machine-readable format
  - JSON, CSV, or standard format (not PDF)
  - Complete and accurate
  - Easily parseable by third-party tools
- [ ] Respond to access requests within 30 days (GDPR timeline)
- [ ] Include data in human-readable format
  - Metadata explaining what each field means
  - Related records included (e.g., user's orders, posts, etc.)
- [ ] Provide data in commonly-used format
  - JSON (structured data)
  - CSV (tabular data)
  - Export in their chosen format
- [ ] Make recurring exports available
  - Users should be able to download data anytime
  - Not just in response to formal request
- [ ] Document all data access requests for compliance

**GOOD-TO-HAVES:**
- Scheduled automatic data exports (monthly backups sent to user)
- Multiple format options
- API for programmatic data export
- Real-time data access portal

**Compliance Mapping:** GDPR Article 15 (access), Article 20 (portability), CCPA § 1798.100

---

## SECTION 4: COMPLIANCE & LEGAL

### 4.1 Privacy Policy & Terms of Service

**Quick Reference:** Clear legal documents explaining data use and user rights  
**Why:** Required by GDPR, CCPA, and general legal requirements

**MUST-HAVES:**
- [ ] Comprehensive privacy policy explaining:
  - What personal data is collected
  - Why (legal basis) - Consent, Contract, Legal Obligation, Legitimate Interest, etc.
  - Who processes it (company, third-parties)
  - How long it's retained
  - User rights (access, erasure, portability)
  - Contact info for privacy inquiries
  - Cookie usage and tracking
- [ ] Terms of service explaining:
  - Service provided
  - User responsibilities
  - Payment terms (if applicable)
  - Limitation of liability
  - Dispute resolution
  - Termination terms
- [ ] Written in clear, plain language (not legal jargon only)
- [ ] Readily accessible on website (link in footer)
- [ ] Version history and update notification
  - Document when policies changed
  - Notify users of significant changes
  - Get re-consent if changes affect them
- [ ] Legal review (consult lawyer for your jurisdiction)

**GOOD-TO-HAVES:**
- Privacy policy in multiple languages (for international users)
- Cookie consent banner with granular options
- Separate data processing agreement for B2B customers
- Regular privacy policy updates (at least annually)

**Compliance Mapping:** GDPR Article 13/14, CCPA § 1798.100, CalOPPA

**Privacy Policy Sections:**
```
1. Data Collection
2. Legal Basis
3. Data Retention
4. Data Sharing
5. User Rights
6. Security Measures
7. Children's Privacy
8. Contact Information
9. Changes to Policy
10. Cookies/Tracking
```

---

### 4.2 Data Processing Agreement (DPA)

**Quick Reference:** Legal agreement with customers specifying how their data is processed  
**Why:** GDPR requires DPA between data controller and processor; required for B2B SaaS

**MUST-HAVES:**
- [ ] Include standard clauses if processing EU personal data
  - Standard Contractual Clauses (SCCs) for data transfer
  - Binding Corporate Rules (BCRs) for multinational companies
- [ ] Specify:
  - What data is processed
  - How data is processed
  - How long data is retained
  - Security measures implemented
  - Sub-processor list
  - User rights enforcement
  - Data breach notification procedures
  - Data deletion/return on termination
- [ ] Require customer consent to sub-processors
  - List all third-party processors
  - Allow customer to object to new processors
- [ ] Implement Data Protection Impact Assessment (DPIA)
  - For high-risk processing
  - Document risk assessment and mitigation
- [ ] Appoint Data Protection Officer (DPO)
  - Required if processing large amounts of data
  - Or provide contact for privacy inquiries
- [ ] Include incident response procedures
  - How breaches are reported
  - Timelines for notification (72 hours for GDPR)

**GOOD-TO-HAVES:**
- Individual DPA for each customer
- Periodic DPA audits
- Compliance certification (SOC 2, ISO 27001)
- Transparent sub-processor changes

**Compliance Mapping:** GDPR Articles 28-31, HIPAA BAA, CCPA Contracts

---

### 4.3 Data Breach Notification

**Quick Reference:** Legal and technical procedures for responding to security breaches  
**Why:** Regulations mandate notification; delayed/improper notification triggers penalties

**MUST-HAVES:**
- [ ] Written incident response plan
  - Escalation procedures
  - Who to contact (CISO, Legal, PR)
  - Investigation procedures
  - Communication templates
- [ ] 72-hour notification requirement (GDPR)
  - Notify supervisory authority within 72 hours
  - Cannot wait for investigation to complete
  - Provide known information; update later if needed
- [ ] Notify affected individuals as soon as reasonably possible
  - Timely notification (GDPR 72-hour rule)
  - Clear explanation of what happened
  - What data was affected
  - What steps user should take
  - Company contact for questions
  - What remediation company is providing (free credit monitoring, etc.)
- [ ] Preserve evidence for investigation
  - Don't modify logs or systems
  - Maintain chain of custody
  - Document all investigation steps
- [ ] Conduct forensic investigation
  - Identify what happened
  - How long breach lasted
  - Who was affected
  - What data was accessed/stolen
  - Root cause analysis
- [ ] Document breach response
  - All communications sent
  - Investigation findings
  - Remediation actions taken
  - Lessons learned
  - Policy/process improvements

**GOOD-TO-HAVES:**
- Cyber insurance for breach costs
- Incident response retainer with forensic firm
- Breach simulation exercises (red team)
- Crisis communication plan
- Post-breach credit monitoring service for users
- Relationship with law enforcement (FBI, local police)

**Compliance Mapping:** GDPR Article 33/34, HIPAA 45 CFR 164.400, CCPA § 1798.150, State breach notification laws

**Breach Notification Checklist:**
```
□ Identify breach immediately
□ Notify relevant stakeholders
□ Preserve evidence
□ Engage forensic firm
□ Notify authorities within 72 hours (GDPR)
□ Notify affected individuals immediately
□ Provide credit monitoring (if credit risk)
□ Document all communications
□ Implement remediation
□ Public disclosure (if required)
□ Conduct post-incident review
```

---

### 4.4 Compliance Certifications

**Quick Reference:** Third-party security certifications for compliance assurance  
**Why:** Customers require certifications; demonstrate security posture; required for regulated industries

**MUST-HAVES (depending on customer base):**
- [ ] **SOC 2 Type II** (for US SaaS companies)
  - Security, Availability, Processing Integrity, Confidentiality, Privacy
  - Type II includes testing over 6-12 months
  - Annual certification recommended
  - Cost: $15,000-$50,000 annually
- [ ] **ISO 27001** (for EU/international companies)
  - Information Security Management System (ISMS)
  - Comprehensive security framework
  - Annual audit and certification
  - Cost: $20,000-$100,000+ initially, $10,000+ annually
- [ ] **GDPR Compliance** (if processing EU personal data)
  - Not a certification, but compliance verification
  - Evidence of DPA, DPIA, privacy policy, etc.
  - Regular audits recommended
- [ ] **HIPAA BAA** (if handling health information)
  - Business Associate Agreement with healthcare entities
  - Demonstrates HIPAA compliance
  - Regular audits
- [ ] **PCI-DSS** (if handling payment card data)
  - Mandatory if storing/processing credit cards
  - Level 1-4 based on transaction volume
  - Annual assessment and certification
  - Cost: $1,200-$100,000+ annually

**GOOD-TO-HAVES:**
- ISO 27018 (Cloud Privacy Code of Conduct)
- CCPA Readiness verification
- Penetration testing certification
- Bug bounty program participation
- Regular third-party security audits

**Compliance Mapping:** Depends on customer requirements and industry

**Certification Timeline:**
- SOC 2: 6-12 months to first certification
- ISO 27001: 6-12 months to first certification
- HIPAA: Ongoing compliance, formal audit annually
- PCI-DSS: Annual assessment
- GDPR: Ongoing compliance, no formal audit required

---

## SECTION 5: SECURITY TESTING & MONITORING

### 5.1 Penetration Testing

**Quick Reference:** Simulate real-world attacks to find vulnerabilities  
**Why:** Automated scanning misses many vulnerabilities; skilled testers find advanced attack paths

**TESTING FREQUENCY:**
- [ ] **MVP/First Launch:** Initial assessment before going live
  - Identify critical vulnerabilities before customers access
  - External penetration test recommended
- [ ] **100-500 Customers:** Annual penetration testing
  - At minimum, external testing from reputable firm
- [ ] **500+ Customers:** Annual + after major changes
  - External and internal testing
  - Red team exercises
- [ ] **High-Risk Industries (Finance, Healthcare):** Quarterly
  - Continuous threat monitoring
  - Regular assessments
- [ ] **After Major Changes:**
  - New payment processing system
  - Data architecture changes
  - Third-party integrations
  - Authentication system overhaul

**MUST-HAVES:**
- [ ] Hire reputable penetration testing firm (not internal team)
  - Need independent assessment
  - External view of security posture
- [ ] Define scope clearly
  - Which systems to test
  - What's out of scope
  - Testing windows (after hours?)
  - Rules of engagement
- [ ] Comprehensive testing covering:
  - Network infrastructure
  - Web application security
  - API security
  - Authentication/authorization
  - Data protection
  - Access controls
- [ ] Professional report with:
  - Executive summary
  - Detailed findings with CVSS scores
  - Evidence of vulnerability
  - Remediation recommendations
  - Timeline for fixes
- [ ] Remediation of critical/high findings before going to production
- [ ] Re-test findings after remediation

**GOOD-TO-HAVES:**
- Red team exercises (simulating advanced persistent threats)
- Bug bounty program ($500-$50,000 annually)
- Continuous automated scanning
- Internal security assessments
- Adversarial threat modeling

**Compliance Mapping:** GDPR Article 32, HIPAA 45 CFR 164.308, PCI-DSS 11.3, ISO 27001 A.14.2.4

---

### 5.2 Vulnerability Scanning & Management

**Quick Reference:** Automated scanning for known vulnerabilities  
**Why:** Continuous monitoring catches vulnerabilities between penetration tests

**MUST-HAVES:**
- [ ] Automated vulnerability scanning tools
  - Dependency scanning (npm audit, pip-audit, etc.)
  - SAST (Static Application Security Testing)
    - SonarQube, Checkmarx, Fortify
    - Scan source code for vulnerable patterns
  - DAST (Dynamic Application Security Testing)
    - Burp Suite, OWASP ZAP
    - Test running application for vulnerabilities
  - Container scanning (Trivy, Clair)
  - Infrastructure scanning (Qualys, Nessus)
- [ ] Integrate scanning into CI/CD pipeline
  - Run on every commit
  - Fail build if critical vulnerabilities found
  - Track vulnerabilities over time
- [ ] Vulnerability severity scoring
  - Use CVSS (Common Vulnerability Scoring System)
  - Critical: Fix within 24-48 hours
  - High: Fix within 7 days
  - Medium: Fix within 30 days
  - Low: Fix within 90 days
- [ ] Tracking and remediation
  - Document all vulnerabilities found
  - Track remediation status
  - Verify fixes with re-scanning
- [ ] False positive reduction
  - Tune scanning tools to reduce noise
  - Review high-impact alerts
  - Don't ignore "low noise" issues

**GOOD-TO-HAVES:**
- Centralized vulnerability management dashboard
- Machine learning-based vulnerability prioritization
- Continuous scanning (not just on commits)
- Integration with project management tools
- Vulnerability trending and metrics

**Scanning Tools:**
```
Dependency Scanning:
- npm audit (Node.js)
- pip-audit (Python)
- Snyk (multi-language)
- GitHub Dependabot (multi-language)

SAST (Static Analysis):
- SonarQube
- Checkmarx
- Fortify
- Semgrep

DAST (Dynamic Analysis):
- Burp Suite
- OWASP ZAP
- Qualys
- Acunetix

Container:
- Trivy
- Clair
- Aqua
```

---

### 5.3 Security Monitoring & Alerting

**Quick Reference:** Real-time monitoring for security incidents and anomalies  
**Why:** Detect and respond to attacks while they're happening

**MUST-HAVES:**
- [ ] Centralized logging platform
  - SIEM (Security Information and Event Management)
  - Collect logs from all systems: app, database, firewalls, load balancers
  - Tools: ELK Stack, Splunk, Datadog, Sumo Logic
- [ ] Monitor for suspicious activity:
  - Multiple failed login attempts
  - Unusual access times or locations
  - Large data downloads
  - Administrative actions
  - API rate limiting triggers
  - Unusual error rates
  - Database access patterns
- [ ] Real-time alerting
  - Alert security team when threshold exceeded
  - Page on-call engineer for critical alerts
  - Automated responses (temporarily lock account, etc.)
- [ ] Alert tuning
  - Reduce false positives
  - Alert on true security events only
  - Adjust thresholds based on baseline behavior
- [ ] Log retention per compliance
  - GDPR: 1 year minimum
  - HIPAA: 6 years minimum
  - PCI-DSS: 1 year minimum
  - ISO 27001: Per policy (recommend 1-3 years)
- [ ] Secure log storage
  - Encrypt logs at rest and in transit
  - Restrict access to logs
  - Implement log integrity verification
  - Archive to cold storage for long-term retention

**GOOD-TO-HAVES:**
- Machine learning anomaly detection
- Correlation across multiple systems
- Automated incident response
- Threat intelligence integration
- User behavior analytics (UBA)
- Risk scoring for alert prioritization

**Alerting Thresholds (Example):**
```
Critical:
- 5 failed logins in 5 minutes
- Admin account accessing sensitive data at 3 AM
- Database export of 10,000+ records
- Multiple authentication bypasses detected

High:
- 3 failed logins for same account in 30 minutes
- Access from new geographic location
- Unusual API usage pattern
- Large data transfer to external system

Medium:
- Failed password reset attempts
- Configuration changes by admin
- API key creation
```

---

### 5.4 Web Application Firewall (WAF)

**Quick Reference:** Network-layer defense blocking malicious HTTP traffic  
**Why:** First line of defense; blocks known attack patterns before reaching application

**MUST-HAVES:**
- [ ] Deploy WAF on all public-facing endpoints
  - Cloudflare WAF
  - AWS WAF
  - Imperva
  - ModSecurity (open source)
- [ ] WAF rule sets
  - OWASP ModSecurity Core Rule Set (CRS)
  - Vendor-specific rules
  - Custom rules for your application
- [ ] Block known attack patterns:
  - SQL injection
  - Cross-site scripting (XSS)
  - Local file inclusion (LFI)
  - Remote file inclusion (RFI)
  - Cross-site request forgery (CSRF)
  - Protocol attacks
- [ ] Bot detection and mitigation
  - Detect and block malicious bots
  - Rate limiting (HTTP flood)
  - CAPTCHA challenges
- [ ] GeoIP blocking (if applicable)
  - Block requests from specific countries
  - Block suspicious geographic anomalies
- [ ] DDoS protection
  - Rate limiting at edge
  - Traffic anomaly detection
  - Automatic scaling
  - Failover to backup servers

**GOOD-TO-HAVES:**
- Machine learning-based threat detection
- Custom WAF rules for your application
- Real-time dashboards
- Integration with logging platform
- Automated threat response

**WAF vs Network Firewall:**
```
Network Firewall:
- Blocks based on IP, port, protocol
- Layer 3-4 (Network/Transport)
- Example: pfSense, Cisco ASA

WAF:
- Blocks based on HTTP content
- Layer 7 (Application)
- Understands: SQL injection, XSS, etc.
- Example: Cloudflare, AWS WAF, Imperva
```

---

## SECTION 6: INFRASTRUCTURE & DEPLOYMENT SECURITY

### 6.1 Secure Deployment Practices

**Quick Reference:** Deploy code safely without exposing secrets or causing downtime  
**Why:** Deployment is high-risk; mistakes expose secrets, introduce vulnerabilities

**MUST-HAVES:**
- [ ] Code review process before deployment
  - At least 1 peer review
  - Review for security issues, not just code style
  - Security-focused code review checklist
- [ ] Automated testing before deployment
  - Unit tests
  - Integration tests
  - Security tests (SAST, dependency checks)
  - Fail deployment if tests fail
- [ ] Staging environment matching production
  - Same infrastructure, configuration, data (anonymized)
  - Test deployment in staging first
  - Verify functionality before production
- [ ] Secrets management
  - Never store secrets in code or version control
  - Use environment variables or secrets manager
  - Rotate secrets regularly
  - Limit secret access to production systems only
- [ ] Blue-green deployment or canary deployment
  - Roll out to subset of traffic first
  - Monitor for errors before full rollout
  - Quick rollback if issues detected
  - Zero-downtime deployments
- [ ] Automated rollback capability
  - If deployment fails, automatically rollback
  - Keep previous version running
  - Test rollback procedure regularly
- [ ] Change log and audit trail
  - Document all deployments
  - Record who deployed what and when
  - Keep for compliance audits

**GOOD-TO-HAVES:**
- Infrastructure-as-Code (IaC)
  - Terraform, CloudFormation, Ansible
  - Reproducible infrastructure
  - Version control for infrastructure
- Immutable infrastructure
  - Build new servers for each deployment
  - Never modify servers in place
  - Reduces configuration drift
- Container orchestration (Kubernetes)
  - Automated scaling and updates
  - Self-healing capabilities
  - Rolling updates without downtime

**Deployment Checklist:**
```
□ All tests passing
□ Code review completed
□ Security scan passed
□ Dependencies updated and scanned
□ Secrets not in code
□ Staging deployment successful
□ Database migrations tested
□ Rollback plan verified
□ Monitoring alerts configured
□ Team notified
□ On-call engineer available
□ Deployment time window appropriate
□ Production deployment
□ Monitor error rates and performance
□ Customer communication ready
```

---

### 6.2 Infrastructure Security

**Quick Reference:** Secure cloud infrastructure and servers  
**Why:** Infrastructure compromise means all data is compromised

**MUST-HAVES:**
- [ ] Network segmentation
  - Separate database network from application servers
  - Restrict database access to application servers only
  - VPN for admin access
  - No direct internet access to database
- [ ] Firewall configuration
  - Allow only necessary ports and protocols
  - Deny all by default, allow specific traffic
  - Document all firewall rules
- [ ] SSH key management
  - Use SSH keys, not passwords
  - Disable password authentication
  - Restrict key access (chmod 600)
  - Rotate keys regularly
  - Remove keys when access no longer needed
- [ ] Operating system hardening
  - Apply security patches promptly
  - Disable unnecessary services
  - Close unused ports
  - Strong file permissions
- [ ] Database security
  - Strong database passwords (20+ characters)
  - Don't use default credentials
  - Limit database user permissions (principle of least privilege)
  - Disable unnecessary features
  - Enable database auditing and logging
  - Restrict database access to application servers only
- [ ] Server monitoring
  - Monitor CPU, memory, disk usage
  - Alert on anomalies
  - Monitor for unauthorized access attempts
  - Monitor network traffic

**GOOD-TO-HAVES:**
- Cloud WAF (AWS WAF, Cloudflare)
- DDoS protection service
- VPC endpoint isolation
- Private subnet for databases
- Bastion/Jump host for admin access
- Hardware security modules for key storage
- Air-gapped backup systems

**Infrastructure Hardening Checklist:**
```
□ SSH key authentication (no passwords)
□ Firewall rules minimized (deny all, allow specific)
□ Unnecessary services disabled
□ OS security updates applied
□ Database passwords strong
□ Database access restricted to app servers
□ Monitoring and alerting configured
□ Backups encrypted and tested
□ VPN for admin access
□ No public access to admin interfaces
```

---

### 6.3 Backup & Disaster Recovery

**Quick Reference:** Regular backups enable recovery from data loss or ransomware  
**Why:** No backup = permanent data loss in case of disaster

**MUST-HAVES:**
- [ ] Automated daily backups
  - Daily backups at minimum (more frequent for critical data)
  - Scheduled during low-traffic times
  - Automated process (no manual backups)
- [ ] Backup retention policy
  - GDPR: 1 year typical
  - HIPAA: 6 years required
  - Financial data: 7 years (tax compliance)
  - Document retention policy
- [ ] Encrypted backups
  - Encrypt backups at rest
  - Use strong encryption (AES-256)
  - Manage backup encryption keys separately
- [ ] Backup testing and restoration
  - Test backups monthly
  - Perform full restore test quarterly
  - Document restore procedures
  - Verify restored data integrity
- [ ] Off-site backup storage
  - Backups stored in different geographic location
  - Protects against data center disasters
  - Cloud backup provider (AWS S3, Google Cloud Storage, Azure)
- [ ] Disaster recovery plan
  - Document Recovery Time Objective (RTO): How quickly to restore
  - Document Recovery Point Objective (RPO): How much data loss acceptable
  - Identify critical systems to restore first
  - Test DR plan semi-annually
  - Keep runbook for disaster response
- [ ] Ransomware protection
  - Backups stored in separate system (attacker can't encrypt)
  - Immutable backups (cannot be modified or deleted)
  - Version retention (keep old backup versions)
  - Air-gapped backup system (not connected to network)

**GOOD-TO-HAVES:**
- Point-in-time recovery capability
- Continuous data protection (CDP)
- Geographic redundancy (backups in multiple regions)
- Backup to multiple cloud providers
- Database-specific backup tools
- Backup compression and deduplication
- Compliance-ready backup reports

**Backup Strategy:**
```
Daily incremental backups (store 7 days)
Weekly full backups (store 4 weeks)
Monthly backups (store 1 year)
Annual archival (store 7+ years)

All encrypted
All tested regularly
Some off-site/air-gapped
```

**RTO/RPO Guidelines:**
```
RTO: 1-4 hours (restore within 1-4 hours)
RPO: 1-24 hours (lose at most 1-24 hours of data)
```

---

### 6.4 Third-Party Risk Management

**Quick Reference:** Evaluate and manage security of vendors and integrations  
**Why:** Vendors are common attack vector; breach in third-party can compromise your application

**MUST-HAVES:**
- [ ] Vendor assessment process
  - Evaluate security posture before integration
  - Request SOC 2, ISO 27001, or security audit
  - Review privacy policy and data handling
  - Verify compliance certifications
- [ ] Data Processing Agreement (DPA) with vendors
  - Document what data is shared
  - How vendor processes data
  - Vendor security obligations
  - Breach notification procedures
  - Data deletion on termination
- [ ] Sub-processor list
  - Document all third-party vendors
  - Include payment processors, analytics, CDN, etc.
  - Notify customers of sub-processors
  - Allow customers to object to new processors
- [ ] Regular vendor security reviews
  - Annual security assessment
  - Request updated certifications
  - Verify ongoing compliance
  - Audit vendor access to your systems
- [ ] Vendor incident response procedures
  - How to respond if vendor is breached
  - Communication procedures
  - Data breach impact assessment
  - Notification to customers if necessary
- [ ] Minimize vendor access
  - Limit access to necessary systems only
  - Grant minimal permissions needed
  - Regular access audits
  - Remove access when no longer needed

**GOOD-TO-HAVES:**
- Automated vendor risk scoring
- Continuous vendor monitoring
- Regular penetration testing of vendor integrations
- Vendor security incident tracking
- Alternative vendors for critical functions

**Vendor Assessment Checklist:**
```
□ SOC 2 Type II or equivalent certification
□ GDPR/HIPAA/compliance certifications
□ Data Processing Agreement in place
□ Encryption practices reviewed
□ Incident response procedures documented
□ Access controls verified
□ Audit trail and logging available
□ Regular security updates maintained
□ Breach notification procedures established
```

---

## SECTION 7: SCALING CONSIDERATIONS

### 7.1 Growth Stage: 100-1000 Customers

**New security requirements as you scale:**

- [ ] **Formal Security Program**
  - Dedicated security officer/team
  - Security policies and procedures documented
  - Security training for all employees
  - Security awareness program

- [ ] **Incident Response Team**
  - On-call rotation for security incidents
  - Documented incident response procedures
  - Regular incident response drills
  - External incident response retainer

- [ ] **Compliance Expansion**
  - SOC 2 Type II certification (if not already)
  - GDPR compliance verification
  - Data Processing Agreements with customers
  - Privacy policy and terms reviewed by attorney

- [ ] **Advanced Security Testing**
  - Red team exercises
  - Bug bounty program
  - Regular penetration testing (quarterly)
  - Third-party security audits

- [ ] **Enhanced Monitoring**
  - 24/7 SOC (Security Operations Center) or managed SIEM
  - Automated threat detection and response
  - Endpoint Detection and Response (EDR)
  - Advanced analytics and threat intelligence

- [ ] **Access Control Hardening**
  - Single Sign-On (SSO) for employees
  - Role-based access control (RBAC) across all systems
  - Privileged access management (PAM)
  - Multi-factor authentication mandatory for all employees

---

### 7.2 Growth Stage: 1000-10,000 Customers

**Enterprise-level security as you grow:**

- [ ] **Full Compliance Program**
  - ISO 27001 certification
  - HIPAA BAA if handling health data
  - PCI-DSS if handling payment data
  - Regular compliance audits

- [ ] **Enterprise Risk Management**
  - Risk assessment process
  - Risk register and tracking
  - Regular risk reviews
  - Business continuity planning

- [ ] **Advanced Threat Protection**
  - Advanced threat protection (ATP)
  - Behavioral analytics
  - Cloud access security broker (CASB)
  - Advanced endpoint protection

- [ ] **Security Operations**
  - In-house or managed SOC (24/7)
  - Threat intelligence team
  - Forensics and incident response team
  - Regular tabletop exercises

- [ ] **Application Security**
  - SAST and DAST testing integrated into CI/CD
  - Security architecture review process
  - Threat modeling for all major features
  - Annual architecture security review

- [ ] **Employee Security**
  - Security training for all roles
  - Annual security certification
  - Background checks for all employees
  - Separation of duties

---

### 7.3 Growth Stage: 10,000+ Customers

**Enterprise security standards:**

- [ ] **Regulatory Compliance**
  - Full compliance with all applicable regulations
  - Regular compliance certifications and audits
  - Compliance team
  - Legal review of all privacy practices

- [ ] **Advanced Security Infrastructure**
  - High-availability WAF across multiple regions
  - DDoS protection tier (Enterprise)
  - Multi-region active-active infrastructure
  - Geographic redundancy for backups

- [ ] **Threat Management**
  - Threat intelligence integration
  - Attack surface management
  - Vulnerability management program
  - Zero-trust architecture implementation

- [ ] **Security Culture**
  - Chief Information Security Officer (CISO)
  - Security champions program
  - Regular security training and testing
  - Security incident post-mortems

- [ ] **Continuous Improvement**
  - Regular penetration testing and red team exercises
  - Security metrics and KPIs
  - Security roadmap
  - Investment in security innovation

---

## SECTION 8: QUICK REFERENCE SECURITY CHECKLIST

### MVP/Launch Checklist (Before First Customer)

**Critical - DO NOT LAUNCH WITHOUT THESE:**

- [ ] HTTPS/TLS enabled everywhere
- [ ] Passwords hashed with Argon2id or bcrypt
- [ ] Input validation on all user inputs
- [ ] Output encoding to prevent XSS
- [ ] Parameterized queries to prevent SQL injection
- [ ] Authentication/authorization on all endpoints
- [ ] CSRF protection on state-changing operations
- [ ] Secure password reset process
- [ ] HTTP security headers (HSTS, CSP, X-Frame-Options)
- [ ] Rate limiting on login and API endpoints
- [ ] Dependency vulnerability scanning
- [ ] Basic error handling (no sensitive data leakage)
- [ ] Privacy policy and terms of service
- [ ] Encrypted backups
- [ ] Incident response plan documented
- [ ] MFA available (at least for admin)

### 100-500 Customers Checklist

**In addition to MVP checklist:**

- [ ] SOC 2 Type II assessment started
- [ ] Annual penetration testing completed
- [ ] GDPR compliance verified
- [ ] Data Processing Agreement with customers
- [ ] Centralized logging/SIEM implemented
- [ ] API security audit completed
- [ ] DPIA (Data Protection Impact Assessment) completed
- [ ] DPA with sub-processors
- [ ] Encrypted data at rest in database
- [ ] Key management system implemented
- [ ] Employee security training program
- [ ] Incident response team established
- [ ] Access control hardened (RBAC)
- [ ] Disaster recovery plan tested
- [ ] Bug bounty program considered

### 500-10,000 Customers Checklist

**Enterprise-level security:**

- [ ] SOC 2 Type II certified
- [ ] ISO 27001 certification considered
- [ ] HIPAA/CCPA/regional compliance verified
- [ ] Quarterly penetration testing
- [ ] 24/7 SOC or managed SIEM
- [ ] Red team exercises completed
- [ ] Advanced threat protection
- [ ] Multi-region infrastructure
- [ ] Formal security program
- [ ] CISO or security team in place
- [ ] Threat intelligence integration
- [ ] Advanced access controls (PAM, SSO)
- [ ] Continuous security testing in CI/CD
- [ ] Threat modeling for all features
- [ ] Annual compliance audits

### 10,000+ Customers Checklist

**Full enterprise security:**

- [ ] ISO 27001 certified
- [ ] SOC 2 Type II + other compliance as needed
- [ ] In-house or managed SOC (24/7)
- [ ] CISO leadership
- [ ] Multi-region active-active infrastructure
- [ ] Enterprise-grade WAF and DDoS protection
- [ ] Zero-trust architecture
- [ ] Advanced threat protection across all systems
- [ ] Quarterly red team exercises
- [ ] Formal security governance
- [ ] Security metrics and KPIs tracked
- [ ] Vendor security program
- [ ] Annual comprehensive security audit
- [ ] Continuous improvement security roadmap
- [ ] Investment in security innovation

---

## SECTION 9: COMPLIANCE REQUIREMENTS BY REGULATION

### GDPR (EU Data Protection)

**Applies if:** Processing personal data of EU residents

**Key Requirements:**
- Legal basis for data processing
- Lawful processing of personal data
- Data minimization (collect only necessary)
- Storage limitation (delete when no longer needed)
- Security measures (encryption, access controls)
- Breach notification within 72 hours
- Right to access (user can download their data)
- Right to erasure (right to be forgotten)
- Right to restrict processing
- Data portability
- Data Protection Officer (if processing at scale)
- Privacy by design and default
- Data Protection Impact Assessment (DPIA)
- Standard Contractual Clauses (SCCs) for data transfers

**Penalties:** Up to €20 million or 4% of global annual turnover, whichever is higher

**Implementation:** Data audit → Legal basis → Privacy policy → DPA → GDPR compliance program

---

### CCPA (California Consumer Privacy Act)

**Applies if:** Processing personal data of California residents, AND (1) annual gross revenue >$25M OR (2) buy/receive/share personal data of 100,000+ people/households OR (3) derive 50%+ revenue from selling data

**Key Requirements:**
- Transparency: Disclose data collection
- Right to access (consumers can request data)
- Right to delete (consumers can request deletion)
- Right to opt-out of sale/sharing
- Non-discrimination (don't penalize for exercising rights)
- Security measures
- Vendor agreements with data processors
- Annual risk assessment
- Incident response plan

**Penalties:** Up to $7,500 per violation (or treble damages if intentional)

**Note:** CPRA (California Privacy Rights Act) expands CCPA starting January 2024

---

### HIPAA (Health Insurance Portability and Accountability Act)

**Applies if:** Processing protected health information (PHI) in US

**Key Requirements:**
- Business Associate Agreement (BAA)
- Safeguards Rule (administrative, physical, technical)
- Privacy Rule (limits on PHI use/disclosure)
- Breach Notification Rule (notify within 60 days)
- Security Rule (encryption, access controls, audit logging)
- Administrative safeguards (policies, training, access controls)
- Physical safeguards (facility security, device security)
- Technical safeguards (encryption, authentication, audit logging)

**Penalties:** $100-$50,000 per violation; civil penalties up to $1.5M annually

---

### PCI-DSS (Payment Card Industry Data Security Standard)

**Applies if:** Processing credit card data

**Requirements Depend on Level:**
- Level 1 (>6M transactions/year): Quarterly assessments, annual external PCI audit
- Level 2: Annual self-assessment questionnaire + vulnerability scanning
- Level 3: Annual self-assessment + vulnerability scanning
- Level 4: Annual self-assessment + vulnerability scanning

**Key Requirements:**
- Network segmentation
- Firewall configuration
- Strong passwords and access controls
- Encryption of cardholder data
- Vulnerability scanning and patching
- Intrusion detection systems
- Strong access control
- Regular testing
- Information security policy
- Staff training

**Recommendation:** Use payment processor tokenization instead of storing card data

---

### ISO 27001 (Information Security Management)

**Applies if:** You want international security certification

**Requirements:**
- Information security policy
- Asset management
- Human resources security
- Access control
- Cryptography
- Physical and environmental security
- Operations security
- Communications security
- System acquisition/development/maintenance
- Supplier relationships
- Information security incident management
- Business continuity management
- Compliance with legal requirements

---

### SOC 2 (System and Organization Controls)

**Applies if:** You're a service organization (SaaS, cloud provider, etc.)

**Two Types:**
- **Type I:** Point-in-time assessment (controls exist on test date)
- **Type II:** Operating effectiveness (controls work over 6-12 month period)

**Five Trust Service Criteria:**
- Security: Protected against unauthorized access
- Availability: Available and operational
- Processing Integrity: Complete, accurate, authorized, timely
- Confidentiality: Restricted to appropriate parties
- Privacy: Collected, used, retained appropriately

**SaaS companies:** Type II is standard requirement

---

## SECTION 10: COMMON VULNERABILITIES & PREVENTION

### OWASP Top 10 (2024) - Detailed Prevention

#### 1. Broken Access Control

**Attack:** User 1 accesses User 2's data by changing ID in URL

**Prevention:**
- Verify on every endpoint that user owns the resource
- Implement RBAC/ABAC
- Test access control explicitly
- Never hide admin features

**Testing:** Try changing ID in URL, accessing admin features as regular user

#### 2. Cryptographic Failures

**Attack:** Database breached; passwords stored plain text; credit cards readable

**Prevention:**
- Encrypt sensitive data at rest (AES-256)
- Use TLS for data in transit
- Hash passwords with Argon2id/bcrypt
- Don't store credit card data

**Testing:** Check database for plain text passwords, unencrypted data

#### 3. Injection

**Attack:** SQL injection: `' OR '1'='1` returns all users; XSS: `<script>alert('xss')</script>`

**Prevention:**
- Parameterized queries (prepared statements)
- Input validation on all inputs
- Output encoding for HTML/JavaScript
- Use ORM frameworks

**Testing:** Try common injection payloads in login fields, search fields

#### 4. Insecure Design

**Attack:** Application designed without security in mind; no threat modeling

**Prevention:**
- Security in design phase, not bolted on later
- Threat modeling for new features
- Security requirements in design docs
- Architecture security review

**Testing:** Review design for security considerations

#### 5. Security Misconfiguration

**Attack:** Debug mode enabled in production; default admin credentials; outdated framework

**Prevention:**
- Disable debug mode in production
- Change all default credentials
- Keep framework and libraries updated
- Remove unnecessary components
- Disable unnecessary HTTP methods

**Testing:** Check for debug mode, default credentials, unnecessary services

#### 6. Vulnerable & Outdated Components

**Attack:** Using library with known vulnerability; jQuery version from 2015 with 47 CVEs

**Prevention:**
- Regular dependency scanning
- Automated updates
- Version pinning/locking
- Remove unused dependencies

**Testing:** Run `npm audit`, `pip-audit`, dependency-check

#### 7. Authentication Failures

**Attack:** Weak passwords; no MFA; session hijacking; password reset flaw

**Prevention:**
- Enforce strong passwords
- Implement MFA
- Secure session management
- Secure password reset process
- Rate limit login attempts

**Testing:** Try common passwords, brute force attacks, session fixation

#### 8. Software & Data Integrity Failures

**Attack:** Compromised library download; unsigned updates; malicious dependency

**Prevention:**
- Verify package signatures
- Use trusted package repositories
- Subresource Integrity (SRI) for CDN resources
- Secure deployment pipeline

**Testing:** Verify package checksums, check CDN resources for tampering

#### 9. Security Logging & Monitoring Failures

**Attack:** Attack succeeds; no logs recorded; incident goes undetected for months

**Prevention:**
- Log all security events
- Implement alerting for suspicious activity
- Regular log reviews
- Proper log retention

**Testing:** Trigger security event, verify it's logged and alerted

#### 10. Server-Side Request Forgery (SSRF)

**Attack:** App fetches URL from user input: `http://localhost:8000/admin` - attacker accesses internal admin

**Prevention:**
- Whitelist allowed URLs
- Block internal IP ranges (127.0.0.1, 192.168.x.x, etc.)
- Disable unnecessary protocols (file://, gopher://, etc.)
- Network segmentation

**Testing:** Try accessing internal URLs through application

---

## FINAL CHECKLIST: Pre-Launch Security Audit

### Week 1-2: Architecture & Design

- [ ] Security architecture review completed
- [ ] Threat model created for application
- [ ] Data flow diagram reviewed for security
- [ ] Identified sensitive data and protection needs
- [ ] Encryption strategy documented
- [ ] Authentication/authorization design reviewed

### Week 3: Implementation Verification

- [ ] HTTPS/TLS configured and tested
- [ ] Password hashing verified (Argon2id/bcrypt)
- [ ] Input validation implemented on all endpoints
- [ ] Output encoding implemented
- [ ] SQL injection prevention verified (parameterized queries)
- [ ] XSS prevention verified (output encoding, CSP)
- [ ] CSRF protection implemented
- [ ] Rate limiting configured
- [ ] Error handling reviewed (no sensitive data leakage)

### Week 4: Testing

- [ ] Automated security testing in CI/CD
- [ ] Manual security testing completed
- [ ] Basic penetration test by internal team (or external)
- [ ] Vulnerability scan completed (dependencies, code)
- [ ] Backup and restore tested
- [ ] Disaster recovery plan reviewed
- [ ] Incident response plan reviewed

### Week 5: Compliance & Documentation

- [ ] Privacy policy completed and reviewed by attorney
- [ ] Terms of service completed
- [ ] Data Processing Agreement prepared
- [ ] GDPR/CCPA compliance verified
- [ ] Data retention policy documented
- [ ] Breach notification procedure documented
- [ ] Security policy documented

### Week 6: Final Review

- [ ] Security team sign-off
- [ ] Penetration test results reviewed and critical issues fixed
- [ ] Log monitoring implemented
- [ ] Backup systems tested
- [ ] Disaster recovery plan tested
- [ ] Team security training completed
- [ ] Incident response team identified

### Week 7: Launch

- [ ] All critical issues remediated
- [ ] Go/no-go decision made
- [ ] Customer communication ready
- [ ] Support team trained on security issues
- [ ] Monitoring and alerting verified active
- [ ] On-call schedule established
- [ ] Post-launch security review scheduled

---

## CONCLUSION

Web application security is not a one-time implementation but an ongoing commitment. Security vulnerabilities are constantly evolving, new attack techniques emerge, and regulations change. 

**Key Principles:**
1. **Security by Design** - Build security in from the start, not as an afterthought
2. **Defense in Depth** - Multiple layers of security, not single point of failure
3. **Principle of Least Privilege** - Users/systems only access what they need
4. **Regular Testing** - Continuous assessment and improvement
5. **Compliance** - Meet regulatory requirements for your industry
6. **Security Culture** - Everyone is responsible for security

**Success Requires:**
- Technical security controls (encryption, authentication, firewalls)
- Operational procedures (incident response, monitoring, backups)
- Legal compliance (privacy policy, DPA, GDPR)
- Employee training and awareness
- Regular testing and updates
- Leadership commitment and investment

**Next Steps:**
1. Use this checklist to audit current implementation
2. Prioritize critical issues for immediate remediation
3. Create 90-day security roadmap
4. Hire security expertise (internal or external)
5. Implement security testing in development process
6. Begin compliance certification process (SOC 2, ISO 27001)
7. Establish 24/7 incident response capability
8. Continuously improve security posture

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Next Review:** July 2026

---

## APPENDIX: Security Resources & Tools

### Compliance Frameworks
- GDPR Official: https://gdpr-info.eu
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- ISO 27001: https://www.iso.org/isoiec-27001-information-security-management.html

### Security Testing Tools
- OWASP ZAP: Free web app vulnerability scanner
- Burp Suite: Professional penetration testing
- Snyk: Dependency vulnerability scanning
- SonarQube: Code quality and security
- npm audit, pip-audit: Dependency scanning

### Monitoring & Logging
- ELK Stack: Free open-source SIEM
- Datadog: Cloud monitoring and security
- Splunk: Enterprise SIEM
- Sumo Logic: Cloud monitoring

### Certifications
- CEH (Certified Ethical Hacker)
- OSCP (Offensive Security Certified Professional)
- CISSP (Certified Information Systems Security Professional)
- Security+: CompTIA Security+

### Security Communities
- OWASP: https://owasp.org
- HackerOne: https://hackerone.com
- Bugcrowd: https://bugcrowd.com
- Reddit /r/cybersecurity
- StackExchange Security

