let audio: HTMLAudioElement | null = null;

export function startAlarm(src: string) {
  if (!audio) {
    audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
  }

  // restart from start each time
  audio.currentTime = 0;

  // try to play (may require user interaction once depending on env)
  audio.play().catch(() => {
    // If autoplay is blocked, it will start once user clicks anywhere
    // The UI modal will handle that naturally.
  });
}

export function stopAlarm() {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {}
}
