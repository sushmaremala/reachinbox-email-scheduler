import nodemailer, { Transporter } from 'nodemailer';
import { config } from './env';

let transporterInstance: Transporter | null = null;
let currentAccountInfo: { user: string; pass: string; webUrl?: string } | null = null;

export async function getTransporter(): Promise<Transporter> {
  if (transporterInstance) {
    return transporterInstance;
  }

  let user = config.smtp.user;
  let pass = config.smtp.pass;

  // Auto-generate Ethereal test account if credentials are not provided
  if (!user || !pass) {
    console.log('⚡ No SMTP credentials found. Auto-generating fresh Ethereal test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      currentAccountInfo = {
        user: testAccount.user,
        pass: testAccount.pass,
        webUrl: 'https://ethereal.email/messages',
      };
      console.log('📬 Ethereal Test Account Generated:');
      console.log(`   User: ${user}`);
      console.log(`   Pass: ${pass}`);
      console.log(`   Web Portal: https://ethereal.email/login`);
    } catch (err: any) {
      console.error('⚠️ Failed to auto-generate Ethereal account, falling back to mock transporter:', err.message);
    }
  } else {
    currentAccountInfo = { user, pass };
  }

  transporterInstance = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: user,
      pass: pass,
    },
  });

  return transporterInstance;
}

export interface SendMailOptions {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | false;
  response: string;
}

export async function sendEmail(options: SendMailOptions): Promise<SendMailResult> {
  const transporter = await getTransporter();

  const mailOptions = {
    from: options.from || config.defaultSender,
    to: options.to,
    subject: options.subject,
    text: options.text || options.html?.replace(/<[^>]+>/g, ''),
    html: options.html || options.text,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || false,
    response: info.response,
  };
}

export function getEtherealAccountInfo() {
  return currentAccountInfo;
}
