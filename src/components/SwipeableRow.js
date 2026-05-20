import { useRef, useMemo, useEffect } from 'react';
import { Animated, PanResponder, View, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

const SCREEN_W = Dimensions.get('window').width;
const SNAP_W = 76;
const FULL_THRESHOLD = SCREEN_W * 0.42;

export default function SwipeableRow({ children, onDelete }) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  // Tracks the snapped position between gestures — no stale closure issues
  const snappedPos = useRef(0);

  // Always have the latest onDelete without recreating PanResponder
  const onDeleteRef = useRef(onDelete);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);

  const spring = (toValue, cb) =>
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: false,
      speed: 16,
      bounciness: 2,
    }).start(cb);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 2,
        onPanResponderGrant: () => {
          // snappedPos.current already holds the correct start position
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, { dx }) => {
          // dx accumulates from gesture start — add to where we were before gesture
          const next = Math.max(-SCREEN_W, Math.min(0, snappedPos.current + dx));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, { dx, vx }) => {
          const finalPos = snappedPos.current + dx;

          if (finalPos < -FULL_THRESHOLD || vx < -1.2) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            snappedPos.current = -SCREEN_W;
            spring(-SCREEN_W, () => {
              snappedPos.current = 0;
              translateX.setValue(0);
              onDeleteRef.current?.();
            });
          } else if (finalPos < -(SNAP_W / 2)) {
            snappedPos.current = -SNAP_W;
            spring(-SNAP_W);
          } else {
            snappedPos.current = 0;
            spring(0);
          }
        },
        onPanResponderTerminate: () => {
          snappedPos.current = 0;
          spring(0);
        },
      }),
    [] // safe: all mutable state in refs
  );

  return (
    // backgroundColor = page bg so card border-radius corners don't reveal red
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={s.action}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </View>
      <Animated.View style={{ transform: [{ translateX }], backgroundColor: colors.bg, borderRadius: 14 }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden' },
  action: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E04F4F',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 26,
  },
});
