import { useRef, useEffect } from 'react';
import { Animated, PanResponder, View, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const SCREEN_W = Dimensions.get('window').width;
const SNAP_W = 76;
const FULL_THRESHOLD = SCREEN_W * 0.42;

export default function SwipeableRow({ children, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const xVal = useRef(0);
  const triggeredFull = useRef(false);

  useEffect(() => {
    const id = translateX.addListener(({ value }) => { xVal.current = value; });
    return () => translateX.removeListener(id);
  }, []);

  const spring = (toValue, cb) =>
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      tension: 280,
      friction: 28,
    }).start(cb);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 2,
      onShouldBlockNativeResponder: () => false,
      onPanResponderGrant: () => {
        triggeredFull.current = false;
        translateX.setOffset(xVal.current);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, { dx }) => {
        const projected = xVal.current + dx;
        if (projected > 0) {
          translateX.setValue(-xVal.current);
        } else if (projected < -SCREEN_W) {
          translateX.setValue(-SCREEN_W - xVal.current);
        } else {
          translateX.setValue(dx);
        }

        // Haptic hint when crossing full threshold
        if (!triggeredFull.current && projected < -FULL_THRESHOLD) {
          triggeredFull.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (triggeredFull.current && projected > -FULL_THRESHOLD) {
          triggeredFull.current = false;
        }
      },
      onPanResponderRelease: (_, { vx }) => {
        translateX.flattenOffset();
        const pos = xVal.current;

        if (pos < -FULL_THRESHOLD || vx < -1.2) {
          // Full swipe → snap to full red → call delete
          spring(-SCREEN_W, () => {
            translateX.setValue(0);
            onDelete?.();
          });
        } else if (pos < -(SNAP_W / 2)) {
          spring(-SNAP_W);
        } else {
          spring(0);
        }
      },
    })
  ).current;

  // Interpolate the icon's right position: near right when peeking, moves further right when full
  const iconTranslateX = translateX.interpolate({
    inputRange: [-SCREEN_W, -SNAP_W, 0],
    outputRange: [SCREEN_W - 52, 0, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={s.container}>
      {/* Red background — always full width, behind the row */}
      <View style={s.bg}>
        <Animated.View style={{ transform: [{ translateX: iconTranslateX }] }}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </Animated.View>
      </View>
      {/* Sliding row */}
      <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden' },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E04F4F',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 27,
  },
});
