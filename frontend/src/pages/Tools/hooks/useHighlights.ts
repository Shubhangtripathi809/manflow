import { useState, useCallback } from 'react';
import { Highlight } from '../../../types';


// The hook: useHighlights
export const useHighlights = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isHighlightMode, setIsHighlightMode] = useState(false);

  const addHighlight = useCallback((highlight: Omit<Highlight, 'id'>) => {
    const newHighlight: Highlight = {
      ...highlight,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    setHighlights(prev => [...prev, newHighlight]);
  }, []);

  const removeLastHighlight = useCallback(() => {
    setHighlights(prev => prev.slice(0, -1));
  }, []);

  const clearAllHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  const toggleHighlightMode = useCallback(() => {
    setIsHighlightMode(prev => !prev);
  }, []);

  return {
    highlights,
    isHighlightMode,
    addHighlight,
    removeLastHighlight,
    clearAllHighlights,
    toggleHighlightMode,
    canUndo: highlights.length > 0
  };
};