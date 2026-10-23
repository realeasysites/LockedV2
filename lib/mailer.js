const nodemailer = require('nodemailer');
const S = require('./site');

let transporter = null;
function getTransport() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendLeadAlert(lead) {
  const t = getTransport();
  const to = process.env.NOTIFY_EMAIL;
  if (!t || !to) return false;
  const rows = [
    ['Name', lead.name], ['Phone', lead.phone], ['Email', lead.email], ['Town', lead.town],
    ['Project', lead.project_type], ['Timing', lead.timeline], ['Reach by', lead.contact_pref],
    ['Saw this post', lead.ref_post], ['Details', lead.details], ['Came from', lead.source],
  ].filter((r) => r[1]);
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 12px">New estimate request</h2>` +
    `<table cellpadding="6" style="border-collapse:collapse;font-size:15px">` +
    rows.map((r) => `<tr><td style="color:#666;vertical-align:top"><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td></tr>`).join('') +
    `</table><p style="margin:18px 0 6px"><a href="tel:${esc(lead.phone)}" style="background:#c9a45c;color:#000;padding:10px 16px;text-decoration:none;font-weight:bold;border-radius:6px">Call ${esc(lead.name)}</a></p>` +
    `<p><a href="${esc(S.siteUrl())}/admin">Open the dashboard</a></p></div>`;
  await t.sendMail({
    from: `"${S.name} Website" <${process.env.SMTP_USER}>`,
    to,
    replyTo: lead.email || undefined,
    subject: `New estimate request: ${lead.name}${lead.project_type ? ' (' + lead.project_type + ')' : ''}`,
    text: rows.map((r) => `${r[0]}: ${r[1]}`).join('\n') + `\n\nDashboard: ${S.siteUrl()}/admin`,
    html,
  });
  return true;
}

async function sendAutoReply(lead) {
  const t = getTransport();
  if (!t || !lead.email) return false;
  await t.sendMail({
    from: `"${S.legal}" <${process.env.SMTP_USER}>`,
    to: lead.email,
    replyTo: process.env.NOTIFY_EMAIL || undefined,
    subject: `We got your request: ${S.legal}`,
    text:
      `Hi ${lead.name},\n\nThanks for reaching out to ${S.legal}. We got your request and will be in touch soon to talk about your project.\n\n` +
      `Have photos of the space or tile you like? Reply to this email and attach them.\n\nQuestions? Call or text ${S.phone}.\n\n${S.tagline}\n${S.legal}`,
  });
  return true;
}

module.exports = { sendLeadAlert, sendAutoReply, esc };
