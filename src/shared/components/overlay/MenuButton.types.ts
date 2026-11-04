import type { ReactNode } from 'react';

/** One choice in a `MenuButton`. */
export type MenuAction = {
  label: string;
  onPress: () => void;
  /** Drawn in red: reporting, cancelling, deleting. */
  destructive?: boolean;
  /** iOS: the SF Symbol beside the label ("flag", "trash"). */
  systemImage?: string;
};

export type MenuButtonProps = {
  /** What the button looks like; the menu opens from it. */
  children: ReactNode;
  actions: MenuAction[];
  /** Read out for the button; also the title of Android's dialog. */
  accessibilityLabel: string;
  /** Android: the dialog's dismiss button ("Close"). */
  cancelLabel: string;
};
