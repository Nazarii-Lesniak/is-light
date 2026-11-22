import { useAppStore, useAppTheme } from '@/entities/location/model/store';
import type { SavedLocation } from '@/entities/location/model/types';
import { searchOblastCities } from '@/features/address-search/api/addressApi';
import { useAddressSearch } from '@/features/address-search/model/useAddressSearch';
import {
  CONTINUOUS_CORNER,
  HIT_SLOP_STANDARD,
  LAYOUT,
  MOTION,
  RADII,
  SPACING,
  TYPOGRAPHY,
  getElevation,
  getInteractiveTokens,
} from '@/shared/theme/tokens';
import { AppBottomSheet } from '@/shared/ui/AppBottomSheet';
import { GlassBackdrop } from '@/shared/ui/GlassBackdrop';
import { InteractiveSurface } from '@/shared/ui/InteractiveSurface';
import { type AddressSearchItem, type CityItem, LVIV_CITY_ID } from '@is-light/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { Building2, Check, ChevronDown, MapPin, Search, Tag, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LABEL_SUGGESTIONS = ['Дім', 'Робота', 'Батьки', 'Офіс'] as const;

const LVIV_QUICK_EXAMPLES = [
  'Вел 50',
  'Городо 72а',
  'Наук 19',
  'Стрий 45',
  'Чорнов 67',
  'Кульпар 226а',
  'Личак 34',
  'Пасіч 85',
  'Сихо 12',
  'Зелен 115',
  'Шевч 60',
  'Франк 45',
  'Бандер 12',
  'Ольги 100',
  'Мазеп 25',
  'Вигов 29',
  'Любін 92',
  'Патон 22',
  'Сахар 42',
  'Антон 90',
  'Копер 15',
  'Дорош 31',
  'Галиц 10',
  'Крак 14',
  'Замар 83',
  'Варшав 138',
  'Топол 4',
  'Грінч 11',
  'Лінкол 57',
  'Хоткев 38',
  'Драган 17',
  'Чуприн 55',
  'Коновал 88',
  'Пекар 24',
  'Левиц 64',
  'Стуса 18',
  'Угор 14',
  'Вашинг 6',
  'Тракт 150',
  'Ряшів 13',
  'Володимира Великого 50',
  'Вулиця Городоцька 12',
  'Проспект Свободи 18',
  'Проспект Чорновола 67',
  'Проспект Червоної Калини 62',
  'Степана Бандери 12',
  'Княгині Ольги 100',
  'Героїв УПА 73',
  'Івана Франка 45',
  'Богдана Хмельницького 176',
] as const;

const OBLAST_QUICK_EXAMPLES = [
  'Шевч 1',
  'Франк 10',
  'Галиц 5',
  'Груш 12',
  'Незал 15',
  'Миру 4',
  'Вокз 3',
  'Зелен 6',
  'Шкіл 2',
  'Молод 18',
  'Вулиця Шевченка 1',
  'Івана Франка 10',
  'Лесі Українки 8',
  'Січових Стрільців 14',
  'Богдана Хмельницького 22',
  'Петра Сагайдачного 7',
] as const;

const DEFAULT_CITY: CityItem = {
  id: LVIV_CITY_ID,
  name: 'Львів',
  otgName: 'Львівська',
};

const VISIBLE_EXAMPLES_COUNT = 5;

function pickRandomExamples(source: readonly string[], count: number): string[] {
  const pool = [...source];
  const target = Math.min(count, pool.length);
  for (let i = 0; i < target; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    const current = pool[i];
    const swap = pool[j];
    if (current !== undefined && swap !== undefined) {
      pool[i] = swap;
      pool[j] = current;
    }
  }
  return pool.slice(0, target);
}

export function AddLocationView() {
  const router = useRouter();
  const theme = useAppTheme();
  const elevation = getElevation(theme);
  const interactive = getInteractiveTokens(theme);
  const locations = useAppStore((s) => s.locations);
  const primaryLocationId = useAppStore((s) => s.primaryLocationId);
  const addLocation = useAppStore((s) => s.addLocation);
  const setPrimaryLocation = useAppStore((s) => s.setPrimaryLocation);

  const [selectedCity, setSelectedCity] = useState<CityItem>(DEFAULT_CITY);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityResults, setCityResults] = useState<CityItem[]>([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const cityAbortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressSearchItem | null>(null);
  const [label, setLabel] = useState('');
  const [isLabelFocused, setIsLabelFocused] = useState(false);

  const stepAnim = useRef(new Animated.Value(1)).current;
  const prevHasSelectedRef = useRef(false);

  const { items, isLoading, error, hasSearched } = useAddressSearch(query, selectedCity.id);
  const hasSelectedAddress = selectedAddress !== null;

  useEffect(() => {
    if (prevHasSelectedRef.current === hasSelectedAddress) {
      return;
    }
    prevHasSelectedRef.current = hasSelectedAddress;
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: MOTION.durationNormal,
      useNativeDriver: true,
    }).start();
  }, [hasSelectedAddress, stepAnim]);

  const fetchCities = useCallback(() => {
    cityAbortRef.current?.abort();
    const controller = new AbortController();
    cityAbortRef.current = controller;

    setIsCitiesLoading(true);
    setCityError(null);

    searchOblastCities('', controller.signal)
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

    fetchCities();

    return () => {
      cityAbortRef.current?.abort();
    };
  }, [cityModalVisible, fetchCities]);

  const handleSelectCity = (city: CityItem) => {
    setSelectedCity(city);
    setQuery('');
    setSelectedAddress(null);
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

  const [quickExamples, setQuickExamples] = useState<string[]>(() =>
    pickRandomExamples(LVIV_QUICK_EXAMPLES, VISIBLE_EXAMPLES_COUNT),
  );

  useFocusEffect(
    useCallback(() => {
      const pool = selectedCity.id === LVIV_CITY_ID ? LVIV_QUICK_EXAMPLES : OBLAST_QUICK_EXAMPLES;
      setQuickExamples(pickRandomExamples(pool, VISIBLE_EXAMPLES_COUNT));
    }, [selectedCity.id]),
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top']}>
      <GlassBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={[TYPOGRAPHY.largeTitle, { color: theme.text }]}>Додати адресу</Text>
          <Text style={[TYPOGRAPHY.subhead, styles.headerSubtitle, { color: theme.textMuted }]}>
            Пошук по м. Львів та всій Львівській області
          </Text>
        </View>

        <Animated.View
          style={[
            styles.flex,
            {
              opacity: stepAnim,
              transform: [
                {
                  translateY: stepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {selectedAddress ? (
            <ScrollView
              style={styles.confirmScroll}
              contentContainerStyle={styles.confirmContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.confirmCard,
                  CONTINUOUS_CORNER,
                  elevation.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.accent,
                  },
                ]}
              >
                <View style={styles.confirmHeader}>
                  <View style={styles.confirmTitleWrap}>
                    <Text
                      style={[
                        TYPOGRAPHY.caption,
                        styles.confirmKicker,
                        { color: theme.accentText },
                      ]}
                    >
                      ОБРАНА АДРЕСА · {selectedAddress.cityName.toUpperCase()}
                    </Text>
                    <Text style={[TYPOGRAPHY.title3, styles.confirmAddress, { color: theme.text }]}>
                      {selectedAddress.fullAddress}
                    </Text>
                    <View
                      style={[
                        styles.groupPill,
                        CONTINUOUS_CORNER,
                        { backgroundColor: theme.accentSoft },
                      ]}
                    >
                      <Text style={[TYPOGRAPHY.caption, { color: theme.accentText }]}>
                        Група {selectedAddress.groupId}
                      </Text>
                    </View>
                  </View>

                  <InteractiveSurface
                    onPress={() => setSelectedAddress(null)}
                    hitSlop={HIT_SLOP_STANDARD}
                    accessibilityRole="button"
                    accessibilityLabel="Змінити адресу"
                    borderRadius={RADII.pill}
                    contentStyle={[styles.closeCircle, { backgroundColor: theme.surfaceMuted }]}
                  >
                    <X size={16} color={theme.textSecondary} strokeWidth={2.2} />
                  </InteractiveSurface>
                </View>

                <View style={[styles.labelSection, { borderTopColor: interactive.divider }]}>
                  <View style={styles.labelHeaderRow}>
                    <Tag size={15} color={theme.textSecondary} />
                    <Text style={[TYPOGRAPHY.headline, { color: theme.text }]}>
                      Мітка локації (необовʼязково)
                    </Text>
                  </View>
                  <Text style={[TYPOGRAPHY.footnote, styles.labelHint, { color: theme.textMuted }]}>
                    Допоможе швидше орієнтуватися серед кількох адрес
                  </Text>

                  <TextInput
                    value={label}
                    onChangeText={setLabel}
                    onFocus={() => setIsLabelFocused(true)}
                    onBlur={() => setIsLabelFocused(false)}
                    placeholder="Наприклад: Дім, Робота, Батьки"
                    placeholderTextColor={theme.textMuted}
                    maxLength={32}
                    style={[
                      TYPOGRAPHY.body,
                      CONTINUOUS_CORNER,
                      styles.labelInput,
                      {
                        backgroundColor: theme.surfaceInput,
                        borderColor: isLabelFocused ? theme.accent : theme.border,
                        borderWidth: isLabelFocused ? 1.5 : LAYOUT.borderWidth,
                        color: theme.text,
                      },
                    ]}
                  />

                  <View style={styles.chipsRow}>
                    {LABEL_SUGGESTIONS.map((preset) => {
                      const active = label === preset;
                      return (
                        <InteractiveSurface
                          key={preset}
                          onPress={() => setLabel(preset)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          borderRadius={RADII.pill}
                          contentStyle={[
                            styles.chip,
                            {
                              backgroundColor: active ? theme.accentSoft : theme.surfaceInput,
                              borderColor: active ? theme.accent : theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              TYPOGRAPHY.subhead,
                              {
                                color: active ? theme.accentText : theme.textSecondary,
                                fontWeight: active ? '600' : '500',
                              },
                            ]}
                          >
                            {preset}
                          </Text>
                        </InteractiveSurface>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.confirmActions}>
                  <InteractiveSurface
                    onPress={() => setSelectedAddress(null)}
                    accessibilityRole="button"
                    borderRadius={RADII.lg}
                    style={styles.actionFlex}
                    contentStyle={[
                      styles.secondaryBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.surfaceInput,
                      },
                    ]}
                  >
                    <Text style={[TYPOGRAPHY.headline, { color: theme.textSecondary }]}>Назад</Text>
                  </InteractiveSurface>

                  <InteractiveSurface
                    onPress={handleSavePress}
                    accessibilityRole="button"
                    rippleTone="accent"
                    borderRadius={RADII.lg}
                    style={styles.actionFlex}
                    contentStyle={[styles.primaryBtn, { backgroundColor: theme.accent }]}
                  >
                    <Check size={17} color={theme.accentOnSolid} strokeWidth={2.5} />
                    <Text style={[TYPOGRAPHY.headline, { color: theme.accentOnSolid }]}>
                      Зберегти
                    </Text>
                  </InteractiveSurface>
                </View>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.searchContainer}>
              <InteractiveSurface
                onPress={() => setCityModalVisible(true)}
                scaleVariant="card"
                borderRadius={RADII.lg}
                accessibilityRole="button"
                accessibilityLabel={`Населений пункт: ${selectedCity.name}`}
                style={[styles.citySelectorOuter, elevation.subtle]}
                contentStyle={[
                  styles.citySelectorInner,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.cityLeft}>
                  <View
                    style={[
                      styles.cityIconBox,
                      CONTINUOUS_CORNER,
                      { backgroundColor: theme.accentSoft },
                    ]}
                  >
                    <Building2 size={17} color={theme.accent} strokeWidth={2.1} />
                  </View>
                  <View style={styles.cityTextWrap}>
                    <Text style={[TYPOGRAPHY.caption, { color: theme.textMuted }]}>
                      Населений пункт
                    </Text>
                    <Text
                      style={[TYPOGRAPHY.callout, styles.cityValue, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {selectedCity.name}
                      {selectedCity.otgName ? ` (${selectedCity.otgName} ОТГ)` : ''}
                    </Text>
                  </View>
                </View>

                <ChevronDown size={18} color={theme.textMuted} strokeWidth={2.2} />
              </InteractiveSurface>

              <View
                style={[
                  styles.searchField,
                  CONTINUOUS_CORNER,
                  elevation.subtle,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isSearchFocused ? theme.accent : theme.border,
                    borderWidth: isSearchFocused ? 1.5 : LAYOUT.borderWidth,
                  },
                ]}
              >
                <Search size={19} color={isSearchFocused ? theme.accent : theme.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={
                    selectedCity.id === LVIV_CITY_ID
                      ? 'Вулиця та будинок, напр.: Вел 50'
                      : 'Введіть вулицю та номер будинку'
                  }
                  placeholderTextColor={theme.textMuted}
                  returnKeyType="search"
                  style={[TYPOGRAPHY.body, styles.searchInput, { color: theme.text }]}
                />
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : query.length > 0 ? (
                  <Pressable
                    onPress={() => setQuery('')}
                    hitSlop={HIT_SLOP_STANDARD}
                    accessibilityRole="button"
                    accessibilityLabel="Очистити пошук"
                    style={styles.clearBtn}
                  >
                    <X size={17} color={theme.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                style={styles.resultsScroll}
                contentContainerStyle={styles.resultsContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {error ? (
                  <View
                    style={[
                      styles.errorCard,
                      CONTINUOUS_CORNER,
                      {
                        backgroundColor: theme.dangerBg,
                        borderColor: theme.dangerBorder,
                      },
                    ]}
                  >
                    <Text style={[TYPOGRAPHY.callout, { color: theme.dangerText }]}>{error}</Text>
                  </View>
                ) : null}

                {!isLoading && !error && hasSearched && items.length === 0 ? (
                  <View
                    style={[
                      styles.emptySearchCard,
                      CONTINUOUS_CORNER,
                      elevation.card,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[TYPOGRAPHY.headline, { color: theme.text }]}>
                      Нічого не знайдено
                    </Text>
                    <Text
                      style={[
                        TYPOGRAPHY.subhead,
                        styles.emptySearchText,
                        { color: theme.textMuted },
                      ]}
                    >
                      Спробуйте ввести коротшу частину назви вулиці або перевірте обраний населений
                      пункт ({selectedCity.name}).
                    </Text>
                  </View>
                ) : null}

                {query.trim().length < 2 ? (
                  <View
                    style={[
                      styles.examplesCard,
                      CONTINUOUS_CORNER,
                      elevation.card,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        TYPOGRAPHY.caption,
                        styles.examplesKicker,
                        { color: theme.textMuted },
                      ]}
                    >
                      ПРИКЛАДИ ШВИДКОГО ПОШУКУ ({selectedCity.name.toUpperCase()})
                    </Text>
                    <View style={styles.chipsRow}>
                      {quickExamples.map((example) => (
                        <InteractiveSurface
                          key={example}
                          onPress={() => setQuery(example)}
                          accessibilityRole="button"
                          borderRadius={RADII.pill}
                          contentStyle={[
                            styles.chip,
                            {
                              backgroundColor: theme.surfaceInput,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Text style={[TYPOGRAPHY.subhead, { color: theme.textSecondary }]}>
                            {example}
                          </Text>
                        </InteractiveSurface>
                      ))}
                    </View>
                  </View>
                ) : null}

                {items.length > 0 ? (
                  <View
                    style={[
                      styles.resultsListCard,
                      CONTINUOUS_CORNER,
                      elevation.card,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    {items.map((item, idx) => {
                      const alreadySaved = locations.some(
                        (loc) =>
                          loc.id === item.id ||
                          (loc.streetId === item.streetId &&
                            loc.buildingName === item.buildingName),
                      );
                      return (
                        <View key={item.id}>
                          {idx > 0 ? (
                            <View
                              style={[
                                styles.insetDivider,
                                { backgroundColor: interactive.divider },
                              ]}
                            />
                          ) : null}
                          <InteractiveSurface
                            onPress={() => handleSelectResult(item)}
                            scaleVariant="none"
                            accessibilityRole="button"
                            contentStyle={styles.resultRow}
                          >
                            <View
                              style={[
                                styles.resultIcon,
                                CONTINUOUS_CORNER,
                                { backgroundColor: theme.accentSoft },
                              ]}
                            >
                              <MapPin size={17} color={theme.accent} strokeWidth={2.1} />
                            </View>

                            <View style={styles.resultTextWrap}>
                              <Text
                                style={[
                                  TYPOGRAPHY.callout,
                                  styles.resultAddress,
                                  { color: theme.text },
                                ]}
                              >
                                {item.fullAddress}
                              </Text>
                              {alreadySaved ? (
                                <Text
                                  style={[
                                    TYPOGRAPHY.footnote,
                                    styles.savedHint,
                                    { color: theme.onIcon },
                                  ]}
                                >
                                  Вже збережено у списку
                                </Text>
                              ) : null}
                            </View>

                            <View
                              style={[
                                styles.resultGroupBadge,
                                CONTINUOUS_CORNER,
                                { backgroundColor: theme.accentSoft },
                              ]}
                            >
                              <Text style={[TYPOGRAPHY.caption, { color: theme.accentText }]}>
                                {item.groupId}
                              </Text>
                            </View>
                          </InteractiveSurface>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      <AppBottomSheet
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
        title="Населений пункт"
        subtitle="Оберіть населений пункт Львівської області"
        maxHeightRatio={0.8}
      >
        <ScrollView
          style={styles.cityList}
          contentContainerStyle={styles.cityListContent}
          showsVerticalScrollIndicator={false}
        >
          {isCitiesLoading ? (
            <View style={styles.cityEmpty}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          ) : cityError ? (
            <View
              style={[
                styles.cityErrorBox,
                CONTINUOUS_CORNER,
                {
                  backgroundColor: theme.dangerBg,
                  borderColor: theme.dangerBorder,
                },
              ]}
            >
              <Text style={[TYPOGRAPHY.callout, styles.cityErrorText, { color: theme.dangerText }]}>
                {cityError}
              </Text>
              <InteractiveSurface
                onPress={fetchCities}
                rippleTone="accent"
                borderRadius={RADII.md}
                style={styles.cityRetryOuter}
                contentStyle={[styles.cityRetryBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={[TYPOGRAPHY.subhead, { color: theme.accentOnSolid }]}>
                  Спробувати ще раз
                </Text>
              </InteractiveSurface>
            </View>
          ) : cityResults.length === 0 ? (
            <View style={styles.cityEmpty}>
              <Text style={[TYPOGRAPHY.callout, { color: theme.textMuted }]}>
                Населених пунктів не знайдено
              </Text>
            </View>
          ) : (
            cityResults.map((city) => {
              const isActive = city.id === selectedCity.id;
              return (
                <InteractiveSurface
                  key={city.id}
                  onPress={() => handleSelectCity(city)}
                  scaleVariant="card"
                  borderRadius={RADII.lg}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  contentStyle={[
                    styles.cityRow,
                    {
                      backgroundColor: isActive ? theme.accentSoft : theme.surfaceInput,
                      borderColor: isActive ? theme.accent : theme.border,
                      borderWidth: isActive ? 1.5 : LAYOUT.borderWidth,
                    },
                  ]}
                >
                  <View style={styles.cityRowText}>
                    <Text style={[TYPOGRAPHY.headline, { color: theme.text }]}>{city.name}</Text>
                    {city.otgName ? (
                      <Text style={[TYPOGRAPHY.footnote, { color: theme.textMuted }]}>
                        {city.otgName} громада
                      </Text>
                    ) : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: LAYOUT.screenHorizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  headerSubtitle: {
    marginTop: 2,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenHorizontal,
    paddingTop: SPACING.xxs,
  },
  citySelectorOuter: {
    marginBottom: SPACING.sm - 2,
  },
  citySelectorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 11,
  },
  cityLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm - 2,
  },
  cityIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityTextWrap: {
    flex: 1,
    gap: 1,
  },
  cityValue: {
    fontWeight: '600',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.sm + 2,
    minHeight: 48,
    gap: SPACING.xs + 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 4,
  },
  resultsScroll: {
    flex: 1,
    marginTop: SPACING.sm,
  },
  resultsContent: {
    paddingBottom: LAYOUT.tabBarClearance,
    gap: SPACING.sm,
  },
  errorCard: {
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    padding: SPACING.md,
  },
  emptySearchCard: {
    alignItems: 'center',
    borderRadius: RADII.xl,
    borderWidth: LAYOUT.borderWidth,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  emptySearchText: {
    marginTop: 6,
    textAlign: 'center',
  },
  examplesCard: {
    borderRadius: RADII.xl,
    borderWidth: LAYOUT.borderWidth,
    padding: LAYOUT.cardPadding,
  },
  examplesKicker: {
    letterSpacing: 0.5,
  },
  chipsRow: {
    marginTop: SPACING.sm - 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: LAYOUT.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsListCard: {
    borderRadius: RADII.xl,
    borderWidth: LAYOUT.borderWidth,
    overflow: 'hidden',
  },
  insetDivider: {
    height: LAYOUT.borderWidth,
    marginLeft: 62,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    gap: SPACING.sm,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextWrap: {
    flex: 1,
    gap: 2,
  },
  resultAddress: {
    fontWeight: '600',
  },
  savedHint: {
    fontWeight: '600',
  },
  resultGroupBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADII.pill,
  },
  confirmScroll: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenHorizontal,
    paddingTop: SPACING.xxs,
  },
  confirmContent: {
    paddingBottom: LAYOUT.tabBarClearance,
  },
  confirmCard: {
    borderRadius: RADII.xl,
    borderWidth: 1.5,
    padding: LAYOUT.cardPadding,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  confirmTitleWrap: {
    flex: 1,
  },
  confirmKicker: {
    letterSpacing: 0.5,
  },
  confirmAddress: {
    marginTop: SPACING.xxs,
  },
  groupPill: {
    marginTop: SPACING.xs + 2,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: LAYOUT.borderWidth,
  },
  labelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelHint: {
    marginTop: 2,
  },
  labelInput: {
    marginTop: SPACING.sm,
    borderRadius: RADII.md + 2,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 12,
    minHeight: 48,
  },
  confirmActions: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm - 2,
  },
  actionFlex: {
    flex: 1,
  },
  secondaryBtn: {
    minHeight: 50,
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    minHeight: 50,
    borderRadius: RADII.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cityList: {
    maxHeight: 380,
  },
  cityListContent: {
    gap: SPACING.xs + 2,
    paddingBottom: SPACING.xs,
  },
  cityErrorBox: {
    alignItems: 'center',
    borderRadius: RADII.lg,
    borderWidth: LAYOUT.borderWidth,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  cityErrorText: {
    textAlign: 'center',
  },
  cityRetryOuter: {
    marginTop: SPACING.sm,
  },
  cityRetryBtn: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityEmpty: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  cityRowText: {
    flex: 1,
    gap: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
