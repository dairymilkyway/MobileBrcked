import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// LEGO Theme Colors
const LEGO_COLORS = {
  yellow: '#FFD700',
  red: '#E3000B',
  blue: '#0055BF',
  green: '#00852B',
};

export default function NotFoundScreen() {
  // Log when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('NotFoundScreen is now focused');
      // You can add any focus-related logic here
      
      return () => {
        // Cleanup function when screen goes out of focus
        console.log('NotFoundScreen is no longer focused');
      };
    }, [])
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Brick Not Found!' }} />
      <ThemedView style={styles.container}>
        <ThemedView style={styles.brickContainer}>
          <ThemedText style={styles.title}>OOPS!</ThemedText>
          <ThemedText style={styles.subtitle}>This brick doesn't exist.</ThemedText>
          <ThemedView style={styles.brickDecoration}>
            <ThemedView style={styles.brickStud}></ThemedView>
            <ThemedView style={styles.brickStud}></ThemedView>
            <ThemedView style={styles.brickStud}></ThemedView>
            <ThemedView style={styles.brickStud}></ThemedView>
          </ThemedView>
          <Link href="/" style={styles.link}>
            <ThemedView style={styles.button}>
              <ThemedText style={styles.buttonText}>Back to Building!</ThemedText>
            </ThemedView>
          </Link>
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: LEGO_COLORS.yellow,
  },
  brickContainer: {
    backgroundColor: LEGO_COLORS.red,
    padding: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 18,
    marginVertical: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  brickDecoration: {
    flexDirection: 'row',
    marginVertical: 15,
  },
  brickStud: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: LEGO_COLORS.yellow,
    marginHorizontal: 5,
  },
  link: {
    marginTop: 20,
  },
  button: {
    backgroundColor: LEGO_COLORS.blue,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
