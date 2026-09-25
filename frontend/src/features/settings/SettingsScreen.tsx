import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { IconButton } from '../../components/ui/IconButton';

export function SettingsScreen({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <header className="flex items-center gap-2 px-2 pb-2 pt-3">
        <IconButton label="Voltar" onClick={() => navigate('/ajustes')}>
          <ChevronLeft size={20} />
        </IconButton>
        <h1 className="font-display text-xl font-semibold">{title}</h1>
      </header>
      <div className="px-4">{children}</div>
    </div>
  );
}
