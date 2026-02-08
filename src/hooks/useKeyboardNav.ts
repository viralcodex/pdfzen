import { createSignal, createMemo } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { type KeyEvent } from "@opentui/core";
import type { FocusableElement } from "../model/models";

export type { FocusableElement };

export function useKeyboardNav() {
  const [focusIndex, setFocusIndex] = createSignal(0);
  const [elements, setElements] = createSignal<FocusableElement[]>([]);
  const [isInputMode, setIsInputMode] = createSignal(false);

  // Memoize valid elements to avoid recalculating on every render
  const validElements = createMemo(() => 
    elements().filter((el) => !el.canFocus || el.canFocus())
  );

  // Memoize current focused element
  const focusedElement = createMemo(() => {
    const valid = validElements();
    const idx = Math.min(focusIndex(), valid.length - 1);
    return valid[Math.max(0, idx)] ?? null;
  });

  const registerElement = (element: FocusableElement) => {
    setElements((prev) => {
      if (prev.some((e) => e.id === element.id)) return prev;
      return [...prev, element];
    });
  };

  const unregisterElement = (id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
  };

  const clampIndex = (idx: number, length: number) => 
    length === 0 ? 0 : ((idx % length) + length) % length;

  const focusNext = () => {
    if (isInputMode()) return;
    const len = validElements().length;
    if (len === 0) return;
    setFocusIndex((prev) => clampIndex(prev + 1, len));
  };

  const focusPrev = () => {
    if (isInputMode()) return;
    const len = validElements().length;
    if (len === 0) return;
    setFocusIndex((prev) => clampIndex(prev - 1, len));
  };

  const focusById = (id: string) => {
    const idx = validElements().findIndex((el) => el.id === id);
    if (idx !== -1) setFocusIndex(idx);
  };

  const executeCurrentAction = () => {
    if (isInputMode()) return;
    focusedElement()?.onEnter?.();
  };

  const isFocused = (id: string) => focusedElement()?.id === id;

  const getFocusedId = () => focusedElement()?.id ?? null;

  const clearElements = () => {
    setElements([]);
    setFocusIndex(0);
  };

  useKeyboard((event: KeyEvent) => {
    // Allow Escape and Tab to exit input mode
    if (isInputMode()) {
      if (event.name === "escape") {
        setIsInputMode(false);
      } else if (event.name === "tab") {
        setIsInputMode(false);
        if (event.shift) {
          focusPrev();
        } else {
          focusNext();
        }
      }
      return;
    }
    
    switch (event.name) {
      case "tab":
        if (event.shift) {
          focusPrev();
        } else {
          focusNext();
        }
        break;
      case "return":
        executeCurrentAction();
        break;
      case "down":
      case "j":
        focusNext();
        break;
      case "up":
      case "k":
        focusPrev();
        break;
    }
  });

  return {
    registerElement,
    unregisterElement,
    isFocused,
    getFocusedId,
    focusById,
    focusIndex,
    clearElements,
    isInputMode,
    setIsInputMode,
  };
}
