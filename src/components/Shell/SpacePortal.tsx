import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { GameView } from '../SillyTavern/GameView'
import { SettingsModal } from '../SillyTavern/SettingsModal'
import { LorebookModal } from '../SillyTavern/LorebookModal'
import { PresetModal } from '../SillyTavern/PresetModal'
import { VariablesModal } from '../SillyTavern/VariablesModal'
import { Toast } from '../SillyTavern/Toast'
import { useSillytavern } from '../../hooks/useSillytavern'

type PortalPage = 'home' | 'sessions' | 'chat' | 'workshop' | 'library' | 'settings'

const CARDS: Array<{
  page: Exclude<PortalPage, 'home'>
  title: string
  tag: string
  stream: string
  label: string
  desc: string
  cut: string
  rows: Array<{ label: string; value: string; accent?: boolean }>
}> = [
  {
    page: 'sessions',
    title: 'Session',
    tag: 'SYS::01',
    stream: 'LOG:01 // SAVE_ARCHIVE',
    label: '会话档案',
    desc: '选择、新建并进入一段本地冒险。',
    cut: 'cut-br',
    rows: [
      { label: 'Mode', value: 'GAME', accent: true },
      { label: 'Store', value: 'INDEXEDDB' },
      { label: 'Rollback', value: 'SNAPSHOT' },
    ],
  },
  {
    page: 'workshop',
    title: 'Workshop',
    tag: 'MOD::02',
    stream: 'BUILD // SCENARIO_FORGE',
    label: '创意工坊',
    desc: '后续用于开局模板、变量结构和展示面板创作。',
    cut: 'cut-tl',
    rows: [
      { label: 'Scenario', value: 'NEXT', accent: true },
      { label: 'Schema', value: 'PLAN' },
      { label: 'Panel', value: 'FORGE' },
    ],
  },
  {
    page: 'library',
    title: 'Library',
    tag: 'DAT::03',
    stream: 'BOOK // PRESET // VARS',
    label: '资料库',
    desc: '管理世界书、预设与当前对话变量。',
    cut: 'cut-tr',
    rows: [
      { label: 'Lore', value: 'LOCAL' },
      { label: 'Preset', value: 'OPENAI' },
      { label: 'Panel', value: 'VARS', accent: true },
    ],
  },
  {
    page: 'settings',
    title: 'Config',
    tag: 'CFG::04',
    stream: 'API // TAGS // BACKUP',
    label: '系统设置',
    desc: '配置 API、标签、格式提示词和备份。',
    cut: 'cut-bl',
    rows: [
      { label: 'API', value: 'ROUTED', accent: true },
      { label: 'Theme', value: 'DEEP' },
      { label: 'Mode', value: 'GAME' },
    ],
  },
]

export function SpacePortal() {
  const st = useSillytavern()
  const [page, setPage] = useState<PortalPage>('home')
  const [activeCard, setActiveCard] = useState<Exclude<PortalPage, 'home'>>('sessions')
  const [mouse, setMouse] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 })
  const [clock, setClock] = useState(() => new Date().toTimeString().slice(0, 8))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'deep-space')
    const id = window.setInterval(() => setClock(new Date().toTimeString().slice(0, 8)), 1000)
    return () => window.clearInterval(id)
  }, [])

  const particles = useMemo(
    () => Array.from({ length: 26 }, (_, index) => ({
      id: index,
      left: `${(index * 37) % 100}%`,
      top: `${(index * 53) % 100}%`,
      size: `${1 + (index % 3)}px`,
      duration: `${8 + (index % 9)}s`,
      delay: `${index % 7}s`,
    })),
    [],
  )

  const sortedChats = useMemo(
    () => [...st.chats].sort((a, b) => b.updatedAt - a.updatedAt),
    [st.chats],
  )

  const openPage = (next: Exclude<PortalPage, 'home'>) => {
    setActiveCard(next)
    if (next === 'chat' && !st.activeChat) {
      setPage('sessions')
      return
    }
    setPage((current) => (current === next ? 'home' : next))
  }

  const handleCreateChat = async () => {
    const name = window.prompt('新建会话名称', `新的冒险 ${st.chats.length + 1}`)
    if (!name?.trim()) return
    await st.createChat(name.trim())
    setActiveCard('chat')
    setPage('chat')
  }

  const handleEnterChat = (id: string) => {
    st.selectChat(id)
    setActiveCard('chat')
    setPage('chat')
  }

  const handleDeleteChat = async (id: string, name: string) => {
    if (!window.confirm(`删除会话「${name}」?`)) return
    await st.removeChat(id)
  }

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    setMouse({
      x: (event.clientX / window.innerWidth - 0.5) * 2,
      y: (event.clientY / window.innerHeight - 0.5) * 2,
      clientX: event.clientX,
      clientY: event.clientY,
    })
  }

  return (
    <div className="space-portal" onMouseMove={handleMouseMove}>
      <div className="space-starfield" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="space-particle"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              animationDuration: particle.duration,
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>
      <span className="space-crosshair" aria-hidden="true" style={{ transform: `translate3d(${mouse.clientX}px, ${mouse.clientY}px, 0)` }} />
      <div className="space-corner space-corner-tl" aria-hidden="true" />
      <div className="space-corner space-corner-tr" aria-hidden="true" />
      <div className="space-corner space-corner-bl" aria-hidden="true" />
      <div className="space-corner space-corner-br" aria-hidden="true" />
      <div className="space-scanline" aria-hidden="true" />
      <div className="space-statusbar">
        <span>WORLDLET TERMINAL</span>
        <span>{page === 'home' ? 'CORE IDLE' : `PANEL / ${page.toUpperCase()}`}</span>
        <span>{clock}</span>
      </div>

      {page !== 'chat' && (
        <aside className="space-card-column" aria-label="主导航">
          <div className="space-brand">
            <span className="space-brand-kicker">WORLDLET</span>
            <strong>酒馆终端</strong>
          </div>
          {CARDS.map((card, index) => (
            <button
              key={card.page}
              className={`space-nav-card ${card.cut} ${activeCard === card.page ? 'active' : ''}`}
              style={{ transform: `perspective(1000px) rotateX(${mouse.y * -2.4}deg) rotateY(${mouse.x * 3.2}deg) translateZ(${activeCard === card.page ? 22 : 0}px)` }}
              onClick={() => openPage(card.page)}
            >
              <span className="space-card-glow" />
              <span className="space-card-header">
                <span className="space-card-tag">{card.tag}</span>
                <span className="space-card-index">0{index + 1}</span>
              </span>
              <span className="space-card-title">{card.title}</span>
              <span className="space-data-stream">{card.stream}</span>
              <span className="space-accent-bar" />
              <span className="space-card-label">{card.label}</span>
              <span className="space-card-desc">{card.desc}</span>
              <span className="space-card-rows">
                {card.rows.map((row) => (
                  <span key={row.label} className="space-card-row">
                    <span>{row.label}</span>
                    <span className={row.accent ? 'accent' : ''}>{row.value}</span>
                  </span>
                ))}
              </span>
            </button>
          ))}
        </aside>
      )}

      <main className={`space-panel-wrap ${page === 'chat' ? 'chat-fullscreen-wrap' : ''}`}>
        <section className={`space-core ${page === 'home' ? '' : 'morph-to-panel'} ${page === 'chat' ? 'chat-fullscreen-core' : ''}`}>
          {page === 'home' ? (
            <CoreIdle activeCard={activeCard} onCreate={handleCreateChat} />
          ) : (
            <div className="space-panel-content">
              <PanelHeader title={panelTitle(page)} subtitle={panelSubtitle(page)} onBack={() => setPage('home')} />
              {page === 'sessions' && (
                <SessionsPage
                  chats={sortedChats}
                  activeChatId={st.activeChat?.id ?? null}
                  onCreate={handleCreateChat}
                  onEnter={handleEnterChat}
                  onDelete={handleDeleteChat}
                />
              )}
              {page === 'chat' && (
                <div className="embedded-chat-page">
                  <div className="chat-toolbar">
                    <button onClick={() => setPage('sessions')}>返回会话</button>
                    <button onClick={() => st.openVariables()}>变量</button>
                    <button onClick={() => st.openLorebooks()}>世界书</button>
                    <button onClick={() => st.openPresets()}>预设</button>
                    <button onClick={() => st.openSettings()}>设置</button>
                  </div>
                  {st.activeChat ? <GameView /> : <EmptyPanel title="未选择会话" text="请返回会话列表选择或新建一个冒险。" />}
                </div>
              )}
              {page === 'library' && <LibraryPage onOpenLorebooks={st.openLorebooks} onOpenPresets={st.openPresets} onOpenVariables={st.openVariables} />}
              {page === 'workshop' && <WorkshopLanding />}
              {page === 'settings' && <SettingsLanding onOpenSettings={st.openSettings} />}
            </div>
          )}
        </section>
      </main>

      {st.showSettings && st.settings && <SettingsModal settings={st.settings} updateSettings={st.updateSettings} onClose={() => st.setShowSettings(false)} />}
      {st.showLorebooks && <LorebookModal onClose={() => st.setShowLorebooks(false)} />}
      {st.showPresets && <PresetModal onClose={() => st.setShowPresets(false)} />}
      {st.showVariables && <VariablesModal onClose={() => st.setShowVariables(false)} />}
      <Toast message={st.toast} />
    </div>
  )
}

function CoreIdle({ activeCard, onCreate }: { activeCard: PortalPage; onCreate: () => void }) {
  const card = CARDS.find((item) => item.page === activeCard) ?? CARDS[0]
  return (
    <div className="hex-idle-content">
      <span className="hex-core-ring" />
      <span className="hex-core-ring hex-core-ring-delay" />
      <div>
        <div className="hex-core-label">{card.title}</div>
        <div className="hex-core-id">SELECT MODULE / {card.label}</div>
      </div>
      <div className="hex-log-panel">
        <p>{card.desc}</p>
        <p>选择左侧终端卡片，或直接新建一段冒险。</p>
        <button className="primary-command" onClick={onCreate}>+ 新开局</button>
      </div>
    </div>
  )
}

function PanelHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <header className="space-panel-header">
      <div>
        <div className="panel-title-row">
          <h1 className="panel-title">{title}</h1>
          <span className="panel-subtitle">{subtitle}</span>
        </div>
        <div className="panel-divider" />
      </div>
      <button className="panel-back-btn" onClick={onBack}>关闭页面</button>
    </header>
  )
}

function SessionsPage({
  chats,
  activeChatId,
  onCreate,
  onEnter,
  onDelete,
}: {
  chats: Array<{ id: string; name: string; updatedAt: number; messages: unknown[]; variables?: Record<string, unknown> }>
  activeChatId: string | null
  onCreate: () => void
  onEnter: (id: string) => void
  onDelete: (id: string, name: string) => void
}) {
  return (
    <div className="space-section">
      <div className="session-command-row">
        <button className="primary-command" onClick={onCreate}>+ 新建会话</button>
        <span>{chats.length} 个会话档案</span>
      </div>
      {chats.length === 0 ? (
        <EmptyPanel title="暂无会话" text="点击「新建会话」创建第一段剧情。" />
      ) : (
        <div className="session-grid">
          {chats.map((chat) => (
            <article key={chat.id} className={`session-card ${chat.id === activeChatId ? 'active' : ''}`}>
              <div>
                <span className="session-state">{chat.id === activeChatId ? '当前会话' : '存档'}</span>
                <h2>{chat.name}</h2>
                <p>{new Date(chat.updatedAt).toLocaleString()}</p>
              </div>
              <div className="session-meta">
                <span>{chat.messages.length} 条消息</span>
                <span>{Object.keys(chat.variables ?? {}).length} 个变量</span>
              </div>
              <div className="session-actions">
                <button onClick={() => onEnter(chat.id)}>进入会话</button>
                <button className="danger" onClick={() => onDelete(chat.id, chat.name)}>删除</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function LibraryPage({ onOpenLorebooks, onOpenPresets, onOpenVariables }: { onOpenLorebooks: () => void; onOpenPresets: () => void; onOpenVariables: () => void }) {
  return (
    <div className="launcher-grid">
      <LauncherPanel title="世界书" text="导入、启用并编辑 SillyTavern 世界书。" action="打开世界书" onClick={onOpenLorebooks} />
      <LauncherPanel title="预设" text="管理提示词、采样参数与 prompt_order。" action="打开预设" onClick={onOpenPresets} />
      <LauncherPanel title="变量" text="查看并编辑当前会话变量快照。" action="打开变量面板" onClick={onOpenVariables} />
    </div>
  )
}

function WorkshopLanding() {
  return (
    <div className="launcher-grid">
      <div className="launcher-panel">
        <h2>创意工坊</h2>
        <p>这里将和后续 MOD 工坊阶段一起实现：开局模板、变量结构编辑器、自定义展示面板与导入导出。</p>
        <button className="primary-command" disabled>等待 Phase 3 实现</button>
      </div>
      <div className="launcher-panel">
        <h2>规划目标</h2>
        <p>把废案中的 MOD 工坊重新定位为“可视化开局创作工具”，避免迁移旧 Agent 生成逻辑。</p>
      </div>
    </div>
  )
}

function SettingsLanding({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="launcher-grid">
      <LauncherPanel title="系统设置" text="配置 API、标签、格式提示词、显示与备份。" action="打开设置" onClick={onOpenSettings} />
      <div className="launcher-panel">
        <h2>Deep Space</h2>
        <p>当前界面已固定为深空终端主题，后续可接入主题切换。</p>
      </div>
    </div>
  )
}

function LauncherPanel({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) {
  return (
    <article className="launcher-panel">
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="primary-command" onClick={onClick}>{action}</button>
    </article>
  )
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-panel">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function panelTitle(page: PortalPage) {
  if (page === 'sessions') return '会话'
  if (page === 'chat') return '对话终端'
  if (page === 'library') return '资料库'
  if (page === 'workshop') return '创意工坊'
  if (page === 'settings') return '设置'
  return '核心'
}

function panelSubtitle(page: PortalPage) {
  if (page === 'sessions') return 'SESSION SELECTOR'
  if (page === 'chat') return 'LIVE STORY CHANNEL'
  if (page === 'library') return 'LORE / PRESET / VARS'
  if (page === 'workshop') return 'SCENARIO WORKSHOP'
  if (page === 'settings') return 'CONFIGURATION'
  return 'IDLE'
}
