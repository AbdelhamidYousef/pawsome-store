import { useEffect, useState } from 'react';

// True while the shopper is scrolling down the page (past `offset`), false again as soon as they
// scroll up or come back near the top. Read once per animation frame, and a few pixels of jitter
// (trackpads, iOS rubber-banding) are ignored so the bar does not flicker.
export function useHideOnScroll(offset = 80, jitter = 6): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      if (y <= offset) setHidden(false);
      else if (y > last + jitter) setHidden(true);
      else if (y < last - jitter) setHidden(false);
      else return;
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [offset, jitter]);
  return hidden;
}
