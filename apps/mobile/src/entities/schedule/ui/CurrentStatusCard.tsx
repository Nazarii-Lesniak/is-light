import { useAppTheme } from '@/entities/location/model/store';
import {
  type DaySchedule,
  formatCountdownUk,
  formatKyivTime,
  getCurrentPowerStatus,
} from '@is-light/shared';
import { Clock, WifiOff, Zap, ZapOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

interface CurrentStatusCardProps {
  today: DaySchedule | null;
  tomorrow: DaySchedule | null;
  updatedAt: string | null;
  isOffline: boolean;
}

export function CurrentStatusCard({
  today,
  tomorrow,
  updatedAt,
  isOffline,
}: CurrentStatusCardProps) {
  const theme = useAppTheme();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const summary = getCurrentPowerStatus(today, tomorrow, now);
  const isOff = summary.status === 'off';
  const hasPublishedToday = Boolean(today?.isPublished);

  const bgColor = isOff ? theme.offBg : theme.onBg;
  const borderColor = isOff ? theme.offBorder : theme.onBorder;
  const iconBgColor = isOff ? theme.offHalfBg : theme.onHalfBg;
  const iconColor = isOff ? theme.offIcon : theme.onIcon;
  const textColor = isOff ? theme.offText : theme.onText;

  const titleText = isOff
    ? 'Зараз немає світла'
    : hasPublishedToday
      ? 'Зараз є світло'
      : 'Є світло';

  let countdownText = 'До кінця доступного графіка змін не заплановано';
  if (!hasPublishedToday) {
    countdownText = 'Графік відключень на сьогодні не застосовується';
  } else if (summary.nextChangeAt && summary.msUntilChange !== null) {
    const actionLabel = summary.nextStatus === 'off' ? 'Відключення' : 'Увімкнення';
    const timeLabel = formatKyivTime(summary.nextChangeAt);
    countdownText = `${actionLabel} о ${timeLabel} (через ${formatCountdownUk(summary.msUntilChange)})`;
  }

  return (
    <View
      className="rounded-2xl border p-3"
      style={{
        backgroundColor: bgColor,
        borderColor,
      }}
    >
      <View className="flex-row items-center gap-2.5">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBgColor }}
        >
          {isOff ? <ZapOff size={20} color={iconColor} /> : <Zap size={20} color={iconColor} />}
        </View>

        <View className="flex-1">
          <Text className="text-base font-bold" style={{ color: textColor }}>
            {titleText}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Clock size={13} color={iconColor} />
            <Text className="flex-1 text-xs" style={{ color: textColor }} numberOfLines={1}>
              {countdownText}
            </Text>
          </View>
        </View>
      </View>

      <View
        className="mt-2 flex-row flex-wrap items-center justify-between gap-2 pt-1.5"
        style={{ borderTopWidth: 1, borderTopColor: borderColor }}
      >
        <Text className="text-[11px]" style={{ color: theme.textSecondary }}>
          {updatedAt ? `Оновлено о ${formatKyivTime(updatedAt)}` : 'Ще не синхронізовано'}
        </Text>

        {isOffline ? (
          <View
            className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: theme.warningBg }}
          >
            <WifiOff size={11} color={theme.warningText} />
            <Text className="text-[11px] font-medium" style={{ color: theme.warningText }}>
              Офлайн-кеш
            </Text>
          </View>
        ) : today?.sourceInfo ? (
          <Text className="text-[11px]" style={{ color: theme.textMuted }} numberOfLines={1}>
            {today.sourceInfo}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
