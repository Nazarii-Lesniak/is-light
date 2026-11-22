import { useAppTheme } from '@/entities/location/model/store';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

export function GlassBackdrop() {
  const theme = useAppTheme();

  if (!theme.isGlass || !theme.glassBackdropOrbs) {
    return null;
  }

  const [orbTop, orbMid, orbBottom] = theme.glassBackdropOrbs;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orbTop, { backgroundColor: orbTop }]} />
      <View style={[styles.orbMid, { backgroundColor: orbMid }]} />
      <View style={[styles.orbBottom, { backgroundColor: orbBottom }]} />
      <BlurView
        intensity={Platform.OS === 'ios' ? 95 : 70}
        tint={theme.isDark ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orbTop: {
    position: 'absolute',
    top: -90,
    left: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  orbMid: {
    position: 'absolute',
    top: 220,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -60,
    left: 40,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
});
