import { useAppTheme } from '@/entities/location/model/store';
import {
  type HourCell,
  type SlotStatus,
  createSlots,
  getKyivCurrentHour,
  slotsToHourCells,
} from '@is-light/shared';
import { Clock, HelpCircle, Zap, ZapOff } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface OutageGridProps {
  slots: readonly SlotStatus[] | null;
  highlightCurrentHour: boolean;
}

function getCellDescriptionUk(cell: HourCell): string {
  const hourStr = String(cell.hour).padStart(2, '0');
  const nextHourStr = String(cell.hour + 1).padStart(2, '0');

  switch (cell.state) {
    case 'on':
      return `${hourStr}:00–${nextHourStr}:00 — Світло є протягом усієї години`;
    case 'off':
      return `${hourStr}:00–${nextHourStr}:00 — Світла немає протягом усієї години`;
    case 'off_first_half':
      return `${hourStr}:00–${hourStr}:30 — Світла немає (30 хв), з ${hourStr}:30 до ${nextHourStr}:00 — світло є`;
    case 'off_second_half':
      return `${hourStr}:00–${hourStr}:30 — Світло є, з ${hourStr}:30 до ${nextHourStr}:00 — світла немає (30 хв)`;
    default:
      return `${hourStr}:00–${nextHourStr}:00 — Немає даних`;
  }
}

export function OutageGrid({ slots, highlightCurrentHour }: OutageGridProps) {
  const theme = useAppTheme();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const currentHour = highlightCurrentHour ? getKyivCurrentHour(new Date()) : -1;

  const cells = useMemo(() => {
    const resolved = slots && slots.length === 48 ? slots : createSlots('unknown');
    return slotsToHourCells(resolved);
  }, [slots]);

  const rows = useMemo(() => {
    const chunked: HourCell[][] = [];
    for (let i = 0; i < cells.length; i += 4) {
      chunked.push(cells.slice(i, i + 4));
    }
    return chunked;
  }, [cells]);

  const selectedCell = selectedHour !== null ? (cells[selectedHour] ?? null) : null;

  return (
    <View
      className="rounded-2xl border p-2.5"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <View className="gap-1.5">
        {rows.map((row) => (
          <View key={row[0]?.label ?? 'row'} className="flex-row gap-1.5">
            {row.map((cell) => {
              const isCurrent = highlightCurrentHour && cell.hour === currentHour;
              const isSelected = selectedHour === cell.hour;
              const isPartial = cell.state === 'off_first_half' || cell.state === 'off_second_half';

              const bgColor =
                cell.state === 'on'
                  ? theme.onBg
                  : cell.state === 'off'
                    ? theme.offBg
                    : cell.state === 'unknown'
                      ? theme.unknownBg
                      : theme.surface;

              const borderColor = isCurrent
                ? theme.accent
                : isSelected
                  ? theme.text
                  : cell.state === 'on'
                    ? theme.onBorder
                    : cell.state === 'off'
                      ? theme.offBorder
                      : isPartial
                        ? theme.partialBorder
                        : theme.unknownBorder;

              const borderWidth = isCurrent || isSelected ? 2 : 1;

              const textColor =
                cell.state === 'on'
                  ? theme.onText
                  : cell.state === 'off'
                    ? theme.offText
                    : isPartial
                      ? theme.partialText
                      : theme.unknownText;

              return (
                <Pressable
                  key={cell.label}
                  onPress={() => setSelectedHour((prev) => (prev === cell.hour ? null : cell.hour))}
                  accessibilityRole="button"
                  accessibilityLabel={getCellDescriptionUk(cell)}
                  className="relative h-[60px] flex-1 overflow-hidden rounded-xl"
                  style={{
                    backgroundColor: bgColor,
                    borderColor,
                    borderWidth,
                  }}
                >
                  {isPartial ? (
                    <View className="absolute inset-0 flex-row">
                      <View
                        className="flex-1"
                        style={{
                          backgroundColor:
                            cell.state === 'off_first_half' ? theme.offHalfBg : theme.onHalfBg,
                        }}
                      />
                      <View
                        className="flex-1"
                        style={{
                          backgroundColor:
                            cell.state === 'off_second_half' ? theme.offHalfBg : theme.onHalfBg,
                        }}
                      />
                    </View>
                  ) : null}

                  <View className="flex-1 items-center justify-center px-1 py-1">
                    {isCurrent ? (
                      <View
                        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      />
                    ) : null}

                    {cell.state === 'on' ? (
                      <Zap size={15} color={theme.onIcon} />
                    ) : cell.state === 'off' ? (
                      <ZapOff size={15} color={theme.offIcon} />
                    ) : isPartial ? (
                      <Clock size={15} color={theme.partialIcon} />
                    ) : (
                      <HelpCircle size={15} color={theme.unknownText} />
                    )}

                    <Text className="mt-1 text-xs font-bold" style={{ color: textColor }}>
                      {cell.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {selectedCell ? (
        <View className="mt-2 rounded-xl px-3 py-2" style={{ backgroundColor: theme.tooltipBg }}>
          <Text className="text-xs font-medium" style={{ color: theme.tooltipText }}>
            {getCellDescriptionUk(selectedCell)}
          </Text>
        </View>
      ) : null}

      <View
        className="mt-2.5 flex-row flex-wrap items-center justify-between gap-2 pt-2"
        style={{ borderTopWidth: 1, borderTopColor: theme.borderSubtle }}
      >
        <View className="flex-row items-center gap-1.5">
          <View
            className="h-3 w-3 rounded border"
            style={{ backgroundColor: theme.onHalfBg, borderColor: theme.onBorder }}
          />
          <Text className="text-[11px]" style={{ color: theme.textMuted }}>
            Є світло
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <View
            className="h-3 w-3 rounded border"
            style={{ backgroundColor: theme.offHalfBg, borderColor: theme.offBorder }}
          />
          <Text className="text-[11px]" style={{ color: theme.textMuted }}>
            Немає
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <View
            className="h-3 w-3 flex-row overflow-hidden rounded border"
            style={{ borderColor: theme.partialBorder }}
          >
            <View className="flex-1" style={{ backgroundColor: theme.offHalfBg }} />
            <View className="flex-1" style={{ backgroundColor: theme.onHalfBg }} />
          </View>
          <Text className="text-[11px]" style={{ color: theme.textMuted }}>
            30 хв
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <View
            className="h-3 w-3 rounded border-2"
            style={{ borderColor: theme.accent, backgroundColor: theme.surface }}
          />
          <Text className="text-[11px]" style={{ color: theme.textMuted }}>
            Зараз
          </Text>
        </View>
      </View>
    </View>
  );
}
