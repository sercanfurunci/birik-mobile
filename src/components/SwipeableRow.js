import { useRef, useEffect } from 'react';
import { Animated, PanResponder, View } from 'react-native';

const ACTION_W = 130; // total width of revealed actions (2 buttons)
const SNAP_THRESHOLD = ACTION_W / 2;

export default function SwipeableRow({ children, renderActions, onSwipeOpen }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);
  const isOpen = useRef(false);

  useEffect(() => {
    const id = translateX.addListener(({ value }) => { currentX.current = value; });
    return () => translateX.removeListener(id);
  }, []);

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 14 }).start();
    isOpen.current = false;
  };

  const open = () => {
    Animated.spring(translateX, { toValue: -ACTION_W, useNativeDriver: true, tension: 120, friction: 14 }).start();
    isOpen.current = true;
    onSwipeOpen?.();
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy),
      onPanResponderGrant: () => {
        translateX.setOffset(currentX.current);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, { dx }) => {
        const next = currentX.current + dx;
        if (next <= 0 && next >= -ACTION_W - 20) translateX.setValue(dx);
      },
      onPanResponderRelease: (_, { dx }) => {
        translateX.flattenOffset();
        const final = currentX.current;
        if (final < -SNAP_THRESHOLD) open();
        else close();
      },
    })
  ).current;

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* Action buttons (revealed behind) */}
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_W, flexDirection: 'row' }}>
        {renderActions(close)}
      </View>
      {/* Row */}
      <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}
