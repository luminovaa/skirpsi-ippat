import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';

interface SnowflakeProps {
  size: number;
  speed: number;
  left: number;
}

const Snowflake: React.FC<SnowflakeProps> = ({ size, speed, left }) => {
  const translateY = new Animated.Value(0);

  useEffect(() => {
    const snowfallAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 240,
          duration: speed,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    );

    snowfallAnimation.start();

    return () => snowfallAnimation.stop();
  }, [speed]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: left,
        transform: [{ translateY }],
        width: size,
        height: size,
      }}
    >
      <Image 
        source={require('@/assets/logo/snowflake.png')}
        style={{ width: size, height: size }}
      />
    </Animated.View>
  );
};

interface SnowfallProps {
  isActive: boolean;
}

const Snowfall: React.FC<SnowfallProps> = ({ isActive }) => {
  const [snowflakes, setSnowflakes] = useState<SnowflakeProps[]>([]);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    if (isActive) {
      // Generate 50 snowflakes with more controlled random properties
      const newSnowflakes = Array.from({ length: 50 }, (_, index) => ({
        size: Math.random() * 20 + 5, // Smaller, more varied sizes
        speed: Math.random() * 5000 + 3000, // Random fall speed between 3-8 seconds
        left: Math.random() * screenWidth, // Random horizontal position
      }));
      setSnowflakes(newSnowflakes);
    } else {
      setSnowflakes([]);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <View style={[styles.container, { height: screenHeight }]} pointerEvents="none">
      {snowflakes.map((snowflake, index) => (
        <Snowflake
          key={index}
          size={snowflake.size}
          speed={snowflake.speed}
          left={snowflake.left}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
});

export default Snowfall;