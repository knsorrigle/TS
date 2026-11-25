import { Copy, Download } from 'lucide-react'
import schema from '../../supabase/schema.sql?raw'
import { copyText } from '../lib/calendar'
import { Panel } from './ui'

export function SchemaTab() {
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([schema], { type: 'text/sql' }))
    a.download = 'techspark-schema.sql'
    a.click()
  }
  return (
    <Panel title="Database & schema" action={<div className="flex gap-2"><button type="button" onClick={() => copyText(schema, 'Schema copied')} className="pill pill--sm"><Copy size={14} /> Copy SQL</button><button type="button" onClick={download} className="pill pill--sm"><Download size={14} /> .sql</button></div>}>
      <ol className="grid gap-4 border-b border-line px-5 py-5 text-[14px] text-frost/85 md:grid-cols-3">
        <li><span className="t-num mr-2 font-[650] text-spark">1</span>Create a Supabase project, open <b>SQL Editor</b>, paste this and run it.</li>
        <li><span className="t-num mr-2 font-[650] text-spark">2</span>Create your account under <b>Authentication → Users</b>, then run the admin insert at the top of the file with your email.</li>
        <li><span className="t-num mr-2 font-[650] text-spark">3</span>Put the project URL and anon key in <code className="text-spark">.env.local</code> (and in Vercel env vars), then redeploy.</li>
      </ol>
      <pre data-lenis-prevent className="max-h-[60vh] overflow-auto px-5 py-5 font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[12.5px] leading-relaxed text-frost/80"><code>{schema}</code></pre>
    </Panel>
  )
}
