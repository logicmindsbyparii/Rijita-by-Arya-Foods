import crypto from 'crypto';
import { Response } from 'express';
import User from '../models/User';
import { IAuthRequest } from '../types';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { sendPasswordResetEmail } from '../utils/mailer';

export const register = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { name, email, phone, password } = req.body;
  if (!password || password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters' }); return;
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) { res.status(400).json({ success: false, message: 'Email already registered' }); return; }
  const user = await User.create({ name, email, phone, password });
  const payload = { id: user._id.toString(), role: user.role, email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Set refresh token as httpOnly cookie for XSS protection
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/api/auth',
  });
  
  res.status(201).json({ success: true, data: { user: user.toJSON(), accessToken, refreshToken }, message: 'Registration successful' });
};

export const login = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ success: false, message: 'Invalid input' }); return;
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user) { res.status(401).json({ success: false, message: 'Invalid email or password' }); return; }
  if (!user.isActive) { res.status(401).json({ success: false, message: 'Account deactivated' }); return; }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) { res.status(401).json({ success: false, message: 'Invalid email or password' }); return; }
  const payload = { id: user._id.toString(), role: user.role, email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Set refresh token as httpOnly cookie for XSS protection
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/api/auth',
  });
  
  res.json({ success: true, data: { user: user.toJSON(), accessToken, refreshToken }, message: 'Login successful' });
};

export const refreshToken = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) { res.status(400).json({ success: false, message: 'Refresh token required' }); return; }
  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) { res.status(401).json({ success: false, message: 'Invalid refresh token' }); return; }
    const payload = { id: user._id.toString(), role: user.role, email: user.email };
    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    
    // Rotate refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
    
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch { res.status(401).json({ success: false, message: 'Invalid or expired refresh token' }); }
};

export const getProfile = async (req: IAuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id).populate('wishlist');
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  res.json({ success: true, data: { user: user.toJSON() } });
};

export const updateProfile = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { name, phone, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user?.id,
    { ...(name && { name }), ...(phone && { phone }), ...(avatar && { avatar }) },
    { new: true, runValidators: true }
  );
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  res.json({ success: true, data: { user: user.toJSON() }, message: 'Profile updated' });
};

export const changePassword = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user?.id).select('+password');
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) { res.status(400).json({ success: false, message: 'Current password is incorrect' }); return; }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, data: {}, message: 'Password changed successfully' });
};

export const addAddress = async (req: IAuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const address = req.body;
  if (address.isDefault) user.addresses.forEach((a: any) => { a.isDefault = false; });
  user.addresses.push(address);
  await user.save();
  res.json({ success: true, data: { addresses: user.addresses }, message: 'Address added' });
};

export const updateAddress = async (req: IAuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const addressId = req.params.addressId;
  const address = (user.addresses as any).id(addressId);
  if (!address) { res.status(404).json({ success: false, message: 'Address not found' }); return; }
  const addressData = req.body;
  if (addressData.isDefault) user.addresses.forEach((a: any) => { a.isDefault = false; });
  Object.assign(address, addressData);
  await user.save();
  res.json({ success: true, data: { addresses: user.addresses }, message: 'Address updated' });
};

export const deleteAddress = async (req: IAuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const addressId = req.params.addressId;
  // Use Mongoose subdocument .pull() to properly mark the array as modified
  (user.addresses as any).pull({ _id: addressId });
  await user.save();
  res.json({ success: true, data: { addresses: user.addresses }, message: 'Address deleted' });
};

export const getWishlist = async (req: IAuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id).populate('wishlist');
  res.json({ success: true, data: { wishlist: user?.wishlist || [] } });
};

export const forgotPassword = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ success: false, message: 'Email is required' }); return; }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    res.json({ success: true, data: { message: 'If an account with that email exists, a password reset link has been sent.' } });
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  await sendPasswordResetEmail(user.email, token).catch(() => {});
  res.json({ success: true, data: { message: 'If an account with that email exists, a password reset link has been sent.' } });
};

export const resetPassword = async (req: IAuthRequest, res: Response): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ success: false, message: 'Token and new password are required' }); return; }
  if (password.length < 6) { res.status(400).json({ success: false, message: 'Password must be at least 6 characters' }); return; }
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: new Date() } });
  if (!user) { res.status(400).json({ success: false, message: 'Invalid or expired reset token' }); return; }
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json({ success: true, data: { message: 'Password has been reset successfully' } });
};

export const toggleWishlist = async (req: IAuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const productId = req.params.productId;
  const index = user.wishlist.findIndex((id) => id.toString() === productId);
  if (index > -1) {
    user.wishlist.splice(index, 1);
    await user.save();
    res.json({ success: true, data: { wishlist: user.wishlist }, message: 'Removed from wishlist' });
  } else {
    user.wishlist.push(productId as any);
    await user.save();
    res.json({ success: true, data: { wishlist: user.wishlist }, message: 'Added to wishlist' });
  }
};
