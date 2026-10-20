
import { useEffect } from 'react';

type UseReplayKeyboardProps = {
  enabled: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  handleNextCandle: () => void;
  handlePrevCandle: () => void;
};

export function useReplayKeyboard({
  enabled,
  setIsPlaying,
  handleNextCandle,
  handlePrevCandle,
}: UseReplayKeyboardProps): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      // Jangan mengambil alih keyboard saat pengguna sedang mengetik.
      if (
        target &&
        (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable
        )
      ) {
        return;
      }

      // Space: play/pause replay.
      if (event.code === 'Space') {
        event.preventDefault();
        setIsPlaying((playing) => !playing);
        return;
      }

      // ArrowRight: candle berikutnya.
      if (event.code === 'ArrowRight') {
        event.preventDefault();
        handleNextCandle();
        return;
      }

      // ArrowLeft: candle sebelumnya.
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        handlePrevCandle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    setIsPlaying,
    handleNextCandle,
    handlePrevCandle,
  ]);
}
