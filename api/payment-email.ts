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
interface Ev { title: string; slug?: string; date: string | null; time: string | null; end_time: string | null; location: string | null }
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

  const mail = confirmationEmail(reg, ev, from)
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

/**
 * Written to read like a note from a person, not a newsletter: no links (free *.vercel.app addresses are a
 * common phishing signal), no buttons or images, a plain subject. Everything the student needs is in the text.
 */
export function confirmationEmail(reg: Reg, ev: Ev | undefined, from: string): Mail {
  const title = ev?.title || reg.event_title
  const first = reg.student_name.trim().split(/\s+/)[0]
  const team = reg.team_name?.trim() || ''
  const waitlisted = reg.status === 'Waitlisted'
  const people = team ? [{ name: reg.student_name, roll: reg.student_roll, lead: true }, ...(reg.team_members ?? []).map((m) => ({ ...m, lead: false }))] : []
  const amount = reg.payment_amount != null ? `Rs. ${reg.payment_amount}` : 'Paid'

  const subject = waitlisted
    ? `Your registration for ${title} (waitlist)`
    : `Your registration for ${title} is confirmed`
  const lead = waitlisted
    ? `we've received your payment. ${team ? `${team} is` : 'You are'} on the waitlist for ${title}, and we'll write to you as soon as a spot opens.`
    : `congratulations! We've received your payment, and ${team ? `${team} is` : 'you are'} registered for ${title}.`

  const rows: [string, string][] = [
    ...(team ? [['Team', team] as [string, string]] : []),
    ['When', when(ev)],
    ['Where', ev?.location || 'To be announced'],
    ['Paid', `${amount} (UTR ${groupUtr(reg.payment_utr || '')})`],
  ]
  const checkIn = team ? 'Everyone on the team should bring their college ID card and check in at the entrance.' : 'Please bring your college ID card and check in at the entrance.'

  const text = [
    `Hi ${first},`, '', lead.charAt(0).toUpperCase() + lead.slice(1), '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(people.length ? ['', 'Team members:', ...people.map((p) => `- ${p.name} (${p.roll})${p.lead ? ', leader' : ''}`)] : []),
    '', checkIn, '', 'If anything here looks wrong, just reply to this email.', '',
    'See you there,', 'TECHSPARK', 'Navkis College of Engineering, Hassan',
  ].join('\n')

  const p = 'margin:0 0 14px;font-size:15px;line-height:1.6'
  const html = `<!doctype html><html><body style="margin:0;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#1f2328;background:#ffffff">
<div style="max-width:520px">
<p style="${p}">Hi ${esc(first)},</p>
<p style="${p}">${esc(lead.charAt(0).toUpperCase() + lead.slice(1))}</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 14px;font-size:15px;line-height:1.6">
${rows.map(([k, v]) => `<tr><td style="padding:2px 16px 2px 0;color:#57606a;vertical-align:top">${esc(k)}</td><td style="padding:2px 0">${esc(v)}</td></tr>`).join('\n')}
</table>
${people.length ? `<p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#57606a">Team members</p>
<p style="${p}">${people.map((x) => `${esc(x.name)} (${esc(x.roll)})${x.lead ? ', leader' : ''}`).join('<br>')}</p>` : ''}
<p style="${p}">${esc(checkIn)}</p>
<p style="${p}">If anything here looks wrong, just reply to this email.</p>
<p style="margin:0;font-size:15px;line-height:1.6">See you there,<br>TECHSPARK<br><span style="color:#57606a">Navkis College of Engineering, Hassan</span></p>
</div></body></html>`

  return { from: `TECHSPARK Navkis <${from}>`, replyTo: from, to: reg.student_email, subject, text, html }
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
