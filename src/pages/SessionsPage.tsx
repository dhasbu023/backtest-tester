
import { SessionList } from '../components/Session/SessionList.js';
import { CreateSessionModal } from '../components/Session/CreateSessionModal.js';
import type { BacktestSession } from '../types/index.js';

type SessionsPageProps = {
  sessions: BacktestSession[];
  isLoading: boolean;
  isCreateModalOpen: boolean;

  onSelectSession: (id: string) => void;
  onOpenCreateModal: () => void;
  onDeleteSession: (id: string) => void | Promise<void>;

  onCloseCreateModal: () => void;
  onSessionCreated: (id: string) => void | Promise<void>;
};

export default function SessionsPage({
  sessions,
  isLoading,
  isCreateModalOpen,
  onSelectSession,
  onOpenCreateModal,
  onDeleteSession,
  onCloseCreateModal,
  onSessionCreated,
}: SessionsPageProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <SessionList
          sessions={sessions}
          isLoading={isLoading}
          onSelectSession={onSelectSession}
          onOpenCreateModal={onOpenCreateModal}
          onDeleteSession={onDeleteSession}
        />
      </div>

      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={onCloseCreateModal}
        onSessionCreated={onSessionCreated}
      />
    </>
  );
}
