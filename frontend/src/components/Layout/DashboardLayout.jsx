import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const isMessages = location.pathname.startsWith('/messages');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col min-h-0">
        <div className={isMessages ? "flex-1 flex flex-col w-full min-h-0" : "p-6 max-w-[1600px] mx-auto w-full"}>
          {children}
        </div>
      </main>
    </div>
  );
}
