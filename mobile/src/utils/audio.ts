/**
 * Audio Chime Utility
 *
 * Plays the fixed confirmation sound (success.wav) upon waste collection completion.
 */
import { createAudioPlayer } from 'expo-audio';

let successPlayer: ReturnType<typeof createAudioPlayer> | null = null;

/**
 * Play the single fixed success chime when a collection is recorded.
 */
export async function playSuccessSound(): Promise<void> {
  try {
    if (!successPlayer) {
      successPlayer = createAudioPlayer(require('../../assets/sounds/success.wav'));
    }
    successPlayer.seekTo(0);
    successPlayer.play();
  } catch {
    // Fail silently if audio output is unavailable
  }
}
