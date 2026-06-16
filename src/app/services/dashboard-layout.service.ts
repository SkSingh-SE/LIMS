import { Injectable } from '@angular/core';
import { CardLayout } from '../models/dashboardModels';

@Injectable({
  providedIn: 'root'
})
export class DashboardLayoutService {
  private readonly LAYOUT_STORAGE_KEY = 'dashboard-card-layout';

  constructor() { }

  /**
   * Save custom card layout to localStorage
   */
  saveLayout(layout: CardLayout[]): void {
    try {
      const layoutData = JSON.stringify(layout);
      localStorage.setItem(this.LAYOUT_STORAGE_KEY, layoutData);
      console.log('Dashboard layout saved:', layout);
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
    }
  }

  /**
   * Get custom card layout from localStorage
   */
  getLayout(): CardLayout[] | null {
    try {
      const layoutData = localStorage.getItem(this.LAYOUT_STORAGE_KEY);
      if (layoutData) {
        const layout = JSON.parse(layoutData) as CardLayout[];
        console.log('Dashboard layout loaded:', layout);
        return layout;
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
    }
    return null;
  }

  /**
   * Reset layout to default (remove custom layout)
   */
  resetLayout(): void {
    try {
      localStorage.removeItem(this.LAYOUT_STORAGE_KEY);
      console.log('Dashboard layout reset to default');
    } catch (error) {
      console.error('Failed to reset dashboard layout:', error);
    }
  }

  /**
   * Check if user has a custom layout saved
   */
  hasCustomLayout(): boolean {
    return localStorage.getItem(this.LAYOUT_STORAGE_KEY) !== null;
  }

  /**
   * Create default layout from cards
   */
  createDefaultLayout(cardKeys: string[]): CardLayout[] {
    return cardKeys.map((key, index) => ({
      cardKey: key,
      position: index,
      visible: true
    }));
  }

  /**
   * Apply custom layout to cards array
   */
  applyLayoutToCards<T extends { key: string }>(cards: T[], layout: CardLayout[]): T[] {
    if (!layout || layout.length === 0) {
      return cards;
    }

    // Create a map for quick lookup
    const layoutMap = new Map<string, CardLayout>();
    layout.forEach(item => layoutMap.set(item.cardKey, item));

    // Sort cards according to layout positions
    const sortedCards = [...cards].sort((a, b) => {
      const layoutA = layoutMap.get(a.key);
      const layoutB = layoutMap.get(b.key);
      
      // If both have layout positions, sort by position
      if (layoutA && layoutB) {
        return layoutA.position - layoutB.position;
      }
      
      // If only one has layout position, prioritize it
      if (layoutA && !layoutB) return -1;
      if (!layoutA && layoutB) return 1;
      
      // If neither has layout position, maintain original order
      return 0;
    });

    // Filter out cards that are marked as not visible
    return sortedCards.filter(card => {
      const layout = layoutMap.get(card.key);
      return !layout || layout.visible;
    });
  }

  /**
   * Update layout when cards are reordered
   */
  updateLayoutPositions(layout: CardLayout[], fromIndex: number, toIndex: number): CardLayout[] {
    const updatedLayout = [...layout];
    
    // Move the item from fromIndex to toIndex
    const [movedItem] = updatedLayout.splice(fromIndex, 1);
    updatedLayout.splice(toIndex, 0, movedItem);
    
    // Update positions to match new order
    updatedLayout.forEach((item, index) => {
      item.position = index;
    });
    
    return updatedLayout;
  }
}