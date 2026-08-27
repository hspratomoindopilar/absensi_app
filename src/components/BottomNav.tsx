export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 shadow-lg z-50 max-w-md mx-auto">
      <button className="flex flex-col items-center text-xs text-blue-600 font-bold">
        <span className="text-lg">🏠</span> <span>Home</span>
      </button>
      <button className="flex flex-col items-center text-xs text-slate-400 font-medium">
        <span className="text-lg">📈</span> <span>Rekap</span>
      </button>
      <button className="flex flex-col items-center text-xs text-slate-400 font-medium">
        <span className="text-lg">🎮</span> <span>Quest</span>
      </button>
    </nav>
  );
}