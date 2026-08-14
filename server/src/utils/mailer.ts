import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
  auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
});

export const sendPasswordResetEmail = async (to: string, token: string): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
  await transporter.sendMail({
    from: `"Rijita" <${process.env.SMTP_USER || 'noreply@rijita.com'}>`,
    to, subject: 'Password Reset Request - Rijita',
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;"><h2 style="color:#2E7D32;">Password Reset</h2><p>You requested a password reset for your Rijita account.</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2E7D32;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">Reset Password</a><p style="color:#666;font-size:12px;">If you did not request this, please ignore this email.</p></div>`,
  });
};
