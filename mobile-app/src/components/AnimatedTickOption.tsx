import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';

type AnimatedTickOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  shape?: 'circle' | 'square';
  activeColor?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
};

const DEFAULT_ACTIVE = '#1565C0';

export default function AnimatedTickOption({
  label,
  selected,
  onPress,
  shape = 'circle',
  activeColor = DEFAULT_ACTIVE,
  containerStyle,
  labelStyle,
}: AnimatedTickOptionProps) {
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 190,
      mass: 0.8,
    }).start();
  }, [progress, selected]);

  return (
    <Pressable onPress={onPress} style={[styles.row, containerStyle]}>
      <View
        style={[
          styles.marker,
          shape === 'square' ? styles.square : styles.circle,
          {
            borderColor: selected ? activeColor : '#d1d5db',
            backgroundColor: selected ? activeColor : '#ffffff',
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: progress,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.55, 1],
                }),
              },
            ],
          }}
        >
          <Ionicons name="checkmark" size={14} color="#ffffff" />
        </Animated.View>
      </View>
      <AppText style={[styles.label, labelStyle]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  marker: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderRadius: 999,
  },
  square: {
    borderRadius: 6,
  },
  label: {
    fontSize: 15,
    color: '#1a1a1a',
  },
});
