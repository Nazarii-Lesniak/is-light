import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import type { SavedLocation } from '@/entities/location/model/types';
import { searchOblastCities } from '@/features/address-search/api/addressApi';
import { useAddressSearch } from '@/features/address-search/model/useAddressSearch';
import { type AddressSearchItem, type CityItem, LVIV_CITY_ID } from '@is-light/shared';
import { useRouter } from 'expo-router';
import { Building2, Check, ChevronDown, MapPin, Search, Tag, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

const LABEL_SUGGESTIONS = ['Дім', 'Робота', 'Батьки', 'Офіс'] as const;

const DEFAULT_CITY: CityItem = {
  id: LVIV_CITY_ID,
  name: 'Львів',
  otgName: 'Львівська',
};

export function AddLocationView() {
  const router = useRouter();
  const theme = useAppTheme();
  const locations = useAppStore((s) => s.locations);
  const primaryLocationId = useAppStore((s) => s.primaryLocationId);
  const addLocation = useAppStore((s) => s.addLocation);
  const setPrimaryLocation = useAppStore((s) => s.setPrimaryLocation);

  const [selectedCity, setSelectedCity] = useState<CityItem>(DEFAULT_CITY);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityItem[]>([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const cityAbortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressSearchItem | null>(null);
  const [label, setLabel] = useState('');

  const { items, isLoading, error, hasSearched } = useAddressSearch(query, selectedCity.id);

  const fetchCities = useCallback((search: string) => {
    cityAbortRef.current?.abort();
    const controller = new AbortController();
    cityAbortRef.current = controller;

    setIsCitiesLoading(true);
    setCityError(null);

    searchOblastCities(search, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) {
          return;
        }
        setCityResults(res.items);
        setIsCitiesLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setIsCitiesLoading(false);
        setCityError(
          err instanceof Error ? err.message : 'Не вдалося завантажити список населених пунктів.',
        );
      });
  }, []);

  useEffect(() => {
    if (!cityModalVisible) {
      cityAbortRef.current?.abort();
      return;
    }

    const delay = cityQuery.trim() ? 250 : 0;
    const timer = setTimeout(() => {
      fetchCities(cityQuery);
    }, delay);

    return () => {
      clearTimeout(timer);
      cityAbortRef.current?.abort();
    };
  }, [cityModalVisible, cityQuery, fetchCities]);

  const handleSelectCity = (city: CityItem) => {
    setSelectedCity(city);
    setQuery('');
    setSelectedAddress(null);
    setCityQuery('');
    setCityModalVisible(false);
  };

  const handleSelectResult = (item: AddressSearchItem) => {
    const duplicate = locations.find(
      (loc) =>
        loc.id === item.id ||
        (loc.streetId === item.streetId && loc.buildingName === item.buildingName),
    );
    if (duplicate) {
      Alert.alert(
        'Адреса вже у списку',
        `Локація «${duplicate.label || duplicate.fullAddress}» (Група ${duplicate.groupId}) вже збережена. Перейти до її графіка?`,
        [
          { text: 'Залишитись', style: 'cancel' },
          {
            text: 'Перейти до графіка',
            onPress: () => {
              setPrimaryLocation(duplicate.id);
              router.push('/(tabs)');
            },
          },
        ],
      );
      return;
    }

    setSelectedAddress(item);
  };

  const commitLocation = (makePrimary: boolean) => {
    if (!selectedAddress) {
      return;
    }

    const newLocation: SavedLocation = {
      id: selectedAddress.id,
      cityId: selectedAddress.cityId,
      cityName: selectedAddress.cityName,
      streetId: selectedAddress.streetId,
      streetName: selectedAddress.streetName,
      buildingName: selectedAddress.buildingName,
      fullAddress: selectedAddress.fullAddress,
      groupId: selectedAddress.groupId,
      label: label.trim() ? label.trim() : null,
      createdAt: new Date().toISOString(),
    };

    addLocation(newLocation, makePrimary);
    setSelectedAddress(null);
    setLabel('');
    setQuery('');
    router.push(makePrimary ? '/(tabs)' : '/(tabs)/list');
  };

  const handleSavePress = () => {
    if (!selectedAddress) {
      return;
    }

    const needsPrimaryPrompt = locations.length === 0 || primaryLocationId === null;
    if (needsPrimaryPrompt) {
      Alert.alert(
        'Основна адреса',
        'Зробити цю адресу основною для головного екрану та сповіщень?',
        [
          {
            text: 'Ні, лише зберегти',
            style: 'cancel',
            onPress: () => commitLocation(false),
          },
          {
            text: 'Так, зробити основною',
            onPress: () => commitLocation(true),
          },
        ],
      );
      return;
    }

    commitLocation(false);
  };

  const quickExamples =
    selectedCity.id === LVIV_CITY_ID
      ? ['вел 50', 'городоцька 12', 'стрийська 45']
      : ['шевченка 1', 'франка 10', 'галицька 5'];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }} edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="px-4 pb-2 pt-3">
          <Text className="text-2xl font-bold" style={{ color: theme.text }}>
            Додати адресу
          </Text>
          <Text className="mt-0.5 text-sm" style={{ color: theme.textMuted }}>
            Пошук по м. Львів та всій Львівській області
          </Text>
        </View>

        {selectedAddress ? (
          <ScrollView
            className="flex-1 px-4 pt-2"
            contentContainerStyle={{ paddingBottom: 112 }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              className="rounded-2xl border p-4"
              style={{ backgroundColor: theme.surface, borderColor: theme.accent }}
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: theme.accentText }}
                  >
                    Обрана адреса • {selectedAddress.cityName}
                  </Text>
                  <Text className="mt-1 text-lg font-bold" style={{ color: theme.text }}>
                    {selectedAddress.fullAddress}
                  </Text>
                  <View
                    className="mt-2 self-start rounded-lg px-2.5 py-1"
                    style={{ backgroundColor: theme.accentSoft }}
                  >
                    <Text className="text-xs font-bold" style={{ color: theme.accentText }}>
                      Група {selectedAddress.groupId}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setSelectedAddress(null)}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.surfaceMuted }}
                  accessibilityLabel="Змінити адресу"
                >
                  <X size={16} color={theme.textSecondary} />
                </Pressable>
              </View>

              <View
                className="mt-5 pt-4"
                style={{ borderTopWidth: 1, borderTopColor: theme.borderSubtle }}
              >
                <View className="flex-row items-center gap-1.5">
                  <Tag size={15} color={theme.textSecondary} />
                  <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                    Мітка локації (необовʼязково)
                  </Text>
                </View>
                <Text className="mt-0.5 text-xs" style={{ color: theme.textMuted }}>
                  Допоможе швидше орієнтуватися серед кількох адрес
                </Text>

                <TextInput
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Наприклад: Дім, Робота, Батьки"
                  placeholderTextColor={theme.textMuted}
                  maxLength={32}
                  className="mt-3 rounded-xl border px-3.5 py-3 text-base"
                  style={{
                    backgroundColor: theme.surfaceInput,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                />

                <View className="mt-2.5 flex-row flex-wrap gap-2">
                  {LABEL_SUGGESTIONS.map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => setLabel(preset)}
                      className="rounded-lg border px-3 py-1.5"
                      style={{
                        backgroundColor: label === preset ? theme.accentSoft : theme.surfaceInput,
                        borderColor: label === preset ? theme.accent : theme.border,
                      }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: label === preset ? theme.accentText : theme.textSecondary }}
                      >
                        {preset}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="mt-6 flex-row gap-2.5">
                <Pressable
                  onPress={() => setSelectedAddress(null)}
                  className="flex-1 items-center rounded-2xl border py-3.5"
                  style={{ borderColor: theme.border, backgroundColor: theme.surfaceInput }}
                >
                  <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                    Назад
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSavePress}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl py-3.5"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Check size={17} color={theme.accentOnSolid} />
                  <Text className="text-sm font-semibold" style={{ color: theme.accentOnSolid }}>
                    Зберегти
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1 px-4 pt-1">
            <Pressable
              onPress={() => setCityModalVisible(true)}
              className="mb-2.5 flex-row items-center justify-between rounded-2xl border px-3.5 py-2.5"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            >
              <View className="flex-row items-center gap-2.5">
                <View
                  className="h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.accentSoft }}
                >
                  <Building2 size={16} color={theme.accent} />
                </View>
                <View>
                  <Text className="text-[11px]" style={{ color: theme.textMuted }}>
                    Населений пункт
                  </Text>
                  <Text className="text-sm font-bold" style={{ color: theme.text }}>
                    {selectedCity.name}
                    {selectedCity.otgName ? ` (${selectedCity.otgName} ОТГ)` : ''}
                  </Text>
                </View>
              </View>

              <ChevronDown size={18} color={theme.textMuted} />
            </Pressable>

            <View
              className="flex-row items-center rounded-2xl border px-3.5"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            >
              <Search size={20} color={theme.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={
                  selectedCity.id === LVIV_CITY_ID
                    ? 'Вулиця та будинок, напр.: вел 50'
                    : 'Введіть вулицю та номер будинку'
                }
                placeholderTextColor={theme.textMuted}
                returnKeyType="search"
                className="ml-2.5 flex-1 py-3.5 text-base"
                style={{ color: theme.text }}
              />
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery('')}
                  className="p-1"
                  accessibilityLabel="Очистити пошук"
                >
                  <X size={18} color={theme.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              className="mt-3 flex-1"
              contentContainerStyle={{ paddingBottom: 112 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {error ? (
                <View
                  className="rounded-2xl border p-4"
                  style={{ backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }}
                >
                  <Text className="text-sm font-medium" style={{ color: theme.dangerText }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              {!isLoading && !error && hasSearched && items.length === 0 ? (
                <View
                  className="items-center rounded-2xl border px-6 py-10"
                  style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                >
                  <Text className="text-base font-bold" style={{ color: theme.text }}>
                    Нічого не знайдено
                  </Text>
                  <Text className="mt-1.5 text-center text-sm" style={{ color: theme.textMuted }}>
                    Спробуйте ввести коротшу частину назви вулиці або перевірте обраний населений
                    пункт ({selectedCity.name}).
                  </Text>
                </View>
              ) : null}

              {query.trim().length < 2 ? (
                <View
                  className="mt-1 rounded-2xl border p-4"
                  style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                >
                  <Text
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: theme.textMuted }}
                  >
                    Приклади швидкого пошуку ({selectedCity.name})
                  </Text>
                  <View className="mt-2.5 flex-row flex-wrap gap-2">
                    {quickExamples.map((example) => (
                      <Pressable
                        key={example}
                        onPress={() => setQuery(example)}
                        className="rounded-xl border px-3 py-2"
                        style={{
                          backgroundColor: theme.surfaceInput,
                          borderColor: theme.border,
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: theme.textSecondary }}
                        >
                          {example}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {items.length > 0 ? (
                <View
                  className="overflow-hidden rounded-2xl border"
                  style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                >
                  {items.map((item, idx) => {
                    const alreadySaved = locations.some(
                      (loc) =>
                        loc.id === item.id ||
                        (loc.streetId === item.streetId && loc.buildingName === item.buildingName),
                    );
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => handleSelectResult(item)}
                        className="flex-row items-center px-4 py-3.5"
                        style={
                          idx > 0
                            ? { borderTopWidth: 1, borderTopColor: theme.borderSubtle }
                            : undefined
                        }
                      >
                        <View
                          className="h-9 w-9 items-center justify-center rounded-xl"
                          style={{ backgroundColor: theme.accentSoft }}
                        >
                          <MapPin size={17} color={theme.accent} />
                        </View>

                        <View className="ml-3 flex-1">
                          <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                            {item.fullAddress} — Група {item.groupId}
                          </Text>
                          {alreadySaved ? (
                            <Text
                              className="mt-0.5 text-xs font-medium"
                              style={{ color: theme.onIcon }}
                            >
                              Вже збережено у списку
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={cityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            className="flex-1 justify-end bg-black/50"
            onPress={() => setCityModalVisible(false)}
          >
            <Pressable
              className="max-h-[82%] rounded-t-3xl px-5 pb-8 pt-4"
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
                  Населений пункт
                </Text>
                <Pressable
                  onPress={() => setCityModalVisible(false)}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.surfaceMuted }}
                >
                  <X size={18} color={theme.textSecondary} />
                </Pressable>
              </View>

              <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                Понад 2 000 міст і сіл Львівської області
              </Text>

              <View
                className="mt-3 flex-row items-center rounded-xl border px-3"
                style={{ backgroundColor: theme.surfaceInput, borderColor: theme.border }}
              >
                <Search size={18} color={theme.textMuted} />
                <TextInput
                  value={cityQuery}
                  onChangeText={setCityQuery}
                  placeholder="Пошук міста або села (напр.: Дрогобич, Стрий)..."
                  placeholderTextColor={theme.textMuted}
                  autoFocus
                  className="ml-2 flex-1 py-3 text-base"
                  style={{ color: theme.text }}
                />
                {isCitiesLoading ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : cityQuery.length > 0 ? (
                  <Pressable onPress={() => setCityQuery('')}>
                    <X size={16} color={theme.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                className="mt-3 max-h-[360px]"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {cityError && !isCitiesLoading ? (
                  <View
                    className="items-center rounded-2xl border px-4 py-6"
                    style={{ backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }}
                  >
                    <Text
                      className="text-center text-sm font-medium"
                      style={{ color: theme.dangerText }}
                    >
                      {cityError}
                    </Text>
                    <Pressable
                      onPress={() => fetchCities(cityQuery)}
                      className="mt-3 rounded-xl px-4 py-2"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: theme.accentOnSolid }}
                      >
                        Спробувати ще раз
                      </Text>
                    </Pressable>
                  </View>
                ) : cityResults.length === 0 && !isCitiesLoading ? (
                  <View className="items-center py-8">
                    <Text className="text-sm" style={{ color: theme.textMuted }}>
                      Населених пунктів не знайдено
                    </Text>
                  </View>
                ) : (
                  <View className="gap-2 pb-2">
                    {cityResults.map((city) => {
                      const isActive = city.id === selectedCity.id;
                      return (
                        <Pressable
                          key={city.id}
                          onPress={() => handleSelectCity(city)}
                          className="flex-row items-center justify-between rounded-2xl border px-3.5 py-3"
                          style={{
                            backgroundColor: isActive ? theme.accentSoft : theme.surfaceInput,
                            borderColor: isActive ? theme.accent : theme.border,
                          }}
                        >
                          <View className="flex-1 pr-2">
                            <Text className="text-sm font-bold" style={{ color: theme.text }}>
                              {city.name}
                            </Text>
                            {city.otgName ? (
                              <Text className="text-xs" style={{ color: theme.textMuted }}>
                                {city.otgName} громада
                              </Text>
                            ) : null}
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
    </SafeAreaView>
  );
}
