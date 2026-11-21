import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import type { SavedLocation } from '@/entities/location/model/types';
import { Check, MapPin, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LocationPickerModal({ visible, onClose }: LocationPickerModalProps) {
  const theme = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleSelect = (location: SavedLocation) => {
    setPrimaryLocation(location.id);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
          <Pressable
            className="max-h-[80%] rounded-t-3xl px-5 pb-8 pt-4"
            style={{
              backgroundColor: theme.surface,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              className="mb-3 h-1.5 w-12 self-center rounded-full"
              style={{ backgroundColor: theme.border }}
            />

            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold" style={{ color: theme.text }}>
                Основна локація
              </Text>
              <Pressable
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.surfaceMuted }}
                accessibilityLabel="Закрити"
              >
                <X size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
              Оберіть адресу для головного екрану та сповіщень
            </Text>

            <View
              className="mt-3.5 flex-row items-center rounded-xl border px-3"
              style={{
                backgroundColor: theme.surfaceInput,
                borderColor: theme.border,
              }}
            >
              <Search size={18} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Пошук серед збережених адрес..."
                placeholderTextColor={theme.textMuted}
                className="ml-2 flex-1 py-3 text-base"
                style={{ color: theme.text }}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <X size={16} color={theme.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              className="mt-3 max-h-[360px]"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredLocations.length === 0 ? (
                <View className="items-center py-8">
                  <Text className="text-sm" style={{ color: theme.textMuted }}>
                    {locations.length === 0
                      ? 'Збережених адрес поки немає'
                      : 'За вашим запитом адрес не знайдено'}
                  </Text>
                </View>
              ) : (
                <View className="gap-2 pb-2">
                  {filteredLocations.map((location) => {
                    const isActive = location.id === primaryLocationId;
                    return (
                      <Pressable
                        key={location.id}
                        onPress={() => handleSelect(location)}
                        className="flex-row items-center rounded-2xl border p-3.5"
                        style={{
                          backgroundColor: isActive ? theme.accentSoft : theme.surfaceInput,
                          borderColor: isActive ? theme.accent : theme.border,
                        }}
                      >
                        <View
                          className="h-10 w-10 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: isActive ? theme.accent : theme.surfaceMuted,
                          }}
                        >
                          <MapPin
                            size={18}
                            color={isActive ? theme.accentOnSolid : theme.textSecondary}
                          />
                        </View>

                        <View className="ml-3 flex-1">
                          {location.label ? (
                            <Text className="text-sm font-bold" style={{ color: theme.text }}>
                              {location.label}
                            </Text>
                          ) : null}
                          <Text
                            className={location.label ? 'text-xs' : 'text-sm font-semibold'}
                            style={{
                              color: location.label ? theme.textSecondary : theme.text,
                            }}
                            numberOfLines={1}
                          >
                            {location.fullAddress}
                          </Text>
                          <Text
                            className="mt-0.5 text-xs font-medium"
                            style={{ color: theme.accentText }}
                          >
                            Група {location.groupId}
                          </Text>
                        </View>

                        {isActive ? (
                          <View
                            className="h-7 w-7 items-center justify-center rounded-full"
                            style={{ backgroundColor: theme.accent }}
                          >
                            <Check size={15} color={theme.accentOnSolid} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
