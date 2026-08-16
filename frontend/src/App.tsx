import Navigation from './components/Navigation'
import Toasts from './components/Toasts'
import Docket from './pages/Docket'
import FileCase from './pages/FileCase'
import MyDisputes from './pages/MyDisputes'
import JurorProfile from './pages/JurorProfile'
import { useVerdictStore } from './lib/store'

export default function App() {
  const { activeTab } = useVerdictStore()
  return (
    <div className="min-h-screen relative">
      <div className="relative z-10">
        <Navigation />
        <main>
          {activeTab === 'docket'     && <Docket      />}
          {activeTab === 'file'       && <FileCase    />}
          {activeTab === 'mydisputes' && <MyDisputes  />}
          {activeTab === 'profile'    && <JurorProfile/>}
        </main>
      </div>
      <Toasts />
    </div>
  )
}
