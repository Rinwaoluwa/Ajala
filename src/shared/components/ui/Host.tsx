import { Host as ExpoHost } from '@expo/ui';
import { useCallback, useState, type ComponentProps } from 'react';

/**
 * Expo UI's `Host`, with its content size applied on time. Use this one
 * everywhere instead of `@expo/ui`'s own.
 *
 * With `matchContents`, the native Host writes SwiftUI's size straight into
 * React Native's layout node (`setStyleSize`) and nothing asks React Native
 * to lay out again. The new size only showed at the next unrelated layout
 * pass: a button sat at zero width and a "Manage" link sat too high until
 * something else on the screen re-rendered, and then they jumped. That was
 * much of the UI moving about by itself.
 *
 * The native side reports the same size through `onLayoutContent` a moment
 * later. Here that becomes state and the view's own width and height, so
 * React commits a layout straight away and the view lands where it belongs.
 * Without `matchContents` this is the plain Host.
 *
 * Safe area: ignored by default (`ignoreSafeArea="all"`). A SwiftUI hosting
 * view keeps its content out of the window's safe area, so a Host first laid
 * out near the foot of the screen (over the home indicator, under a pinned
 * footer) pushed its content up — a "Manage" link half its height above its
 * label, a text box's placeholder on its top edge — and nothing laid it out
 * again after scrolling until an unrelated re-render. A Host is always inside
 * a React Native screen that already keeps clear of the safe area, so its
 * content never needs to. Pass `ignoreSafeArea` to choose otherwise.
 */
type HostProps = ComponentProps<typeof ExpoHost>;
type Size = { width: number; height: number };

export function Host({ matchContents, onLayoutContent, style, ignoreSafeArea = 'all', ...props }: HostProps) {
  const [size, setSize] = useState<Size | null>(null);
  const horizontal = typeof matchContents === 'object' ? !!matchContents.horizontal : !!matchContents;
  const vertical = typeof matchContents === 'object' ? !!matchContents.vertical : !!matchContents;
  const sized = horizontal || vertical;

  const handleLayout = useCallback<NonNullable<HostProps['onLayoutContent']>>(
    (event) => {
      if (sized) {
        const { width, height } = event.nativeEvent;
        setSize((s) => (s && s.width === width && s.height === height ? s : { width, height }));
      }
      onLayoutContent?.(event);
    },
    [sized, onLayoutContent],
  );

  return (
    <ExpoHost
      {...props}
      matchContents={matchContents}
      ignoreSafeArea={ignoreSafeArea}
      onLayoutContent={handleLayout}
      style={[
        style,
        size
          ? { ...(horizontal ? { width: size.width } : null), ...(vertical ? { height: size.height } : null) }
          : null,
      ]}
    />
  );
}
