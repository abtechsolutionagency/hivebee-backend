import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../logging/logger.js';

const isEmailConfigured = Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.emailFrom);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      connectionTimeout: env.smtpConnectionTimeoutMs,
      greetingTimeout: env.smtpGreetingTimeoutMs,
      socketTimeout: env.smtpSocketTimeoutMs,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    })
  : null;

const buildMailErrorMeta = (error, payload) => ({
  message: error?.message,
  code: error?.code,
  command: error?.command,
  response: error?.response,
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  to: payload?.to,
  subject: payload?.subject
});

const sendMail = async (payload) => {
  if (!transporter) {
    logger.warn('SMTP is not configured. Skipping email send.');
    return { sent: false, skipped: true };
  }

  try {
    await transporter.sendMail({ from: env.emailFrom, ...payload });
    return { sent: true, skipped: false };
  } catch (error) {
    logger.error('Email send failed', buildMailErrorMeta(error, payload));
    return { sent: false, skipped: false, error: error?.message ?? 'Unknown email error' };
  }
};

export const mailService = {
  async sendPrimaryVerificationEmail({ email, name, verificationLink, code }) {
    return sendMail({
      to: email,
      subject: 'Verify your JoinTheHive account',
      text: `Hi ${name}, verify your email using this link: ${verificationLink}. Verification code: ${code}`,
      html: `<p>Hi ${name},</p><p>Please verify your email for JoinTheHive.</p><p><a href="${verificationLink}">Verify Email</a></p><p>Code: <strong>${code}</strong></p>`
    });
  },

  async sendWorkerInviteEmail({ toEmail, primaryName, inviteLink, expiresAt }) {
    return sendMail({
      to: toEmail,
      subject: `${primaryName} invited you to JoinTheHive as a Worker Bee`,
      text: `${primaryName} invited you as a Worker Bee. Join using this link: ${inviteLink}. Invite expires at: ${expiresAt.toISOString()}`,
      html: `<p>${primaryName} invited you as a <strong>Worker Bee</strong>.</p><p><a href="${inviteLink}">Accept Invite</a></p><p>Expires: ${expiresAt.toISOString()}</p>`
    });
  }
};
