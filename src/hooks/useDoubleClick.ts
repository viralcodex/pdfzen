interface UseDoubleClickOptions<T> {
  target: T;
  delay?: number;
  onClick?: (value: T) => void;
  onDoubleClick?: (value: T) => void;
}

export function useDoubleClick<T>() {
  let lastClickTime = 0;
  let lastTarget: T | null = null;

  const handleClick = (options: UseDoubleClickOptions<T>) => {
    const { target, delay = 300, onClick, onDoubleClick } = options;
    const now = Date.now();
    const isDoubleClick = Object.is(lastTarget, target) && now - lastClickTime < delay;

    onClick?.(target);

    if (isDoubleClick) {
      lastClickTime = 0;
      lastTarget = null;
      onDoubleClick?.(target);
      return;
    }

    lastClickTime = now;
    lastTarget = target;
  };

  return handleClick;
}
