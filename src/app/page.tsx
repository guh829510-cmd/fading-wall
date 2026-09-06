import Canvas from '@/components/Canvas'
import AuthButton from '@/components/AuthButton'
import BuyCredits from '@/components/BuyCredits'

export default function Home() {
  return (
    <main className="relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight">THE FADING WALL</h1>
          <p className="text-xs text-gray-500">One canvas. 4,000,000 pixels. Infinite war.</p>
        </div>
        <div className="flex items-center gap-3">
          <BuyCredits />
          <AuthButton />
        </div>
      </div>

      {/* Rules Banner */}
      <div className="absolute top-[73px] left-0 right-0 z-10 bg-black text-white text-xs py-2 px-6 flex items-center justify-center gap-6">
        <span>🎨 1 free pixel / 24h</span>
        <span>⚡ Pixels fade 5% daily</span>
        <span>🛡️ Refresh to defend</span>
        <span>💀 0% = dead pixel</span>
      </div>

      <Canvas />
    </main>
  )
}
