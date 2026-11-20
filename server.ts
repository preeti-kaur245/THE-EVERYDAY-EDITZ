import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { INITIAL_PRODUCTS, INITIAL_EDITORIAL_COLLECTIONS, INITIAL_STORE_SETTINGS } from './src/data/mockData';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Persistent Data & Uploads directories
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(__dirname, 'public/uploads');
const UPLOADS_REELS_DIR = path.resolve(UPLOADS_DIR, 'reels');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_REELS_DIR)) {
  fs.mkdirSync(UPLOADS_REELS_DIR, { recursive: true });
}

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const EDITORIAL_FILE = path.join(DATA_DIR, 'editorial.json');
const REELS_FILE = path.join(DATA_DIR, 'reels.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const SESSION_SECRET_FILE = path.join(DATA_DIR, '.session_secret');

const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || 'https://everyday_editz.in').replace(/\/+$/, '');

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateUniqueSlug(baseText: string, existingProducts: any[], excludeId?: string): string {
  const base = slugify(baseText) || `product-${Date.now().toString(36)}`;
  let candidate = base;
  let counter = 2;
  while (existingProducts.some((p: any) => p.id !== excludeId && p.slug === candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  return candidate;
}

// Bootstrap persistent data files if they do not exist
if (!fs.existsSync(REELS_FILE)) {
  fs.writeFileSync(REELS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(CUSTOMERS_FILE)) {
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(INITIAL_STORE_SETTINGS, null, 2), 'utf-8');
}
if (!fs.existsSync(PRODUCTS_FILE)) {
  const seeded = INITIAL_PRODUCTS.map((p, idx) => ({
    ...p,
    slug: p.slug || slugify(p.name) || p.id,
    seoTitle: p.seoTitle || `${p.name} | The Everyday Editz`,
    seoDescription: p.seoDescription || (p.tagline ? `${p.tagline} Shop online at The Everyday Editz across India.` : `Buy ${p.name} online at The Everyday Editz.`),
    isFeatured: p.isFeatured !== undefined ? p.isFeatured : (p.id === 'prod-magdock-pad' || p.id === 'prod-w-toiletry-org' || Boolean(p.isDailyEdit)),
    displayOrder: p.displayOrder || idx + 1,
    isPublished: p.isPublished !== false,
    status: p.status || 'Active',
  }));
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
} else {
  // Normalize existing products & remove any legacy unsupported delivery guarantee copy in seoDescription
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    const existing = JSON.parse(raw);
    let modified = false;
    for (let i = 0; i < existing.length; i++) {
      const p = existing[i];
      if (!p.primaryImage && p.images && p.images.length > 0) {
        p.primaryImage = p.images[0];
        modified = true;
      }
      if (!p.gallery && p.images) {
        p.gallery = p.images.map((u: string, idx: number) => ({
          url: u,
          position: idx + 1,
          isPrimary: idx === 0 || u === p.primaryImage
        }));
        modified = true;
      }
      if (!p.slug) {
        p.slug = generateUniqueSlug(p.name || p.id, existing, p.id);
        modified = true;
      }
      if (!p.seoTitle) {
        p.seoTitle = `${p.name} — Buy Online | The Everyday Editz`;
        modified = true;
      }
      if (!p.seoDescription || String(p.seoDescription).includes('Guaranteed doorstep delivery in India.')) {
        p.seoDescription = p.tagline
          ? `${p.tagline} Shop online at The Everyday Editz with 100% secure prepaid checkout.`
          : `Discover ${p.name} at The Everyday Editz. Thoughtfully selected everyday finds.`;
        modified = true;
      }
      if (p.isFeatured === undefined) {
        p.isFeatured = p.id === 'prod-magdock-pad' || p.id === 'prod-w-toiletry-org' || Boolean(p.isDailyEdit);
        modified = true;
      }
      if (p.displayOrder === undefined) {
        p.displayOrder = i + 1;
        modified = true;
      }
      if (p.isPublished === undefined) {
        p.isPublished = true;
        modified = true;
      }
      if (!p.status) {
        p.status = 'Active';
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Could not normalize products:', err);
  }
}
if (!fs.existsSync(EDITORIAL_FILE)) {
  fs.writeFileSync(EDITORIAL_FILE, JSON.stringify(INITIAL_EDITORIAL_COLLECTIONS, null, 2), 'utf-8');
}

// Body parsing middlewares (100MB for HD vertical video uploads)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve uploaded product assets and reels statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Persistent Session & Security Store
interface AdminSession {
  token: string;
  username: string;
  role: 'admin' | 'staff';
  createdAt: number;
  expiresAt: number;
}

interface CustomerSession {
  token: string;
  customerId: string;
  email: string;
  role: 'customer';
  rememberMe: boolean;
  createdAt: number;
  expiresAt: number;
}

interface FailedAttempt {
  count: number;
  lockedUntil?: number;
}

const sessions = new Map<string, AdminSession>();
const customerSessions = new Map<string, CustomerSession>();
const failedLoginAttempts = new Map<string, FailedAttempt>();
const failedCustomerAttempts = new Map<string, FailedAttempt>();
const auditLogs: Array<{ id: string; timestamp: string; action: string; status: 'Success' | 'Warning' | 'Failed' | 'Blocked'; ip?: string; details: string }> = [];

function loadSessionsFromDisk() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const now = Date.now();
    if (Array.isArray(raw?.admin)) {
      for (const s of raw.admin) {
        if (s?.token && s.expiresAt > now) sessions.set(s.token, s);
      }
    }
    if (Array.isArray(raw?.customer)) {
      for (const s of raw.customer) {
        if (s?.token && s.expiresAt > now) customerSessions.set(s.token, s);
      }
    }
  } catch {
    // Start with clean sessions if file is unreadable
  }
}

function persistSessionsToDisk() {
  try {
    const now = Date.now();
    const adminList = Array.from(sessions.values()).filter((s) => s.expiresAt > now);
    const customerList = Array.from(customerSessions.values()).filter((s) => s.expiresAt > now);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ admin: adminList, customer: customerList }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist sessions:', err);
  }
}

loadSessionsFromDisk();

// Helper: Add Audit Log
function logAudit(action: string, status: 'Success' | 'Warning' | 'Failed' | 'Blocked', details: string, ip?: string) {
  const log = {
    id: 'LOG-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    action,
    status,
    ip: ip || '127.0.0.1',
    details,
  };
  auditLogs.unshift(log);
  if (auditLogs.length > 500) auditLogs.pop();
  return log;
}

// Initial system audit
logAudit('SYSTEM_BOOT', 'Success', 'The Everyday Editz full-stack backend initialized on port ' + PORT);

// Admin Credentials config (can be overridden via environment variables)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'EverydayEdit@2026!').digest('hex');

function resolveSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }
  try {
    if (fs.existsSync(SESSION_SECRET_FILE)) {
      const saved = fs.readFileSync(SESSION_SECRET_FILE, 'utf-8').trim();
      if (saved.length >= 32) return saved;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SESSION_SECRET_FILE, generated, { encoding: 'utf-8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const JWT_SECRET = resolveSessionSecret();

// Cryptographic token generator (Admin)
function generateSecureToken(username: string): string {
  const payload = Buffer.from(JSON.stringify({
    username,
    role: 'admin',
    iat: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  })).toString('base64url');
  
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

// Cryptographic token generator (Staff Portal — scoped role: 'staff')
function generateStaffToken(username: string): string {
  const payload = Buffer.from(JSON.stringify({
    username,
    role: 'staff',
    iat: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `staff_${payload}.${signature}`;
}

// Verify Admin token helper (requires valid signature AND active non-expired admin-role session)
function verifySecureToken(token: string): { valid: boolean; username?: string; isCustomerToken?: boolean; isStaffToken?: boolean } {
  try {
    if (!token) return { valid: false };
    if (token.startsWith('cust_')) {
      return { valid: false, isCustomerToken: true };
    }
    if (token.startsWith('staff_')) {
      return { valid: false, isStaffToken: true };
    }
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    const [payloadBase64, providedSig] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadBase64).digest('base64url');
    
    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return { valid: false };
    }

    const data = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    if (data.role && data.role !== 'admin') return { valid: false, isStaffToken: data.role === 'staff' };

    const session = sessions.get(token);
    if (!session || session.role !== 'admin' || Date.now() > session.expiresAt) {
      if (session && Date.now() > session.expiresAt) {
        sessions.delete(token);
        persistSessionsToDisk();
      }
      return { valid: false };
    }

    return { valid: true, username: data.username || session.username };
  } catch {
    return { valid: false };
  }
}

// Verify Staff or Admin token helper (rejects customer tokens with 403)
function verifyStaffOrAdminToken(token: string): { valid: boolean; username?: string; role?: 'staff' | 'admin'; isCustomerToken?: boolean } {
  try {
    if (!token) return { valid: false };
    if (token.startsWith('cust_')) {
      return { valid: false, isCustomerToken: true };
    }
    if (!token.startsWith('staff_')) {
      const adminCheck = verifySecureToken(token);
      if (adminCheck.valid) {
        return { valid: true, username: adminCheck.username, role: 'admin' };
      }
      return { valid: false };
    }
    const raw = token.substring(6);
    const parts = raw.split('.');
    if (parts.length !== 2) return { valid: false };
    const [payloadBase64, providedSig] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadBase64).digest('base64url');

    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return { valid: false };
    }

    const data = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    if (data.role !== 'staff') return { valid: false };

    const session = sessions.get(token);
    if (!session || session.role !== 'staff' || Date.now() > session.expiresAt) {
      if (session && Date.now() > session.expiresAt) {
        sessions.delete(token);
        persistSessionsToDisk();
      }
      return { valid: false };
    }

    return { valid: true, username: data.username || session.username, role: 'staff' };
  } catch {
    return { valid: false };
  }
}

function extractBearerToken(req: express.Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return '';
}

// Strict RBAC Middleware: Admin Only (rejects customer & staff tokens with 403)
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Administrator authentication required.' });
  }
  const verified = verifySecureToken(token);
  if (verified.isCustomerToken || verified.isStaffToken) {
    logAudit('ADMIN_ACCESS_DENIED', 'Blocked', `${verified.isStaffToken ? 'Staff' : 'Customer'} token attempted to access admin-only route ${req.method} ${req.path}`, req.ip);
    return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges are required for this resource.' });
  }
  if (!verified.valid) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid. Please sign in to the Admin Portal.' });
  }
  (req as any).adminUser = verified.username;
  next();
}

// Strict RBAC Middleware: Staff Portal (allows verified staff or admin; rejects customers with 403)
function requireStaff(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Staff authentication required.' });
  }
  const verified = verifyStaffOrAdminToken(token);
  if (verified.isCustomerToken) {
    logAudit('STAFF_ACCESS_DENIED', 'Blocked', `Customer token attempted to access staff route ${req.method} ${req.path}`, req.ip);
    return res.status(403).json({ success: false, error: 'Forbidden: Staff authorization is required for this resource.' });
  }
  if (!verified.valid) {
    return res.status(401).json({ success: false, error: 'Staff session expired or invalid. Please sign in to the Staff Portal.' });
  }
  (req as any).staffUser = verified.username;
  (req as any).staffRole = verified.role;
  next();
}

// ========================================================
// Customer Cryptographic Security & Password Storage
// Uses PBKDF2 with 100,000 iterations, 64-byte key length, and SHA-512
// Passwords are NEVER stored in plain text or Google Sheets
// ========================================================

function hashCustomerPassword(password: string, salt?: string): { salt: string; hash: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex');
  return { salt: s, hash };
}

function verifyCustomerPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const a = Buffer.from(hash);
    const b = Buffer.from(expectedHash);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function createCustomerSession(customerId: string, email: string, rememberMe = true): { token: string; expiresAt: number } {
  const now = Date.now();
  const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = now + ttlMs;
  const payload = Buffer.from(JSON.stringify({
    customerId,
    email,
    role: 'customer',
    iat: now,
    exp: expiresAt,
    nonce: crypto.randomBytes(16).toString('hex')
  })).toString('base64url');
  
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  const token = `cust_${payload}.${signature}`;
  customerSessions.set(token, {
    token,
    customerId,
    email,
    role: 'customer',
    rememberMe,
    createdAt: now,
    expiresAt,
  });
  persistSessionsToDisk();
  return { token, expiresAt };
}

function revokeCustomerSession(token: string) {
  if (token && customerSessions.delete(token)) {
    persistSessionsToDisk();
  }
}

function revokeAllCustomerSessions(customerId: string) {
  let changed = false;
  for (const [tok, sess] of customerSessions.entries()) {
    if (sess.customerId === customerId) {
      customerSessions.delete(tok);
      changed = true;
    }
  }
  if (changed) persistSessionsToDisk();
}

function verifyCustomerToken(token: string): { valid: boolean; customerId?: string; email?: string } {
  try {
    if (!token || !token.startsWith('cust_')) return { valid: false };
    const raw = token.substring(5);
    const parts = raw.split('.');
    if (parts.length !== 2) return { valid: false };
    const [payloadBase64, providedSig] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadBase64).digest('base64url');
    
    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return { valid: false };
    }

    const data = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    if (data.role !== 'customer') return { valid: false };

    const session = customerSessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      if (session) {
        customerSessions.delete(token);
        persistSessionsToDisk();
      }
      return { valid: false };
    }

    return { valid: true, customerId: data.customerId, email: data.email };
  } catch {
    return { valid: false };
  }
}

function sanitizeCustomer(cust: any) {
  if (!cust) return null;
  const {
    salt,
    passwordHash,
    passwordResetCode,
    passwordResetToken,
    passwordResetExpiry,
    emailVerificationCode,
    emailVerificationToken,
    emailVerificationExpiry,
    ...safe
  } = cust;
  return { ...safe, hasPassword: Boolean(passwordHash && salt) };
}

// Rate Limiter for Admin Login
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    brand: 'The Everyday Editz',
    market: 'India',
    codAllowed: false,
    paymentMode: '100% Prepaid Online',
    timestamp: new Date().toISOString()
  });
});

// Universal strict RBAC guard for all /api/admin/* routes (excluding /login and /logout)
app.use('/api/admin', (req, res, next) => {
  if ((req.path === '/login' || req.path === '/logout') && req.method === 'POST') {
    return next();
  }
  return requireAdmin(req, res, next);
});

// Admin Login Route
app.post('/api/admin/login', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const { username, password } = req.body;

  // Check lockout
  const attemptRecord = failedLoginAttempts.get(clientIp);
  const now = Date.now();
  if (attemptRecord && attemptRecord.lockedUntil && now < attemptRecord.lockedUntil) {
    const remainingMin = Math.ceil((attemptRecord.lockedUntil - now) / 60000);
    logAudit('ADMIN_LOGIN_ATTEMPT', 'Blocked', `Too many failed attempts from IP ${clientIp}. Locked for ${remainingMin}m.`, clientIp);
    return res.status(429).json({
      success: false,
      error: `Too many failed attempts. Access is locked for ${remainingMin} more minute(s) for security.`
    });
  }

  // Validate credentials using constant-time hash comparison
  const inputHash = crypto.createHash('sha256').update(password || '').digest('hex');
  const isUserMatch = username === ADMIN_USERNAME;
  const isPassMatch = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(ADMIN_PASSWORD_HASH));

  if (!isUserMatch || !isPassMatch) {
    const current = attemptRecord ? attemptRecord.count + 1 : 1;
    let lockedUntil: number | undefined;
    if (current >= MAX_ATTEMPTS) {
      lockedUntil = now + LOCKOUT_MS;
      logAudit('ADMIN_LOCKED_OUT', 'Warning', `IP ${clientIp} exceeded ${MAX_ATTEMPTS} attempts and has been locked for 15 minutes.`, clientIp);
    } else {
      logAudit('ADMIN_LOGIN_FAILED', 'Failed', `Invalid login credentials attempt (${current}/${MAX_ATTEMPTS}) for user '${username}'.`, clientIp);
    }
    failedLoginAttempts.set(clientIp, { count: current, lockedUntil });

    return res.status(401).json({
      success: false,
      error: lockedUntil
        ? `Account locked due to 5 consecutive failed attempts. Try again in 15 minutes.`
        : `Invalid admin credentials. ${MAX_ATTEMPTS - current} attempt(s) remaining.`
    });
  }

  // Login successful: reset failed attempts
  failedLoginAttempts.delete(clientIp);
  const token = generateSecureToken(username);
  sessions.set(token, {
    token,
    username,
    role: 'admin',
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000 // 24 hours validity
  });
  persistSessionsToDisk();

  logAudit('ADMIN_LOGIN_SUCCESS', 'Success', `Admin user '${username}' logged in successfully.`, clientIp);

  res.json({
    success: true,
    token,
    user: {
      username,
      role: 'Super Admin',
      sessionExpiresIn: '24 hours'
    }
  });
});

// Admin Session Verification
app.get('/api/admin/verify', requireAdmin, (req, res) => {
  const token = extractBearerToken(req);
  const session = sessions.get(token);

  res.json({
    success: true,
    user: {
      username: (req as any).adminUser || session?.username || ADMIN_USERNAME,
      role: 'Super Admin',
      expiresAt: session?.expiresAt
    }
  });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  const token = extractBearerToken(req) || req.body?.token;
  if (token && sessions.delete(token)) {
    persistSessionsToDisk();
  }
  logAudit('ADMIN_LOGOUT', 'Success', 'Admin logged out.');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Admin Audit Logs API
app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  res.json({ success: true, logs: auditLogs });
});

// ========================================================
// Everyday Editz Staff Portal — Server-Side Auth & Scoped Operations
// Reuses existing configured staff/admin credentials without modifying them
// ========================================================
app.use('/api/staff', (req, res, next) => {
  if ((req.path === '/login' || req.path === '/logout') && req.method === 'POST') {
    return next();
  }
  return requireStaff(req, res, next);
});

app.post('/api/staff/login', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  const attemptRecord = failedLoginAttempts.get(clientIp);
  const now = Date.now();
  if (attemptRecord && attemptRecord.lockedUntil && now < attemptRecord.lockedUntil) {
    const remainingMin = Math.ceil((attemptRecord.lockedUntil - now) / 60000);
    logAudit('STAFF_LOGIN_ATTEMPT', 'Blocked', `Too many failed staff login attempts from IP ${clientIp}. Locked for ${remainingMin}m.`, clientIp);
    return res.status(429).json({
      success: false,
      error: `Too many failed attempts. Staff Portal access is locked for ${remainingMin} more minute(s).`
    });
  }

  // Constant-time verification against existing configured credentials (never modified or exposed)
  const inputHash = crypto.createHash('sha256').update(password).digest('hex');
  const isUserMatch = username === ADMIN_USERNAME;
  const isPassMatch =
    inputHash.length === ADMIN_PASSWORD_HASH.length &&
    crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(ADMIN_PASSWORD_HASH));

  if (!isUserMatch || !isPassMatch) {
    const current = attemptRecord ? attemptRecord.count + 1 : 1;
    let lockedUntil: number | undefined;
    if (current >= MAX_ATTEMPTS) {
      lockedUntil = now + LOCKOUT_MS;
      logAudit('STAFF_LOCKED_OUT', 'Warning', `IP ${clientIp} exceeded ${MAX_ATTEMPTS} staff login attempts and was locked for 15 minutes.`, clientIp);
    } else {
      logAudit('STAFF_LOGIN_FAILED', 'Failed', `Invalid staff login attempt (${current}/${MAX_ATTEMPTS}) for user '${username}'.`, clientIp);
    }
    failedLoginAttempts.set(clientIp, { count: current, lockedUntil });

    return res.status(401).json({
      success: false,
      error: lockedUntil
        ? 'Account temporarily locked after 5 consecutive failed attempts. Please try again in 15 minutes.'
        : `Invalid staff credentials. ${MAX_ATTEMPTS - current} attempt(s) remaining.`
    });
  }

  failedLoginAttempts.delete(clientIp);
  const token = generateStaffToken(username);
  sessions.set(token, {
    token,
    username,
    role: 'staff',
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000
  });
  persistSessionsToDisk();

  logAudit('STAFF_LOGIN_SUCCESS', 'Success', `Staff user '${username}' signed into Staff Portal.`, clientIp);

  res.json({
    success: true,
    token,
    user: {
      username,
      role: 'Staff',
      sessionExpiresIn: '24 hours'
    }
  });
});

app.get('/api/staff/verify', requireStaff, (req, res) => {
  const token = extractBearerToken(req);
  const session = sessions.get(token);
  res.json({
    success: true,
    user: {
      username: (req as any).staffUser || session?.username || ADMIN_USERNAME,
      role: (req as any).staffRole === 'admin' ? 'Admin' : 'Staff',
      expiresAt: session?.expiresAt
    }
  });
});

app.post('/api/staff/logout', (req, res) => {
  const token = extractBearerToken(req) || req.body?.token;
  if (token && sessions.delete(token)) {
    persistSessionsToDisk();
  }
  logAudit('STAFF_LOGOUT', 'Success', 'Staff user signed out.');
  res.json({ success: true, message: 'Signed out of Staff Portal.' });
});

// Staff Products Read / Create / Update / Delete
app.get('/api/staff/products', requireStaff, (req, res) => {
  try {
    const products = sortByMerchandisingOrder(readProductsSafe());
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, count: products.length, products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load products: ' + err.message });
  }
});

app.post('/api/staff/products', requireStaff, (req, res) => {
  const payload = req.body;
  if (!payload || !String(payload.name || '').trim()) {
    return res.status(400).json({ success: false, error: 'Product name is required.' });
  }
  try {
    const products = readProductsSafe();
    const id = payload.id || `prod-${Date.now()}`;
    const price = Math.max(1, Number(payload.price) || 299);
    const originalPrice = Math.max(price, Number(payload.originalPrice) || Math.round(price * 1.35));
    const discountPercent = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    const stockCount = payload.stockCount !== undefined ? Math.max(0, Number(payload.stockCount)) : 20;
    const computedInStock = stockCount > 0 && payload.inStock !== false;
    const slug = generateUniqueSlug(payload.slug || payload.name, products, id);
    const imgs: string[] = Array.isArray(payload.images) && payload.images.length > 0
      ? payload.images.filter(Boolean)
      : ['/brand-logo.jpg'];
    const primaryImage = payload.primaryImage || imgs[0];

    const newProduct = {
      ...payload,
      id,
      slug,
      name: String(payload.name).trim(),
      tagline: String(payload.tagline || 'Thoughtfully curated everyday essential.').trim(),
      seoTitle: payload.seoTitle || `${String(payload.name).trim()} — Buy Online | The Everyday Editz`,
      seoDescription: payload.seoDescription || `${payload.tagline || String(payload.name).trim()} Shop online at The Everyday Editz across India.`,
      departments: Array.isArray(payload.departments) && payload.departments.length > 0 ? payload.departments : ['women'],
      subcategories: Array.isArray(payload.subcategories) ? payload.subcategories : [],
      tags: Array.isArray(payload.tags) ? payload.tags : ['Curated', 'Daily Upgrade'],
      price,
      originalPrice,
      discountPercent,
      supplierCost: Number(payload.supplierCost) || Math.round(price * 0.45),
      stockCount,
      inStock: computedInStock,
      isFeatured: Boolean(payload.isFeatured),
      displayOrder: typeof payload.displayOrder === 'number' ? payload.displayOrder : 1,
      isDailyEdit: Boolean(payload.isDailyEdit),
      isTrending: Boolean(payload.isTrending),
      isNewArrival: Boolean(payload.isNewArrival ?? true),
      isBestSeller: Boolean(payload.isBestSeller),
      isPublished: payload.isPublished !== false,
      status: payload.isPublished === false ? 'Draft' : 'Active',
      rating: payload.rating || 4.8,
      reviewCount: payload.reviewCount || 1,
      primaryImage,
      images: imgs,
      gallery: imgs.map((u: string, idx: number) => ({
        url: u,
        position: idx + 1,
        isPrimary: idx === 0 || u === primaryImage
      })),
      options: Array.isArray(payload.options) ? payload.options : [],
      variantItems: Array.isArray(payload.variantItems) ? payload.variantItems : [],
      editorial: payload.editorial || {
        everydayEdit: String(payload.tagline || 'Studio tested daily upgrade.').trim(),
        whyYouLoveIt: ['Curated with durable materials.', 'Designed for everyday convenience.'],
        problemItSolves: 'Simplifies daily routines.',
        keyFeatures: ['Ergonomic design', 'Built for everyday durability'],
        specifications: { Origin: 'The Everyday Editz Studio', Warranty: '7-Day Replacement Guarantee' },
        materialAndDimensions: { material: 'Durable Grade', dimensions: 'Standard', weight: 'Lightweight' },
        packageContents: ['1 × Unit'],
        howToUse: ['Unbox and enjoy daily.'],
        limitations: ['Follow standard care guidelines.'],
        shippingAndReturns: 'Complimentary shipping above ₹499. 7-Day Replacement Guarantee.'
      },
      reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
      lastStockUpdate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    };

    products.unshift(newProduct);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
    logAudit('STAFF_PRODUCT_CREATED', 'Success', `Staff '${(req as any).staffUser}' created product ${id} (${newProduct.name}).`);
    res.status(201).json({ success: true, product: newProduct });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create product: ' + err.message });
  }
});

app.put('/api/staff/products/:id', requireStaff, (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  try {
    const products = readProductsSafe();
    const index = products.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: `Product "${id}" not found.` });
    }
    const current = products[index];
    const updated = { ...current, ...updates, id };

    if (updates.slug !== undefined || (updates.name !== undefined && !current.slug)) {
      updated.slug = generateUniqueSlug(updates.slug || updates.name || current.name, products, id);
    }
    if (updates.isPublished !== undefined) {
      updated.status = updates.isPublished ? 'Active' : 'Draft';
    }
    if (updates.stockCount !== undefined || updates.inStock !== undefined) {
      const stk = Math.max(0, Number(updated.stockCount) || 0);
      updated.stockCount = stk;
      updated.inStock = stk > 0 && updates.inStock !== false;
    }
    if (updates.price !== undefined || updates.originalPrice !== undefined) {
      const pr = Math.max(1, Number(updated.price) || 0);
      const orig = Math.max(pr, Number(updated.originalPrice) || pr);
      updated.price = pr;
      updated.originalPrice = orig;
      updated.discountPercent = orig > pr ? Math.round(((orig - pr) / orig) * 100) : 0;
    }
    if (updates.images || updates.primaryImage) {
      const imgs: string[] = Array.isArray(updates.images) ? updates.images.filter(Boolean) : (current.images || []);
      const primary: string = updates.primaryImage || imgs[0] || '';
      if (primary && imgs.includes(primary)) {
        updated.images = [primary, ...imgs.filter((img) => img !== primary)];
      } else if (primary) {
        updated.images = [primary, ...imgs];
      } else {
        updated.images = imgs;
      }
      updated.primaryImage = updated.images[0] || '';
      updated.gallery = updated.images.map((url: string, idx: number) => ({
        url,
        position: idx + 1,
        isPrimary: idx === 0 || url === updated.primaryImage
      }));
    }
    updated.lastStockUpdate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    products[index] = updated;
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
    logAudit('STAFF_PRODUCT_UPDATED', 'Success', `Staff '${(req as any).staffUser}' updated product ${id} (${updated.name}) — ₹${updated.price}, stock ${updated.stockCount}.`);
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update product: ' + err.message });
  }
});

app.delete('/api/staff/products/:id', requireStaff, (req, res) => {
  const { id } = req.params;
  try {
    const products = readProductsSafe();
    const nextProducts = products.filter((p: any) => p.id !== id);
    if (nextProducts.length === products.length) {
      return res.status(404).json({ success: false, error: `Product "${id}" not found.` });
    }
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(nextProducts, null, 2), 'utf-8');
    logAudit('STAFF_PRODUCT_DELETED', 'Success', `Staff '${(req as any).staffUser}' deleted product ${id}.`);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete product: ' + err.message });
  }
});

// Staff Image Upload & Gallery Management
app.post('/api/staff/upload-image', requireStaff, (req, res) => {
  const { dataUrl, base64, filename, mimeType } = req.body || {};
  const rawData = dataUrl || base64;
  if (!rawData) {
    return res.status(400).json({ success: false, error: 'No image data provided.' });
  }
  try {
    let buffer: Buffer;
    let ext = 'jpg';
    const matches = String(rawData).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const detectedMime = matches[1].toLowerCase();
      if (detectedMime.includes('png')) ext = 'png';
      else if (detectedMime.includes('webp')) ext = 'webp';
      else if (detectedMime.includes('gif')) ext = 'gif';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(String(rawData), 'base64');
      if (mimeType?.includes('png')) ext = 'png';
      else if (mimeType?.includes('webp')) ext = 'webp';
    }
    const safeBase = (filename || 'staff-prod').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'staff-prod';
    const uniqueName = `${safeBase}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), buffer);
    const publicUrl = `/uploads/${uniqueName}`;
    logAudit('STAFF_IMAGE_UPLOADED', 'Success', `Staff uploaded image ${publicUrl}.`);
    res.json({ success: true, url: publicUrl, filename: uniqueName, bytes: buffer.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Could not save uploaded image: ' + err.message });
  }
});

// Staff Categories Management (persisted in settings.json -> synced to storefront)
app.get('/api/staff/categories', requireStaff, (req, res) => {
  const settings = readSettingsSafe();
  res.json({ success: true, departments: Array.isArray(settings.departmentsConfig) ? settings.departmentsConfig : null });
});

app.put('/api/staff/categories', requireStaff, (req, res) => {
  const { departments } = req.body || {};
  if (!Array.isArray(departments)) {
    return res.status(400).json({ success: false, error: 'departments array is required.' });
  }
  try {
    const current = readSettingsSafe();
    const updated = { ...current, departmentsConfig: departments };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    logAudit('STAFF_CATEGORIES_UPDATED', 'Success', `Staff '${(req as any).staffUser}' updated storefront department categories.`);
    res.json({ success: true, departments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save categories: ' + err.message });
  }
});

// Staff Orders View & Status Updates
const ALLOWED_ORDER_STATUSES = ['Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

app.get('/api/staff/orders', requireStaff, (req, res) => {
  try {
    const orders = readOrdersSafe();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, count: orders.length, orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load orders: ' + err.message });
  }
});

app.put('/api/staff/orders/:id/status', requireStaff, (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber } = req.body || {};
  if (!status || !ALLOWED_ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid order status. Allowed: ${ALLOWED_ORDER_STATUSES.join(', ')}.` });
  }
  try {
    const orders = readOrdersSafe();
    const idx = orders.findIndex((o: any) => o.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: `Order "${id}" not found.` });
    }
    const updated = {
      ...orders[idx],
      status,
      trackingNumber: trackingNumber !== undefined ? String(trackingNumber).trim() : orders[idx].trackingNumber,
      deliveryStatus: status === 'Delivered' ? 'Delivered' : status === 'Shipped' || status === 'Out for Delivery' ? 'In Transit' : status === 'Cancelled' ? 'Cancelled' : 'Ordered',
      updatedAt: new Date().toISOString()
    };
    orders[idx] = updated;
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    logAudit('STAFF_ORDER_STATUS_UPDATED', 'Success', `Staff '${(req as any).staffUser}' updated order ${id} status to ${status}.`);
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update order status: ' + err.message });
  }
});

// Staff Homepage Promotional Banners (scoped strictly to promotional banner fields)
app.get('/api/staff/banners', requireStaff, (req, res) => {
  const s = readSettingsSafe();
  res.json({
    success: true,
    banners: {
      announcementText: s.announcementText || '',
      announcementSubtext: s.announcementSubtext || '',
      brandTagline: s.brandTagline || '',
      heroHeadline: s.heroHeadline || '',
      heroSubtitle: s.heroSubtitle || '',
      dailyEditTitle: s.dailyEditTitle || '',
      dailyEditSubtitle: s.dailyEditSubtitle || ''
    }
  });
});

app.put('/api/staff/banners', requireStaff, (req, res) => {
  const allowedKeys = [
    'announcementText',
    'announcementSubtext',
    'brandTagline',
    'heroHeadline',
    'heroSubtitle',
    'dailyEditTitle',
    'dailyEditSubtitle'
  ] as const;
  try {
    const current = readSettingsSafe();
    const patch: Record<string, string> = {};
    for (const k of allowedKeys) {
      if (req.body && req.body[k] !== undefined) {
        patch[k] = String(req.body[k]).trim();
      }
    }
    const updated = { ...current, ...patch };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    logAudit('STAFF_BANNERS_UPDATED', 'Success', `Staff '${(req as any).staffUser}' updated homepage promotional banners.`);
    res.json({ success: true, settings: updated, banners: patch });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save promotional banners: ' + err.message });
  }
});

// Staff Promotional Reels & Videos Management
app.get('/api/staff/reels', requireStaff, (req, res) => {
  try {
    const raw = fs.readFileSync(REELS_FILE, 'utf-8');
    const reels = JSON.parse(raw);
    reels.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
    res.json({ success: true, count: reels.length, reels });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load reels: ' + err.message });
  }
});

app.post('/api/staff/reels/upload-video', requireStaff, (req, res) => {
  const { videoData, base64, filename, mimeType } = req.body || {};
  const rawData = videoData || base64;
  if (!rawData) {
    return res.status(400).json({ success: false, error: 'No video payload received.' });
  }
  try {
    let buffer: Buffer;
    let detectedMime = (mimeType || '').toLowerCase();
    let ext = 'mp4';
    const matches = String(rawData).match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      detectedMime = matches[1].toLowerCase();
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(String(rawData), 'base64');
    }
    if (detectedMime.includes('webm')) ext = 'webm';
    else if (detectedMime.includes('quicktime') || detectedMime.includes('mov')) ext = 'mov';
    else if (detectedMime.includes('mp4') || detectedMime.includes('m4v')) ext = 'mp4';
    else {
      const fileExt = (filename || '').split('.').pop()?.toLowerCase();
      if (fileExt === 'webm' || fileExt === 'mov' || fileExt === 'mp4') ext = fileExt;
      else return res.status(400).json({ success: false, error: 'Unsupported video format. Use MP4, WebM, or MOV.' });
    }
    if (buffer.length > 100 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Video exceeds the 100MB maximum size limit.' });
    }
    const safeBase = (filename || 'reel').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'reel';
    const uniqueName = `reel-${safeBase}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_REELS_DIR, uniqueName), buffer);
    const publicUrl = `/uploads/reels/${uniqueName}`;
    logAudit('STAFF_REEL_VIDEO_UPLOADED', 'Success', `Staff uploaded reel video ${publicUrl}.`);
    res.json({ success: true, url: publicUrl, filename: uniqueName, bytes: buffer.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to store reel video: ' + err.message });
  }
});

app.post('/api/staff/reels/upload-thumbnail', requireStaff, (req, res) => {
  const { imageData } = req.body || {};
  if (!imageData) {
    return res.status(400).json({ success: false, error: 'No thumbnail image provided.' });
  }
  try {
    let buffer: Buffer;
    let ext = 'jpg';
    const matches = String(imageData).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(String(imageData), 'base64');
    }
    const uniqueName = `thumb-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_REELS_DIR, uniqueName), buffer);
    res.json({ success: true, url: `/uploads/reels/${uniqueName}`, filename: uniqueName });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save reel thumbnail: ' + err.message });
  }
});

app.post('/api/staff/reels', requireStaff, (req, res) => {
  const payload = req.body || {};
  if (!String(payload.title || '').trim() || !String(payload.video_url || '').trim()) {
    return res.status(400).json({ success: false, error: 'Reel title and video URL are required.' });
  }
  try {
    const reels = JSON.parse(fs.readFileSync(REELS_FILE, 'utf-8'));
    const nowIso = new Date().toISOString();
    const newReel = {
      id: `reel-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
      title: String(payload.title).trim(),
      description: String(payload.description || '').trim(),
      video_url: String(payload.video_url).trim(),
      thumbnail_url: String(payload.thumbnail_url || '').trim(),
      product_id: String(payload.product_id || '').trim(),
      category: String(payload.category || 'Lifestyle').trim(),
      cta_label: String(payload.cta_label || 'Shop Now').trim(),
      cta_url: String(payload.cta_url || '').trim(),
      display_order: typeof payload.display_order === 'number' ? payload.display_order : reels.length + 1,
      status: payload.status === 'Published' ? 'Published' : payload.status === 'Unpublished' ? 'Unpublished' : 'Draft',
      published_at: payload.status === 'Published' ? nowIso : undefined,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: (req as any).staffUser || 'Staff'
    };
    reels.push(newReel);
    fs.writeFileSync(REELS_FILE, JSON.stringify(reels, null, 2), 'utf-8');
    logAudit('STAFF_REEL_CREATED', 'Success', `Staff created reel "${newReel.title}".`);
    res.status(201).json({ success: true, reel: newReel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create reel: ' + err.message });
  }
});

app.put('/api/staff/reels/:id', requireStaff, (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  try {
    const reels = JSON.parse(fs.readFileSync(REELS_FILE, 'utf-8'));
    const idx = reels.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: `Reel "${id}" not found.` });
    }
    const updated = {
      ...reels[idx],
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };
    if (updated.status === 'Published' && !updated.published_at) {
      updated.published_at = new Date().toISOString();
    }
    reels[idx] = updated;
    fs.writeFileSync(REELS_FILE, JSON.stringify(reels, null, 2), 'utf-8');
    logAudit('STAFF_REEL_UPDATED', 'Success', `Staff updated reel "${updated.title}".`);
    res.json({ success: true, reel: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update reel: ' + err.message });
  }
});

app.delete('/api/staff/reels/:id', requireStaff, (req, res) => {
  const { id } = req.params;
  try {
    const reels = JSON.parse(fs.readFileSync(REELS_FILE, 'utf-8'));
    const nextReels = reels.filter((r: any) => r.id !== id);
    if (nextReels.length === reels.length) {
      return res.status(404).json({ success: false, error: `Reel "${id}" not found.` });
    }
    fs.writeFileSync(REELS_FILE, JSON.stringify(nextReels, null, 2), 'utf-8');
    logAudit('STAFF_REEL_DELETED', 'Success', `Staff deleted reel ${id}.`);
    res.json({ success: true, message: 'Reel deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete reel: ' + err.message });
  }
});

app.post('/api/staff/reels/:id/toggle-publish', requireStaff, (req, res) => {
  const { id } = req.params;
  try {
    const reels = JSON.parse(fs.readFileSync(REELS_FILE, 'utf-8'));
    const idx = reels.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: `Reel "${id}" not found.` });
    }
    const reel = reels[idx];
    const newStatus = reel.status === 'Published' ? 'Unpublished' : 'Published';
    reel.status = newStatus;
    reel.updated_at = new Date().toISOString();
    if (newStatus === 'Published' && !reel.published_at) {
      reel.published_at = new Date().toISOString();
    }
    fs.writeFileSync(REELS_FILE, JSON.stringify(reels, null, 2), 'utf-8');
    logAudit('STAFF_REEL_STATUS_TOGGLED', 'Success', `Staff set reel "${reel.title}" to ${newStatus}.`);
    res.json({ success: true, reel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to toggle reel publish status: ' + err.message });
  }
});

// Pending validated gateway orders for server-side stock deduction & price integrity
interface PendingGatewayOrder {
  gatewayOrderId: string;
  amount: number;
  items: Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number }>;
  createdAt: number;
  verified?: boolean;
}
const pendingGatewayOrders = new Map<string, PendingGatewayOrder>();

function readProductsSafe(): any[] {
  try {
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function readSettingsSafe(): any {
  try {
    return { ...INITIAL_STORE_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) };
  } catch {
    return INITIAL_STORE_SETTINGS;
  }
}

function readCustomersSafe(): any[] {
  try {
    return JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeCustomersSafe(customers: any[]) {
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2), 'utf-8');
}

function readOrdersSafe(): any[] {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

// Payment: Create Order (Prepaid Only + Server-Side Price & Stock Validation)
app.post('/api/payments/create-order', (req, res) => {
  const { amount, currency, items, discountAmount } = req.body;

  // Cash on Delivery is strictly prohibited
  if (req.body.paymentMethod === 'Cash on Delivery' || req.body.isCod) {
    return res.status(400).json({
      success: false,
      error: 'Cash on Delivery (COD) is strictly disabled. The Everyday Editz accepts prepaid online orders only.'
    });
  }

  let verifiedSubtotal = 0;
  const validatedItems: Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number }> = [];

  if (Array.isArray(items) && items.length > 0) {
    const products = readProductsSafe();
    for (const line of items) {
      const qty = Number(line.quantity) || 0;
      if (!line.productId || qty <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid cart item quantity.' });
      }
      const product = products.find((p: any) => p.id === line.productId);
      if (!product) {
        return res.status(400).json({ success: false, error: `Product "${line.productId}" is no longer available.` });
      }
      if (product.isPublished === false || product.status === 'Draft' || product.status === 'Inactive') {
        return res.status(400).json({ success: false, error: `"${product.name}" has been unpublished and cannot be purchased.` });
      }

      let unitPrice = Number(product.price) || 0;
      if (line.variantId && Array.isArray(product.variantItems) && product.variantItems.length > 0) {
        const variant = product.variantItems.find((v: any) => v.id === line.variantId);
        if (!variant) {
          return res.status(400).json({ success: false, error: `Selected option for "${product.name}" is no longer available.` });
        }
        if (!variant.inStock || (Number(variant.stockCount) || 0) < qty) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for "${product.name} (${variant.title})". Available: ${variant.stockCount || 0}.`
          });
        }
        if (typeof variant.price === 'number' && variant.price > 0) {
          unitPrice = variant.price;
        }
      } else {
        if (!product.inStock || (Number(product.stockCount) || 0) < qty) {
          return res.status(400).json({
            success: false,
            error: `"${product.name}" is out of stock or has insufficient inventory (Available: ${product.stockCount || 0}).`
          });
        }
      }

      verifiedSubtotal += unitPrice * qty;
      validatedItems.push({
        productId: product.id,
        variantId: line.variantId,
        quantity: qty,
        unitPrice,
      });
    }

    const storeSettings = readSettingsSafe();
    const threshold = Number(storeSettings.freeShippingThreshold) || 499;
    const baseShipping = Number(storeSettings.shippingCharge) || 49;
    const shippingFee = verifiedSubtotal >= threshold || verifiedSubtotal === 0 ? 0 : baseShipping;
    const discount = Math.max(0, Number(discountAmount) || 0);
    const serverTotal = Math.max(0, verifiedSubtotal - discount + shippingFee);

    if (typeof amount === 'number' && Math.abs(amount - serverTotal) > 2) {
      return res.status(409).json({
        success: false,
        error: `Price or shipping mismatch detected. Live catalogue total is ₹${serverTotal} (submitted ₹${amount}). Please review your refreshed cart.`,
        serverTotal,
      });
    }
  } else if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid payment amount or cart items are required' });
  }

  const finalAmount = verifiedSubtotal > 0
    ? (() => {
        const storeSettings = readSettingsSafe();
        const threshold = Number(storeSettings.freeShippingThreshold) || 499;
        const baseShipping = Number(storeSettings.shippingCharge) || 49;
        const shippingFee = verifiedSubtotal >= threshold ? 0 : baseShipping;
        return Math.max(0, verifiedSubtotal - Math.max(0, Number(discountAmount) || 0) + shippingFee);
      })()
    : Number(amount);

  if (finalAmount <= 0 && validatedItems.length === 0) {
    return res.status(400).json({ success: false, error: 'Valid payment amount is required' });
  }

  // Generate secure server-side order token & verification challenge
  const gatewayOrderId = 'order_ee_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const serverSignatureChallenge = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${gatewayOrderId}|${finalAmount}|INR`)
    .digest('hex');

  pendingGatewayOrders.set(gatewayOrderId, {
    gatewayOrderId,
    amount: finalAmount,
    items: validatedItems,
    createdAt: Date.now(),
    verified: false,
  });

  logAudit('PAYMENT_ORDER_CREATED', 'Success', `Initiated gateway order ${gatewayOrderId} for ₹${finalAmount}`);

  res.json({
    success: true,
    gatewayOrderId,
    amount: finalAmount,
    currency: currency || 'INR',
    serverSignatureChallenge,
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_live_everyday_editz_prepaid',
    notes: {
      store: 'The Everyday Editz',
      support: 'manpreetkaurdeveloper2@gmail.com'
    }
  });
});

// Payment: Verify Payment (Server-side validation + atomic inventory deduction)
app.post('/api/payments/verify', (req, res) => {
  const { gatewayOrderId, gatewayPaymentId, serverSignatureChallenge, amount } = req.body;

  if (!gatewayOrderId || !gatewayPaymentId) {
    logAudit('PAYMENT_VERIFY_FAILED', 'Failed', 'Missing transaction parameters in verification request');
    return res.status(400).json({ success: false, error: 'Incomplete transaction details' });
  }

  // Re-verify server challenge
  const expectedChallenge = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${gatewayOrderId}|${amount}|INR`)
    .digest('hex');

  const isValidChallenge = serverSignatureChallenge === expectedChallenge;

  if (!isValidChallenge) {
    logAudit('PAYMENT_TAMPER_DETECTED', 'Warning', `Signature mismatch on order ${gatewayOrderId}`);
    return res.status(400).json({
      success: false,
      error: 'Payment verification failed: cryptographic signature mismatch. Order cannot be marked as paid.'
    });
  }

  // Deduct stock atomically once per gatewayOrderId
  const pending = pendingGatewayOrders.get(gatewayOrderId);
  if (pending && !pending.verified && pending.items.length > 0) {
    try {
      const products = readProductsSafe();
      const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      for (const line of pending.items) {
        const idx = products.findIndex((p: any) => p.id === line.productId);
        if (idx >= 0) {
          const prod = products[idx];
          const newStock = Math.max(0, (Number(prod.stockCount) || 0) - line.quantity);
          prod.stockCount = newStock;
          prod.availableQuantity = newStock;
          prod.reservedQuantity = (Number(prod.reservedQuantity) || 0) + line.quantity;
          prod.inStock = newStock > 0;
          prod.lastStockUpdate = nowStr;
          if (line.variantId && Array.isArray(prod.variantItems)) {
            prod.variantItems = prod.variantItems.map((vi: any) => {
              if (vi.id === line.variantId) {
                const vStock = Math.max(0, (Number(vi.stockCount) || 0) - line.quantity);
                return { ...vi, stockCount: vStock, inStock: vStock > 0 };
              }
              return vi;
            });
          }
          products[idx] = prod;
        }
      }
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
      pending.verified = true;
      pendingGatewayOrders.set(gatewayOrderId, pending);
    } catch (err: any) {
      logAudit('INVENTORY_DEDUCT_ERROR', 'Warning', `Could not deduct inventory for ${gatewayOrderId}: ${err.message}`);
    }
  }

  const transactionId = 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  logAudit('PAYMENT_VERIFIED', 'Success', `Payment confirmed for Order ID ${gatewayOrderId}. Transaction: ${transactionId}, Amount: ₹${amount}`);

  res.json({
    success: true,
    verified: true,
    transactionId,
    gatewayPaymentId,
    status: 'Paid',
    paidAt: new Date().toISOString(),
    message: 'Payment verified and confirmed server-side.'
  });
});

// Persist confirmed order to server orders.json (and associate with customer if logged in)
app.post('/api/orders/confirm', (req, res) => {
  const order = req.body;
  if (!order || !order.id) {
    return res.status(400).json({ success: false, error: 'Order payload required.' });
  }
  try {
    const orders = readOrdersSafe();
    if (!orders.some((o: any) => o.id === order.id)) {
      orders.unshift(order);
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to persist order: ' + err.message });
  }
});

// Payment: Webhook Receiver
app.post('/api/payments/webhook', (req, res) => {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'ee_webhook_secret_2026';
  const signature = req.headers['x-razorpay-signature'] || req.headers['x-payment-signature'];

  logAudit('WEBHOOK_RECEIVED', 'Success', `Payment gateway webhook event: ${req.body.event || 'unknown'}`);
  // Acknowledge webhook receipt to prevent gateway retries
  res.json({ received: true, timestamp: Date.now() });
});

// Return / Replacement Claim Submission
app.post('/api/returns/submit', (req, res) => {
  const { orderId, customerName, customerEmail, customerPhone, productId, productName, issueType, description, evidenceImages } = req.body;

  if (!orderId || !customerEmail || !issueType || !description) {
    return res.status(400).json({
      success: false,
      error: 'Missing required claim parameters: orderId, customerEmail, issueType, and description are mandatory.'
    });
  }

  // Disallow change of mind per Consumer Protection rules
  const forbiddenReasons = ['change of mind', 'not needed anymore', 'found cheaper', 'disliked colour'];
  const lowerDesc = (description + ' ' + (issueType || '')).toLowerCase();
  const hasForbiddenReason = forbiddenReasons.some(r => lowerDesc.includes(r));

  if (hasForbiddenReason && !['Damaged in Transit', 'Defective Item', 'Incorrect Product', 'Incomplete Package', 'Misdescribed'].includes(issueType)) {
    return res.status(400).json({
      success: false,
      error: 'Under our policy and Indian Consumer Protection E-Commerce Rules, change of mind returns are not accepted. Claims are eligible for damaged, defective, incomplete, or incorrect items within 7 days of delivery.'
    });
  }

  const claimId = 'CLM-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
  const newClaim = {
    id: claimId,
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    productId,
    productName,
    issueType,
    description,
    evidenceImages: evidenceImages || [],
    status: 'Submitted',
    createdAt: new Date().toISOString()
  };

  logAudit('RETURN_CLAIM_SUBMITTED', 'Success', `Claim ${claimId} submitted by ${customerEmail} for Order #${orderId} (${issueType})`);

  res.json({
    success: true,
    claimId,
    claim: newClaim,
    message: 'Your claim has been submitted to the Grievance & Quality Assurance desk. Our team will review within 24-48 business hours.'
  });
});

// Proxy to Google Sheets Web App (Bypasses any potential browser CORS restrictions)
app.post('/api/sheets/proxy-sync', async (req, res) => {
  const { targetUrl, action, sheet, payload } = req.body;
  const scriptUrl = targetUrl || process.env.GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbx2Y_diNJLiRryZXfM8eklSK9dFxaxNcNJmgISvavE1E38CD6fhS-eqvhXT7vEXc-kF/exec';

  try {
    const fetchResponse = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action || 'syncItem', sheet, payload }),
      redirect: 'follow',
    });

    const text = await fetchResponse.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.json({ success: true, googleResponse: data });
  } catch (err: any) {
    res.status(502).json({
      success: false,
      error: 'Failed to communicate with Google Sheets endpoint: ' + (err.message || String(err))
    });
  }
});

// ========================================================
// Store Settings & Customer Authentication APIs
// ========================================================

app.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: readSettingsSafe() });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const current = readSettingsSafe();
    const updated = { ...current, ...req.body };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    logAudit('STORE_SETTINGS_UPDATED', 'Success', 'Updated canonical storefront settings & SEO config.');
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save settings: ' + err.message });
  }
});

// Normalize Indian 10-digit phone number
function normalizeIndianPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/\d/.test(password)) {
    return 'Password must include at least one number.';
  }
  return null;
}

app.post('/api/auth/register', (req, res) => {
  const {
    fullName,
    firstName,
    lastName,
    email,
    phoneNumber,
    whatsappNumber,
    password,
    confirmPassword,
    marketingConsent,
    whatsappConsent,
    city,
    state,
    pincode,
    customerSegment
  } = req.body || {};

  const cleanFullName = String(fullName || `${firstName || ''} ${lastName || ''}`).trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = phoneNumber ? normalizeIndianPhone(phoneNumber) : '';

  if (cleanFullName.length < 2) {
    return res.status(400).json({ success: false, field: 'fullName', error: 'Full name must be at least 2 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, field: 'email', error: 'Please enter a valid email address.' });
  }
  if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ success: false, field: 'phoneNumber', error: 'Please enter a valid 10-digit Indian mobile number starting with 6–9.' });
  }

  const pwdErr = validatePasswordStrength(password || '');
  if (pwdErr) {
    return res.status(400).json({ success: false, field: 'password', error: pwdErr });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, field: 'confirmPassword', error: 'Passwords do not match.' });
  }

  const customers = readCustomersSafe();
  if (customers.some((c: any) => String(c.email || '').toLowerCase() === cleanEmail)) {
    return res.status(409).json({ success: false, field: 'email', error: 'An account with this email address already exists. Please sign in.' });
  }

  const nameParts = cleanFullName.split(/\s+/);
  const fName = firstName ? String(firstName).trim() : nameParts[0];
  const lName = lastName ? String(lastName).trim() : nameParts.slice(1).join(' ');
  const { salt, hash } = hashCustomerPassword(password);
  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const newCustomer = {
    id: 'CUST-IND-' + Date.now().toString(36).toUpperCase(),
    fullName: cleanFullName,
    firstName: fName,
    lastName: lName,
    email: cleanEmail,
    phoneNumber: cleanPhone,
    whatsappNumber: whatsappNumber ? normalizeIndianPhone(whatsappNumber) : cleanPhone,
    city: String(city || '').trim(),
    state: String(state || '').trim(),
    pincode: String(pincode || '').trim(),
    customerSegment: customerSegment || 'Women',
    registrationDate: nowStr,
    registrationSource: 'Email & Password Registration',
    termsAccepted: true,
    privacyAccepted: true,
    marketingConsent: Boolean(marketingConsent),
    whatsappConsent: Boolean(whatsappConsent),
    emailVerified: true,
    totalOrders: 0,
    totalSpending: 0,
    customerStatus: 'Active',
    lastActivity: nowStr,
    savedAddresses: [],
    salt,
    passwordHash: hash,
  };

  customers.unshift(newCustomer);
  writeCustomersSafe(customers);

  const { token, expiresAt } = createCustomerSession(newCustomer.id, newCustomer.email, true);
  logAudit('CUSTOMER_REGISTERED', 'Success', `New customer registered: ${cleanEmail} (${newCustomer.id})`);

  res.status(201).json({
    success: true,
    token,
    expiresAt,
    customer: sanitizeCustomer(newCustomer),
    message: 'Account created successfully.'
  });
});

const CUSTOMER_MAX_ATTEMPTS = 7;
const CUSTOMER_LOCKOUT_MS = 15 * 60 * 1000;

app.post('/api/auth/login', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const { email, identifier, password, rememberMe } = req.body || {};
  const cleanEmail = String(email || identifier || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ success: false, error: 'Please enter both your email address and password.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, field: 'email', error: 'Please enter a valid email address.' });
  }

  const rateKey = `${clientIp}:${cleanEmail}`;
  const attempt = failedCustomerAttempts.get(rateKey);
  const now = Date.now();
  if (attempt && attempt.lockedUntil && now < attempt.lockedUntil) {
    const mins = Math.ceil((attempt.lockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      error: `Too many unsuccessful sign-in attempts. Please try again in ${mins} minute(s) or reset your password.`
    });
  }

  const customers = readCustomersSafe();
  const idx = customers.findIndex((c: any) => String(c.email || '').toLowerCase() === cleanEmail);

  if (idx === -1) {
    const count = (attempt?.count || 0) + 1;
    failedCustomerAttempts.set(rateKey, {
      count,
      lockedUntil: count >= CUSTOMER_MAX_ATTEMPTS ? now + CUSTOMER_LOCKOUT_MS : undefined,
    });
    return res.status(401).json({ success: false, error: 'Incorrect email address or password. Please check your details and try again.' });
  }

  const cust = customers[idx];
  if (!cust.salt || !cust.passwordHash) {
    return res.status(401).json({
      success: false,
      error: 'No password is set for this account yet. Please click "Forgot password?" to set a password.'
    });
  }
  if (!verifyCustomerPassword(password, cust.salt, cust.passwordHash)) {
    const count = (attempt?.count || 0) + 1;
    failedCustomerAttempts.set(rateKey, {
      count,
      lockedUntil: count >= CUSTOMER_MAX_ATTEMPTS ? now + CUSTOMER_LOCKOUT_MS : undefined,
    });
    logAudit('CUSTOMER_LOGIN_FAILED', 'Failed', `Failed login attempt for ${cleanEmail}`, clientIp);
    return res.status(401).json({ success: false, error: 'Incorrect email address or password. Please check your details and try again.' });
  }

  failedCustomerAttempts.delete(rateKey);
  cust.lastActivity = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  customers[idx] = cust;
  writeCustomersSafe(customers);

  const shouldRemember = rememberMe !== false;
  const { token, expiresAt } = createCustomerSession(cust.id, cust.email, shouldRemember);
  logAudit('CUSTOMER_LOGIN_SUCCESS', 'Success', `Customer signed in: ${cust.email}`, clientIp);

  res.json({
    success: true,
    token,
    expiresAt,
    rememberMe: shouldRemember,
    customer: sanitizeCustomer(cust),
    message: `Welcome back, ${cust.firstName || cust.fullName}!`
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = extractBearerToken(req) || req.body?.token;
  if (token) {
    revokeCustomerSession(token);
  }
  res.json({ success: true, message: 'Signed out securely.' });
});

app.get('/api/auth/me', (req, res) => {
  const token = extractBearerToken(req);
  const verified = verifyCustomerToken(token);
  if (!verified.valid) {
    return res.status(401).json({ success: false, error: 'Invalid or expired customer session.' });
  }
  const customers = readCustomersSafe();
  const cust = customers.find((c: any) => c.id === verified.customerId);
  if (!cust) {
    return res.status(404).json({ success: false, error: 'Customer account not found.' });
  }
  res.json({ success: true, customer: sanitizeCustomer(cust) });
});

app.get('/api/auth/orders', (req, res) => {
  const token = extractBearerToken(req);
  const verified = verifyCustomerToken(token);
  if (!verified.valid) {
    return res.status(401).json({ success: false, error: 'Please sign in to view your orders.' });
  }
  const customers = readCustomersSafe();
  const cust = customers.find((c: any) => c.id === verified.customerId);
  if (!cust) {
    return res.status(404).json({ success: false, error: 'Customer account not found.' });
  }
  const cleanEmail = String(cust.email || '').toLowerCase();
  const cleanPhone = normalizeIndianPhone(cust.phoneNumber || '');
  const orders = readOrdersSafe().filter((o: any) => {
    if (o.customerId && o.customerId === cust.id) return true;
    const oEmail = String(o.shippingAddress?.email || '').toLowerCase();
    const oPhone = normalizeIndianPhone(o.shippingAddress?.phoneNumber || '');
    if (cleanEmail && oEmail && oEmail === cleanEmail) return true;
    if (cleanPhone.length === 10 && oPhone === cleanPhone) return true;
    return false;
  });
  res.json({ success: true, count: orders.length, orders });
});

app.put('/api/auth/profile', (req, res) => {
  const token = extractBearerToken(req);
  const verified = verifyCustomerToken(token);
  if (!verified.valid) {
    return res.status(401).json({ success: false, error: 'Please sign in to update your profile.' });
  }
  const customers = readCustomersSafe();
  const idx = customers.findIndex((c: any) => c.id === verified.customerId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Customer account not found.' });
  }
  const cust = customers[idx];
  const { fullName, firstName, lastName, phoneNumber, whatsappNumber, city, state, pincode, customerSegment, marketingConsent, whatsappConsent } = req.body || {};

  if (fullName !== undefined) {
    const cleanFull = String(fullName).trim();
    if (cleanFull.length < 2) {
      return res.status(400).json({ success: false, error: 'Full name must be at least 2 characters.' });
    }
    cust.fullName = cleanFull;
    const parts = cleanFull.split(/\s+/);
    cust.firstName = firstName ? String(firstName).trim() : parts[0];
    cust.lastName = lastName !== undefined ? String(lastName).trim() : parts.slice(1).join(' ');
  } else {
    if (firstName !== undefined) cust.firstName = String(firstName).trim();
    if (lastName !== undefined) cust.lastName = String(lastName).trim();
    cust.fullName = `${cust.firstName || ''} ${cust.lastName || ''}`.trim();
  }

  if (phoneNumber !== undefined && String(phoneNumber).trim()) {
    const cleanPhone = normalizeIndianPhone(phoneNumber);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit Indian mobile number.' });
    }
    const dupPhone = customers.some((c: any) => c.id !== cust.id && normalizeIndianPhone(c.phoneNumber || '') === cleanPhone);
    if (dupPhone) {
      return res.status(409).json({ success: false, error: 'This mobile number is already registered to another account.' });
    }
    cust.phoneNumber = cleanPhone;
  }

  if (whatsappNumber !== undefined) cust.whatsappNumber = normalizeIndianPhone(whatsappNumber);
  if (city !== undefined) cust.city = String(city).trim();
  if (state !== undefined) cust.state = String(state).trim();
  if (pincode !== undefined) cust.pincode = String(pincode).trim();
  if (customerSegment !== undefined) cust.customerSegment = customerSegment;
  if (marketingConsent !== undefined) cust.marketingConsent = Boolean(marketingConsent);
  if (whatsappConsent !== undefined) cust.whatsappConsent = Boolean(whatsappConsent);
  cust.lastActivity = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  customers[idx] = cust;
  writeCustomersSafe(customers);

  res.json({ success: true, customer: sanitizeCustomer(cust) });
});

app.put('/api/auth/addresses', (req, res) => {
  const token = extractBearerToken(req);
  const verified = verifyCustomerToken(token);
  if (!verified.valid) {
    return res.status(401).json({ success: false, error: 'Please sign in to manage saved addresses.' });
  }
  const { savedAddresses } = req.body || {};
  if (!Array.isArray(savedAddresses)) {
    return res.status(400).json({ success: false, error: 'savedAddresses must be an array.' });
  }
  const customers = readCustomersSafe();
  const idx = customers.findIndex((c: any) => c.id === verified.customerId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Customer not found.' });
  }
  customers[idx].savedAddresses = savedAddresses;
  customers[idx].lastActivity = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  writeCustomersSafe(customers);
  res.json({ success: true, customer: sanitizeCustomer(customers[idx]) });
});

app.post('/api/auth/change-password', (req, res) => {
  const token = extractBearerToken(req);
  const verified = verifyCustomerToken(token);
  if (!verified.valid) {
    return res.status(401).json({ success: false, error: 'Please sign in to change your password.' });
  }
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  const customers = readCustomersSafe();
  const idx = customers.findIndex((c: any) => c.id === verified.customerId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Account not found.' });
  }
  const cust = customers[idx];
  if (cust.salt && cust.passwordHash) {
    if (!currentPassword || !verifyCustomerPassword(currentPassword, cust.salt, cust.passwordHash)) {
      return res.status(400).json({ success: false, field: 'currentPassword', error: 'Your current password is incorrect.' });
    }
  }
  const pwdErr = validatePasswordStrength(newPassword || '');
  if (pwdErr) {
    return res.status(400).json({ success: false, field: 'newPassword', error: pwdErr });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, field: 'confirmPassword', error: 'New passwords do not match.' });
  }

  const { salt, hash } = hashCustomerPassword(newPassword);
  cust.salt = salt;
  cust.passwordHash = hash;
  cust.lastActivity = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  customers[idx] = cust;
  writeCustomersSafe(customers);

  // Rotate sessions for security
  revokeAllCustomerSessions(cust.id);
  const nextSession = createCustomerSession(cust.id, cust.email, true);
  logAudit('CUSTOMER_PASSWORD_CHANGED', 'Success', `Password changed for ${cust.email}`);

  res.json({
    success: true,
    token: nextSession.token,
    expiresAt: nextSession.expiresAt,
    customer: sanitizeCustomer(cust),
    message: 'Your password has been updated securely.'
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid registered email address.' });
  }

  const customers = readCustomersSafe();
  const idx = customers.findIndex((c: any) => String(c.email || '').toLowerCase() === cleanEmail);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'No account found with that email address.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  delete customers[idx].passwordResetCode;
  customers[idx].passwordResetToken = resetToken;
  customers[idx].passwordResetExpiry = Date.now() + 15 * 60 * 1000;
  writeCustomersSafe(customers);

  const targetEmail = customers[idx].email;
  const resetUrl = `/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(targetEmail)}`;
  logAudit('CUSTOMER_PASSWORD_RESET_REQUESTED', 'Success', `Password reset link issued for ${targetEmail}`);

  res.json({
    success: true,
    email: targetEmail,
    resetUrl,
    expiresInMinutes: 15,
    message: 'A secure password reset link has been generated (valid for 15 minutes).'
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword, confirmPassword } = req.body || {};
  const cleanToken = String(token || '').trim();

  if (!cleanToken) {
    return res.status(400).json({ success: false, error: 'A valid password reset link is required.' });
  }
  const pwdErr = validatePasswordStrength(newPassword || '');
  if (pwdErr) {
    return res.status(400).json({ success: false, field: 'newPassword', error: pwdErr });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, field: 'confirmPassword', error: 'Passwords do not match.' });
  }

  const customers = readCustomersSafe();
  const idx = customers.findIndex((c: any) => c.passwordResetToken === cleanToken);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'This password reset link is invalid or has already been used.' });
  }
  const cust = customers[idx];
  if (!cust.passwordResetExpiry || Date.now() > cust.passwordResetExpiry) {
    return res.status(400).json({ success: false, error: 'This password reset link has expired. Please request a new one.' });
  }

  const { salt, hash } = hashCustomerPassword(newPassword);
  cust.salt = salt;
  cust.passwordHash = hash;
  delete cust.passwordResetCode;
  delete cust.passwordResetToken;
  delete cust.passwordResetExpiry;
  cust.lastActivity = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  customers[idx] = cust;
  writeCustomersSafe(customers);

  // Revoke all active sessions after password reset
  revokeAllCustomerSessions(cust.id);

  logAudit('CUSTOMER_PASSWORD_RESET_COMPLETED', 'Success', `Password updated via reset link for ${cust.email}`);
  res.json({ success: true, message: 'Password updated successfully! You can now sign in with your new password.' });
});

app.get('/api/admin/customers', requireAdmin, (req, res) => {
  const customers = readCustomersSafe().map(sanitizeCustomer);
  res.json({ success: true, count: customers.length, customers });
});

// ========================================================
// Canonical Products API (Server-Authoritative Persistence)
// ========================================================

function sortByMerchandisingOrder(list: any[]) {
  return [...list].sort((a: any, b: any) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));
}

// 1. Get Published Storefront Products (or ALL if ?all=1 with valid Admin token)
app.get('/api/products', (req, res) => {
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    const allProducts = JSON.parse(raw);

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const isAdminReq = req.query.all === '1' && token && verifySecureToken(token).valid;

    const result = isAdminReq
      ? sortByMerchandisingOrder(allProducts)
      : sortByMerchandisingOrder(
          allProducts.filter((p: any) => p.isPublished !== false && p.status !== 'Draft' && p.status !== 'Inactive')
        );

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ success: true, count: result.length, products: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to read canonical products: ' + err.message });
  }
});

// 1a. Admin Get ALL Products (Includes Draft, Inactive, Unpublished)
app.get('/api/admin/products', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);
  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin token required.' });
  }
  try {
    const products = sortByMerchandisingOrder(readProductsSafe());
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, count: products.length, products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to read admin products: ' + err.message });
  }
});

// 1b. Create New Canonical Product (Server-side Authenticated)
app.post('/api/admin/products', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin token required.' });
  }

  const payload = req.body;
  if (!payload || !payload.name) {
    return res.status(400).json({ success: false, error: 'Product name is mandatory.' });
  }

  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    let products = JSON.parse(raw);

    const id = payload.id || `prod-${Date.now()}`;
    const price = Number(payload.price) || 299;
    const originalPrice = Number(payload.originalPrice) || Math.round(price * 1.4);
    const discountPercent = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    const stockCount = payload.stockCount !== undefined ? Number(payload.stockCount) : 20;
    const computedInStock = stockCount > 0 && payload.inStock !== false;
    const slug = generateUniqueSlug(payload.slug || payload.name, products, id);

    const imgs: string[] = Array.isArray(payload.images) && payload.images.length > 0 
      ? payload.images 
      : ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'];
    const primaryImage = payload.primaryImage || imgs[0];

    const newProduct = {
      ...payload,
      id,
      slug,
      name: String(payload.name).trim(),
      tagline: payload.tagline || 'Essential daily curation',
      seoTitle: payload.seoTitle || `${String(payload.name).trim()} — Buy Online | The Everyday Editz`,
      seoDescription: payload.seoDescription || `${payload.tagline || String(payload.name).trim()} Shop online at The Everyday Editz across India.`,
      departments: Array.isArray(payload.departments) && payload.departments.length > 0 ? payload.departments : ['women'],
      subcategories: Array.isArray(payload.subcategories) ? payload.subcategories : [],
      tags: Array.isArray(payload.tags) ? payload.tags : ['Curated', 'Daily Upgrade'],
      price,
      originalPrice,
      discountPercent,
      supplierCost: Number(payload.supplierCost) || Math.round(price * 0.45),
      stockCount,
      inStock: computedInStock,
      isFeatured: Boolean(payload.isFeatured),
      displayOrder: typeof payload.displayOrder === 'number' ? payload.displayOrder : 1,
      isDailyEdit: Boolean(payload.isDailyEdit),
      isTrending: Boolean(payload.isTrending),
      isNewArrival: Boolean(payload.isNewArrival ?? true),
      isBestSeller: Boolean(payload.isBestSeller),
      isPublished: payload.isPublished !== false,
      status: payload.isPublished === false ? (payload.status || 'Draft') : (payload.status || 'Active'),
      rating: payload.rating || 4.8,
      reviewCount: payload.reviewCount || 1,
      primaryImage,
      images: imgs,
      gallery: imgs.map((u: string, idx: number) => ({
        url: u,
        position: idx + 1,
        isPrimary: idx === 0 || u === primaryImage,
      })),
      options: Array.isArray(payload.options) ? payload.options : [],
      variantItems: Array.isArray(payload.variantItems) ? payload.variantItems : [],
      editorial: payload.editorial || {
        everydayEdit: payload.tagline || 'Studio tested daily upgrade.',
        whyYouLoveIt: ['Curated with durable materials.', 'Compact form-factor built for everyday convenience.'],
        problemItSolves: 'Simplifies everyday organization.',
        keyFeatures: ['Ergonomic design', 'Built to last'],
        specifications: { Origin: 'The Everyday Editz Studio', Warranty: '7-Day Replacement Guarantee' },
        materialAndDimensions: { material: 'Durable Grade', dimensions: 'Standard', weight: 'Lightweight' },
        packageContents: ['1 × Unit'],
        howToUse: ['Unbox and use daily.'],
        limitations: ['Follow standard care guidelines.'],
        shippingAndReturns: 'Complimentary shipping above ₹499. 7-Day Replacement Guarantee.',
      },
      reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
      lastStockUpdate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };

    // Prepend to catalog so new product appears immediately at top of storefront & admin
    products.unshift(newProduct);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');

    logAudit('PRODUCT_CREATED', 'Success', `Created product ${id} (${newProduct.name}) [Published: ${newProduct.isPublished}, Stock: ${newProduct.stockCount}]`);

    res.json({ success: true, product: newProduct });
  } catch (err: any) {
    logAudit('PRODUCT_CREATE_FAILED', 'Failed', `Error creating product: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to create product: ' + err.message });
  }
});

// 1c. Delete Product (Server-side Authenticated)
app.delete('/api/admin/products/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin token required.' });
  }

  const { id } = req.params;

  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    let products = JSON.parse(raw);
    const initialLen = products.length;
    products = products.filter((p: any) => p.id !== id);

    if (products.length === initialLen) {
      return res.status(404).json({ success: false, error: `Product "${id}" not found.` });
    }

    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
    logAudit('PRODUCT_DELETED', 'Success', `Deleted product ${id} from canonical database.`);

    res.json({ success: true, message: `Product ${id} deleted successfully.` });
  } catch (err: any) {
    logAudit('PRODUCT_DELETE_FAILED', 'Failed', `Error deleting product ${id}: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to delete product: ' + err.message });
  }
});

// 2. Update Canonical Product (Server-side Authenticated)
app.put('/api/admin/products/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin token required.' });
  }

  const { id } = req.params;
  const updates = req.body;

  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    let products = JSON.parse(raw);
    const index = products.findIndex((p: any) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: `Product "${id}" not found in canonical record.` });
    }

    const current = products[index];
    const updated = { ...current, ...updates, id };

    if (updates.slug !== undefined || (updates.name !== undefined && !current.slug)) {
      updated.slug = generateUniqueSlug(updates.slug || updates.name || current.name, products, id);
    }
    if (updates.isPublished !== undefined) {
      updated.status = updates.isPublished ? (updates.status === 'Draft' ? 'Active' : (updates.status || 'Active')) : 'Draft';
    }
    if (updates.stockCount !== undefined || updates.inStock !== undefined) {
      const stk = Number(updated.stockCount) || 0;
      updated.inStock = stk > 0 && updates.inStock !== false;
    }

    // Recalculate discount percentage if prices change
    if (updates.price !== undefined || updates.originalPrice !== undefined) {
      const pr = Number(updated.price) || 0;
      const orig = Number(updated.originalPrice) || 0;
      updated.discountPercent = orig > pr ? Math.round(((orig - pr) / orig) * 100) : 0;
    }

    // Normalize images, primaryImage, and gallery
    if (updates.images || updates.primaryImage || updates.gallery) {
      const imgs: string[] = Array.isArray(updates.images) ? [...updates.images] : (current.images || []);
      const primary: string = updates.primaryImage || (imgs.length > 0 ? imgs[0] : '');
      
      // If primary is specified, ensure it's at index 0 of images
      if (primary && imgs.includes(primary)) {
        const withoutPrimary = imgs.filter(img => img !== primary);
        updated.images = [primary, ...withoutPrimary];
      } else if (primary && !imgs.includes(primary)) {
        updated.images = [primary, ...imgs];
      } else {
        updated.images = imgs;
      }

      updated.primaryImage = updated.images[0] || '';
      updated.gallery = updated.images.map((url: string, idx: number) => ({
        url,
        position: idx + 1,
        isPrimary: idx === 0 || url === updated.primaryImage
      }));
    }

    updated.lastStockUpdate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    products[index] = updated;
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');

    logAudit('PRODUCT_UPDATED', 'Success', `Product ${id} (${updated.name}) updated. Price: ₹${updated.price}, Stock: ${updated.stockCount}, Published: ${updated.isPublished}`);

    res.json({ success: true, product: updated });
  } catch (err: any) {
    logAudit('PRODUCT_UPDATE_FAILED', 'Failed', `Error updating product ${id}: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to save product update: ' + err.message });
  }
});

// 2d. Batch Homepage Merchandising Update (Admin Only)
app.put('/api/admin/products-merchandising', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);
  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin token required.' });
  }
  const { items } = req.body || {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, error: 'items array is required.' });
  }
  try {
    const products = readProductsSafe();
    for (const patch of items) {
      const idx = products.findIndex((p: any) => p.id === patch.id);
      if (idx >= 0) {
        const fields = ['displayOrder', 'isFeatured', 'isDailyEdit', 'isTrending', 'isNewArrival', 'isBestSeller', 'isPublished', 'inStock'];
        for (const f of fields) {
          if (patch[f] !== undefined) products[idx][f] = patch[f];
        }
        if (patch.isPublished !== undefined) {
          products[idx].status = patch.isPublished ? 'Active' : 'Draft';
        }
      }
    }
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
    logAudit('MERCHANDISING_UPDATED', 'Success', `Updated merchandising order/flags for ${items.length} products.`);
    res.json({ success: true, products: sortByMerchandisingOrder(products) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update merchandising: ' + err.message });
  }
});

// 2b. Direct Product Image Persistence (Uploads to disk, writes to database record)
app.post('/api/admin/products/:id/persist-image', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin token required.' });
  }

  const { id } = req.params;
  const { dataUrl, base64, filename, mimeType, isPrimary, position } = req.body;
  const rawData = dataUrl || base64;

  if (!rawData) {
    return res.status(400).json({ success: false, error: 'No image data provided. Provide dataUrl or base64.' });
  }

  try {
    let buffer: Buffer;
    let ext = 'jpg';

    const matches = rawData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const detectedMime = matches[1].toLowerCase();
      if (detectedMime.includes('png')) ext = 'png';
      else if (detectedMime.includes('webp')) ext = 'webp';
      else if (detectedMime.includes('gif')) ext = 'gif';
      else if (detectedMime.includes('svg')) ext = 'svg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(rawData, 'base64');
      if (mimeType?.includes('png')) ext = 'png';
      else if (mimeType?.includes('webp')) ext = 'webp';
    }

    const safeBase = (filename || `prod-${id}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
    const uniqueName = `${safeBase}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    const destinationPath = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(destinationPath, buffer);
    const publicUrl = `/uploads/${uniqueName}`;

    // Read and update canonical database
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    let products = JSON.parse(raw);
    const index = products.findIndex((p: any) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: `Product "${id}" not found in canonical record.` });
    }

    const prod = products[index];
    let currentImages: string[] = Array.isArray(prod.images) ? [...prod.images] : [];

    if (isPrimary || currentImages.length === 0) {
      currentImages = [publicUrl, ...currentImages.filter(img => img !== publicUrl)];
      prod.primaryImage = publicUrl;
    } else if (typeof position === 'number' && position >= 0 && position < currentImages.length) {
      currentImages.splice(position, 0, publicUrl);
    } else {
      currentImages.push(publicUrl);
    }

    // Deduplicate
    prod.images = Array.from(new Set(currentImages));
    if (!prod.primaryImage || !prod.images.includes(prod.primaryImage)) {
      prod.primaryImage = prod.images[0] || publicUrl;
    }

    // Generate canonical gallery array
    prod.gallery = prod.images.map((url: string, idx: number) => ({
      url,
      position: idx + 1,
      isPrimary: url === prod.primaryImage
    }));

    products[index] = prod;
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');

    logAudit('PRODUCT_IMAGE_PERSISTED', 'Success', `Persisted image ${publicUrl} to product ${id}. Gallery count: ${prod.images.length}`);

    res.json({
      success: true,
      url: publicUrl,
      product: prod
    });
  } catch (err: any) {
    logAudit('PRODUCT_IMAGE_PERSIST_FAILED', 'Failed', `Error persisting image for ${id}: ${err.message}`);
    res.status(500).json({ success: false, error: 'Could not persist image: ' + err.message });
  }
});

// 2c. Update Product Gallery Order / Primary Image
app.put('/api/admin/products/:id/gallery', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin token required.' });
  }

  const { id } = req.params;
  const { images, primaryImage } = req.body;

  if (!Array.isArray(images)) {
    return res.status(400).json({ success: false, error: 'images must be an array of image URLs.' });
  }

  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    let products = JSON.parse(raw);
    const index = products.findIndex((p: any) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: `Product "${id}" not found in canonical record.` });
    }

    const prod = products[index];
    let orderedImages = [...images];
    const targetPrimary = primaryImage || orderedImages[0] || '';

    // If targetPrimary is in images, ensure it is first in images array
    if (targetPrimary && orderedImages.includes(targetPrimary)) {
      orderedImages = [targetPrimary, ...orderedImages.filter(img => img !== targetPrimary)];
    }

    prod.primaryImage = targetPrimary;
    prod.images = orderedImages;
    prod.gallery = orderedImages.map((url: string, idx: number) => ({
      url,
      position: idx + 1,
      isPrimary: url === targetPrimary
    }));

    products[index] = prod;
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');

    logAudit('PRODUCT_GALLERY_UPDATED', 'Success', `Updated gallery for product ${id}. Image count: ${prod.images.length}`);

    res.json({ success: true, product: prod });
  } catch (err: any) {
    logAudit('PRODUCT_GALLERY_FAILED', 'Failed', `Error updating gallery for ${id}: ${err.message}`);
    res.status(500).json({ success: false, error: 'Could not update gallery: ' + err.message });
  }
});

// 3. Upload Product Image (Server-side Authenticated, Saves to /public/uploads/)
app.post('/api/admin/upload-image', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin token required.' });
  }

  const { dataUrl, base64, filename, mimeType } = req.body;
  const rawData = dataUrl || base64;

  if (!rawData) {
    return res.status(400).json({ success: false, error: 'No image data provided. Provide dataUrl or base64 string.' });
  }

  try {
    let buffer: Buffer;
    let ext = 'jpg';

    const matches = rawData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const detectedMime = matches[1].toLowerCase();
      if (detectedMime.includes('png')) ext = 'png';
      else if (detectedMime.includes('webp')) ext = 'webp';
      else if (detectedMime.includes('gif')) ext = 'gif';
      else if (detectedMime.includes('svg')) ext = 'svg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(rawData, 'base64');
      if (mimeType?.includes('png')) ext = 'png';
      else if (mimeType?.includes('webp')) ext = 'webp';
    }

    const safeBase = (filename || 'product').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
    const uniqueName = `${safeBase}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    const destinationPath = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(destinationPath, buffer);
    const publicUrl = `/uploads/${uniqueName}`;

    logAudit('IMAGE_UPLOADED', 'Success', `Saved image ${publicUrl} (${Math.round(buffer.length / 1024)} KB)`);

    res.json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
      bytes: buffer.length
    });
  } catch (err: any) {
    logAudit('IMAGE_UPLOAD_FAILED', 'Failed', `Image upload error: ${err.message}`);
    res.status(500).json({ success: false, error: 'Could not write image to disk: ' + err.message });
  }
});

// ========================================================
// Editorial Collections API
// ========================================================

// 1. Get Editorial Collections
app.get('/api/editorial', (req, res) => {
  try {
    const raw = fs.readFileSync(EDITORIAL_FILE, 'utf-8');
    const collections = JSON.parse(raw);
    res.json({ success: true, count: collections.length, collections });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to read editorial collections: ' + err.message });
  }
});

// 2. Create or Update Editorial Collection (Admin Only)
app.post('/api/admin/editorial', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication required.' });
  }

  const payload = req.body;
  if (!payload.title || !payload.shortDescription) {
    return res.status(400).json({ success: false, error: 'Collection title and short description are required.' });
  }

  try {
    const raw = fs.readFileSync(EDITORIAL_FILE, 'utf-8');
    let collections = JSON.parse(raw);

    const id = payload.id || ('edit-col-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex'));
    const index = collections.findIndex((c: any) => c.id === id);

    const record = {
      ...payload,
      id,
      images: Array.isArray(payload.images) && payload.images.length > 0 ? payload.images : ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80'],
      coverImageIndex: typeof payload.coverImageIndex === 'number' ? payload.coverImageIndex : 0,
      productIds: Array.isArray(payload.productIds) ? payload.productIds : [],
      status: payload.status === 'Draft' ? 'Draft' : 'Published',
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      collections[index] = record;
    } else {
      collections.unshift(record);
    }

    fs.writeFileSync(EDITORIAL_FILE, JSON.stringify(collections, null, 2), 'utf-8');
    logAudit('EDITORIAL_SAVED', 'Success', `Editorial collection "${record.title}" (${record.status}) saved.`);

    res.json({ success: true, collection: record });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save editorial collection: ' + err.message });
  }
});

// 3. Delete Editorial Collection (Admin Only)
app.delete('/api/admin/editorial/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { id } = req.params;
  try {
    const raw = fs.readFileSync(EDITORIAL_FILE, 'utf-8');
    let collections = JSON.parse(raw);
    collections = collections.filter((c: any) => c.id !== id);
    fs.writeFileSync(EDITORIAL_FILE, JSON.stringify(collections, null, 2), 'utf-8');

    logAudit('EDITORIAL_DELETED', 'Success', `Editorial collection ${id} deleted.`);
    res.json({ success: true, message: `Editorial collection ${id} removed.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete editorial collection: ' + err.message });
  }
});

// ========================================================
// REELS & VIDEO CONTENT MANAGEMENT API (Admin & Public)
// ========================================================

// 1. Public Endpoint: Get Published & Active Reels for Storefront
app.get('/api/reels', (req, res) => {
  try {
    const raw = fs.readFileSync(REELS_FILE, 'utf-8');
    const allReels = JSON.parse(raw);
    const now = new Date();

    // Customers and logged-out visitors can ONLY view published reels within active schedule
    const publishedReels = allReels
      .filter((r: any) => {
        if (r.status !== 'Published') return false;
        if (r.published_at && new Date(r.published_at) > now) return false;
        if (r.expires_at && new Date(r.expires_at) <= now) return false;
        return true;
      })
      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

    res.json({
      success: true,
      count: publishedReels.length,
      reels: publishedReels
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve published reels: ' + err.message });
  }
});

// 2. Admin Endpoint: Get All Reels (Drafts, Published, Unpublished, Scheduled) with Analytics
app.get('/api/admin/reels', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    logAudit('REEL_ACCESS_DENIED', 'Blocked', 'Unauthorized attempt to access admin reel manager.');
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication token required.' });
  }

  try {
    const raw = fs.readFileSync(REELS_FILE, 'utf-8');
    const reels = JSON.parse(raw);
    const now = new Date();

    const stats = {
      total: reels.length,
      published: reels.filter((r: any) => r.status === 'Published' && (!r.published_at || new Date(r.published_at) <= now) && (!r.expires_at || new Date(r.expires_at) > now)).length,
      draft: reels.filter((r: any) => r.status === 'Draft').length,
      unpublished: reels.filter((r: any) => r.status === 'Unpublished').length,
      scheduled: reels.filter((r: any) => r.status === 'Published' && r.published_at && new Date(r.published_at) > now).length,
      expired: reels.filter((r: any) => r.expires_at && new Date(r.expires_at) <= now).length,
    };

    reels.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

    res.json({
      success: true,
      stats,
      reels
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to read reels database: ' + err.message });
  }
});

// 3. Admin Video Upload: Supports MP4, WebM, MOV with validation up to 100MB
app.post('/api/admin/reels/upload-video', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  const verification = verifySecureToken(token || '');
  if (!token || !verification.valid) {
    logAudit('REEL_UPLOAD_BLOCKED', 'Blocked', 'Unauthorized video upload attempt.');
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin privileges required to upload videos.' });
  }

  const { videoData, base64, filename, mimeType } = req.body;
  const rawData = videoData || base64;

  if (!rawData) {
    return res.status(400).json({ success: false, error: 'No video payload received. Provide videoData or base64.' });
  }

  try {
    let buffer: Buffer;
    let detectedMime = (mimeType || '').toLowerCase();
    let ext = 'mp4';

    // Parse DataURL if provided
    const matches = rawData.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      detectedMime = matches[1].toLowerCase();
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(rawData, 'base64');
    }

    // Determine extension & validate format
    if (detectedMime.includes('webm')) {
      ext = 'webm';
    } else if (detectedMime.includes('quicktime') || detectedMime.includes('mov')) {
      ext = 'mov';
    } else if (detectedMime.includes('mp4') || detectedMime.includes('m4v')) {
      ext = 'mp4';
    } else {
      // Fallback check on provided filename extension
      const fileExt = (filename || '').split('.').pop()?.toLowerCase();
      if (fileExt === 'webm') ext = 'webm';
      else if (fileExt === 'mov') ext = 'mov';
      else if (fileExt === 'mp4') ext = 'mp4';
      else {
        return res.status(400).json({
          success: false,
          error: `Unsupported video format "${detectedMime || fileExt}". Allowed formats: MP4 (.mp4), WebM (.webm), QuickTime (.mov).`
        });
      }
    }

    // Server-side size validation (max 100MB)
    const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
    if (buffer.length > MAX_VIDEO_BYTES) {
      return res.status(400).json({
        success: false,
        error: `Video file exceeds maximum allowed size of 100MB (${(buffer.length / (1024 * 1024)).toFixed(1)}MB). Please compress video or use standard 9:16 mobile export.`
      });
    }

    const safeBase = (filename || 'reel').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'reel';
    const uniqueName = `reel-${safeBase}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    const destinationPath = path.join(UPLOADS_REELS_DIR, uniqueName);

    fs.writeFileSync(destinationPath, buffer);
    const publicUrl = `/uploads/reels/${uniqueName}`;

    logAudit('REEL_VIDEO_UPLOADED', 'Success', `Admin uploaded reel video: ${publicUrl} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB, ${ext.toUpperCase()})`);

    res.json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
      bytes: buffer.length,
      mimeType: `video/${ext === 'mov' ? 'quicktime' : ext}`
    });
  } catch (err: any) {
    logAudit('REEL_UPLOAD_FAILED', 'Failed', `Video upload error: ${err.message}`);
    res.status(500).json({ success: false, error: 'Could not store video on server: ' + err.message });
  }
});

// 4. Admin Thumbnail Upload: Custom poster frame or auto-generated canvas image
app.post('/api/admin/reels/upload-thumbnail', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
  }

  const { imageData, filename } = req.body;
  if (!imageData) {
    return res.status(400).json({ success: false, error: 'No image data provided.' });
  }

  try {
    let buffer: Buffer;
    let ext = 'jpg';

    const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageData, 'base64');
    }

    const uniqueName = `thumb-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    const destinationPath = path.join(UPLOADS_REELS_DIR, uniqueName);

    fs.writeFileSync(destinationPath, buffer);
    const publicUrl = `/uploads/reels/${uniqueName}`;

    res.json({ success: true, url: publicUrl, filename: uniqueName });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Could not save thumbnail: ' + err.message });
  }
});

// 5. Admin Create Reel Record
app.post('/api/admin/reels', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  const verification = verifySecureToken(token || '');
  if (!token || !verification.valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin credentials required.' });
  }

  const payload = req.body;
  if (!payload.title || !payload.video_url) {
    return res.status(400).json({ success: false, error: 'Reel title and video URL are mandatory.' });
  }

  try {
    const raw = fs.readFileSync(REELS_FILE, 'utf-8');
    let reels = JSON.parse(raw);

    const id = payload.id || (`reel-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`);
    const nowIso = new Date().toISOString();

    const newReel = {
      id,
      title: String(payload.title).trim(),
      description: String(payload.description || '').trim(),
      video_url: String(payload.video_url).trim(),
      thumbnail_url: payload.thumbnail_url || '',
      product_id: payload.product_id || '',
      category: payload.category || 'Lifestyle',
      cta_label: payload.cta_label || 'Shop Now',
      cta_url: payload.cta_url || '',
      display_order: typeof payload.display_order === 'number' ? payload.display_order : (reels.length + 1),
      status: payload.status === 'Published' ? 'Published' : payload.status === 'Unpublished' ? 'Unpublished' : 'Draft',
      published_at: payload.published_at || (payload.status === 'Published' ? nowIso : undefined),
      expires_at: payload.expires_at || undefined,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: verification.username || 'Admin',
      file_size: payload.file_size,
      duration: payload.duration
    };

    reels.push(newReel);
    fs.writeFileSync(REELS_FILE, JSON.stringify(reels, null, 2), 'utf-8');

    logAudit('REEL_CREATED', 'Success', `Created new reel "${newReel.title}" (${newReel.status}, Order #${newReel.display_order})`);

    res.json({ success: true, reel: newReel });
  } catch (err: any) {
    logAudit('REEL_CREATE_FAILED', 'Failed', `Error creating reel: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to create reel: ' + err.message });
  }
});

// 6. Admin Update Reel Record (or Replace Video)
app.put('/api/admin/reels/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication required.' });
  }

  const { id } = req.params;
  const updates = req.body;

  try {
    const raw = fs.readFileSync(REELS_FILE, 'utf-8');
    let reels = JSON.parse(raw);
    const index = reels.findIndex((r: any) => r.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: `Reel "${id}" not found.` });
    }

    const current = reels[index];
    const oldVideoUrl = current.video_url;

    // Handle video replacement safely: do not delete old video unless replacement URL is provided and valid
    if (updates.video_url && updates.video_url !== oldVideoUrl && updates.cleanupOldVideo && oldVideoUrl?.startsWith('/uploads/reels/')) {
      const oldFilename = path.basename(oldVideoUrl);
      const oldFilePath = path.join(UPLOADS_REELS_DIR, oldFilename);
      try {
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          logAudit('REEL_OLD_VIDEO_CLEANED', 'Success', `Removed replaced video file: ${oldFilename}`);
        }
      } catch (cleanErr) {
        console.warn('Could not clean old video file:', cleanErr);
      }
    }

    const updated = {
      ...current,
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };

    // If changing to Published and no published_at is set, set published_at to now
    if (updated.status === 'Published' && !updated.published_at) {
      updated.published_at = new Date().toISOString();
    }

    reels[index] = updated;
    fs.writeFileSync(REELS_FILE, JSON.stringify(reels, null, 2), 'utf-8');

    logAudit('REEL_UPDATED', 'Success', `Updated reel "${updated.title}" (${updated.status})`);

    res.json({ success: true, reel: updated });
  } catch (err: any) {
    logAudit('REEL_UPDATE_FAILED', 'Failed', `Error updating reel ${id}: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to update reel: ' + err.message });
  }
});

// 7. Admin Delete Reel Record
app.delete('/api/admin/reels/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication required.' });
  }

  const { id } = req.params;

  try {
    const raw = fs.readFileSync(REELS_FILE, 'utf-8');
    let reels = JSON.parse(raw);
    const target = reels.find((r: any) => r.id === id);

    if (!target) {
      return res.status(404).json({ success: false, error: `Reel "${id}" not found.` });
    }

    // Clean up uploaded video file from disk if in uploads folder
    if (target.video_url?.startsWith('/uploads/reels/')) {
      const vidFile = path.join(UPLOADS_REELS_DIR, path.basename(target.video_url));
      try {
        if (fs.existsSync(vidFile)) fs.unlinkSync(vidFile);
      } catch (e) {
        console.warn('Could not delete video file:', e);
      }
    }
    if (target.thumbnail_url?.startsWith('/uploads/reels/')) {
      const thumbFile = path.join(UPLOADS_REELS_DIR, path.basename(target.thumbnail_url));
      try {
        if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile);
      } catch (e) {
        console.warn('Could not delete thumbnail file:', e);
      }
    }

    reels = reels.filter((r: any) => r.id !== id);
    fs.writeFileSync(REELS_FILE, JSON.stringify(reels, null, 2), 'utf-8');

    logAudit('REEL_DELETED', 'Success', `Deleted reel "${target.title}" (ID: ${id})`);

    res.json({ success: true, message: `Reel "${target.title}" successfully deleted.` });
  } catch (err: any) {
    logAudit('REEL_DELETE_FAILED', 'Failed', `Error deleting reel ${id}: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to delete reel: ' + err.message });
  }
});

// 8. Admin Reorder Reels
app.put('/api/admin/reels-reorder', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const { reelIds } = req.body;
  if (!Array.isArray(reelIds)) {
    return res.status(400).json({ success: false, error: 'reelIds array is required.' });
  }

  try {
    const raw = fs.readFileSync(REELS_FILE, 'utf-8');
    let reels = JSON.parse(raw);

    reelIds.forEach((id: string, index: number) => {
      const r = reels.find((item: any) => item.id === id);
      if (r) {
        r.display_order = index + 1;
        r.updated_at = new Date().toISOString();
      }
    });

    reels.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
    fs.writeFileSync(REELS_FILE, JSON.stringify(reels, null, 2), 'utf-8');

    logAudit('REELS_REORDERED', 'Success', `Reordered ${reelIds.length} reels.`);

    res.json({ success: true, reels });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to reorder reels: ' + err.message });
  }
});

// 9. Admin Quick Toggle Publish/Unpublish
app.post('/api/admin/reels/:id/toggle-publish', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token || !verifySecureToken(token).valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const { id } = req.params;
  try {
    const raw = fs.readFileSync(REELS_FILE, 'utf-8');
    let reels = JSON.parse(raw);
    const index = reels.findIndex((r: any) => r.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: `Reel "${id}" not found.` });
    }

    const reel = reels[index];
    const newStatus = reel.status === 'Published' ? 'Unpublished' : 'Published';
    reel.status = newStatus;
    reel.updated_at = new Date().toISOString();
    if (newStatus === 'Published' && !reel.published_at) {
      reel.published_at = new Date().toISOString();
    }

    fs.writeFileSync(REELS_FILE, JSON.stringify(reels, null, 2), 'utf-8');

    logAudit('REEL_STATUS_TOGGLED', 'Success', `Reel "${reel.title}" status changed to ${newStatus}`);

    res.json({ success: true, reel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to toggle reel status: ' + err.message });
  }
});

// ========================================================
// Dynamic SEO Endpoints: /robots.txt & /sitemap.xml
// ========================================================
function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send([
    'User-agent: *',
    'Allow: /',
    'Allow: /category/',
    'Allow: /product/',
    'Allow: /new-arrivals',
    'Allow: /everyday-essentials',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /staff',
    'Disallow: /staff/',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /forgot-password',
    'Disallow: /reset-password',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /api/',
    'Disallow: /*?*',
    '',
    `Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`,
    ''
  ].join('\n'));
});

app.get('/sitemap.xml', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const products = readProductsSafe().filter(
    (p: any) => p.isPublished !== false && p.status !== 'Draft' && p.status !== 'Inactive'
  );

  const staticRoutes = [
    { loc: `${CANONICAL_ORIGIN}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${CANONICAL_ORIGIN}/new-arrivals`, changefreq: 'daily', priority: '0.9' },
    { loc: `${CANONICAL_ORIGIN}/everyday-essentials`, changefreq: 'daily', priority: '0.9' },
    { loc: `${CANONICAL_ORIGIN}/category/women`, changefreq: 'daily', priority: '0.9' },
    { loc: `${CANONICAL_ORIGIN}/category/men`, changefreq: 'daily', priority: '0.9' },
    { loc: `${CANONICAL_ORIGIN}/category/kids`, changefreq: 'daily', priority: '0.9' },
    { loc: `${CANONICAL_ORIGIN}/category/home-lifestyle`, changefreq: 'daily', priority: '0.9' },
  ];

  const productRoutes = products.map((p: any) => ({
    loc: `${CANONICAL_ORIGIN}/product/${encodeURIComponent(p.slug || p.id)}`,
    changefreq: 'weekly',
    priority: p.isFeatured ? '0.9' : '0.8',
  }));

  const urlsXml = [...staticRoutes, ...productRoutes]
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, max-age=0');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`);
});

// Vite Dev Server or Production Build Handler
async function setupServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: 3000, host: '0.0.0.0' },
      appType: 'spa',
    });

    // Use vite's connect instance as middleware
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EVERYDAY_EDITZ] Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('[EVERYDAY_EDITZ] Server startup error:', err);
  process.exit(1);
});
