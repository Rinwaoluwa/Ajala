import { Host } from '@expo/ui';
import { Pressable, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { NativeIcon, NativeSpinner, StepProgress, Text, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { WIZARD_STEPS } from '../../domain/rules/postDraftRules';
import { wizardCopy } from '../copy';

/**
 * The wizard's top: a back arrow, the type's title and line ("New meetup /
 * Casual in-person gathering"), "Save draft" at the right, then the five-segment
 * indicator with the current step in Marigold.
 *
 * "Save draft" is the mint pill of the design. While saving it shows a spinner;
 * once saved it says so briefly (`justSaved`), fading between the two labels.
 * The title wraps rather than pushing the pill off-screen at large text sizes.
 */

export type WizardHeaderProps = {
  title: string;
  subtitle: string;
  step: number;
  onBack: () => void;
  onSaveDraft: () => void;
  canSaveDraft: boolean;
  saving: boolean;
  justSaved: boolean;
};

export function WizardHeader({
  title,
  subtitle,
  step,
  onBack,
  onSaveDraft,
  canSaveDraft,
  saving,
  justSaved,
}: WizardHeaderProps) {
  const theme = useTheme();
  const label = saving ? wizardCopy.savingDraft : justSaved ? wizardCopy.draftSaved : wizardCopy.saveDraft;

  return (
    <View className="px-20 pt-8">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={wizardCopy.back}
          testID="create-back"
          style={{ marginLeft: -4, padding: 4 }}
        >
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.back} size={18} color={theme.foreground} />
          </Host>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="headingMd" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="bodySm" tone="muted">
            {subtitle}
          </Text>
        </View>
        <Pressable
          onPress={onSaveDraft}
          disabled={!canSaveDraft || saving}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: !canSaveDraft || saving, busy: saving }}
          testID="create-save-draft"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: theme.selectedFill,
            opacity: canSaveDraft || saving ? 1 : 0.55,
          }}
        >
          {saving ? (
            <Host matchContents>
              <NativeSpinner size={12} color={theme.selectedForeground} />
            </Host>
          ) : null}
          <Animated.View key={label} entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
            {/* Capped so, at large text, the pill leaves the title room to read. */}
            <Text variant="labelSm" maxFontSizeMultiplier={1.3} style={{ color: theme.selectedForeground }}>
              {label}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
      <View className="mt-16">
        <StepProgress count={WIZARD_STEPS} current={step} tone="accent" />
      </View>
    </View>
  );
}
