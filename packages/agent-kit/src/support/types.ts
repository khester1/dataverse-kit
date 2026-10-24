import type * as React from 'react';

/** One pill on the docked launcher. */
export interface LauncherItem {
  id: string;
  /** The accessible name, and the text revealed on expand. Always present to AT. */
  label: string;
  icon: React.ReactElement;
  /** Rendered as a count badge; omit or 0 for none. */
  badgeCount?: number;
}

/** A tab in the assistant panel's strip. Two or three; this is not a general TabList. */
export interface AssistantTab {
  id: string;
  label: string;
  icon?: React.ReactElement;
}

export interface FeedbackValue {
  /** 1..5, or 0 for "not rated". Submit is blocked until it is > 0. */
  rating: number;
  comment: string;
  /** REQUIRED by the reference surface — submit stays disabled until answered. */
  mayContact?: boolean;
}
