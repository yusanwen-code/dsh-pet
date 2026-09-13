import { useMemo, useState } from 'react'

import type { PetEvent, PetManifest, PetState } from '@dsh-pet/protocol'
import { PetCard } from '@dsh-pet/web'
import manifestJson from '../../../pets/deepseek/pet.json' with { type: 'json' }

const states: readonly PetState[] = ['idle', 'thinking', 'tool', 'success', 'error']
const logoUrl = new URL('../../../assets/logo.svg', import.meta.url).href
const stateCopy: Record<PetState, { title: string; description: string }> = {
  idle: { title: '待命', description: 'Harness 正在等待下一条指令。' },
  thinking: { title: '思考', description: '模型正在生成或整理回复。' },
  tool: { title: '工具', description: '代理正在调用一个已注册工具。' },
  success: { title: '完成', description: '当前回合已经顺利结束。' },
  error: { title: '异常', description: '当前尝试失败或被取消。' },
}

const assetUrls: Record<PetState, string> = {
  idle: new URL('../../../pets/deepseek/assets/idle.svg', import.meta.url).href,
  thinking: new URL('../../../pets/deepseek/assets/thinking.svg', import.meta.url).href,
  tool: new URL('../../../pets/deepseek/assets/tool.svg', import.meta.url).href,
  success: new URL('../../../pets/deepseek/assets/success.svg', import.meta.url).href,
  error: new URL('../../../pets/deepseek/assets/error.svg', import.meta.url).href,
}

const manifest: PetManifest = {
  ...(manifestJson as PetManifest),
  assets: Object.fromEntries(states.map((state) => [state, {
    ...manifestJson.assets[state],
    src: assetUrls[state],
  }])) as PetManifest['assets'],
}

function makeEvent(state: PetState): PetEvent {
  return {
    version: '0.1',
    state,
    sessionId: 'demo-session',
    timestamp: Date.now(),
    ...(state === 'tool' ? { toolName: 'bash' } : {}),
  }
}

export function App() {
  const [event, setEvent] = useState<PetEvent>(() => makeEvent('idle'))
  const eventJson = useMemo(() => JSON.stringify(event, null, 2), [event])

  return (
    <main className="workbench">
      <section className="workbench__intro">
        <div className="eyebrow"><img src={logoUrl} alt="dsh-pet" /><i />PET PROTOCOL / 0.1</div>
        <h1>让代理的工作，<br /><em>有生命地发生。</em></h1>
        <p className="lede">dsh-pet 把 DeepSeek Harness 的事件接到任意宠物外观。统一协议就像一根数据线：一端是 Harness，另一端由创造者决定。</p>

        <div className="state-grid" aria-label="模拟宠物状态">
          {states.map((state) => (
            <button
              key={state}
              type="button"
              aria-label={state}
              data-active={event.state === state}
              onClick={() => setEvent(makeEvent(state))}
            >
              <span>{stateCopy[state].title}</span>
              <small>{state}</small>
            </button>
          ))}
        </div>

        <div className="event-console">
          <header><span>LIVE EVENT</span><b>{stateCopy[event.state].description}</b></header>
          <pre data-testid="event-json">{eventJson}</pre>
        </div>
      </section>

      <section className="workbench__preview" aria-label="宠物预览">
        <div className="preview-grid" aria-hidden="true" />
        <div className="preview-label">ACTIVE SURFACE <span>DSH WEB</span></div>
        <PetCard manifest={manifest} event={event} fallbackAsset={assetUrls.idle} />
        <p className="preview-note"><span>01</span> 点击宠物打招呼<br /><span>02</span> 用左侧事件切换状态</p>
      </section>
    </main>
  )
}
