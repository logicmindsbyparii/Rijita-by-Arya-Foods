import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { IAuthRequest } from '../types';

interface JwtPayload { id: string; role: string; email: string }

// Validate JWT secrets at import time (fail fast on startup)
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required. Set it in .env file.');
if (!JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET environment variable is required. Set it in .env file.');

const SECRET = () => JWT_SECRET;
const REFRESH_SECRET = () => JWT_REFRESH_SECRET;

export const generateAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, SECRET(), { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any });

export const generateRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, REFRESH_SECRET(), { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any });

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, REFRESH_SECRET()) as JwtPayload;

export const protect = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) { res.status(401).json({ success: false, message: 'Not authorized, no token provided' }); return; }
  try {
    const decoded = jwt.verify(token, SECRET()) as JwtPayload;
    const user = await User.findById(decoded.id).select('-password');
    if (!user) { res.status(401).json({ success: false, message: 'User not found' }); return; }
    if (!user.isActive) { res.status(401).json({ success: false, message: 'Account deactivated' }); return; }
    // Use the freshly-fetched user's role/email, not the JWT's stale claims —
    // otherwise a role change (e.g. demoting an admin) has no effect until the token expires.
    req.user = { id: decoded.id, role: user.role, email: user.email };
    next();
  } catch { res.status(401).json({ success: false, message: 'Not authorized, token invalid' }); }
};

export const authorize = (...roles: string[]) =>
  (req: IAuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Not authorized for this action' }); return;
    }
    next();
  };

export const optionalAuth = async (req: IAuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1] : undefined;
    if (token) {
      const decoded = jwt.verify(token, SECRET()) as JwtPayload;
      req.user = { id: decoded.id, role: decoded.role, email: decoded.email };
    }
  } catch { /* silent */ }
  next();
};
