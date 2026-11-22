import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import type { SavedLocation } from '@/entities/location/model/types';
import { useRouter } from 'expo-router';
import { Check, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LABEL_PRESETS = ['Дім', 'Робота', 'Батьки', 'Офіс'] as const;

function getUkrainianLocationWord(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 19) {
    return 'локацій';
  }
  if (mod10 === 1) {
    return 'локація';
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'локації';
  }
  return 'локацій';
}

export function LocationsListView() {
  const router = useRouter();
  const theme = useAppTheme();
  const locations = useAppStore((s) => s.locations);
  const primaryLocationId = useAppStore((s) => s.primaryLocationId);
  const setPrimaryLocation = useAppStore((s) => s.setPrimaryLocation);
  const removeLocation = useAppStore((s) => s.removeLocation);
  const updateLocationLabel = useAppStore((s) => s.updateLocationLabel);

  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [labelDraft, setLabelDraft] = useState('');

  const handleOpenEdit = (location: SavedLocation) => {
    setEditingLocation(location);
    setLabelDraft(location.label ?? '');
  };

  const handleSaveLabel = () => {
    if (!editingLocation) {
      return;
    }
    updateLocationLabel(editingLocation.id, labelDraft);
    setEditingLocation(null);
    setLabelDraft('');
  };

  const handleDeletePress = (location: SavedLocation) => {
    const isPrimary = location.id === primaryLocationId;
    const otherLocations = locations.filter((item) => item.id !== location.id);
    const nextLocation = otherLocations[0] ?? null;

    let message = `Видалити адресу «${location.fullAddress}» зі списку?`;
    if (isPrimary && nextLocation) {
      message = `Це ваша основна адреса. Після видалення основною автоматично стане «${
        nextLocation.label || nextLocation.fullAddress
      }» (Група ${nextLocation.groupId}), а підписку на сповіщення буде оновлено.`;
    } else if (isPrimary && !nextLocation) {
      message =
        'Це ваша остання та основна адреса. Після видалення головний екран буде очищено, а push-сповіщення вимкнено.';
    }

    Alert.alert('Видалити локацію?', message, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => {
          removeLocation(location.id);
        },
      },
    ]);
  };

  const locationWord = getUkrainianLocationWord(locations.length);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }} edges={['top']}>
      <View className="px-4 pb-3 pt-3">
        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
          Збережені адреси
        </Text>
        <Text className="mt-0.5 text-xs" style={{ color: theme.textMuted }}>
          Львівська область • {locations.length} {locationWord}
        </Text>
      </View>

      {locations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pb-24">
          <View
            className="h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: theme.surfaceMuted }}
          >
            <MapPin size={30} color={theme.textMuted} />
          </View>
          <Text className="mt-4 text-center text-lg font-bold" style={{ color: theme.text }}>
            Список адрес порожній
          </Text>
          <Text className="mt-1.5 text-center text-sm leading-5" style={{ color: theme.textMuted }}>
            Додайте одну або кілька адрес у Львові чи області, щоб швидко перемикатись між ними.
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/add')}
            className="mt-6 flex-row items-center gap-2 rounded-2xl px-5 py-3.5"
            style={{ backgroundColor: theme.accent }}
          >
            <Plus size={18} color={theme.accentOnSolid} />
            <Text className="text-sm font-semibold" style={{ color: theme.accentOnSolid }}>
              Додати першу адресу
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ gap: 12, paddingTop: 4, paddingBottom: 112 }}
          showsVerticalScrollIndicator={false}
        >
          {locations.map((location) => {
            const isPrimary = location.id === primaryLocationId;

            return (
              <View
                key={location.id}
                className="rounded-2xl border p-4"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: isPrimary ? theme.accent : theme.border,
                }}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      {location.label ? (
                        <Text className="text-base font-bold" style={{ color: theme.text }}>
                          {location.label}
                        </Text>
                      ) : null}

                      <View
                        className="rounded-lg px-2 py-0.5"
                        style={{ backgroundColor: theme.accentSoft }}
                      >
                        <Text className="text-xs font-bold" style={{ color: theme.accentText }}>
                          Група {location.groupId}
                        </Text>
                      </View>

                      {isPrimary ? (
                        <View
                          className="flex-row items-center gap-1 rounded-lg px-2 py-0.5"
                          style={{ backgroundColor: theme.onHalfBg }}
                        >
                          <Star size={11} color={theme.onIcon} fill={theme.onIcon} />
                          <Text className="text-xs font-bold" style={{ color: theme.onText }}>
                            Основна
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text className="mt-1.5 text-sm" style={{ color: theme.textSecondary }}>
                      {location.fullAddress}
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-3.5 flex-row items-center gap-2 pt-3"
                  style={{ borderTopWidth: 1, borderTopColor: theme.borderSubtle }}
                >
                  {!isPrimary ? (
                    <Pressable
                      onPress={() => setPrimaryLocation(location.id)}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5"
                      style={{ backgroundColor: theme.accentSoft }}
                    >
                      <Check size={15} color={theme.accent} />
                      <Text className="text-xs font-semibold" style={{ color: theme.accentText }}>
                        Зробити основною
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => router.push('/(tabs)')}
                      className="flex-1 items-center justify-center rounded-xl py-2.5"
                      style={{ backgroundColor: theme.surfaceMuted }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: theme.textSecondary }}
                      >
                        Відкрити графік
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => handleOpenEdit(location)}
                    accessibilityLabel="Редагувати мітку"
                    className="h-10 w-10 items-center justify-center rounded-xl border"
                    style={{ backgroundColor: theme.surfaceInput, borderColor: theme.border }}
                  >
                    <Pencil size={16} color={theme.textSecondary} />
                  </Pressable>

                  <Pressable
                    onPress={() => handleDeletePress(location)}
                    accessibilityLabel="Видалити адресу"
                    className="h-10 w-10 items-center justify-center rounded-xl border"
                    style={{ backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }}
                  >
                    <Trash2 size={16} color={theme.dangerText} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={editingLocation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingLocation(null)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            className="flex-1 items-center justify-center bg-black/50 px-5"
            onPress={() => setEditingLocation(null)}
          >
            <Pressable
              className="w-full rounded-3xl border p-5"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold" style={{ color: theme.text }}>
                  Мітка локації
                </Text>
                <Pressable
                  onPress={() => setEditingLocation(null)}
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.surfaceMuted }}
                >
                  <X size={16} color={theme.textSecondary} />
                </Pressable>
              </View>

              <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                {editingLocation?.fullAddress}
              </Text>

              <TextInput
                value={labelDraft}
                onChangeText={setLabelDraft}
                placeholder="Наприклад: Дім, Робота, Батьки"
                placeholderTextColor={theme.textMuted}
                maxLength={32}
                autoFocus
                className="mt-3.5 rounded-xl border px-3.5 py-3 text-base"
                style={{
                  backgroundColor: theme.surfaceInput,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              />

              <View className="mt-3 flex-row flex-wrap gap-2">
                {LABEL_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setLabelDraft(preset)}
                    className="rounded-lg border px-3 py-1.5"
                    style={{
                      backgroundColor:
                        labelDraft === preset ? theme.accentSoft : theme.surfaceInput,
                      borderColor: labelDraft === preset ? theme.accent : theme.border,
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color: labelDraft === preset ? theme.accentText : theme.textSecondary,
                      }}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="mt-5 flex-row gap-2.5">
                <Pressable
                  onPress={() => setEditingLocation(null)}
                  className="flex-1 items-center rounded-xl border py-3"
                  style={{ borderColor: theme.border, backgroundColor: theme.surfaceInput }}
                >
                  <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                    Скасувати
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveLabel}
                  className="flex-1 items-center rounded-xl py-3"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Text className="text-sm font-semibold" style={{ color: theme.accentOnSolid }}>
                    Зберегти
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
