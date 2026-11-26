/**
 * POST /api/payment-email — emails a team leader (or solo student) that their payment is confirmed.
 *
 * Called by the admin panel right after "Mark checked". Sent from the club Gmail over SMTP with an
 * app password that only lives in Vercel's environment (GMAIL_APP_PASSWORD), never in the browser.
 *
 * Guard rails:
 *  - the caller must be the signed-in admin holding the seat (their own Supabase token, checked with is_admin());
 *    every database read/write below runs as that admin, so RLS still applies
 *  - only registrations whose payment is marked checked
 *  - once per registration (confirmation_sent_at), unless the admin explicitly asks to resend
 */
import nodemailer from 'nodemailer'

interface Reg {
  id: string; event_id: string; event_title: string; student_name: string; student_email: string; student_roll: string
  status: string; team_name: string | null; team_members: { name: string; roll: string }[] | null
  payment_utr: string | null; payment_amount: number | null; payment_verified: boolean; confirmation_sent_at: string | null
}
interface Ev { title: string; slug: string; date: string | null; time: string | null; end_time: string | null; location: string | null }
export interface Mail { from: string; replyTo: string; to: string; subject: string; text: string; html: string }
export interface Deps {
  env: Record<string, string | undefined>
  fetch: typeof fetch
  send: (mail: Mail) => Promise<void>
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

export async function handle(request: Request, deps: Deps): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const { env } = deps
  const base = env.VITE_SUPABASE_URL, anon = env.VITE_SUPABASE_ANON_KEY
  const from = env.GMAIL_USER || 'techspark.navkis@gmail.com'
  if (!base || !anon) return json({ error: 'The server is missing its Supabase settings.' }, 500)
  if (!env.GMAIL_APP_PASSWORD) return json({ error: 'Email isn’t set up yet: add GMAIL_APP_PASSWORD in Vercel, then redeploy.', code: 'not_configured' }, 503)

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  let body: { id?: string; resend?: boolean }
  try { body = await request.json() } catch { return json({ error: 'Bad request' }, 400) }
  const id = String(body.id || '')
  if (!token || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Bad request' }, 400)

  const db = (path: string, init: RequestInit = {}) => deps.fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: anon, authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers || {}) },
  })

  // 1) is this the admin holding the seat?
  const adm = await db('rpc/is_admin', { method: 'POST', body: '{}' })
  if (!adm.ok || (await adm.json()) !== true) return json({ error: 'Only the signed-in admin can send this.' }, 403)

  // 2) the registration (RLS: admins only)
  const regRes = await db(`techspark_registrations?id=eq.${id}&select=*`)
  const reg = regRes.ok ? ((await regRes.json()) as Reg[])[0] : undefined
  if (!reg) return json({ error: 'That registration no longer exists.' }, 404)
  if (!reg.payment_verified || !reg.payment_utr) return json({ error: 'Mark the payment as checked first.' }, 409)
  if (reg.confirmation_sent_at && !body.resend) return json({ error: 'Already emailed.', code: 'already_sent', at: reg.confirmation_sent_at }, 409)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(reg.student_email)) return json({ error: 'This registration has no valid email.' }, 422)

  const evRes = await db(`techspark_events?id=eq.${reg.event_id}&select=title,slug,date,time,end_time,location`)
  const ev = evRes.ok ? ((await evRes.json()) as Ev[])[0] : undefined

  const site = new URL(request.url).origin
  const mail = confirmationEmail(reg, ev, site, from)
  try { await deps.send(mail) }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json({ error: /auth|credential|535|534/i.test(msg) ? 'Gmail refused the login: check GMAIL_APP_PASSWORD in Vercel.' : `Couldn’t send the email (${msg.slice(0, 120)}).` }, 502)
  }

  const at = new Date().toISOString()
  await db(`techspark_registrations?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ confirmation_sent_at: at }), headers: { prefer: 'return=minimal' } })
  return json({ sent: true, to: reg.student_email, at })
}

/* ───────── the email ───────── */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const groupUtr = (u: string) => u.replace(/(\d{4})(?=\d)/g, '$1 ')

function when(ev?: Ev): string {
  if (!ev?.date) return 'Date to be announced'
  const d = new Date(`${ev.date}T00:00:00Z`)
  const day = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const t = ev.time ? (ev.end_time ? `${ev.time} – ${ev.end_time}` : ev.time) : ''
  return t ? `${day}, ${t}` : day
}

export function confirmationEmail(reg: Reg, ev: Ev | undefined, site: string, from: string): Mail {
  const title = ev?.title || reg.event_title
  const first = reg.student_name.trim().split(/\s+/)[0]
  const team = reg.team_name?.trim() || ''
  const waitlisted = reg.status === 'Waitlisted'
  const people = team ? [{ name: reg.student_name, roll: reg.student_roll, lead: true }, ...(reg.team_members ?? []).map((m) => ({ ...m, lead: false }))] : []
  const link = ev?.slug ? `${site}/events/${ev.slug}` : site
  const paid = `₹${reg.payment_amount ?? ''}`.replace(/₹$/, 'Paid')

  const subject = waitlisted
    ? `Payment confirmed — ${title} (waitlist)`
    : team ? `${team} is in — ${title}` : `You’re in — ${title}`
  const lead = waitlisted
    ? `Your payment is confirmed. ${team ? `${team} is` : 'You’re'} on the waitlist for ${title} — we’ll let you know the moment a spot opens.`
    : `Congratulations — your payment is confirmed and ${team ? `${team} is` : 'you’re'} registered for ${title}.`

  const rows: [string, string][] = [
    ['Payment', `${paid} · UTR ${groupUtr(reg.payment_utr || '')}`],
    ...(team ? [['Team', team] as [string, string]] : []),
    ['When', when(ev)],
    ['Where', ev?.location || 'To be announced'],
  ]

  const text = [
    `Hi ${first},`, '', lead, '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(people.length ? ['', 'Your team:', ...people.map((p) => `  • ${p.name} (${p.roll})${p.lead ? ' — leader' : ''}`)] : []),
    '', team ? 'Everyone on the team brings their student ID and checks in at the entrance.' : 'Bring your student ID and check in at the entrance.',
    '', `Event page: ${link}`, '', 'See you there,', 'TECHSPARK', 'Navkis College of Engineering, Hassan', '',
    'Questions? Just reply to this email.',
  ].join('\n')

  const td = 'padding:10px 0;border-top:1px solid #e6e8ee;font-size:14px;vertical-align:top'
  const html = `<!doctype html><html><body style="margin:0;background:#f3f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b0f19">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="height:4px;background:#1a9fe8;background:linear-gradient(90deg,#0057ff,#1a9fe8)"></td></tr>
<tr><td style="padding:28px 28px 8px">
<p style="margin:0;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#1a9fe8;font-weight:600">${waitlisted ? 'Payment confirmed' : team ? 'Team registered' : 'Registration confirmed'}</p>
<h1 style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.15">${esc(waitlisted ? `Hang tight, ${first}.` : team ? `${team} is in.` : `You’re in, ${first}.`)}</h1>
<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#374151">Hi ${esc(first)}, ${esc(lead.charAt(0).toLowerCase() + lead.slice(1))}</p>
</td></tr>
<tr><td style="padding:12px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows.map(([k, v]) => `<tr><td style="${td};width:92px;color:#6b7280">${esc(k)}</td><td style="${td};color:#0b0f19">${esc(v)}</td></tr>`).join('')}
${people.length ? `<tr><td style="${td};width:92px;color:#6b7280">Members</td><td style="${td}">${people.map((p) => `${esc(p.name)} <span style="color:#6b7280">· ${esc(p.roll)}${p.lead ? ' · leader' : ''}</span>`).join('<br>')}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:16px 28px 8px;font-size:14px;line-height:1.6;color:#374151">${team ? 'Everyone on the team brings their student ID and checks in at the entrance.' : 'Bring your student ID and check in at the entrance.'}</td></tr>
<tr><td style="padding:12px 28px 28px"><a href="${esc(link)}" style="display:inline-block;background:#0b0f19;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px">View the event</a></td></tr>
<tr><td style="padding:18px 28px;background:#f8f9fc;font-size:12.5px;line-height:1.6;color:#6b7280">TECHSPARK · Navkis College of Engineering, Hassan<br>Questions? Just reply to this email.</td></tr>
</table></td></tr></table></body></html>`

  return { from: `TECHSPARK <${from}>`, replyTo: from, to: reg.student_email, subject, text, html }
}

/* ───────── wiring for Vercel ───────── */
export default {
  async fetch(request: Request) {
    return handle(request, {
      env: process.env,
      fetch,
      send: async (mail) => {
        const transport = nodemailer.createTransport({
          host: 'smtp.gmail.com', port: 465, secure: true,
          auth: { user: process.env.GMAIL_USER || 'techspark.navkis@gmail.com', pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '') },
        })
        await transport.sendMail(mail)
      },
    })
  },
}
