import { GameView } from './components/SillyTavern/GameView'
import { useSillytavern } from './hooks/useSillytavern'

export function App() {
  const st = useSillytavern()

  if (!st.initialized) {
    return <div className="app-shell app-center">正在初始化独立酒馆...</div>
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Worldlet</p>
          <h1>独立酒馆前端</h1>
          <p className="subtitle">RPG 终端风格 · SillyTavern 世界书/预设兼容 · 变量快照回档</p>
        </div>
        <div className="toolbar">
          <button onClick={() => void st.createChat('新的冒险')}>新开局</button>
          <button onClick={st.openSettings}>设置</button>
          <button onClick={st.openLorebooks}>世界书</button>
          <button onClick={st.openPresets}>预设</button>
          <button onClick={st.openVariables}>变量</button>
        </div>
      </header>

      <section className="game-frame">
        {st.activeChat ? (
          <GameView />
        ) : (
          <div className="empty-state">
            <h2>还没有激活的冒险</h2>
            <p>点击「新开局」创建一个本地对话。之后可导入世界书、预设，并通过 XML 标签驱动剧情和变量。</p>
            <button onClick={() => void st.createChat('新的冒险')}>创建第一个开局</button>
          </div>
        )}
      </section>
    </main>
  )
}
