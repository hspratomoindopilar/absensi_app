'use client';

type HeaderProps = {
  schoolName: string;
  className: string;
  teacherName: string;
  onLogout: () => void;
};

export default function Header({ schoolName, className, teacherName, onLogout }: HeaderProps) {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-50 flex justify-between items-center">
      <div>
        <h1 className="font-bold text-base">Absensi {className}</h1>
        <p className="text-xs text-blue-100">{schoolName} | 👨‍🏫 {teacherName}</p>
      </div>
      <button
        onClick={onLogout}
        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-inner"
      >
        Keluar
      </button>
    </header>
  );
}