import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import type { SavedLocation } from '@/entities/location/model/types';
import {
  CONTINUOUS_CORNER,
  HIT_SLOP_STANDARD,
  LAYOUT,
  RADII,
  SPACING,
  TYPOGRAPHY,
} from '@/shared/theme/tokens';
import { AppBottomSheet } from '@/shared/ui/AppBottomSheet';
import { InteractiveSurface } from '@/shared/ui/InteractiveSurface';
import { Check, MapPin, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LocationPickerModal({ visible, onClose }: LocationPickerModalProps) {
  const theme = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const locations = useAppStore((s) => s.locations);
  const primaryLocationId = useAppStore((s) => s.primaryLocationId);
  const setPrimaryLocation = useAppStore((s) => s.setPrimaryLocation);

  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return locations;
    }
    return locations.filter((item) => {
      const haystack =
        `${item.label ?? ''} ${item.fullAddress} група ${item.groupId}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [locations, searchQuery]);

  const handleClose = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
    onClose();
  };

  const handleSelect = (location: SavedLocation) => {
    setPrimaryLocation(location.id);
    handleClose();
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={handleClose}
      title="Основна локація"
      subtitle="Оберіть адресу для головного екрану та сповіщень"
      avoidKeyboard
      maxHeightRatio={0.82}
    >
      <View
        style={[
          styles.searchBox,
          CONTINUOUS_CORNER,
          {
            backgroundColor: theme.surfaceInput,
            borderColor: isSearchFocused ? theme.accent : theme.border,
            borderWidth: isSearchFocused ? 1.5 : LAYOUT.borderWidth,
          },
        ]}
      >
        <Search size={18} color={isSearchFocused ? theme.accent : theme.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Пошук серед збережених адрес…"
          placeholderTextColor={theme.textMuted}
          style={[TYPOGRAPHY.body, styles.searchInput, { color: theme.text }]}
        />
        {searchQuery.length > 0 ? (
          <Pressable
            onPress={() => setSearchQuery('')}
            hitSlop={HIT_SLOP_STANDARD}
            accessibilityLabel="Очистити пошук"
          >
            <X size={16} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredLocations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[TYPOGRAPHY.callout, { color: theme.textMuted }]}>
              {locations.length === 0
                ? 'Збережених адрес поки немає'
                : 'За вашим запитом адрес не знайдено'}
            </Text>
          </View>
        ) : (
          filteredLocations.map((location) => {
            const isActive = location.id === primaryLocationId;
            return (
              <InteractiveSurface
                key={location.id}
                onPress={() => handleSelect(location)}
                scaleVariant="card"
                borderRadius={RADII.lg}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                contentStyle={[
                  styles.locationRow,
                  {
                    backgroundColor: isActive ? theme.accentSoft : theme.surfaceInput,
                    borderColor: isActive ? theme.accent : theme.border,
                    borderWidth: isActive ? 1.5 : LAYOUT.borderWidth,
                  },
                ]}
              >
                <View
                  style={[
                    styles.pinBadge,
                    CONTINUOUS_CORNER,
                    {
                      backgroundColor: isActive ? theme.accent : theme.surfaceMuted,
                    },
                  ]}
                >
                  <MapPin
                    size={18}
                    color={isActive ? theme.accentOnSolid : theme.textSecondary}
                    strokeWidth={2.1}
                  />
                </View>

                <View style={styles.rowTextWrap}>
                  {location.label ? (
                    <Text style={[TYPOGRAPHY.headline, { color: theme.text }]} numberOfLines={1}>
                      {location.label}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      location.label ? TYPOGRAPHY.footnote : TYPOGRAPHY.callout,
                      {
                        color: location.label ? theme.textSecondary : theme.text,
                        fontWeight: location.label ? '400' : '600',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {location.fullAddress}
                  </Text>
                  <Text style={[TYPOGRAPHY.caption, styles.groupText, { color: theme.accentText }]}>
                    Група {location.groupId}
                  </Text>
                </View>

                {isActive ? (
                  <View style={[styles.checkCircle, { backgroundColor: theme.accent }]}>
                    <Check size={14} color={theme.accentOnSolid} strokeWidth={2.6} />
                  </View>
                ) : null}
              </InteractiveSurface>
            );
          })
        )}
      </ScrollView>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.md + 2,
    paddingHorizontal: SPACING.sm,
    minHeight: 46,
    gap: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
  },
  list: {
    marginTop: SPACING.sm,
    maxHeight: 360,
  },
  listContent: {
    gap: SPACING.xs + 2,
    paddingBottom: SPACING.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.lg,
    padding: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  pinBadge: {
    width: 40,
    height: 40,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  groupText: {
    marginTop: 2,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
